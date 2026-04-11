import httpx
from app.config import settings

class MewsClient:
    def __init__(self):
        self.base_url = settings.MEWS_BASE_URL.rstrip("/")
        self.client_token = settings.MEWS_CLIENT_TOKEN
        self.access_token = settings.MEWS_ACCESS_TOKEN
        self.client_name = "NHGOne/1.0"

    async def post(self, endpoint: str, data: dict = None):
        if data is None:
            data = {}
        
        # Inject standard authentication envelope
        payload = {
            "ClientToken": self.client_token,
            "AccessToken": self.access_token,
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
