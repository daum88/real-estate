# Kinnisvara Dashboard

A due-diligence dashboard for Estonian real estate. Enter an address and get everything in
one place: building data, permits and energy class, spatial constraints, apartment-association
(KÜ) health, nearby transit and schools, municipal plans, environmental risk, and an ML-based
market valuation.

## What it does

- **Address search** (In-ADS) — resolves an address to coordinates, cadastral number and building code
- **Building data** (EHR) — year built, area, floors, occupancy permit, energy certificate
- **Spatial constraints** (Maa-amet) — flood zones, heritage areas, utility easements
- **Apartment-association health** (e-Äriregister) — tax debt, developer lookup
- **Environment** — radon, noise and flood risk profile
- **Location** — GTFS transit stops, EHIS schools, municipal plans, PRIA agricultural parcels
- **Marketplace** — 21,000+ scraped KV.ee listings (sale + rent) with comparable analysis
- **Valuation** — XGBoost automated valuation model (€/m²) with a weighted-comparable fallback
- **Affordability** — what fits a given budget, plus property comparison

## Tech stack

- Next.js 16 (App Router) · React 19 · TypeScript
- Tailwind CSS 4 · Framer Motion · Lucide icons
- Pure-JavaScript XGBoost inference (no Python needed at runtime)
- Live Estonian government APIs (no authentication required)

## The valuation model (AVM)

- XGBoost (gradient-boosted trees) trained on ~8,000 apartment listings scraped from KV.ee
- Predicts €/m² from 20 features: area, rooms, year, energy class, location, comparable prices, amenities, …
- 5-fold cross-validation: **MAPE ~28.7%** vs **60.3%** for a comparable-average baseline (~52% better)
- Runtime model: `public/models/avm_v3_all.json` (~1,200 trees), evaluated in JS by `lib/ml-model.js`
- Training: XGBoost — feature engineering in `scripts/build-features.js`; `scripts/train_model.py` is an experimental v4 iteration (the deployed model is `avm_v3_all.json`)

## Data sources

| Source | Data |
|---|---|
| KV.ee (scraped) | 21,619 sale + rental listings |
| EHR | building specs, permits, energy certificates |
| In-ADS | geocoding, cadastral numbers |
| Maa-amet | spatial constraints, district median prices |
| e-Äriregister | KÜ health, tax debt, developer info |
| GTFS / EHIS / municipal plans | transit, schools, planning data |
| PRIA | agricultural parcels |

The KV.ee listings are scraped from public search-result pages for this portfolio project and are
included so the app runs out of the box.

## API routes

| Route | Description |
|---|---|
| `POST /api/lookup` | full due-diligence report for an address |
| `POST /api/valuate` | ML + comparable valuation, rental yield |
| `POST /api/afford` | affordability + property comparison |

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000.

The runtime data (`data/all_listings.json`, `data/rentals.json`) and the trained model
(`public/models/avm_v3_all.json`) are included, so the app works out of the box. Re-scraping uses
the scripts in `scripts/` (KV.ee detail pages are reCAPTCHA-protected, which is why some fields are
estimated).

## Known limitations

- AVM MAPE ~28.7% — trained on asking prices only, not transaction prices
- The AVM is conservative: residual corrections are small, so predictions stay close to the median €/m² (~€2,844)
- Only ~63% of listings have precise In-ADS coordinates in the AVM training set (87% of the runtime dataset has lat/lon; the marketplace comparable search uses real distances when both sides have coordinates)
- Room count is present on only ~7.7% of sale listings — "same room count" comparables and the AVM room features are sparse
- KV.ee detail pages are reCAPTCHA-protected, so heating type, exact room count and broker info are unavailable for most listings
- EHR v3 `buildingData` currently returns no permit documents or energy certificates for most buildings — permit/energy status falls back to "no records on record" rather than a false verdict
- KÜ health and developer lookup use a small static registry cache; the live e-Äriregister X-Road gateway is not integrated. Unknown addresses return null (shown as "no data") instead of fabricated values
- Chimney-sweep certificates use a deterministic heuristic fallback until the Päästeamet feed is integrated
