from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Literal
import uuid
from datetime import datetime, timezone, timedelta
import aiohttp
from bs4 import BeautifulSoup
import asyncio
import re

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============ MODELS ============

class PropertyCreate(BaseModel):
    url: Optional[str] = None
    nickname: Optional[str] = None
    address: Optional[str] = None
    suburb: Optional[str] = None
    state: Optional[str] = None
    postcode: Optional[str] = None
    property_type: Literal["investment", "ppor"] = "investment"
    current_value: Optional[float] = None
    # Loan details
    outstanding_loan: Optional[float] = None
    monthly_loan_repayment: Optional[float] = None
    # Rental details
    rent_amount: Optional[float] = None
    rent_frequency: Literal["weekly", "monthly"] = "monthly"
    # Expenses
    yearly_expenses: Optional[float] = None

class PropertyUpdate(BaseModel):
    nickname: Optional[str] = None
    address: Optional[str] = None
    suburb: Optional[str] = None
    state: Optional[str] = None
    postcode: Optional[str] = None
    property_type: Optional[Literal["investment", "ppor"]] = None
    current_value: Optional[float] = None
    outstanding_loan: Optional[float] = None
    monthly_loan_repayment: Optional[float] = None
    rent_amount: Optional[float] = None
    rent_frequency: Optional[Literal["weekly", "monthly"]] = None
    yearly_expenses: Optional[float] = None
    bedrooms: Optional[int] = None
    bathrooms: Optional[int] = None
    parking: Optional[int] = None

class Property(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    url: Optional[str] = None
    address: str = ""
    nickname: Optional[str] = None
    property_type: str = "investment"  # "investment" or "ppor"
    # Value tracking
    current_value: Optional[float] = None
    previous_value: Optional[float] = None
    daily_change: Optional[float] = None
    daily_change_percent: Optional[float] = None
    # Loan tracking
    outstanding_loan: Optional[float] = None
    monthly_loan_repayment: Optional[float] = None
    # Rental tracking
    rent_amount: Optional[float] = None
    rent_frequency: str = "monthly"  # "weekly" or "monthly"
    monthly_rent: Optional[float] = None  # Normalized to monthly
    # Expenses
    yearly_expenses: Optional[float] = None
    # Calculated fields
    net_value: Optional[float] = None
    annual_rental_income: Optional[float] = None
    annual_loan_repayments: Optional[float] = None
    yearly_cash_flow: Optional[float] = None
    yearly_shortage: Optional[float] = None
    # Property details
    image_url: Optional[str] = None
    bedrooms: Optional[int] = None
    bathrooms: Optional[int] = None
    parking: Optional[int] = None
    suburb: Optional[str] = None
    state: Optional[str] = None
    postcode: Optional[str] = None
    status: str = "active"
    last_updated: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PropertyHistory(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    property_id: str
    value: float
    loan: Optional[float] = None
    net_value: Optional[float] = None
    recorded_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PropertyResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    url: Optional[str] = None
    address: str = ""
    nickname: Optional[str] = None
    property_type: str = "investment"
    current_value: Optional[float] = None
    previous_value: Optional[float] = None
    daily_change: Optional[float] = None
    daily_change_percent: Optional[float] = None
    outstanding_loan: Optional[float] = None
    monthly_loan_repayment: Optional[float] = None
    rent_amount: Optional[float] = None
    rent_frequency: str = "monthly"
    monthly_rent: Optional[float] = None
    yearly_expenses: Optional[float] = None
    net_value: Optional[float] = None
    annual_rental_income: Optional[float] = None
    annual_loan_repayments: Optional[float] = None
    yearly_cash_flow: Optional[float] = None
    yearly_shortage: Optional[float] = None
    image_url: Optional[str] = None
    bedrooms: Optional[int] = None
    bathrooms: Optional[int] = None
    parking: Optional[int] = None
    suburb: Optional[str] = None
    state: Optional[str] = None
    postcode: Optional[str] = None
    status: str = "active"
    last_updated: str
    created_at: str

class HistoryResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    property_id: str
    value: float
    loan: Optional[float]
    net_value: Optional[float]
    recorded_at: str

# ============ HELPER FUNCTIONS ============

def calculate_property_financials(prop: dict) -> dict:
    """Calculate all financial metrics for a property"""
    # Normalize rent to monthly
    monthly_rent = None
    if prop.get("rent_amount"):
        if prop.get("rent_frequency") == "weekly":
            monthly_rent = prop["rent_amount"] * 52 / 12
        else:
            monthly_rent = prop["rent_amount"]
    
    # Calculate net value
    net_value = None
    if prop.get("current_value") is not None:
        loan = prop.get("outstanding_loan") or 0
        net_value = prop["current_value"] - loan
    
    # Calculate annual figures
    annual_rental_income = monthly_rent * 12 if monthly_rent else None
    annual_loan_repayments = prop.get("monthly_loan_repayment", 0) * 12 if prop.get("monthly_loan_repayment") else None
    yearly_expenses = prop.get("yearly_expenses") or 0
    
    # Calculate cash flow and shortage (only for investment properties)
    yearly_cash_flow = None
    yearly_shortage = None
    
    if prop.get("property_type") == "investment" and annual_rental_income is not None:
        total_outgoing = (annual_loan_repayments or 0) + yearly_expenses
        yearly_cash_flow = annual_rental_income - total_outgoing
        yearly_shortage = total_outgoing - annual_rental_income  # Positive = shortage, Negative = surplus
    
    return {
        "monthly_rent": monthly_rent,
        "net_value": net_value,
        "annual_rental_income": annual_rental_income,
        "annual_loan_repayments": annual_loan_repayments,
        "yearly_cash_flow": yearly_cash_flow,
        "yearly_shortage": yearly_shortage
    }

def parse_address_from_url(url: str) -> dict:
    """Parse property address from URL patterns"""
    data = {
        "address": "",
        "suburb": None,
        "state": None,
        "postcode": None
    }
    
    # New format: /state/suburb-postcode/street/number-pid-xxxxx/
    new_format = re.search(r'/([a-z]{2,3})/([a-z-]+)-(\d{4})/([a-z-]+)/(\d+[a-z]?)-pid-', url.lower())
    if new_format:
        state = new_format.group(1).upper()
        suburb = new_format.group(2).replace('-', ' ').title()
        postcode = new_format.group(3)
        street = new_format.group(4).replace('-', ' ').title()
        number = new_format.group(5)
        
        data["address"] = f"{number} {street}, {suburb} {state} {postcode}"
        data["suburb"] = suburb
        data["state"] = state
        data["postcode"] = postcode
        return data
    
    # Old format: /property/123-street-name-suburb-state-postcode/
    old_format = re.search(r'/property/([^/]+)', url)
    if old_format:
        address_slug = old_format.group(1)
        address_parts = address_slug.replace('-', ' ').title()
        data["address"] = address_parts
        
        location_match = re.search(r'(\w+)-(\w{2,3})-(\d{4})$', url.rstrip('/'))
        if location_match:
            data["suburb"] = location_match.group(1).title()
            data["state"] = location_match.group(2).upper()
            data["postcode"] = location_match.group(3)
    
    return data

async def scrape_property_data(url: str) -> dict:
    """Scrape property data from property.com.au"""
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-AU,en;q=0.9',
    }
    
    data = {
        "address": "",
        "current_value": None,
        "image_url": None,
        "suburb": None,
        "state": None,
        "postcode": None
    }
    
    # Extract address from URL (always works)
    url_data = parse_address_from_url(url)
    data.update(url_data)
    
    try:
        async with aiohttp.ClientSession() as session:
            await asyncio.sleep(1)
            async with session.get(url, headers=headers, timeout=30) as response:
                if response.status != 200:
                    return data
                
                html = await response.text()
                soup = BeautifulSoup(html, 'html.parser')
                
                og_title = soup.find('meta', property='og:title')
                if og_title and og_title.get('content'):
                    title = og_title['content'].split('|')[0].strip()
                    if title:
                        data["address"] = title
                
                og_image = soup.find('meta', property='og:image')
                if og_image and og_image.get('content'):
                    data["image_url"] = og_image['content']
                
                return data
                
    except Exception as e:
        logger.error(f"Error scraping {url}: {str(e)}")
        return data

# ============ API ROUTES ============

@api_router.get("/")
async def root():
    return {"message": "Property Management API"}

@api_router.post("/properties", response_model=PropertyResponse)
async def create_property(input: PropertyCreate):
    """Add a new property (via URL or manual entry)"""
    
    # Start with input data
    property_data = {
        "id": str(uuid.uuid4()),
        "url": input.url,
        "nickname": input.nickname,
        "address": input.address or "",
        "suburb": input.suburb,
        "state": input.state,
        "postcode": input.postcode,
        "property_type": input.property_type,
        "current_value": input.current_value,
        "previous_value": None,
        "daily_change": None,
        "daily_change_percent": None,
        "outstanding_loan": input.outstanding_loan,
        "monthly_loan_repayment": input.monthly_loan_repayment,
        "rent_amount": input.rent_amount,
        "rent_frequency": input.rent_frequency,
        "yearly_expenses": input.yearly_expenses,
        "image_url": None,
        "bedrooms": None,
        "bathrooms": None,
        "parking": None,
        "status": "active",
        "last_updated": datetime.now(timezone.utc).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    # If URL provided, try to parse address from it
    if input.url:
        url_data = parse_address_from_url(input.url)
        if url_data.get("address") and not input.address:
            property_data["address"] = url_data["address"]
        if url_data.get("suburb") and not input.suburb:
            property_data["suburb"] = url_data["suburb"]
        if url_data.get("state") and not input.state:
            property_data["state"] = url_data["state"]
        if url_data.get("postcode") and not input.postcode:
            property_data["postcode"] = url_data["postcode"]
    
    # Calculate financials
    financials = calculate_property_financials(property_data)
    property_data.update(financials)
    
    await db.properties.insert_one(property_data)
    
    # Record initial history if value provided
    if input.current_value:
        history = {
            "id": str(uuid.uuid4()),
            "property_id": property_data["id"],
            "value": input.current_value,
            "loan": input.outstanding_loan,
            "net_value": financials.get("net_value"),
            "recorded_at": datetime.now(timezone.utc).isoformat()
        }
        await db.property_history.insert_one(history)
    
    return PropertyResponse(**property_data)

@api_router.get("/properties", response_model=List[PropertyResponse])
async def get_properties(
    search: Optional[str] = None, 
    suburb: Optional[str] = None,
    property_type: Optional[str] = None
):
    """Get all properties with optional filters"""
    query = {}
    
    if search:
        query["$or"] = [
            {"address": {"$regex": search, "$options": "i"}},
            {"nickname": {"$regex": search, "$options": "i"}},
            {"suburb": {"$regex": search, "$options": "i"}}
        ]
    
    if suburb and suburb != "all":
        query["suburb"] = {"$regex": suburb, "$options": "i"}
    
    if property_type and property_type != "all":
        query["property_type"] = property_type
    
    properties = await db.properties.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return [PropertyResponse(**p) for p in properties]

@api_router.get("/properties/{property_id}", response_model=PropertyResponse)
async def get_property(property_id: str):
    """Get a single property by ID"""
    property = await db.properties.find_one({"id": property_id}, {"_id": 0})
    if not property:
        raise HTTPException(status_code=404, detail="Property not found")
    return PropertyResponse(**property)

@api_router.patch("/properties/{property_id}", response_model=PropertyResponse)
async def update_property(property_id: str, input: PropertyUpdate):
    """Update a property's details"""
    property = await db.properties.find_one({"id": property_id}, {"_id": 0})
    if not property:
        raise HTTPException(status_code=404, detail="Property not found")
    
    update_data = {k: v for k, v in input.model_dump().items() if v is not None}
    update_data["last_updated"] = datetime.now(timezone.utc).isoformat()
    
    # Track value changes for history
    old_value = property.get("current_value")
    new_value = update_data.get("current_value")
    
    if new_value and new_value != old_value:
        update_data["previous_value"] = old_value
        if old_value and old_value > 0:
            update_data["daily_change"] = new_value - old_value
            update_data["daily_change_percent"] = round(((new_value - old_value) / old_value) * 100, 2)
    
    # Merge with existing data for calculations
    merged = {**property, **update_data}
    financials = calculate_property_financials(merged)
    update_data.update(financials)
    
    await db.properties.update_one({"id": property_id}, {"$set": update_data})
    
    # Record history if value changed
    if new_value and new_value != old_value:
        history = {
            "id": str(uuid.uuid4()),
            "property_id": property_id,
            "value": new_value,
            "loan": update_data.get("outstanding_loan") or property.get("outstanding_loan"),
            "net_value": financials.get("net_value"),
            "recorded_at": datetime.now(timezone.utc).isoformat()
        }
        await db.property_history.insert_one(history)
    
    updated = await db.properties.find_one({"id": property_id}, {"_id": 0})
    return PropertyResponse(**updated)

@api_router.delete("/properties/{property_id}")
async def delete_property(property_id: str):
    """Remove a property"""
    result = await db.properties.delete_one({"id": property_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Property not found")
    
    await db.property_history.delete_many({"property_id": property_id})
    return {"message": "Property deleted successfully"}

@api_router.get("/properties/{property_id}/history", response_model=List[HistoryResponse])
async def get_property_history(property_id: str, days: int = 30):
    """Get historical values for a property"""
    property = await db.properties.find_one({"id": property_id}, {"_id": 0})
    if not property:
        raise HTTPException(status_code=404, detail="Property not found")
    
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    
    history = await db.property_history.find(
        {"property_id": property_id, "recorded_at": {"$gte": cutoff.isoformat()}},
        {"_id": 0}
    ).sort("recorded_at", 1).to_list(1000)
    
    return [HistoryResponse(**h) for h in history]

@api_router.get("/portfolio/stats")
async def get_portfolio_stats():
    """Get aggregated portfolio statistics
    - Value/Loans/Net: Include ALL properties (Investment + PPOR)
    - Rental/Expenses/Cash Flow: Investment properties ONLY
    """
    # Get ALL properties for value calculations
    all_properties = await db.properties.find({}, {"_id": 0}).to_list(1000)
    
    # Separate by type
    investment_properties = [p for p in all_properties if p.get("property_type") == "investment"]
    ppor_properties = [p for p in all_properties if p.get("property_type") == "ppor"]
    
    # VALUE/LOANS/NET - Include ALL properties
    total_value = sum(p.get("current_value") or 0 for p in all_properties)
    total_loans = sum(p.get("outstanding_loan") or 0 for p in all_properties)
    total_net_value = sum(p.get("net_value") or 0 for p in all_properties)
    
    # RENTAL/EXPENSES/CASH FLOW - Investment properties ONLY
    total_annual_rent = sum(p.get("annual_rental_income") or 0 for p in investment_properties)
    total_annual_expenses = sum(p.get("yearly_expenses") or 0 for p in investment_properties)
    total_annual_repayments = sum(p.get("annual_loan_repayments") or 0 for p in investment_properties)
    
    # Calculate overall shortage/surplus (Investment only)
    total_outgoing = total_annual_repayments + total_annual_expenses
    overall_cash_flow = total_annual_rent - total_outgoing
    overall_shortage = total_outgoing - total_annual_rent
    
    return {
        "total_properties": len(all_properties),
        "investment_count": len(investment_properties),
        "ppor_count": len(ppor_properties),
        # All properties
        "total_property_value": total_value,
        "total_outstanding_loans": total_loans,
        "total_net_value": total_net_value,
        # Investment only
        "total_annual_rental_income": total_annual_rent,
        "total_annual_expenses": total_annual_expenses,
        "total_annual_loan_repayments": total_annual_repayments,
        "overall_yearly_cash_flow": overall_cash_flow,
        "overall_yearly_shortage": overall_shortage,
        "is_cash_flow_positive": overall_cash_flow >= 0
    }

@api_router.get("/portfolio/history")
async def get_portfolio_history(days: int = 90):
    """Get historical portfolio values for charting (ALL properties)"""
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    
    # Get ALL property IDs (Investment + PPOR)
    all_props = await db.properties.find({}, {"id": 1, "_id": 0}).to_list(1000)
    prop_ids = [p["id"] for p in all_props]
    
    if not prop_ids:
        return []
    
    # Aggregate history by date
    pipeline = [
        {"$match": {
            "property_id": {"$in": prop_ids},
            "recorded_at": {"$gte": cutoff.isoformat()}
        }},
        {"$addFields": {
            "date": {"$substr": ["$recorded_at", 0, 10]}
        }},
        {"$group": {
            "_id": "$date",
            "total_value": {"$sum": "$value"},
            "total_loan": {"$sum": {"$ifNull": ["$loan", 0]}},
            "total_net": {"$sum": {"$ifNull": ["$net_value", 0]}}
        }},
        {"$sort": {"_id": 1}}
    ]
    
    result = await db.property_history.aggregate(pipeline).to_list(1000)
    
    return [{
        "date": r["_id"],
        "total_value": r["total_value"],
        "total_loan": r["total_loan"],
        "total_net": r["total_net"]
    } for r in result]

@api_router.post("/demo/seed")
async def seed_demo_data():
    """Seed demo data for testing"""
    demo_properties = [
        {
            "id": str(uuid.uuid4()),
            "url": "https://www.property.com.au/nsw/sydney-2000/george-st/123-pid-11111111/",
            "address": "123 George Street, Sydney NSW 2000",
            "nickname": "Sydney CBD Investment",
            "property_type": "investment",
            "current_value": 1250000,
            "previous_value": 1240000,
            "daily_change": 10000,
            "daily_change_percent": 0.81,
            "outstanding_loan": 800000,
            "monthly_loan_repayment": 4500,
            "rent_amount": 850,
            "rent_frequency": "weekly",
            "yearly_expenses": 12000,
            "image_url": "https://images.unsplash.com/photo-1758548157747-285c7012db5b?crop=entropy&cs=srgb&fm=jpg&q=85",
            "bedrooms": 2,
            "bathrooms": 2,
            "parking": 1,
            "suburb": "Sydney",
            "state": "NSW",
            "postcode": "2000",
            "status": "active",
        },
        {
            "id": str(uuid.uuid4()),
            "url": "https://www.property.com.au/vic/south-yarra-3141/chapel-st/45-pid-22222222/",
            "address": "45 Chapel Street, South Yarra VIC 3141",
            "nickname": "Melbourne Rental",
            "property_type": "investment",
            "current_value": 980000,
            "previous_value": 985000,
            "daily_change": -5000,
            "daily_change_percent": -0.51,
            "outstanding_loan": 650000,
            "monthly_loan_repayment": 3800,
            "rent_amount": 2800,
            "rent_frequency": "monthly",
            "yearly_expenses": 9500,
            "image_url": "https://images.unsplash.com/photo-1757439402190-99b73ac8e807?crop=entropy&cs=srgb&fm=jpg&q=85",
            "bedrooms": 3,
            "bathrooms": 1,
            "parking": 2,
            "suburb": "South Yarra",
            "state": "VIC",
            "postcode": "3141",
            "status": "active",
        },
        {
            "id": str(uuid.uuid4()),
            "url": "https://www.property.com.au/qld/fortitude-valley-4006/james-st/78-pid-33333333/",
            "address": "78 James Street, Fortitude Valley QLD 4006",
            "nickname": "Brisbane Unit",
            "property_type": "investment",
            "current_value": 720000,
            "previous_value": 715000,
            "daily_change": 5000,
            "daily_change_percent": 0.70,
            "outstanding_loan": 500000,
            "monthly_loan_repayment": 2900,
            "rent_amount": 550,
            "rent_frequency": "weekly",
            "yearly_expenses": 7500,
            "image_url": "https://images.unsplash.com/photo-1758548157275-d939cf0f0e32?crop=entropy&cs=srgb&fm=jpg&q=85",
            "bedrooms": 2,
            "bathrooms": 1,
            "parking": 1,
            "suburb": "Fortitude Valley",
            "state": "QLD",
            "postcode": "4006",
            "status": "active",
        },
        {
            "id": str(uuid.uuid4()),
            "url": None,
            "address": "15 Beach Road, Bondi NSW 2026",
            "nickname": "Our Family Home",
            "property_type": "ppor",
            "current_value": 2100000,
            "previous_value": 2080000,
            "daily_change": 20000,
            "daily_change_percent": 0.96,
            "outstanding_loan": 1200000,
            "monthly_loan_repayment": 6500,
            "rent_amount": None,
            "rent_frequency": "monthly",
            "yearly_expenses": 15000,
            "image_url": "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?crop=entropy&cs=srgb&fm=jpg&q=85",
            "bedrooms": 4,
            "bathrooms": 3,
            "parking": 2,
            "suburb": "Bondi",
            "state": "NSW",
            "postcode": "2026",
            "status": "active",
        }
    ]
    
    # Clear existing data
    await db.properties.delete_many({})
    await db.property_history.delete_many({})
    
    # Insert properties with calculated financials
    for prop in demo_properties:
        prop["last_updated"] = datetime.now(timezone.utc).isoformat()
        prop["created_at"] = datetime.now(timezone.utc).isoformat()
        
        financials = calculate_property_financials(prop)
        prop.update(financials)
        
        await db.properties.insert_one(prop)
        
        # Generate historical data (30 days)
        if prop["current_value"]:
            base_value = prop["current_value"]
            base_loan = prop.get("outstanding_loan") or 0
            
            for i in range(30, 0, -1):
                variance = (hash(f"{prop['id']}{i}") % 100 - 50) * 100
                value = base_value + variance + (i * 200)
                loan = base_loan - (i * 50)  # Loan slowly decreases
                
                history = {
                    "id": str(uuid.uuid4()),
                    "property_id": prop["id"],
                    "value": value,
                    "loan": loan,
                    "net_value": value - loan,
                    "recorded_at": (datetime.now(timezone.utc) - timedelta(days=i)).isoformat()
                }
                await db.property_history.insert_one(history)
    
    return {"message": f"Seeded {len(demo_properties)} demo properties with history"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
