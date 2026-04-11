from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.services.mews_client import mews_client
from app.routers import reservations, members, payments
from app.services.sync_service import sync_service

app = FastAPI(title="NHGOne API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(reservations.router)
app.include_router(members.router)
app.include_router(payments.router)

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "NHGOne"}

@app.get("/stats")
async def get_stats():
    """
    Get summary stats from Supabase.
    """
    try:
        if not sync_service.supabase:
            return {"status": "error", "message": "Supabase not connected"}
        
        res_count = sync_service.supabase.table("reservations").select("id", count="exact").execute().count
        mem_count = sync_service.supabase.table("members").select("id", count="exact").execute().count
        pay_count = sync_service.supabase.table("payments").select("id", count="exact").execute().count
        
        return {
            "status": "success",
            "data": {
                "reservations": res_count or 0,
                "members": mem_count or 0,
                "payments": pay_count or 0
            }
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/")
async def root():
    return {"message": "Welcome to NHGOne API"}

@app.get("/test-mews")
async def test_mews():
    try:
        # Simple call to /api/services/getAll as a smoke test
        # Note: In production environment this might return different services
        response = await mews_client.post("/api/services/getAll", {
            "Limitation": {"Count": 1}
        })
        return {"status": "success", "data": response}
    except Exception as e:
        return {"status": "error", "message": str(e)}
