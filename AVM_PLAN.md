# AVM Implementation Plan

## Phase 1: Feature Foundation (build now, no ML needed)

### 1.1 Geocode all listings with WGS84 coordinates
- Current: listings have `addressRaw` text only
- Needed: lat/lon for every listing to compute spatial features
- Method: Batch-geocode each listing's address through In-ADS (`lib/inads.ts`)
- Output: `lat`, `lon` fields on every listing in `all_listings.json`

### 1.2 Spatial features 
- `comp_avg_price_sqm_1km` — mean price/m² of nearest 10 listings within 1km
- `comp_count_1km` — listing density
- `dist_city_center_km` — distance to city center
- Method: Compute using Haversine on WGS84 coords after 1.1

### 1.3 Apartment count per building
- Current: fixed `/ 26` heuristic
- Needed: actual unit count from In-ADS apartment list API
- Method: In-ADS returns `appartments[]` array with count per building

### 1.4 Transaction price data
- Source: Maa-amet downloadable CSV (monthly, free)
- Needed: district-level median transaction prices vs asking prices
- Method: Download + parse CSV into `lib/maaamet.ts`, compute asking/transaction ratio

### 1.5 Feature matrix export
- Export all 19,406 listings with full feature vectors to `data/features.json`
- Ready for ML training in Python

## Phase 2: ML Model (requires Python)
- Train XGBoost on feature matrix
- Export to ONNX
- Load in Node.js via onnxruntime-node
- Integrate into `/api/valuate`

## Phase 3: Production
- Retrain monthly with new listings
- A/B test against current weighted-comparable model
- Add house-specific model with land area
