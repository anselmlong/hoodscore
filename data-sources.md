# Data Sources Reference — SG Hood Score

## URA Planning Area Boundaries
- **Dataset:** Master Plan 2025 Planning Area Boundary (No Sea)
- **URL:** data.gov.sg/datasets/d_2cc750190544007400b2cfd5d7f53209/view
- **Format:** GEOJSON (2.1 MB)
- **Update:** ~5 years (next Master Plan refresh)
- **Last:** Dec 2025
- **Coverage:** 55 planning areas, polygon boundaries
- **Status:** ✅ USE

## HDB Resale Flat Prices
- **Dataset:** Resale flat prices based on registration date from Jan-2017 onwards
- **URL:** data.gov.sg/datasets/d_8b84c4ee58e3cfc0ece0d773c8ca6abc/view
- **Format:** CSV (233K+ rows)
- **Update:** Monthly
- **Last:** 23 Jun 2026
- **Coverage:** Jan 2017–Jun 2026
- **Key fields:** town (maps to planning area), flat_type, resale_price, floor_area_sqm, street_name, storey_range
- **Status:** ✅ USE (town field directly maps to planning areas)

## Hawker Centres
- **Dataset:** Hawker Centres (GEOJSON)
- **URL:** data.gov.sg/datasets/d_4a086da0a5553be1d89383cd90d07ecd/view
- **Format:** GEOJSON (137 KB)
- **Update:** Quarterly
- **Last:** 14 Jun 2026
- **Coverage:** 100+ hawker centres with coordinates
- **Status:** ✅ USE

## Bus Stop Locations
- **Dataset:** LTA Bus Stop
- **URL:** data.gov.sg/datasets/d_3f172c6feb3f4f92a2f47d93eed2908a/view
- **Format:** GEOJSON
- **Update:** Quarterly
- **Last:** 07 Apr 2026
- **Coverage:** ~5,000 bus stops with coordinates
- **Status:** ✅ USE

## MRT Station Locations
- **Dataset:** LTA MRT Station Exit (GEOJSON)
- **URL:** data.gov.sg/datasets/d_b39d3a0871985372d7e1637193335da5/view
- **Format:** GEOJSON
- **Update:** Quarterly
- **Last:** 06 Jan 2026
- **Coverage:** All MRT/LRT station exits with coordinates
- **Status:** ✅ USE

## Schools
- **Dataset:** School Directory and Information (collection 457)
- **URL:** data.gov.sg/collections/457/view
- **Format:** CSV (337 rows)
- **Update:** Yearly
- **Last:** Apr 2026
- **Coverage:** Primary, secondary, pre-university schools
- **Key fields:** school_name, address, postal_code, telephone, email, planning_area (already included!), zone, school_type, main_level
- **Note:** Includes "planning_area" field in CSV — no geocoding needed!
- **Status:** ✅ USE (planning_area field is already in the dataset)

## Parks & Green Spaces
- **Dataset:** NParks Parks and Nature Reserves
- **URL:** data.gov.sg/datasets/d_77d7ec97be83d44f61b85454f844382f/view
- **Format:** GEOJSON (polygon boundaries)
- **Update:** Quarterly
- **Last:** 11 Jun 2026
- **Coverage:** All parks and nature reserves under NParks
- **Status:** ✅ USE (polygons = compute % green coverage per area)

## Crime Data
- **Dataset:** Selected Major Offences Recorded By Neighbourhood Police Centre (NPC), Annual
- **URL:** data.gov.sg/datasets/d_5767147db6e5b4c4cfa874db132fef39/view
- **Format:** CSV (342 rows)
- **Update:** Annual
- **Last:** 09 May 2025 (2024 data)
- **Coverage:** 5 preventable crimes (robbery, housebreaking, snatch theft, theft of motor vehicle, outrage of modesty) by NPC
- **NPC Boundary:** data.gov.sg/datasets/d_89b44df21fccc4f51390eaff16aa1fe8/view (GEOJSON, 37 NPCs)
- **Status:** ✅ USE (NPC → planning area via spatial join)

## Excluded

### PSI / Air Quality
- **Dataset:** Pollutant Standards Index (PSI)
- **URL:** data.gov.sg/datasets/d_fe37906a0182569d891506e815e819b7/view
- **Format:** API (updates every 15 min)
- **Status:** ❌ SKIP — only 5 regions (N/S/E/W/Central), can't map to 55 planning areas

### Pre-Schools / Childcare
- **Dataset:** Pre-Schools Location
- **URL:** data.gov.sg/datasets/d_61eefab99958fd70e6aab17320a71f1c/view
- **Format:** GEOJSON
- **Update:** Unknown (last Jun 2024)
- **Status:** ❌ SKIP — data 2 years stale

### Demographics (Census 2020)
- **Dataset:** Resident Population by Planning Area
- **URL:** data.gov.sg/datasets/d_d95ae740c0f8961a0b10435836660ce0/view
- **Format:** CSV
- **Update:** Every 10 years
- **Last:** 2021 (2020 census)
- **Status:** ⚠️ Can use for population context but 6 years stale