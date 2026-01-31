"""
Supabase Client Configuration
Singleton pattern for Supabase client initialization
"""

import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()


class SupabaseClient:
    """Singleton Supabase client wrapper"""
    
    _instance: Client = None
    _admin_instance: Client = None
    
    @classmethod
    def get_client(cls) -> Client:
        """Get the regular Supabase client (anon key)"""
        if cls._instance is None:
            url = os.getenv("SUPABASE_URL")
            key = os.getenv("SUPABASE_ANON_KEY")
            
            if not url or not key:
                raise ValueError("SUPABASE_URL and SUPABASE_ANON_KEY must be set")
            
            cls._instance = create_client(url, key)
        
        return cls._instance
    
    @classmethod
    def get_admin_client(cls) -> Client:
        """Get the admin Supabase client (service role key, falls back to anon key)"""
        if cls._admin_instance is None:
            url = os.getenv("SUPABASE_URL")
            key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
            
            if not url:
                raise ValueError("SUPABASE_URL must be set")
            
            # Try service role key first, fall back to anon key
            if not key:
                key = os.getenv("SUPABASE_ANON_KEY")
                if not key:
                    raise ValueError("Either SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY must be set")
            
            try:
                cls._admin_instance = create_client(url, key)
            except Exception as e:
                # Fall back to ANON key if service role key fails
                fallback_key = os.getenv("SUPABASE_ANON_KEY")
                if fallback_key and key != fallback_key:
                    print(f"Warning: Service role key failed, using ANON key instead")
                    cls._admin_instance = create_client(url, fallback_key)
                else:
                    raise
        
        return cls._admin_instance


def get_supabase() -> Client:
    """Dependency injection helper for regular client"""
    return SupabaseClient.get_client()


def get_supabase_admin() -> Client:
    """Dependency injection helper for admin client"""
    return SupabaseClient.get_admin_client()
