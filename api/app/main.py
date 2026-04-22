from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.services.mews_client import mews_client
from app.routers import reservations, members, payments, admin
from app.services.sync_service import sync_service
from app.services.encryption import encryption_service
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from zoneinfo import ZoneInfo
import traceback
from datetime import datetime

app = FastAPI(title="NHGOne API")

# Configure scheduler with Asia/Bangkok timezone
scheduler = AsyncIOScheduler(timezone=ZoneInfo("Asia/Bangkok"))

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
app.include_router(admin.router)

async def daily_auto_sync():
    """
    Automated job to fetch and store Mews reservations.
    Now dynamically checks which properties are scheduled for the current minute.
    """
    now = datetime.now(ZoneInfo("Asia/Bangkok"))
    current_hour = now.hour
    current_minute = now.minute
    
    print(f"[{now.isoformat()}] Checking for scheduled syncs at {current_hour:02d}:{current_minute:02d}...")
    
    if not sync_service.supabase:
        print(f"[{now.isoformat()}] [ERROR] Supabase client not initialized. Skipping automated sync.")
        return
        
    try:
        # 1. Fetch properties that are enabled and scheduled for this exact minute
        props_res = sync_service.supabase.table("property_api_settings") \
            .select("property_name, sync_hour, sync_minute") \
            .eq("sync_enabled", True) \
            .eq("sync_hour", current_hour) \
            .eq("sync_minute", current_minute) \
            .execute()
            
        properties = [p["property_name"] for p in props_res.data]
        
        if not properties:
            return

        print(f"Found {len(properties)} properties scheduled for sync: {properties}")
        
        # 2. Sync for each scheduled property
        for prop in properties:
            try:
                print(f"Starting scheduled sync for property: {prop}")
                
                # --- A. Sync Reservations ---
                # We use yesterday as default range for auto-sync in get_mapped_reservations
                res_result = await sync_service.get_mapped_reservations(property_name=prop)
                res_batch = []
                for r in res_result.get("data", []):
                    m_id = r.get("Identifier")
                    if m_id:
                        res_batch.append({
                            "mews_id": m_id,
                            "property": prop,
                            "data": encryption_service.encrypt_data(r)
                        })
                
                if res_batch:
                    sync_service.supabase.table("reservations_sync").upsert(res_batch).execute()
                    print(f"Successfully synced {len(res_batch)} reservations for {prop}")
                
                # --- B. Sync Members (Arrival Based) ---
                mem_result = await sync_service.get_mapped_members(property_name=prop)
                mem_batch = []
                for m in mem_result:
                    m_id = m.get("Identifier")
                    if m_id:
                        mem_batch.append({
                            "mews_id": m_id,
                            "property": prop,
                            "data": encryption_service.encrypt_data(m)
                        })
                
                if mem_batch:
                    sync_service.supabase.table("members_sync").upsert(mem_batch).execute()
                    print(f"Successfully synced {len(mem_batch)} members for {prop}")

                # Log overall success
                total_synced = len(res_batch) + len(mem_batch)
                sync_service.supabase.table("sync_logs").insert({
                    "property": prop,
                    "status": "success",
                    "records_synced": total_synced,
                    "message": f"Successfully synced {len(res_batch)} reservations and {len(mem_batch)} members"
                }).execute()
                    
            except Exception as prop_err:
                sync_service.supabase.table("sync_logs").insert({
                    "property": prop,
                    "status": "error",
                    "records_synced": 0,
                    "message": str(prop_err)
                }).execute()
                print(f"Error syncing {prop}: {str(prop_err)}")
                
    except Exception as e:
        print(f"Error in automated sync check: {str(e)}")
        traceback.print_exc()

@app.on_event("startup")
async def start_scheduler():
    if not sync_service.supabase:
        print("[CRITICAL] Cannot start scheduler: Supabase credentials missing or invalid.")
        return

    # Run the check job every minute
    scheduler.add_job(daily_auto_sync, 'cron', second=0)
    scheduler.start()
    print("Scheduler initialized with Asia/Bangkok timezone and 1-minute interval check.")

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
