"""
Storage Routes
Supabase storage and database size information
"""

from fastapi import APIRouter, HTTPException
from typing import Dict, Any
import os
from config import get_supabase_admin

router = APIRouter()

# Supabase limits (in bytes)
# Free tier: 500MB database, 1GB storage
# Pro tier: 8GB database, 100GB storage
STORAGE_TIERS = {
    "free": {
        "storage": 1 * 1024 * 1024 * 1024,  # 1 GB file storage
        "database": 500 * 1024 * 1024,  # 500 MB database
    },
    "pro": {
        "storage": 100 * 1024 * 1024 * 1024,  # 100 GB
        "database": 8 * 1024 * 1024 * 1024,  # 8 GB
    },
}


@router.get("/info")
async def get_storage_info():
    """
    Get comprehensive Supabase storage and database usage information
    """
    try:
        supabase = get_supabase_admin()
        tier = os.getenv("SUPABASE_TIER", "free")
        tier_limits = STORAGE_TIERS.get(tier, STORAGE_TIERS["free"])
        
        # Get file storage info from buckets
        total_file_storage_used = 0
        bucket_details = []
        
        try:
            buckets_result = supabase.storage.list_buckets()
            
            for bucket in buckets_result:
                bucket_name = bucket.name if hasattr(bucket, 'name') else bucket.get('name', '')
                
                try:
                    files = supabase.storage.from_(bucket_name).list()
                    bucket_size = 0
                    file_count = 0
                    
                    for file_info in files:
                        if isinstance(file_info, dict):
                            size = file_info.get('metadata', {}).get('size', 0)
                            if size:
                                bucket_size += size
                                file_count += 1
                        elif hasattr(file_info, 'metadata'):
                            size = getattr(file_info.metadata, 'size', 0) if file_info.metadata else 0
                            if size:
                                bucket_size += size
                                file_count += 1
                    
                    total_file_storage_used += bucket_size
                    bucket_details.append({
                        "name": bucket_name,
                        "size_bytes": bucket_size,
                        "size_formatted": format_bytes(bucket_size),
                        "file_count": file_count
                    })
                except Exception as e:
                    bucket_details.append({
                        "name": bucket_name,
                        "error": str(e)
                    })
        except Exception:
            pass
        
        # Get database size
        database_size = 0
        table_sizes = []
        
        try:
            # Query pg_database_size via RPC or direct query
            result = supabase.rpc("get_db_size_info", {}).execute()
            if result.data and len(result.data) > 0:
                db_info = result.data[0] if isinstance(result.data, list) else result.data
                database_size = db_info.get('database_size_bytes', 0)
                table_sizes = db_info.get('table_sizes', [])
        except Exception:
            # Fallback: estimate from records table
            try:
                result = supabase.table("records").select("*", count="exact").limit(0).execute()
                row_count = result.count or 0
                # Rough estimate: 1KB per row average
                database_size = row_count * 1024
            except:
                pass
        
        # Calculate totals
        total_storage = tier_limits["storage"]
        total_database = tier_limits["database"]
        remaining_storage = total_storage - total_file_storage_used
        remaining_database = total_database - database_size
        
        return {
            # File Storage
            "file_storage": {
                "total_bytes": total_storage,
                "total_formatted": format_bytes(total_storage),
                "used_bytes": total_file_storage_used,
                "used_formatted": format_bytes(total_file_storage_used),
                "remaining_bytes": remaining_storage,
                "remaining_formatted": format_bytes(remaining_storage),
                "usage_percentage": round((total_file_storage_used / total_storage) * 100, 2) if total_storage > 0 else 0,
            },
            # Database Storage
            "database": {
                "total_bytes": total_database,
                "total_formatted": format_bytes(total_database),
                "used_bytes": database_size,
                "used_formatted": format_bytes(database_size),
                "remaining_bytes": remaining_database,
                "remaining_formatted": format_bytes(remaining_database),
                "usage_percentage": round((database_size / total_database) * 100, 2) if total_database > 0 else 0,
                "table_sizes": table_sizes
            },
            # Buckets
            "buckets": bucket_details,
            "bucket_count": len(bucket_details),
            # Tier info
            "tier": tier,
        }
    
    except Exception as e:
        tier_limits = STORAGE_TIERS["free"]
        return {
            "file_storage": {
                "total_bytes": tier_limits["storage"],
                "total_formatted": "1 GB",
                "used_bytes": 0,
                "used_formatted": "0 B",
                "remaining_bytes": tier_limits["storage"],
                "remaining_formatted": "1 GB",
                "usage_percentage": 0,
            },
            "database": {
                "total_bytes": tier_limits["database"],
                "total_formatted": "500 MB",
                "used_bytes": 0,
                "used_formatted": "0 B",
                "remaining_bytes": tier_limits["database"],
                "remaining_formatted": "500 MB",
                "usage_percentage": 0,
                "table_sizes": []
            },
            "buckets": [],
            "bucket_count": 0,
            "tier": "free",
            "error": str(e)
        }


@router.get("/buckets")
async def list_buckets():
    """List all storage buckets"""
    try:
        supabase = get_supabase_admin()
        buckets = supabase.storage.list_buckets()
        
        bucket_list = []
        for bucket in buckets:
            if hasattr(bucket, 'name'):
                bucket_list.append({
                    "name": bucket.name,
                    "id": bucket.id,
                    "public": bucket.public,
                    "created_at": bucket.created_at
                })
            else:
                bucket_list.append(bucket)
        
        return {"buckets": bucket_list}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/buckets/{bucket_name}/files")
async def list_bucket_files(bucket_name: str, path: str = ""):
    """List files in a specific bucket"""
    try:
        supabase = get_supabase_admin()
        files = supabase.storage.from_(bucket_name).list(path)
        
        file_list = []
        for f in files:
            if isinstance(f, dict):
                file_list.append(f)
            else:
                file_list.append({
                    "name": getattr(f, 'name', 'unknown'),
                    "id": getattr(f, 'id', None),
                    "metadata": getattr(f, 'metadata', None)
                })
        
        return {"files": file_list, "bucket": bucket_name, "path": path}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/database/size")
async def get_database_size():
    """Get estimated database size"""
    try:
        supabase = get_supabase_admin()
        
        # Try to get database size via RPC
        try:
            result = supabase.rpc("get_database_size", {}).execute()
            if result.data:
                return {"database_size": result.data}
        except:
            pass
        
        # Fallback: estimate based on table count
        return {
            "database_size": "Unable to determine",
            "note": "Create an RPC function 'get_database_size' for accurate measurement"
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


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
