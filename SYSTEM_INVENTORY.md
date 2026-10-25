# Kinnisvara Dashboard — System Inventory

## 1. SCRAPED LISTINGS (KV.ee)

| Source | Type | Count | File |
|---|---|---|---|
| KV.ee | Apartments for sale | 9,695 | data/all_listings.json |
| KV.ee | Houses for sale | ~9,711 | data/all_listings.json |
| KV.ee | Apartments for rent | 2,213 | data/rentals.json |
| **Total** | | **21,619** | |

### Fields per listing

| Field | Sale Coverage | Rental Coverage | How Obtained |
|---|---|---|---|
| priceEur / monthlyRent | 100% | 99.6% | Search result table column |
| area (m²) | 100% | 100% | Search result table column |
| pricePerSqm / rentPerSqm | 100% | 100% | Calculated or table |
| rooms | 7.7% (1,505) | <1% | Filter passes (rooms_min=X&rooms_max=X) — most passes were not merged into the final dataset |
| floor | 96% | ~70% | Regex "Korrus X/Y" |
| year (built) | 89% | ~70% | Regex "ehitusaasta 1995" |
| material | 70% | ~70% | Filter passes (structure[]=code) + regex |
| energyClass (A-H) | 53% (10,284) | <1% | Filter passes (energy_certs=A..H) |
| condition | 26% (5,015) | 0% | Filter pass (uusarendus/järelturg) |
| heating | <5% | 0% | Text regex. Detail pages blocked by reCAPTCHA |
| addressRaw | 100% | 100% | Raw KV.ee card text |
| url | 100% | 100% | Clickable KV.ee link |
| id | 100% | 100% | kv_/kvh_/kvr_ + KV.ee object ID |

### What's blocked
KV.ee individual listing pages have reCAPTCHA. Cannot access: heating type, energy class (rentals), room count (rentals), full descriptions, broker info, cadastral numbers.

**Rooms caveat:** despite filter-pass scraping, only ~7.7% of the final sale listings
carry a room count — room-count features in the AVM and "same room count" comparables
are therefore sparse.

---

## 2. LIVE GOVERNMENT APIs

| Source | Data | Auth | File |
|---|---|---|---|
| EHR v3 | Building specs, permit status, energy certs, year, area, floors, documents | None | lib/ehr.ts |
| In-ADS | Address → ehr_code, WGS84 coords, adr_id, katastritunnus, apartment list | None | lib/inads.ts |
| Maa-amet | Spatial constraints (flood, heritage, utility easements) | None | lib/maaamet.ts |
| Maa-amet stats | District median prices (CSV download, not auto-fetched) | None | lib/maaamet.ts |
| e-Äriregister | KÜ health, developer lookup, tax debt | None | lib/ariregister.ts |

### EHR limitation
Only returns BUILDING-level data. Apartment codes (ehr_code-apt_code) return 400.
We estimate apartment area as: building_area ÷ 26.

---

## 3. CURATED DATA

| Source | What | Count | File |
|---|---|---|---|
| Transit stops | Real GTFS routes + frequencies | 29 stops, 15 counties | lib/data/transit-stops.ts |
| Schools | Real EHIS names + locations | 106 schools, 15 counties | lib/data/schools-data.ts |
| Municipal plans | Real plan data with status | Kambja, Tartu, Tallinn, Pärnu | lib/data/municipal-plans.ts |
| PRIA agriculture | Parcel data | 3-5 parcels per region | lib/pria.ts |
| Environmental | Radon, noise, flood | Heuristic by county/address | lib/environmental.ts |

---

## 4. SCRAPING INFRASTRUCTURE

| Tool | File | Method |
|---|---|---|
| Filter scraper | scripts/full-scrape.js | Guarantees fields via KV.ee filter URLs (energy_certs=X, rooms_min=X&rooms_max=X, structure[]=code) |
| Bulk scraper | scripts/full-scrape.js | All pages, extracts full listing data from search results |
| House scraper | scripts/scrape-houses.js | Same as full-scrape but type=house |
| Rental scraper | scripts/scrape-rentals.js | deal_type=2, separate price format |
| Manual captcha | Chrome on port 9222 | User solves reCAPTCHA once, scraper connects |

### How to scrape
```bash
# 1. Start Chrome with debug port
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug

# 2. In Chrome: go to kv.ee, accept cookies, solve captcha

# 3. Run scraper
cd kinnisvara-dashboard
node scripts/full-scrape.js apartments   # apartments
node scripts/full-scrape.js houses       # houses
node scripts/scrape-rentals.js           # rentals
```

---

## 5. DASHBOARD FEATURES

| Feature | Status | File |
|---|---|---|
| Address search → EHR building data | ✅ | app/components/Dashboard.tsx |
| Property specs (area, floors, year, status) | ✅ | app/components/PropertyDetailsCard.tsx |
| Permit status + energy cert + EHR links | ✅ | app/components/BuildingHealthCard.tsx |
| Comparable listings (15 nearby, clickable) | ✅ | app/components/MarketContextCard.tsx |
| Weighted valuation model (6 features) | ✅ | lib/marketplace.ts → valuateProperty() |
| Energy class distribution chart | ✅ | MarketContextCard |
| Price trend by decade | ✅ | MarketContextCard |
| Affordability calculator | ✅ | app/components/AffordabilityCard.tsx + /api/afford |
| Transit score + schools | ✅ | app/components/LocationEnvironmentCard.tsx |
| Spatial constraints + plans + agriculture | ✅ | LocationEnvironmentCard |
| KÜ health + developer lookup | ✅ | app/components/KUHealthCard.tsx |
| Portal search links | ✅ | MarketContextCard |
| Custom valuation endpoint | ✅ | /api/valuate |
| Rental data + yield | ⚠️ Scraped, not in dashboard | data/rentals.json |

---

## 6. API ENDPOINTS

| Endpoint | Method | Input | Output |
|---|---|---|---|
| /api/lookup | POST | { address } | Full property report (EHR + comps + transit + schools + valuation) |
| /api/valuate | POST | { address, area, rooms, year, material, energyClass, floor } | Weighted valuation with price range + confidence |
| /api/afford | POST | { budget } | Listings under budget with summary |

---

## 7. MISSING / TODO

1. **Heating** for sale listings — only on detail pages (reCAPTCHA blocked). Could use captcha solving service (2captcha).
2. **Room count** for rentals — rental table format doesn't show rooms. Need to visit individual pages.
3. **Rental yield** in dashboard — data scraped (2,213 rentals, yield calc in scrape-rentals.js) but no UI.
4. **Apartment-level EHR** — only building data. Could use In-ADS apartment list to estimate unit specs.
5. **Transaction prices** — Maa-amet CSV not auto-downloaded. Published monthly, free to download.
6. **ML model** — 19,406 labeled rows with 7+ features. Could train XGBoost/linear regression.
7. **Location precision** — address parsing extracts city/district but not exact coords. Already have WGS84 from In-ADS.
8. **House valuation** — current model is apartment-focused. Houses need land area + different features.

---

## 8. KEY FILES

| File | Purpose |
|---|---|
| lib/marketplace.ts | Valuation engine, search, stats, all analysis |
| scripts/full-scrape.js | Main scraper (apartments + houses + filters) |
| scripts/scrape-rentals.js | Rental scraper with yield calculation |
| lib/types.ts | All TypeScript interfaces |
| data/all_listings.json | Main database (19,406 listings) |
| data/rentals.json | Rental database (2,213 listings) |
| data/rental_yields.json | Yield calculations |
| data/filter_data.json | Raw filter pass results |
| app/api/lookup/route.ts | Main property report endpoint |
| app/api/valuate/route.ts | Custom valuation endpoint |
| app/api/afford/route.ts | Affordability endpoint |
