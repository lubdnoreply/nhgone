import httpx
from app.config import settings, get_supabase_client
from app.services.encryption import encryption_service
from fastapi import HTTPException

class MewsClient:
    def __init__(self):
        self.base_url = settings.MEWS_BASE_URL.rstrip("/")
        self.client_name = "NHGOne/1.0"
        self.supabase = get_supabase_client()

    def _get_credentials(self, property_name: str = None):
        if not property_name or property_name == "default":
            # Fallback to env variables
            return settings.MEWS_CLIENT_TOKEN, settings.MEWS_ACCESS_TOKEN
        
        # Fetch from DB
        response = self.supabase.table("property_api_settings").select("*").eq("property_name", property_name).execute()
        if not response.data:
            raise HTTPException(status_code=400, detail=f"API credentials not found for property: {property_name}")
        
        client_token = encryption_service.decrypt(response.data[0]["client_token"])
        access_token = encryption_service.decrypt(response.data[0]["access_token"])
        
        return client_token, access_token

    async def post(self, endpoint: str, data: dict = None, property_name: str = None):
        if data is None:
            data = {}
        
        # Get credentials
        client_token, access_token = self._get_credentials(property_name)

        # Inject standard authentication envelope
        payload = {
            "ClientToken": client_token,
            "AccessToken": access_token,
            "Client": self.client_name,
            **data
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}{endpoint}",
                json=payload,
                timeout=30.0
            )
            response.raise_for_status()
            return response.json()

mews_client = MewsClient()
