"""
CSV Operations Routes
Upload and export CSV functionality with WebSocket notifications and data optimization
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Request
from fastapi.responses import StreamingResponse
from typing import Optional, List, Dict, Any
import pandas as pd
import numpy as np
import io
import uuid
import json
from datetime import datetime
from config import get_supabase_admin

router = APIRouter()


async def broadcast_update(request: Request, event_type: str, table: str, data: Any = None):
    """Broadcast update to all connected WebSocket clients"""
    try:
        manager = request.app.state.ws_manager
        await manager.broadcast({
            "type": event_type,
            "table": table,
            "data": data
        })
    except Exception as e:
        print(f"WebSocket broadcast error: {e}")


def optimize_dataframe(df: pd.DataFrame, optimize_level: str = "standard") -> tuple[pd.DataFrame, dict]:
    """
    Optimize DataFrame to reduce storage size
    Returns optimized DataFrame and optimization stats
    """
    original_memory = df.memory_usage(deep=True).sum()
    optimizations = []
    
    for col in df.columns:
        col_type = df[col].dtype
        
        # Optimize integers
        if col_type in ['int64', 'int32']:
            col_min = df[col].min()
            col_max = df[col].max()
            
            if col_min >= 0:
                if col_max <= 255:
                    df[col] = df[col].astype('uint8')
                    optimizations.append(f"{col}: int64 → uint8")
                elif col_max <= 65535:
                    df[col] = df[col].astype('uint16')
                    optimizations.append(f"{col}: int64 → uint16")
                elif col_max <= 4294967295:
                    df[col] = df[col].astype('uint32')
                    optimizations.append(f"{col}: int64 → uint32")
            else:
                if col_min >= -128 and col_max <= 127:
                    df[col] = df[col].astype('int8')
                    optimizations.append(f"{col}: int64 → int8")
                elif col_min >= -32768 and col_max <= 32767:
                    df[col] = df[col].astype('int16')
                    optimizations.append(f"{col}: int64 → int16")
                elif col_min >= -2147483648 and col_max <= 2147483647:
                    df[col] = df[col].astype('int32')
                    optimizations.append(f"{col}: int64 → int32")
        
        # Optimize floats
        elif col_type == 'float64':
            df[col] = df[col].astype('float32')
            optimizations.append(f"{col}: float64 → float32")
        
        # Optimize object/string columns
        elif col_type == 'object':
            # Trim whitespace from strings
            if df[col].apply(lambda x: isinstance(x, str) if pd.notna(x) else True).all():
                df[col] = df[col].str.strip()
                
                # Convert to category if low cardinality (fewer unique values)
                unique_ratio = df[col].nunique() / len(df)
                if unique_ratio < 0.5 and optimize_level in ["aggressive", "maximum"]:
                    # Don't convert to category for DB - just note the optimization potential
                    optimizations.append(f"{col}: trimmed whitespace, low cardinality ({df[col].nunique()} unique)")
                else:
                    optimizations.append(f"{col}: trimmed whitespace")
    
    # For maximum optimization, truncate long text fields
    if optimize_level == "maximum":
        for col in df.select_dtypes(include=['object']).columns:
            max_len = df[col].str.len().max() if df[col].dtype == 'object' else 0
            if max_len > 500:
                df[col] = df[col].str[:500]
                optimizations.append(f"{col}: truncated to 500 chars")
    
    optimized_memory = df.memory_usage(deep=True).sum()
    
    return df, {
        "original_size_bytes": int(original_memory),
        "optimized_size_bytes": int(optimized_memory),
        "reduction_bytes": int(original_memory - optimized_memory),
        "reduction_percentage": round((1 - optimized_memory / original_memory) * 100, 2) if original_memory > 0 else 0,
        "optimizations_applied": optimizations
    }


def estimate_database_size(df: pd.DataFrame) -> dict:
    """
    Estimate the database storage size for a DataFrame
    PostgreSQL storage estimates
    """
    row_count = len(df)
    
    # Estimate size per column type
    size_estimate = 0
    column_sizes = {}
    
    for col in df.columns:
        col_type = df[col].dtype
        col_size = 0
        
        if col_type in ['int8', 'uint8']:
            col_size = row_count * 1  # 1 byte
        elif col_type in ['int16', 'uint16']:
            col_size = row_count * 2  # 2 bytes
        elif col_type in ['int32', 'uint32']:
            col_size = row_count * 4  # 4 bytes
        elif col_type in ['int64', 'uint64']:
            col_size = row_count * 8  # 8 bytes
        elif col_type == 'float32':
            col_size = row_count * 4  # 4 bytes
        elif col_type == 'float64':
            col_size = row_count * 8  # 8 bytes
        elif col_type == 'bool':
            col_size = row_count * 1  # 1 byte
        elif col_type == 'object':
            # String: average length + 4 bytes overhead
            if df[col].dtype == 'object':
                avg_len = df[col].fillna('').astype(str).str.len().mean()
                col_size = int(row_count * (avg_len + 4))
        else:
            # Default estimate
            col_size = row_count * 8
        
        column_sizes[col] = col_size
        size_estimate += col_size
    
    # Add PostgreSQL overhead (~23 bytes per row for tuple header)
    row_overhead = row_count * 23
    
    # Add index overhead (estimate ~20% of data size for primary key)
    index_overhead = int(size_estimate * 0.2)
    
    total_estimate = size_estimate + row_overhead + index_overhead
    
    return {
        "row_count": row_count,
        "data_size_bytes": size_estimate,
        "row_overhead_bytes": row_overhead,
        "index_overhead_bytes": index_overhead,
        "total_estimate_bytes": total_estimate,
        "total_estimate_formatted": format_bytes(total_estimate),
        "column_sizes": column_sizes
    }


def format_bytes(bytes_value: int) -> str:
    """Format bytes to human-readable string"""
    if bytes_value == 0:
        return "0 B"
    
    units = ['B', 'KB', 'MB', 'GB', 'TB']
    unit_index = 0
    value = float(bytes_value)
    
    while value >= 1024 and unit_index < len(units) - 1:
        value /= 1024
        unit_index += 1
    
    return f"{value:.2f} {units[unit_index]}"


@router.post("/upload/{table_name}")
async def upload_csv(
    table_name: str,
    request: Request,
    file: UploadFile = File(...),
    clear_existing: bool = Form(False, description="Clear existing data before import"),
    optimize: str = Form("standard", description="Optimization level: none, standard, aggressive, maximum")
):
    """
    Upload a CSV file and insert data into the specified table.
    Automatically maps CSV columns to table columns with optional optimization.
    """
    try:
        # Validate file type
        if not file.filename.endswith('.csv'):
            raise HTTPException(status_code=400, detail="Only CSV files are allowed")
        
        # Read CSV content
        content = await file.read()
        file_size = len(content)
        
        try:
            df = pd.read_csv(io.BytesIO(content))
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid CSV format: {str(e)}")
        
        if df.empty:
            raise HTTPException(status_code=400, detail="CSV file is empty")
        
        # Clean column names (lowercase, replace spaces with underscores)
        df.columns = df.columns.str.strip().str.lower().str.replace(' ', '_')
        
        # Apply optimization if requested
        optimization_stats = None
        if optimize != "none":
            df, optimization_stats = optimize_dataframe(df, optimize)
        
        # Estimate database size before insert
        size_estimate = estimate_database_size(df)
        
        # Add metadata columns if not present
        if 'id' not in df.columns:
            df['id'] = [str(uuid.uuid4()) for _ in range(len(df))]
        
        if 'created_at' not in df.columns:
            df['created_at'] = datetime.utcnow().isoformat()
        
        # Convert NaN to None for proper JSON serialization
        df = df.where(pd.notnull(df), None)
        
        # Convert numpy types to Python native types for JSON serialization
        def convert_types(obj):
            if isinstance(obj, (np.integer,)):
                return int(obj)
            elif isinstance(obj, (np.floating,)):
                return float(obj)
            elif isinstance(obj, np.ndarray):
                return obj.tolist()
            elif pd.isna(obj):
                return None
            return obj
        
        # Convert to list of dictionaries with proper types
        records = []
        for _, row in df.iterrows():
            record = {k: convert_types(v) for k, v in row.items()}
            records.append(record)
        
        supabase = get_supabase_admin()
        
        # Clear existing data if requested
        if clear_existing:
            supabase.table(table_name).delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
        
        # Insert records in batches to avoid timeout
        batch_size = 100
        inserted_count = 0
        errors = []
        
        for i in range(0, len(records), batch_size):
            batch = records[i:i + batch_size]
            try:
                result = supabase.table(table_name).insert(batch).execute()
                inserted_count += len(batch)
            except Exception as e:
                errors.append(f"Batch {i // batch_size + 1}: {str(e)}")
        
        response = {
            "message": "CSV upload completed",
            "total_rows": len(records),
            "inserted_rows": inserted_count,
            "columns": list(df.columns),
            "table_name": table_name,
            "size_info": {
                "original_file_size": format_bytes(file_size),
                "estimated_db_size": size_estimate["total_estimate_formatted"],
                "optimization_applied": optimize if optimize != "none" else None,
                "optimization_savings": optimization_stats.get("reduction_percentage", 0) if optimization_stats else 0
            }
        }
        
        if errors:
            response["errors"] = errors
            response["message"] = "CSV upload completed with some errors"
        
        # Broadcast to WebSocket clients
        await broadcast_update(request, "csv_uploaded", table_name, {"rows": inserted_count})
        
        return response
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/preview")
async def preview_csv_post(file: UploadFile = File(...)):
    """
    Preview CSV file contents and column mapping with size estimation
    """
    try:
        if not file.filename.endswith('.csv'):
            raise HTTPException(status_code=400, detail="Only CSV files are allowed")
        
        content = await file.read()
        file_size = len(content)
        df = pd.read_csv(io.BytesIO(content))
        
        # Clean column names
        original_columns = list(df.columns)
        df.columns = df.columns.str.strip().str.lower().str.replace(' ', '_')
        cleaned_columns = list(df.columns)
        
        # Estimate size
        size_estimate = estimate_database_size(df)
        
        # Estimate size at different optimization levels
        optimization_sizes = {}
        for level in ["none", "standard", "aggressive", "maximum"]:
            df_copy = df.copy()
            if level != "none":
                df_copy, _ = optimize_dataframe(df_copy, level)
            level_estimate = estimate_database_size(df_copy)
            optimization_sizes[level] = level_estimate["total_estimate_formatted"]
        
        # Get preview data (first 5 rows)
        preview_data = df.head(5).where(pd.notnull(df.head(5)), None).to_dict(orient='records')
        
        return {
            "original_columns": original_columns,
            "cleaned_columns": cleaned_columns,
            "column_mapping": dict(zip(original_columns, cleaned_columns)),
            "total_rows": len(df),
            "preview_data": preview_data,
            "data_types": {col: str(dtype) for col, dtype in df.dtypes.items()},
            "file_size": format_bytes(file_size),
            "file_size_bytes": file_size,
            "estimated_db_size": size_estimate["total_estimate_formatted"],
            "estimated_db_size_bytes": size_estimate["total_estimate_bytes"],
            "optimization_preview": optimization_sizes
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/export/{table_name}")
async def export_csv(table_name: str):
    """
    Export table data to CSV file
    """
    try:
        supabase = get_supabase_admin()
        result = supabase.table(table_name).select("*").execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="No data found in table")
        
        # Convert to DataFrame
        df = pd.DataFrame(result.data)
        
        # Create CSV in memory
        output = io.StringIO()
        df.to_csv(output, index=False)
        output.seek(0)
        
        # Create streaming response
        response = StreamingResponse(
            io.BytesIO(output.getvalue().encode()),
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename={table_name}_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
            }
        )
        
        return response
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/validate")
async def validate_csv(file: UploadFile = File(...)):
    """
    Validate CSV file structure and data types
    """
    try:
        if not file.filename.endswith('.csv'):
            raise HTTPException(status_code=400, detail="Only CSV files are allowed")
        
        content = await file.read()
        
        try:
            df = pd.read_csv(io.BytesIO(content))
        except Exception as e:
            return {
                "valid": False,
                "error": f"Failed to parse CSV: {str(e)}"
            }
        
        # Check for issues
        issues = []
        
        # Check for empty columns
        empty_cols = df.columns[df.isna().all()].tolist()
        if empty_cols:
            issues.append(f"Empty columns found: {empty_cols}")
        
        # Check for duplicate column names
        if len(df.columns) != len(set(df.columns)):
            issues.append("Duplicate column names detected")
        
        # Check for very long values that might cause issues
        for col in df.select_dtypes(include=['object']).columns:
            max_len = df[col].astype(str).str.len().max()
            if max_len > 10000:
                issues.append(f"Column '{col}' has very long values (max: {max_len} chars)")
        
        return {
            "valid": len(issues) == 0,
            "issues": issues,
            "row_count": len(df),
            "column_count": len(df.columns),
            "columns": list(df.columns)
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
