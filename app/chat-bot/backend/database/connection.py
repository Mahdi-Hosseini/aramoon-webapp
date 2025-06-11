from supabase import create_client, Client
from config import settings
import logging

logger = logging.getLogger(__name__)


class SupabaseClient:
    _instance = None
    _client: Client = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(SupabaseClient, cls).__new__(cls)
        return cls._instance
    
    def __init__(self):
        if self._client is None:
            try:
                self._client = create_client(
                    settings.supabase_url,
                    settings.supabase_anon_key
                )
                logger.info("Supabase client initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize Supabase client: {e}")
                raise
    
    @property
    def client(self) -> Client:
        return self._client
    
    async def health_check(self) -> bool:
        """Check if the database connection is healthy"""
        try:
            # Simple query to test connection
            result = self._client.table('conversations').select('id').limit(1).execute()
            return True
        except Exception as e:
            logger.error(f"Database health check failed: {e}")
            return False


# Singleton instance
supabase_client = SupabaseClient() 