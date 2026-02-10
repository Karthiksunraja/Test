# Property Value Tracker - PRD

## Original Problem Statement
Build a web-based property value tracking dashboard for property.com.au with:
- Users can input property listing URLs
- System periodically fetches/scrapes property value data
- Store historical property values on a daily basis
- Dashboard displaying all tracked properties with current value, daily change, historical trends
- Filter/select individual properties
- Light theme, no authentication, no alerts

## Architecture

### Tech Stack
- **Frontend**: React 19 + TailwindCSS + Recharts + Shadcn/UI
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Styling**: Organic earthy theme (Libre Baskerville + Public Sans fonts)

### System Components
```
┌─────────────────────────────────────────────────────────┐
│                      Frontend (React)                    │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │  Dashboard  │  │PropertyDetail│  │  Components   │  │
│  │  - Stats    │  │  - Chart     │  │  - Card       │  │
│  │  - Cards    │  │  - History   │  │  - Input      │  │
│  │  - Filter   │  │  - Actions   │  │  - Dropdown   │  │
│  └─────────────┘  └──────────────┘  └───────────────┘  │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                    Backend (FastAPI)                     │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │  Property   │  │   Scraper    │  │    Stats      │  │
│  │   CRUD      │  │ (BeautifulSoup)│  │  Aggregation │  │
│  └─────────────┘  └──────────────┘  └───────────────┘  │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                     MongoDB                              │
│  ┌─────────────┐  ┌──────────────────────────────────┐ │
│  │ properties  │  │       property_history           │ │
│  └─────────────┘  └──────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### Database Schema

**Properties Collection:**
```json
{
  "id": "uuid",
  "url": "string",
  "address": "string",
  "nickname": "string (optional)",
  "current_value": "number",
  "previous_value": "number",
  "daily_change": "number",
  "daily_change_percent": "number",
  "image_url": "string",
  "bedrooms": "number",
  "bathrooms": "number",
  "parking": "number",
  "property_type": "string",
  "suburb": "string",
  "state": "string",
  "postcode": "string",
  "status": "pending | active | error",
  "last_updated": "datetime",
  "created_at": "datetime"
}
```

**Property History Collection:**
```json
{
  "id": "uuid",
  "property_id": "uuid",
  "value": "number",
  "recorded_at": "datetime"
}
```

### API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/ | Health check |
| POST | /api/properties | Add property |
| GET | /api/properties | List all (with search/filter) |
| GET | /api/properties/{id} | Get single property |
| DELETE | /api/properties/{id} | Remove property |
| GET | /api/properties/{id}/history | Get historical values |
| POST | /api/properties/{id}/refresh | Refresh property data |
| GET | /api/stats | Dashboard statistics |
| POST | /api/demo/seed | Seed demo data |

## User Personas

### Property Investor
- Tracks multiple investment properties
- Wants to see portfolio total value
- Monitors daily/weekly changes

### Homeowner
- Tracks their own home value
- Compares with nearby properties
- Interested in market trends

## What's Been Implemented (Feb 10, 2026)

### MVP Complete
- [x] Dashboard with stats cards (total properties, total value, active count, avg change)
- [x] Add property form with URL and nickname input
- [x] Property cards with images, values, status badges, daily changes
- [x] Search and filter functionality (by suburb)
- [x] Property detail page with historical chart
- [x] Time range selector (7, 14, 30, 90 days)
- [x] Property actions (refresh, delete, view listing)
- [x] Demo data seeding with 30 days of history
- [x] Responsive design with organic earthy theme
- [x] Web scraper for property.com.au (basic implementation)

## Prioritized Backlog

### P0 (Critical)
- [x] Core dashboard functionality
- [x] Property CRUD operations
- [x] Historical data charts

### P1 (Important)
- [ ] Scheduled daily updates (APScheduler cron job)
- [ ] More robust scraping with anti-bot measures
- [ ] Error recovery and retry logic

### P2 (Nice to Have)
- [ ] Email notifications for significant changes
- [ ] Property comparison view
- [ ] Export data to CSV/PDF
- [ ] Multiple property websites support (Redfin, Zillow AU)

## Next Tasks
1. Implement APScheduler for automated daily property updates
2. Add more robust error handling for scraping failures
3. Add property comparison feature (compare 2-3 properties side by side)
4. Consider adding email alerts for price changes > 5%
