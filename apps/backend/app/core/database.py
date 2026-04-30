import supabase

from app.core.config import get_settings

settings = get_settings()

engine = supabase.create_client(
    settings.supabase_url,
    settings.supabase_service_role_key,
)
