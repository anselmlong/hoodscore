# SG Hood Score — Full Build Plan

## 1. Product Overview

A livability ranking engine for all 55 URA planning areas in Singapore. Users explore a ranked map + list, break down scores by dimension, customise weights, and compare areas side-by-side. Pure data, no AI.

**URL:** `hood.anselmlong.com` (custom domain TBD later)

---

## 2. Design Direction

**Vibe:** Civic credible. Clean, government-design-ish, data-dashboard energy. Think Singapore Department of Statistics meets OWID (Our World in Data). Trustworthy over flashy.

**10 design templates for you to swipe through** (I'll render these as static HTML mockups so you can actually see them, not just read descriptions):

| # | Name | Vibe |
|---|------|------|
| 1 | **Master Plan** | Blueprint aesthetic — light grid, annotation lines, technical drawing feel |
| 2 | **Statistics Singapore** | Clean white dashboard, DOS palette (navy + teal), data-table-forward |
| 3 | **LTA DataMall** | Dark mode transit map vibes, monorail blue + orange accents |
| 4 | **URA Draft** | Architectural — light beige, minimal, serif headers for area names |
| 5 | **NEA Dashboard** | Card-based, green accent for "healthy" score, red for low, like environmental indices |
| 6 | **The Economic Times** | Classic finance-ranking aesthetic — green/red arrows, sparklines |
| 7 | **HDB Brochure** | Warm, residential — rounded cards, neighbourhood photo placeholders |
| 8 | **OWID-style** | Full-width charts, scatterplots, tooltip-rich exploration |
| 9 | **PropertyGuru-lite** | List-heavy, filter bars, pill tags for dimensions, mobile-swipeable |
| 10 | **Minimal Monochrome** | Black + white + one accent, brutalism-lite, super fast load |

---

## 3. Data Sources & Cadence

### Included Dimensions (6)

| Dimension | Dataset | Format | Update Cadence | Data Quality |
|-----------|---------|--------|----------------|--------------|
| 🚇 **Transit** | LTA Bus Stops (GEOJSON) + MRT Station Exits (GEOJSON) | Point coordinates | Quarterly | ✅ Solid. ~5,000 bus stops + ~200 MRT exits |
| 🍜 **Food** | NEA Hawker Centres (GEOJSON) | Point coordinates | Quarterly | ✅ Solid. 120+ centres, coordinates included |
| 📚 **Schools** | MOE General Information of Schools (CSV) | Addresses (needs geocoding via OneMap) | Yearly (last: Apr 2026) | ✅ Solid. 337 schools, postal codes available. OneMap geocoding once, cache forever |
| 🌳 **Green Space** | NParks Parks & Nature Reserves (GEOJSON) | Polygon boundaries | Quarterly | ✅ Excellent. Polygons = compute actual coverage per area |
| 🛡️ **Safety** | SPF Crime by NPC (CSV) + NPC Boundaries (GEOJSON) | NPC-level offences | Annual (last: May 2025 for 2024 data) | ✅ Good. Map via spatial join NPC → planning area |
| 🏠 **Affordability** | HDB Resale Flat Prices (CSV) | Town-level transactions | Monthly (last: Jun 2026) | ✅ Excellent. "town" field maps to planning area directly |

### Excluded

| Dimension | Why |
|-----------|-----|
| 💨 **Air Quality** | NEA PSI data only at 5-region level (North/South/East/West/Central). Can't map to 55 planning areas with trustable granularity. |
| 👶 **Childcare** | ECDA data last updated Jun 2024 — 2 years stale |
| 👥 **Demographics** | Census of Population 2020 — decennial, 6 years stale. Would mislead users about current population density |

### Update Pipeline (GitHub Actions Weekly)

```
data.gov.sg API ──► Python download scripts ──► raw/ dir
                        │
                   geoprocessing + spatial join
                        │
                   Vercel Postgres (hood_score schema)
                        │
                   Next.js API routes (REST)
                        │
                   React frontend (SWR cache)
```

**Tradeoff: GH Actions vs VPS cron**
- GH Actions: free, code + pipeline co-located, built-in secrets, 2,000 min/month free. Debugging is slower (push → wait → read logs).
- VPS cron: faster iteration, full SSH access, but another thing to maintain.
- **Recommendation:** GH Actions. Weekly run costs ~5-10 min/month, barely registers.

---

## 4. Scoring Engine

### Default: Equal Weight (all 6 dimensions = 1.0)

### User Customisation: 2 modes

1. **Quick Quiz** — "Tell us what matters to you" (5-6 sliders or yes/no questions). e.g. "Do you commute daily?" → transit weight +0.5. "Have kids?" → schools weight +0.5.
2. **Expert Mode** — 6 sliders, drag to weight each dimension. Total normalises to 1.0.

### Scoring Method

For each dimension per planning area:
- **Raw → Normalised score** (0-100)
- Min-max normalisation with 5th/95th percentile clipping (prevents Changi's transit density from warping all other scores)
- Each dimension exposes: `metric_name`, `unit`, `raw_value`, `score`, `context_data` (e.g. "12 bus stops within 500m")

### Overall Score

```
overall = Σ(weight_i × score_i) / Σ(weight_i)
```

---

## 5. Architecture

```
hoodscore/
├── .github/workflows/
│   └── refresh-data.yml        # Weekly: download → process → seed Postgres
├── data/
│   ├── raw/                    # Downloaded CSVs/GEOJSONs (cached)
│   ├── processed/              # Cleaned, normalised JSON outputs
│   └── boundaries/             # URA MP2025 planning area GEOJSON
├── pipeline/                   # Python data processing
│   ├── requirements.txt
│   ├── download_all.py         # Fetches all datasets from data.gov.sg
│   ├── process_transit.py      # Bus stop + MRT → score per area
│   ├── process_food.py         # Hawker → score per area
│   ├── process_schools.py      # Geocode addresses → score per area
│   ├── process_green.py        # Park polygon overlap → score per area
│   ├── process_safety.py       # Crime data NPC → planning area → score
│   ├── process_hdb.py          # HDB resale → median price/psm score
│   ├── geocode_one_map.py      # OneMap API wrapper with caching
│   └── seed_db.py              # Upserts into Vercel Postgres
├── src/
│   ├── app/
│   │   ├── page.tsx            # Hero + embedded map (landing)
│   │   ├── explore/
│   │   │   └── page.tsx        # Full map + ranked list view
│   │   ├── area/
│   │   │   └── [slug]/
│   │   │       └── page.tsx    # Planning area detail
│   │   ├── api/
│   │   │   ├── scores/
│   │   │   │   └── route.ts    # GET all scores (w/ optional weight params)
│   │   │   ├── areas/
│   │   │   │   └── route.ts    # GET single area detail + breakdown
│   │   │   └── compare/
│   │   │       └── route.ts    # POST {area_ids} → side-by-side
│   │   └── compare/
│   │       └── page.tsx        # Comparison view UI
│   ├── components/
│   │   ├── Map.tsx             # Singapore choropleth map (Leaflet/MapLibre)
│   │   ├── ScoreCard.tsx       # Dimension breakdown card
│   │   ├── WeightQuiz.tsx      # Quick weight customisation wizard
│   │   ├── CompareTable.tsx    # Side-by-side area table
│   │   ├── SearchBar.tsx       # Planning area search + filter
│   │   └── HeroSection.tsx     # Landing hero
│   ├── lib/
│   │   ├── scores.ts           # Score computation + static JSON data layer (server-side)
│   │   └── types/
│   │       └── index.ts        # TypeScript types
├── public/
│   └── design-templates/       # 10 HTML mockups for you to swipe
├── tailwind.config.ts
├── next.config.ts
└── package.json
```

---

## 6. Vercel Postgres Schema

```sql
CREATE TABLE planning_areas (
  id          SERIAL PRIMARY KEY,
  slug        TEXT UNIQUE NOT NULL,    -- 'ang-mo-kio'
  name        TEXT NOT NULL,            -- 'Ang Mo Kio'
  region      TEXT NOT NULL,            -- 'North-East'
  boundary    GEOGRAPHY(POLYGON) NOT NULL,
  population  INT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE dimension_scores (
  id            SERIAL PRIMARY KEY,
  area_id       INT REFERENCES planning_areas(id),
  dimension     TEXT NOT NULL,          -- 'transit', 'food', 'schools', 'green', 'safety', 'affordability'
  score         DECIMAL(5,2) NOT NULL,  -- 0-100
  raw_value     DECIMAL(12,2),          -- e.g. 42 bus stops within 500m
  unit          TEXT,                   -- 'bus_stops', 'hawker_centres', etc.
  score_date    DATE NOT NULL,
  UNIQUE(area_id, dimension, score_date)
);

CREATE TABLE area_comparisons (
  id            SERIAL PRIMARY KEY,
  session_id    TEXT,                   -- anonymous session for saving comparisons
  area_ids      INT[] NOT NULL,
  weights       JSONB,                 -- custom weight config
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 7. Pages & UX Flow

### Landing Page (Hero)
- Big heading: "Where should you live in Singapore?"
- Subtitle: "A data-driven livability score for every planning area."
- CTA: "Explore the map" → scrolls to map

### Explore (Map + List)
- **Map:** Singapore choropleth, colour-coded by overall score (green → yellow → red)
- Click area → opens detail flyout / navigates to area page
- **List:** Ranked table alongside map, sortable by any dimension
- **Search:** Type planning area name → filters map + list
- **Filter:** Pill buttons to highlight by dimension ("Best transit", "Best food", etc.)

### Area Detail Page (`/area/ang-mo-kio`)
- Big score number (0-100) with colour
- 6 dimension breakdown cards, each showing:
  - Score bar (0-100)
  - Raw context data ("12 bus stops within 500m", "3 hawker centres")
  - Mini map or icon
- "Customise your weights" button → slides in the weight quiz
- "Compare" button → add to comparison sidebar

### Comparison View (`/compare?areas=bisham,bedok,tampines`)
- Side-by-side table or radar chart
- Which area wins in each dimension highlighted
- Shareable URL

### Weight Customisation
- Quick Quiz mode: 6 simple questions ("How important is proximity to food?")
- Expert mode: 6 sliders
- URL updates with query params (?weights=transit:1.5,food:0.8) → shareable weighted results

---

## 8. Monetisation (Lightweight Plan)

**Threshold triggers** — not building these now, just documented for when:

| Tier | Trigger | Model |
|------|---------|-------|
| **Free** | Always | Full site, all features |
| **Affiliate-lite** | 10k MAU | PropertyGuru / 99.co / Ohmyhome affiliate links on area pages ("See HDB flats in this area"). Ohmyhome's SG listing API. |
| **Agent Pro** | Self-serve launch | Exportable reports for property agents: "Top 10 areas for families with school-age children". PDF export, CSV download. One-time purchase or $5/mo. |
| **Sponsored areas** | 50k MAU | "Presented by [developer]" for new BTO areas — but only if it doesn't compromise data trust. Must be clearly marked. |

**Key principle:** The score must remain trustable. No paid influence on rankings. If it ever feels pay-to-win, the product dies.

---

## 9. Build Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Scaffold Next.js 14 App Router project
- [ ] Set up Vercel Postgres
- [ ] Download URA MP2025 boundary GEOJSON
- [ ] OneMap authentication + test geocoding
- [ ] Write pipeline scripts (download_all.py)
- [ ] GH Actions weekly workflow setup

### Phase 2: Core Data (Week 2-3)
- [ ] Process transit data (bus stops + MRT)
- [ ] Process food data (hawker centres)
- [ ] Geocode schools + compute school density
- [ ] Process green space (polygon overlap)
- [ ] Process safety (NPC → planning area mapping)
- [ ] Process HDB prices (median by town)
- [ ] Seed Vercel Postgres

### Phase 3: Frontend (Week 3-4)
- [ ] Landing page hero section
- [ ] Singapore choropleth map (Leaflet with MP2025 boundaries)
- [ ] Ranked list component
- [ ] Area detail page with dimension breakdown
- [ ] Search + filter

### Phase 4: Polish (Week 4-5)
- [ ] Weight customisation (quiz + expert mode)
- [ ] Comparison view
- [ ] Shareable URLs with weight params
- [ ] Mobile-first responsive
- [ ] 10 design template mockups for your review

### Phase 5: Launch (Week 5)
- [ ] Deploy to Vercel
- [ ] GH Actions pipeline verification
- [ ] Manual QA on 10 areas
- [ ] Share with friends for feedback
- [ ] Optional: share on r/singapore

---

## 10. Modularity for Future Dimensions

Adding a new dimension (e.g. "Healthcare"):

```python
# pipeline/process_healthcare.py
from score_base import DimensionProcessor

class HealthcareProcessor(DimensionProcessor):
    dimension = "healthcare"
    unit = "clinics"

    def download(self):
        # fetch from data.gov.sg or other source
        pass

    def compute(self, raw_data, boundaries):
        # spatial join clinics → planning area
        return {area_id: {"score": x, "raw_value": y}}
```

No other file needs to change. `seed_db.py` auto-discovers processors in `pipeline/`. The frontend dimension cards render dynamically from the API response — add `healthcare` to the response JSON, cards appear automatically.

---

Let me know if you want me to tweak anything before we start Phase 1. Once you sign off, I'll kick off the design templates and start scaffolding.
