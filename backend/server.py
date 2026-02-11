from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
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
    url: str
    nickname: Optional[str] = None

class Property(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    url: str
    address: str = ""
    nickname: Optional[str] = None
    current_value: Optional[float] = None
    previous_value: Optional[float] = None
    daily_change: Optional[float] = None
    daily_change_percent: Optional[float] = None
    image_url: Optional[str] = None
    bedrooms: Optional[int] = None
    bathrooms: Optional[int] = None
    parking: Optional[int] = None
    property_type: Optional[str] = None
    suburb: Optional[str] = None
    state: Optional[str] = None
    postcode: Optional[str] = None
    status: str = "pending"
    last_updated: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PropertyHistory(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    property_id: str
    value: float
    recorded_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PropertyResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    url: str
    address: str
    nickname: Optional[str]
    current_value: Optional[float]
    previous_value: Optional[float]
    daily_change: Optional[float]
    daily_change_percent: Optional[float]
    image_url: Optional[str]
    bedrooms: Optional[int]
    bathrooms: Optional[int]
    parking: Optional[int]
    property_type: Optional[str]
    suburb: Optional[str]
    state: Optional[str]
    postcode: Optional[str]
    status: str
    last_updated: str
    created_at: str

class HistoryResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    property_id: str
    value: float
    recorded_at: str

# ============ SCRAPING ============

def parse_address_from_url(url: str) -> dict:
    """Parse property address from URL patterns"""
    data = {
        "address": "",
        "suburb": None,
        "state": None,
        "postcode": None
    }
    
    # New format: /state/suburb-postcode/street/number-pid-xxxxx/
    # Example: /nsw/marsden-park-2765/pratia-cres/46-pid-20583686/
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
        
        # Try to extract location from end of URL
        location_match = re.search(r'(\w+)-(\w{2,3})-(\d{4})$', url.rstrip('/'))
        if location_match:
            data["suburb"] = location_match.group(1).title()
            data["state"] = location_match.group(2).upper()
            data["postcode"] = location_match.group(3)
    
    return data

async def scrape_property_data(url: str) -> dict:
    """Scrape property data from property.com.au"""
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-AU,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Sec-Ch-Ua': '"Chromium";v="122", "Google Chrome";v="122"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"macOS"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
    }
    
    # First, parse what we can from the URL
    data = {
        "address": "",
        "current_value": None,
        "image_url": None,
        "bedrooms": None,
        "bathrooms": None,
        "parking": None,
        "property_type": None,
        "suburb": None,
        "state": None,
        "postcode": None
    }
    
    # Extract address from URL (this always works)
    url_data = parse_address_from_url(url)
    data.update(url_data)
    
    # Try to scrape additional data
    try:
        async with aiohttp.ClientSession() as session:
            await asyncio.sleep(1)  # Rate limiting delay
            async with session.get(url, headers=headers, timeout=30) as response:
                if response.status == 429:
                    logger.warning(f"Rate limited for {url}")
                    # Return URL-parsed data instead of error
                    return data
                    
                if response.status != 200:
                    logger.warning(f"Failed to fetch {url}: Status {response.status}")
                    return data  # Return URL-parsed data
                
                html = await response.text()
                soup = BeautifulSoup(html, 'html.parser')
                
                # Try to extract from meta tags
                og_title = soup.find('meta', property='og:title')
                if og_title and og_title.get('content'):
                    title_content = og_title['content'].split('|')[0].strip()
                    if title_content:
                        data["address"] = title_content
                
                # Try to extract image
                og_image = soup.find('meta', property='og:image')
                if og_image and og_image.get('content'):
                    data["image_url"] = og_image['content']
                
                # Try to find property value estimate
                value_patterns = [
                    r'\$[\d,]+(?:\.\d{2})?',
                    r'[\d,]+(?:\.\d{2})?\s*(?:million|m)',
                ]
                
                for script in soup.find_all('script'):
                    text = script.string or ""
                    for pattern in value_patterns:
                        match = re.search(pattern, text, re.IGNORECASE)
                        if match:
                            value_str = match.group()
                            value = parse_property_value(value_str)
                            if value and value > 100000:
                                data["current_value"] = value
                                break
                
                return data
                
    except asyncio.TimeoutError:
        logger.error(f"Timeout scraping {url}")
        return {"error": "Timeout"}
    except Exception as e:
        logger.error(f"Error scraping {url}: {str(e)}")
        return {"error": str(e)}

def parse_property_value(value_str: str) -> Optional[float]:
    """Parse property value string to float"""
    if not value_str:
        return None
    
    # Remove $ and commas
    clean = re.sub(r'[$,\s]', '', value_str.lower())
    
    # Handle millions
    if 'm' in clean or 'million' in clean:
        clean = re.sub(r'[a-zA-Z]', '', clean)
        try:
            return float(clean) * 1000000
        except ValueError:
            return None
    
    try:
        return float(clean)
    except ValueError:
        return None

# ============ API ROUTES ============

@api_router.get("/")
async def root():
    return {"message": "Property Value Tracker API"}

@api_router.post("/properties", response_model=PropertyResponse, status_code=201)
async def create_property(input: PropertyCreate):
    """Add a new property to track"""
    # Validate URL
    if not input.url.startswith('http'):
        raise HTTPException(status_code=400, detail="Invalid URL format")
    
    # Check if property already exists
    existing = await db.properties.find_one({"url": input.url}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Property already being tracked")
    
    # Create property record
    property_obj = Property(
        url=input.url,
        nickname=input.nickname,
        status="pending"
    )
    
    doc = property_obj.model_dump()
    doc['last_updated'] = doc['last_updated'].isoformat()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.properties.insert_one(doc)
    
    # Trigger initial scrape in background
    asyncio.create_task(update_single_property(property_obj.id))
    
    return PropertyResponse(**doc)

@api_router.get("/properties", response_model=List[PropertyResponse])
async def get_properties(search: Optional[str] = None, suburb: Optional[str] = None):
    """Get all tracked properties with optional filters"""
    query = {}
    
    if search:
        query["$or"] = [
            {"address": {"$regex": search, "$options": "i"}},
            {"nickname": {"$regex": search, "$options": "i"}},
            {"suburb": {"$regex": search, "$options": "i"}}
        ]
    
    if suburb:
        query["suburb"] = {"$regex": suburb, "$options": "i"}
    
    properties = await db.properties.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return [PropertyResponse(**p) for p in properties]

@api_router.get("/properties/{property_id}", response_model=PropertyResponse)
async def get_property(property_id: str):
    """Get a single property by ID"""
    property = await db.properties.find_one({"id": property_id}, {"_id": 0})
    if not property:
        raise HTTPException(status_code=404, detail="Property not found")
    return PropertyResponse(**property)

@api_router.delete("/properties/{property_id}")
async def delete_property(property_id: str):
    """Remove a property from tracking"""
    result = await db.properties.delete_one({"id": property_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Property not found")
    
    # Also delete history
    await db.property_history.delete_many({"property_id": property_id})
    
    return {"message": "Property deleted successfully"}

@api_router.get("/properties/{property_id}/history", response_model=List[HistoryResponse])
async def get_property_history(property_id: str, days: int = 30):
    """Get historical values for a property"""
    # Verify property exists
    property = await db.properties.find_one({"id": property_id}, {"_id": 0})
    if not property:
        raise HTTPException(status_code=404, detail="Property not found")
    
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    
    history = await db.property_history.find(
        {"property_id": property_id, "recorded_at": {"$gte": cutoff.isoformat()}},
        {"_id": 0}
    ).sort("recorded_at", 1).to_list(1000)
    
    return [HistoryResponse(**h) for h in history]

@api_router.post("/properties/{property_id}/refresh")
async def refresh_property(property_id: str):
    """Manually trigger a refresh for a property"""
    property = await db.properties.find_one({"id": property_id}, {"_id": 0})
    if not property:
        raise HTTPException(status_code=404, detail="Property not found")
    
    await update_single_property(property_id)
    
    updated = await db.properties.find_one({"id": property_id}, {"_id": 0})
    return PropertyResponse(**updated)

@api_router.get("/stats")
async def get_stats():
    """Get dashboard statistics"""
    total = await db.properties.count_documents({})
    active = await db.properties.count_documents({"status": "active"})
    pending = await db.properties.count_documents({"status": "pending"})
    error = await db.properties.count_documents({"status": "error"})
    
    # Get total value of all properties
    pipeline = [
        {"$match": {"current_value": {"$ne": None}}},
        {"$group": {"_id": None, "total": {"$sum": "$current_value"}}}
    ]
    result = await db.properties.aggregate(pipeline).to_list(1)
    total_value = result[0]["total"] if result else 0
    
    # Get average change
    pipeline = [
        {"$match": {"daily_change_percent": {"$ne": None}}},
        {"$group": {"_id": None, "avg": {"$avg": "$daily_change_percent"}}}
    ]
    result = await db.properties.aggregate(pipeline).to_list(1)
    avg_change = result[0]["avg"] if result else 0
    
    return {
        "total_properties": total,
        "active": active,
        "pending": pending,
        "error": error,
        "total_value": total_value,
        "average_daily_change": round(avg_change, 2) if avg_change else 0
    }

# ============ BACKGROUND TASKS ============

async def update_single_property(property_id: str):
    """Update a single property's data"""
    property = await db.properties.find_one({"id": property_id}, {"_id": 0})
    if not property:
        return
    
    logger.info(f"Updating property: {property['url']}")
    
    scraped_data = await scrape_property_data(property['url'])
    
    if "error" in scraped_data:
        await db.properties.update_one(
            {"id": property_id},
            {"$set": {"status": "error", "last_updated": datetime.now(timezone.utc).isoformat()}}
        )
        return
    
    update_data = {
        "status": "active",
        "last_updated": datetime.now(timezone.utc).isoformat()
    }
    
    if scraped_data.get("address"):
        update_data["address"] = scraped_data["address"]
    if scraped_data.get("image_url"):
        update_data["image_url"] = scraped_data["image_url"]
    if scraped_data.get("suburb"):
        update_data["suburb"] = scraped_data["suburb"]
    if scraped_data.get("state"):
        update_data["state"] = scraped_data["state"]
    if scraped_data.get("postcode"):
        update_data["postcode"] = scraped_data["postcode"]
    
    # Handle value updates
    new_value = scraped_data.get("current_value")
    if new_value:
        old_value = property.get("current_value")
        update_data["previous_value"] = old_value
        update_data["current_value"] = new_value
        
        if old_value and old_value > 0:
            update_data["daily_change"] = new_value - old_value
            update_data["daily_change_percent"] = round(((new_value - old_value) / old_value) * 100, 2)
        
        # Record history
        history = PropertyHistory(
            property_id=property_id,
            value=new_value
        )
        history_doc = history.model_dump()
        history_doc['recorded_at'] = history_doc['recorded_at'].isoformat()
        await db.property_history.insert_one(history_doc)
    
    await db.properties.update_one({"id": property_id}, {"$set": update_data})

async def update_all_properties():
    """Update all properties - called by scheduler"""
    logger.info("Starting daily property update...")
    properties = await db.properties.find({}, {"_id": 0, "id": 1}).to_list(1000)
    
    for prop in properties:
        await update_single_property(prop["id"])
        await asyncio.sleep(2)  # Rate limiting
    
    logger.info("Daily property update complete")

# ============ DEMO DATA ============

@api_router.post("/demo/seed")
async def seed_demo_data():
    """Seed demo data for testing"""
    demo_properties = [
        {
            "id": str(uuid.uuid4()),
            "url": "https://www.property.com.au/property/123-george-street-sydney-nsw-2000/",
            "address": "123 George Street, Sydney NSW 2000",
            "nickname": "Sydney CBD Unit",
            "current_value": 1250000,
            "previous_value": 1240000,
            "daily_change": 10000,
            "daily_change_percent": 0.81,
            "image_url": "https://images.unsplash.com/photo-1758548157747-285c7012db5b?crop=entropy&cs=srgb&fm=jpg&q=85",
            "bedrooms": 2,
            "bathrooms": 2,
            "parking": 1,
            "property_type": "Apartment",
            "suburb": "Sydney",
            "state": "NSW",
            "postcode": "2000",
            "status": "active",
            "last_updated": datetime.now(timezone.utc).isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "url": "https://www.property.com.au/property/45-chapel-street-melbourne-vic-3141/",
            "address": "45 Chapel Street, South Yarra VIC 3141",
            "nickname": "Melbourne Investment",
            "current_value": 980000,
            "previous_value": 985000,
            "daily_change": -5000,
            "daily_change_percent": -0.51,
            "image_url": "https://images.unsplash.com/photo-1757439402190-99b73ac8e807?crop=entropy&cs=srgb&fm=jpg&q=85",
            "bedrooms": 3,
            "bathrooms": 1,
            "parking": 2,
            "property_type": "Townhouse",
            "suburb": "South Yarra",
            "state": "VIC",
            "postcode": "3141",
            "status": "active",
            "last_updated": datetime.now(timezone.utc).isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "url": "https://www.property.com.au/property/78-james-street-brisbane-qld-4000/",
            "address": "78 James Street, Fortitude Valley QLD 4006",
            "nickname": "Brisbane Rental",
            "current_value": 720000,
            "previous_value": 715000,
            "daily_change": 5000,
            "daily_change_percent": 0.70,
            "image_url": "https://images.unsplash.com/photo-1758548157275-d939cf0f0e32?crop=entropy&cs=srgb&fm=jpg&q=85",
            "bedrooms": 2,
            "bathrooms": 1,
            "parking": 1,
            "property_type": "Apartment",
            "suburb": "Fortitude Valley",
            "state": "QLD",
            "postcode": "4006",
            "status": "active",
            "last_updated": datetime.now(timezone.utc).isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    # Clear existing demo data
    await db.properties.delete_many({})
    await db.property_history.delete_many({})
    
    # Insert properties
    for prop in demo_properties:
        await db.properties.insert_one(prop)
        
        # Generate historical data (30 days)
        base_value = prop["current_value"]
        for i in range(30, 0, -1):
            # Add some variance
            variance = (hash(f"{prop['id']}{i}") % 100 - 50) * 100  # +/- $5000
            value = base_value + variance + (i * 200)  # Trending up slightly
            
            history = {
                "id": str(uuid.uuid4()),
                "property_id": prop["id"],
                "value": value,
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
