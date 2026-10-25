# AVM Model Summary — Kinnisvara Dashboard

## Overview

XGBoost regression model for automated property valuation in Estonia. Predicts price per m² from 20 property features, then computes total price. Trained on 7,992 apartment listings scraped from KV.ee with enriched spatial and structural features.

## Model Architecture

| Property | Value |
|---|---|
| Algorithm | XGBoost (Gradient Boosted Decision Trees) |
| Objective | `reg:absoluteerror` (MAE) |
| Trees | 1,200 |
| Max depth | 7 |
| Learning rate | 0.05 |
| Subsample | 0.8 |
| Column sample | 0.8 |
| Target variable | Price per m² (€/m²) |
| Total price | predicted_€/m² × area |

## Features (20)

| # | Feature | Type | Source |
|---|---|---|---|
| 1 | area | m² | KV.ee listing |
| 2 | rooms | count | KV.ee filter pass |
| 3 | year | built year | KV.ee listing |
| 4 | age | 2026 - year | Derived |
| 5 | floorRatio | floor/totalFloors | KV.ee listing |
| 6 | roomDensity | rooms/area | Derived |
| 7 | energyNum | A=1..H=8 | KV.ee filter pass |
| 8 | lat | WGS84 latitude | In-ADS geocoding |
| 9 | lon | WGS84 longitude | In-ADS geocoding |
| 10 | matStone | kivimaja=1 | KV.ee filter pass |
| 11 | matWood | puitmaja=1 | KV.ee filter pass |
| 12 | matPanel | paneelmaja=1 | KV.ee filter pass |
| 13 | isNew | year ≥ 2020 | Derived |
| 14 | isRenovated | condition | Text extraction |
| 15 | comp_avg_price_sqm_1km | mean €/m² of nearest 10 | Spatial computation |
| 16 | comp_count_1km | listings within 1km | Spatial computation |
| 17 | hasBalcony | boolean | Text extraction |
| 18 | hasSauna | boolean | Text extraction |
| 19 | hasParking | boolean | Text extraction |
| 20 | hasStorage | boolean | Text extraction |

## Training Data

| Metric | Value |
|---|---|
| Total scraped listings | 19,469 |
| Valid training entries | 7,992 (apartments only) |
| Precise In-ADS coordinates | 5,022 (63%) |
| Approximate (county center + jitter) | 2,970 (37%) |
| Price range | €5,500 – €1,990,000 |
| Median price | €149,900 |
| Median price/m² | €2,844 |

## Accuracy (5-fold cross-validation)

| Model | MAPE | MAE | Data |
|---|---|---|---|
| **XGBoost (all apartments)** | **28.7% ±1.3** | ~€36,000 | 7,992 apts |
| XGBoost (precise coords only) | 24.4% ±1.8 | — | 5,022 apts |
| Comparable-average baseline | 60.3% | — | 7,992 apts |
| Improvement over baseline | **52%** | | |

## Top Features (by gain)

1. `comp_avg_price_sqm_1km` — nearby comparable price
2. `isNew` — new construction premium
3. `year` — building year
4. `lon` / `lat` — spatial location
5. `age` — building age
6. `comp_count_1km` — market liquidity
7. `roomDensity` — rooms per m²
8. `matStone` — stone construction

## Deployment

- **Model file**: `public/models/avm_v3_all.json` (1,200 trees, ~5MB)
- **Inference**: Pure JavaScript tree evaluator in `lib/ml-model.js`
- **API**: Integrated into `POST /api/valuate` — returns `data.ml` alongside comparable valuation
- **Fallback**: Weighted comparable model in `lib/marketplace.ts → valuateProperty()`

## Limitations

- MAPE 28.7% vs industry target 8-12%
- Only 63% of listings have precise In-ADS coordinates
- Houses trained separately (37% MAPE) — need land area features
- Asking prices only (no transaction data)
- Sparse amenity features (balcony/sauna/parking <1% coverage)

## Path to 8-12% MAPE

1. **Geocode all listings** with In-ADS (currently 63% precise)
2. **Add EHR features**: exact floor count, heating type, official energy cert
3. **Add Maa-amet transaction data**: asking vs sale price delta (~3-7%)
4. **Add transit/school distance**: from existing curated data
5. **Train on price/m² with log transform** to handle skew
