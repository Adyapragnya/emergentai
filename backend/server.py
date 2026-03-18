from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel
from typing import Optional
import uuid
from datetime import datetime, timezone, timedelta
import random

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

# Constants
PORTS = ["Mumbai", "Kandla", "Kochi", "Tuticorin", "Chennai", "Vizag", "Mundra"]
SERVICE_TYPES = ["LSA", "FFA", "NAVCOM"]

VESSEL_NAMES = [
    "MV Ocean Pride", "MV Jade Emperor", "MV Star Navigator",
    "MV Pearl Voyager", "MV Golden Horizon", "MV Sapphire Sea",
    "MV Iron Monarch", "MV Silver Dawn", "MV Crystal Wave",
    "MV Red Falcon", "MV Neptune's Grace", "MV Coral Trader",
    "MV Phoenix Rising", "MV Blue Marlin", "MV Pacific Champion",
    "MV Indian Express", "MV Emerald Coast", "MV Tiger Bay",
    "MV Monsoon Wind", "MV Dragon Star", "MV Arctic Venture",
    "MV Deccan Queen", "MV Malabar Spirit", "MV Konkan Explorer",
    "MV Gujarat Pride"
]

# Ship Managers with city office locations (day-to-day operators)
SHIP_MANAGERS = [
    "Anglo-Eastern Ship Management Hong Kong",
    "Anglo-Eastern Ship Management Mumbai",
    "Synergy Marine Singapore",
    "Synergy Marine Chennai",
    "Fleet Management Ltd Mumbai",
    "BSM Ship Management Mumbai",
    "V.Ships Dubai",
    "V.Ships Singapore",
    "Executive Ship Management Singapore",
    "Thome Ship Management Singapore",
    "Columbia Shipmanagement Limassol",
    "Wallem Shipmanagement Hong Kong",
]

# Ship Owners (asset-holding companies)
SHIP_OWNERS = [
    "HPCL",
    "Indian Oil Corporation",
    "GE Shipping",
    "Essar Shipping",
    "SCI India",
    "Reliance Industries",
    "Adani Logistics",
    "Eastern Bulk Carriers AS",
    "Pacific Basin Shipping",
    "Safe Bulkers Inc",
    "Tsakos Energy Navigation",
]

# Static lists for filter dropdowns (as requested by user)
FILTER_MANAGERS = [
    "Anglo-Eastern",
    "Synergy Marine",
    "Fleet Management Ltd",
    "BSM Mumbai",
    "GE Shipping",
    "SCI India",
    "Tolani Shipping",
    "Essar Shipping",
]

FILTER_OWNERS = [
    "HPCL",
    "Indian Oil",
    "GE Shipping",
    "Essar Shipping",
    "SCI India",
    "Reliance Industries",
    "Adani Ports",
]

VESSEL_TYPES = ["Bulk Carrier", "Product Tanker", "Chemical Tanker", "Container", "RORO", "General Cargo"]

# Service types mapping by vessel type for consistency
# Bulk Carrier: LSA, FFA (no NAVCOM typically)
# Tankers: FFA is critical, LSA
# RORO: LSA, FFA (no NAVCOM unless special)
# Container: All services
# General Cargo: All services
VESSEL_SERVICE_MAP = {
    "Bulk Carrier": ["LSA", "FFA"],
    "Product Tanker": ["FFA", "LSA"],
    "Chemical Tanker": ["FFA", "LSA"],
    "Container": ["LSA", "FFA", "NAVCOM"],
    "RORO": ["LSA", "FFA"],
    "General Cargo": ["LSA", "FFA", "NAVCOM"],
}

NEXT_PORTS = [
    {"name": "Singapore", "code": "SGP", "covered": False},
    {"name": "Colombo", "code": "LKA", "covered": False},
    {"name": "Dubai", "code": "ARE", "covered": False},
    {"name": "Shanghai", "code": "CHN", "covered": False},
    {"name": "Rotterdam", "code": "NLD", "covered": False},
    {"name": "Hamburg", "code": "DEU", "covered": False},
    {"name": "Fujairah", "code": "ARE", "covered": False},
    {"name": "Yokohama", "code": "JPN", "covered": False},
    {"name": "Mumbai", "code": "INBOM", "covered": True},
    {"name": "Kandla", "code": "INKDL", "covered": True},
    {"name": "Kochi", "code": "INCOK", "covered": True},
    {"name": "Chennai", "code": "INMAA", "covered": True},
    {"name": "Vizag", "code": "INVTZ", "covered": True},
    {"name": "Tuticorin", "code": "INTUT", "covered": True},
    {"name": "Mundra", "code": "INMDR", "covered": True},
]


# Request models
class NoteCreate(BaseModel):
    text: str

class StatusUpdate(BaseModel):
    status: str

class AssignData(BaseModel):
    engineer: str = "Engineer Team"


# Helpers
def build_query(port: Optional[str] = None, manager: Optional[str] = None, owner: Optional[str] = None, cert_status: Optional[str] = None) -> dict:
    q = {}
    if port and port != "All":
        ports = [p.strip() for p in port.split(",")]
        q["port"] = ports[0] if len(ports) == 1 else {"$in": ports}
    if manager and manager != "All":
        q["ship_manager"] = manager
    if owner and owner != "All":
        q["ship_owner"] = owner
    if cert_status and cert_status != "All":
        # Filter by certificate status (expired, critical, warning)
        q["certificates.status"] = cert_status
    return q


def generate_checklist(service_type):
    checklists = {
        "LSA": [
            {"item": "Lifeboat inspection", "completed": False},
            {"item": "Life raft servicing", "completed": False},
            {"item": "Life jacket count & condition", "completed": False},
            {"item": "EPIRB battery test", "completed": False},
            {"item": "Pyrotechnics expiry check", "completed": False},
        ],
        "FFA": [
            {"item": "Fire extinguisher inspection", "completed": False},
            {"item": "Fire hose pressure test", "completed": False},
            {"item": "Fixed CO2 system check", "completed": False},
            {"item": "Fire detection alarm test", "completed": False},
            {"item": "Breathing apparatus service", "completed": False},
        ],
        "NAVCOM": [
            {"item": "Radar calibration", "completed": False},
            {"item": "GPS accuracy verification", "completed": False},
            {"item": "VHF radio range test", "completed": False},
            {"item": "GMDSS equipment check", "completed": False},
            {"item": "AIS transponder verification", "completed": False},
        ],
    }
    return checklists.get(service_type, [])


def generate_seed_data():
    now = datetime.now(timezone.utc)
    vessels, jobs, quotes, leads, notifications = [], [], [], [], []

    for i, name in enumerate(VESSEL_NAMES):
        vessel_id = str(uuid.uuid4())
        port = PORTS[i % len(PORTS)]

        r = random.random()
        if r < 0.25:
            eta_offset = random.uniform(-48, -2)
        elif r < 0.5:
            eta_offset = random.uniform(-2, 12)
        else:
            eta_offset = random.uniform(12, 168)

        eta = now + timedelta(hours=eta_offset)
        etd = eta + timedelta(hours=random.uniform(18, 72))

        # Pick vessel type first, then get consistent services
        vessel_type = random.choice(VESSEL_TYPES)
        available_services = VESSEL_SERVICE_MAP.get(vessel_type, SERVICE_TYPES)
        num_services = random.randint(1, len(available_services))
        services = random.sample(available_services, num_services)

        certs = []
        for svc in services:
            days_remaining = random.choice([-5, -2, 0, 1, 2, 3, 5, 7, 10, 14, 20, 30, 45, 60, 90])
            expiry = now + timedelta(days=days_remaining)
            if days_remaining <= 0:
                status = "expired"
            elif days_remaining <= 7:
                status = "critical"
            elif days_remaining <= 30:
                status = "warning"
            else:
                status = "safe"
            certs.append({
                "type": svc,
                "expiry_date": expiry.isoformat(),
                "days_remaining": days_remaining,
                "status": status,
            })

        relationship = "existing" if random.random() < 0.7 else "new_lead"
        call_status = random.choice(["pending", "pending", "called", "overdue", "overdue"])
        berth = f"B-{random.randint(1, 25):02d}"
        imo = f"9{random.randint(100000, 999999)}"
        gt = random.randint(5000, 80000)
        dwt = random.randint(gt, gt + 50000)
        year_built = random.randint(1998, 2023)
        next_port = random.choice(NEXT_PORTS)

        # Ensure owner and manager are always different
        ship_manager = SHIP_MANAGERS[i % len(SHIP_MANAGERS)]
        ship_owner = SHIP_OWNERS[(i + 3) % len(SHIP_OWNERS)]  # Offset to ensure difference

        vessel = {
            "id": vessel_id, "name": name, "imo_number": imo,
            "ship_manager": ship_manager,
            "ship_owner": ship_owner,
            "port": port, "eta": eta.isoformat(), "etd": etd.isoformat(),
            "berth": berth, "service_types": services, "certificates": certs,
            "relationship": relationship, "call_status": call_status,
            "vessel_type": vessel_type, "gross_tonnage": gt,
            "dwt": dwt, "year_built": year_built, "next_port": next_port,
            "assigned_engineer": None, "notes": [],
            "created_at": now.isoformat(),
        }
        vessels.append(vessel)

        if random.random() < 0.7:
            for svc in services:
                cert = next((c for c in certs if c["type"] == svc), None)
                jobs.append({
                    "id": str(uuid.uuid4()), "vessel_id": vessel_id,
                    "vessel_name": name, "ship_manager": vessel["ship_manager"],
                    "ship_owner": vessel["ship_owner"],
                    "vessel_type": vessel["vessel_type"],
                    "next_port": vessel["next_port"],
                    "port": port, "berth": berth,
                    "eta": eta.isoformat(), "etd": etd.isoformat(),
                    "service_type": svc,
                    "cert_expiry_date": cert["expiry_date"] if cert else None,
                    "cert_days_remaining": cert["days_remaining"] if cert else None,
                    "cert_status": cert["status"] if cert else "safe",
                    "status": random.choice(["pending", "pending", "acknowledged", "in_progress"]),
                    "checklist": generate_checklist(svc),
                    "created_at": now.isoformat(),
                })

        if random.random() < 0.4:
            quotes.append({
                "id": str(uuid.uuid4()), "vessel_id": vessel_id,
                "vessel_name": name, "ship_manager": vessel["ship_manager"],
                "ship_owner": vessel["ship_owner"],
                "port": port, "service_types": services,
                "amount": random.randint(50, 500) * 1000, "currency": "INR",
                "status": random.choice(["open", "open", "sent"]),
                "created_at": (now - timedelta(days=random.randint(0, 5))).isoformat(),
            })

        for cert in certs:
            if cert["status"] in ["critical", "expired"]:
                msg = f"{name}: {cert['type']} cert {'EXPIRED' if cert['status'] == 'expired' else 'expiring in ' + str(cert['days_remaining']) + 'd'}"
                notifications.append({
                    "id": str(uuid.uuid4()), "type": "cert_expiry",
                    "message": msg, "vessel_name": name, "port": port,
                    "severity": cert["status"], "read": False,
                    "created_at": now.isoformat(),
                })

    lead_names = ["MV Atlantic Spirit", "MV Bay Runner", "MV Coral Sea", "MV Delta Force", "MV Echo Bay"]
    for ln in lead_names:
        leads.append({
            "id": str(uuid.uuid4()), "vessel_name": ln,
            "ship_manager": random.choice(SHIP_MANAGERS),
            "ship_owner": random.choice(SHIP_OWNERS),
            "port": random.choice(PORTS),
            "eta": (now + timedelta(days=random.randint(1, 7))).isoformat(),
            "service_types": random.sample(SERVICE_TYPES, random.randint(1, 2)),
            "source": random.choice(["Port Authority", "Agent Referral", "Website Inquiry", "Trade Show"]),
            "created_at": (now - timedelta(days=random.randint(0, 3))).isoformat(),
        })

    return vessels, jobs, quotes, leads, notifications


# Startup
@app.on_event("startup")
async def startup_event():
    count = await db.vessels.count_documents({})
    if count == 0:
        vessels, jobs, quotes, leads, notifications = generate_seed_data()
        if vessels:
            await db.vessels.insert_many(vessels)
        if jobs:
            await db.jobs.insert_many(jobs)
        if quotes:
            await db.quotes.insert_many(quotes)
        if leads:
            await db.leads.insert_many(leads)
        if notifications:
            await db.notifications.insert_many(notifications)
        logger.info(f"Seeded: {len(vessels)} vessels, {len(jobs)} jobs, {len(quotes)} quotes, {len(leads)} leads")


# Routes
@api_router.get("/")
async def root():
    return {"message": "Ch16.ai Marine Intelligence API"}


@api_router.get("/ports")
async def get_ports():
    return {"ports": PORTS}


@api_router.get("/filters")
async def get_filters():
    # Return the static filter lists as requested
    return {"managers": FILTER_MANAGERS, "owners": FILTER_OWNERS}


@api_router.get("/sales/port-counts")
async def get_port_counts():
    counts = {}
    for port in PORTS:
        counts[port] = await db.vessels.count_documents({"port": port})
    return counts


@api_router.post("/seed")
async def seed():
    await db.vessels.drop()
    await db.jobs.drop()
    await db.quotes.drop()
    await db.leads.drop()
    await db.notifications.drop()
    vessels, jobs, quotes, leads, notifications = generate_seed_data()
    if vessels:
        await db.vessels.insert_many(vessels)
    if jobs:
        await db.jobs.insert_many(jobs)
    if quotes:
        await db.quotes.insert_many(quotes)
    if leads:
        await db.leads.insert_many(leads)
    if notifications:
        await db.notifications.insert_many(notifications)
    return {"message": "Data seeded", "counts": {
        "vessels": len(vessels), "jobs": len(jobs),
        "quotes": len(quotes), "leads": len(leads),
    }}


# Sales endpoints
@api_router.get("/sales/vessels")
async def get_sales_vessels(port: Optional[str] = None, tab: str = "arriving", manager: Optional[str] = None, owner: Optional[str] = None, cert_status: Optional[str] = None):
    pf = build_query(port, manager, owner, cert_status)
    if tab == "overdue":
        pf["call_status"] = "overdue"
    vessels = await db.vessels.find(pf, {"_id": 0}).sort("eta", 1).to_list(100)
    return vessels


@api_router.get("/sales/quotes")
async def get_sales_quotes(port: Optional[str] = None, manager: Optional[str] = None, owner: Optional[str] = None, cert_status: Optional[str] = None):
    pf = build_query(port, manager, owner, cert_status)
    return await db.quotes.find(pf, {"_id": 0}).sort("created_at", -1).to_list(100)


@api_router.get("/sales/leads")
async def get_sales_leads(port: Optional[str] = None, manager: Optional[str] = None, owner: Optional[str] = None, cert_status: Optional[str] = None):
    pf = build_query(port, manager, owner, cert_status)
    return await db.leads.find(pf, {"_id": 0}).sort("created_at", -1).to_list(100)


@api_router.get("/sales/stats")
async def get_sales_stats(port: Optional[str] = None, manager: Optional[str] = None, owner: Optional[str] = None, cert_status: Optional[str] = None):
    pf = build_query(port, manager, owner, cert_status)
    total = await db.vessels.count_documents(pf)
    expiring = await db.vessels.count_documents({**pf, "certificates.status": {"$in": ["critical", "expired"]}})
    overdue = await db.vessels.count_documents({**pf, "call_status": "overdue"})
    open_quotes = await db.quotes.count_documents({**pf, "status": {"$in": ["open", "sent"]}})
    new_leads = await db.leads.count_documents(pf)
    # Add cert status counts for the filter UI
    expired_count = await db.vessels.count_documents({**build_query(port, manager, owner), "certificates.status": "expired"})
    critical_count = await db.vessels.count_documents({**build_query(port, manager, owner), "certificates.status": "critical"})
    warning_count = await db.vessels.count_documents({**build_query(port, manager, owner), "certificates.status": "warning"})
    return {
        "arriving_this_week": total, "certificates_expiring": expiring,
        "overdue_calls": overdue, "open_quotes": open_quotes, "new_leads": new_leads,
        "cert_expired": expired_count, "cert_critical": critical_count, "cert_warning": warning_count,
    }


@api_router.post("/sales/vessels/{vessel_id}/call")
async def mark_called(vessel_id: str):
    result = await db.vessels.update_one({"id": vessel_id}, {"$set": {"call_status": "called"}})
    if result.modified_count == 0:
        raise HTTPException(404, "Vessel not found")
    vessel = await db.vessels.find_one({"id": vessel_id}, {"_id": 0})
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()), "type": "call_made",
        "message": f"Call logged: {vessel['name']} at {vessel['port']}",
        "vessel_name": vessel["name"], "port": vessel["port"],
        "severity": "info", "read": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"message": "Call logged"}


@api_router.post("/sales/vessels/{vessel_id}/quote")
async def create_quote(vessel_id: str):
    vessel = await db.vessels.find_one({"id": vessel_id}, {"_id": 0})
    if not vessel:
        raise HTTPException(404, "Vessel not found")
    quote = {
        "id": str(uuid.uuid4()), "vessel_id": vessel_id,
        "vessel_name": vessel["name"], "ship_manager": vessel["ship_manager"],
        "port": vessel["port"], "service_types": vessel["service_types"],
        "amount": random.randint(50, 500) * 1000, "currency": "INR",
        "status": "open", "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.quotes.insert_one(quote)
    return {"message": "Quote created", "quote_id": quote["id"]}


@api_router.post("/sales/vessels/{vessel_id}/assign")
async def assign_engineer(vessel_id: str, data: AssignData):
    result = await db.vessels.update_one({"id": vessel_id}, {"$set": {"assigned_engineer": data.engineer}})
    if result.modified_count == 0:
        raise HTTPException(404, "Vessel not found")
    return {"message": "Engineer assigned"}


@api_router.post("/sales/vessels/{vessel_id}/note")
async def add_note(vessel_id: str, data: NoteCreate):
    note = {"id": str(uuid.uuid4()), "text": data.text, "created_at": datetime.now(timezone.utc).isoformat()}
    result = await db.vessels.update_one({"id": vessel_id}, {"$push": {"notes": note}})
    if result.modified_count == 0:
        raise HTTPException(404, "Vessel not found")
    return {"message": "Note added"}


# Ops endpoints
@api_router.get("/ops/jobs")
async def get_ops_jobs(port: Optional[str] = None, manager: Optional[str] = None, owner: Optional[str] = None):
    pf = build_query(port, manager, owner)
    return await db.jobs.find(pf, {"_id": 0}).sort("eta", 1).to_list(100)


@api_router.put("/ops/jobs/{job_id}/status")
async def update_job_status(job_id: str, data: StatusUpdate):
    valid = ["pending", "acknowledged", "in_progress", "completed", "flagged"]
    if data.status not in valid:
        raise HTTPException(400, f"Invalid status. Must be one of: {valid}")
    result = await db.jobs.update_one({"id": job_id}, {"$set": {"status": data.status}})
    if result.modified_count == 0:
        raise HTTPException(404, "Job not found")
    job = await db.jobs.find_one({"id": job_id}, {"_id": 0})
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()), "type": "job_update",
        "message": f"{job['vessel_name']} - {job['service_type']}: {data.status}",
        "vessel_name": job["vessel_name"], "port": job["port"],
        "severity": "critical" if data.status == "flagged" else "info",
        "read": False, "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"message": f"Status updated to {data.status}", "job": job}


@api_router.get("/ops/feed")
async def get_vessel_feed(port: Optional[str] = None, manager: Optional[str] = None, owner: Optional[str] = None):
    pf = build_query(port, manager, owner)
    vessels = await db.vessels.find(pf, {"_id": 0}).sort("eta", 1).to_list(100)
    for v in vessels:
        job_count = await db.jobs.count_documents({"vessel_id": v["id"]})
        v["has_jobs"] = job_count > 0
    return vessels


@api_router.get("/ops/certificates")
async def get_expiring_certs(port: Optional[str] = None, manager: Optional[str] = None, owner: Optional[str] = None):
    pf = build_query(port, manager, owner)
    pf["certificates.status"] = {"$in": ["critical", "expired", "warning"]}
    vessels = await db.vessels.find(pf, {"_id": 0}).to_list(100)
    result = []
    for v in vessels:
        for cert in v.get("certificates", []):
            if cert["status"] in ["critical", "expired", "warning"]:
                result.append({
                    "vessel_name": v["name"], "vessel_id": v["id"],
                    "port": v["port"], "cert_type": cert["type"],
                    "expiry_date": cert["expiry_date"],
                    "days_remaining": cert["days_remaining"],
                    "status": cert["status"],
                })
    result.sort(key=lambda x: x["days_remaining"])
    return result


@api_router.get("/ops/stats")
async def get_ops_stats(port: Optional[str] = None, manager: Optional[str] = None, owner: Optional[str] = None):
    pf = build_query(port, manager, owner)
    total = await db.jobs.count_documents(pf)
    pending = await db.jobs.count_documents({**pf, "status": "pending"})
    in_progress = await db.jobs.count_documents({**pf, "status": "in_progress"})
    completed = await db.jobs.count_documents({**pf, "status": "completed"})
    flagged = await db.jobs.count_documents({**pf, "status": "flagged"})
    cert_pf = build_query(port, manager, owner)
    cert_pf["certificates.status"] = {"$in": ["critical", "expired"]}
    urgent = await db.vessels.count_documents(cert_pf)
    return {
        "total_jobs": total, "pending": pending, "in_progress": in_progress,
        "completed": completed, "flagged": flagged, "urgent_certificates": urgent,
    }


# Notifications
@api_router.get("/notifications")
async def get_notifications():
    return await db.notifications.find({}, {"_id": 0}).sort("created_at", -1).to_list(50)


@api_router.put("/notifications/{notif_id}/read")
async def mark_read(notif_id: str):
    await db.notifications.update_one({"id": notif_id}, {"$set": {"read": True}})
    return {"message": "Marked as read"}


# Include router and middleware
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
