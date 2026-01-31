"""
Data Routes
CRUD operations for the main data table with WebSocket notifications
"""

from fastapi import APIRouter, HTTPException, Query, Request
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
from config import get_supabase_admin

router = APIRouter()

# Default table name - can be changed based on your needs
DEFAULT_TABLE = "records"


class RecordCreate(BaseModel):
    """Schema for creating a record"""
    data: Dict[str, Any]


class RecordUpdate(BaseModel):
    """Schema for updating a record"""
    data: Dict[str, Any]


class PaginatedResponse(BaseModel):
    """Paginated response schema"""
    data: List[Dict[str, Any]]
    total: int
    page: int
    page_size: int
    total_pages: int


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


@router.get("/tables")
async def get_tables():
    """Get list of available tables"""
    try:
        supabase = get_supabase_admin()
        # Query information schema to get table names
        result = supabase.rpc(
            "get_table_names",
            {}
        ).execute()
        
        if result.data:
            return {"tables": result.data}
        
        # Fallback: return default table
        return {"tables": [{"table_name": DEFAULT_TABLE}]}
    except Exception as e:
        # If RPC doesn't exist, return default table
        return {"tables": [{"table_name": DEFAULT_TABLE}]}


@router.get("/{table_name}")
async def get_records(
    table_name: str,
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(None, description="Search query"),
    sort_by: Optional[str] = Query(None, description="Column to sort by"),
    sort_order: Optional[str] = Query("asc", description="Sort order (asc/desc)")
):
    """
    Get paginated records from a table with optional search and sorting
    """
    try:
        supabase = get_supabase_admin()
        
        # Calculate offset
        offset = (page - 1) * page_size
        
        # Build query
        query = supabase.table(table_name).select("*", count="exact")
        
        # Apply search if provided (searches across all text columns)
        if search:
            # Use ilike for case-insensitive search on common columns
            query = query.or_(
                f"name.ilike.%{search}%,"
                f"email.ilike.%{search}%,"
                f"title.ilike.%{search}%,"
                f"description.ilike.%{search}%"
            )
        
        # Apply sorting
        if sort_by:
            query = query.order(sort_by, desc=(sort_order == "desc"))
        else:
            query = query.order("created_at", desc=True)
        
        # Apply pagination
        query = query.range(offset, offset + page_size - 1)
        
        result = query.execute()
        
        total = result.count if result.count else 0
        total_pages = (total + page_size - 1) // page_size if total > 0 else 1
        
        return PaginatedResponse(
            data=result.data or [],
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{table_name}/all")
async def get_all_records(table_name: str):
    """Get all records from a table (for export)"""
    try:
        supabase = get_supabase_admin()
        result = supabase.table(table_name).select("*").execute()
        return {"data": result.data or []}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{table_name}/{record_id}")
async def get_record(table_name: str, record_id: str):
    """Get a single record by ID"""
    try:
        supabase = get_supabase_admin()
        result = supabase.table(table_name).select("*").eq("id", record_id).single().execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Record not found")
        
        return {"data": result.data}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{table_name}")
async def create_record(table_name: str, record: RecordCreate, request: Request):
    """Create a new record"""
    try:
        supabase = get_supabase_admin()
        result = supabase.table(table_name).insert(record.data).execute()
        
        # Broadcast to WebSocket clients
        await broadcast_update(request, "record_created", table_name, result.data)
        
        return {"message": "Record created successfully", "data": result.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{table_name}/{record_id}")
async def update_record(table_name: str, record_id: str, record: RecordUpdate, request: Request):
    """Update an existing record"""
    try:
        supabase = get_supabase_admin()
        result = supabase.table(table_name).update(record.data).eq("id", record_id).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Record not found")
        
        # Broadcast to WebSocket clients
        await broadcast_update(request, "record_updated", table_name, result.data)
        
        return {"message": "Record updated successfully", "data": result.data}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{table_name}/{record_id}")
async def delete_record(table_name: str, record_id: str, request: Request):
    """Delete a record"""
    try:
        supabase = get_supabase_admin()
        result = supabase.table(table_name).delete().eq("id", record_id).execute()
        
        # Broadcast to WebSocket clients
        await broadcast_update(request, "record_deleted", table_name, {"id": record_id})
        
        return {"message": "Record deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{table_name}")
async def delete_all_records(table_name: str, request: Request):
    """Delete all records from a table"""
    try:
        supabase = get_supabase_admin()
        # Delete all by using a condition that matches everything
        result = supabase.table(table_name).delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
        
        # Broadcast to WebSocket clients
        await broadcast_update(request, "all_records_deleted", table_name)
        
        return {"message": "All records deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{table_name}/schema/columns")
async def get_table_columns(table_name: str):
    """Get column information for a table"""
    try:
        supabase = get_supabase_admin()
        
        # Try to get one record to infer schema
        result = supabase.table(table_name).select("*").limit(1).execute()
        
        if result.data and len(result.data) > 0:
            columns = list(result.data[0].keys())
            return {"columns": columns}
        
        return {"columns": ["id", "created_at"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
