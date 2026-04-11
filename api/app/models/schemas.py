from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

# --- MEWS API Schemas ---

class MewsLimitation(BaseModel):
    Count: Optional[int] = 100
    Cursor: Optional[str] = None

class ReservationsRequest(BaseModel):
    StartUtc: Optional[str] = None
    EndUtc: Optional[str] = None
    States: Optional[List[str]] = ["Confirmed", "Started", "Processed"]
    Extent: Optional[dict] = {"Reservations": True, "ReservationGroups": True, "Customers": True}
    Cursor: Optional[str] = None
    Limitation: Optional[MewsLimitation] = MewsLimitation()

class Customer(BaseModel):
    Id: str
    FirstName: Optional[str] = None
    LastName: Optional[str] = None
    Email: Optional[str] = None
    Phone: Optional[str] = None

class Reservation(BaseModel):
    Id: str
    CustomerId: str
    StartUtc: str
    EndUtc: str
    Status: str
    # Add other fields as needed based on MEWS API response

class ReservationsResponse(BaseModel):
    Reservations: List[Reservation]
    Customers: Optional[List[Customer]] = []
    Cursor: Optional[str] = None

# --- Internal API Schemas (Transformed for Frontend) ---

class ReservationUI(BaseModel):
    id: str
    guest_name: str
    status: str
    check_in: str
    check_out: str
    mews_id: str
