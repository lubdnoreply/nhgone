from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    MEWS_CLIENT_TOKEN: str = ""
    MEWS_ACCESS_TOKEN: str = ""
    MEWS_BASE_URL: str = "https://api.mews-demo.com"
    
    class Config:
        env_file = ".env"

from supabase import create_client, Client

@lru_cache()
def get_settings():
    return Settings()

settings = get_settings()

def get_supabase_client() -> Client:
    # Use service role key to bypass RLS when fetching secure tokens internally
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)

# Trigger reload
