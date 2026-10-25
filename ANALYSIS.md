# Kinnisvara Dashboard — Full Code Analysis & Audit

Date: 2026-10-25 · Next.js 16.2.12 (App Router, Turbopack) · React 19.2 · TS 5 strict
Verified live against: In-ADS gazetteer, EHR v3, e-Äriregister endpoints.

---

## 1. Verdict

Solid, ambitious portfolio project: 21,619 real scraped KV.ee listings, a working
1,200-tree XGBoost model with a pure-JS evaluator, and a genuinely nice-looking
UI. **However, the audit found 4 critical data-integrity bugs and ~15 functional
issues** — most notably valuations that could display **€242,000,000** for a
commercial building and apartment buildings classified as private houses.
All critical issues have been fixed in this pass; lint is clean, `tsc` is clean,
12 tests pass, production build passes.

---

## 2. Critical bugs found & fixed

| # | Bug | Impact | Fix |
|---|---|---|---|
| C1 | `lib/ehr.ts` `isHouse` matched `buildingType.includes('elamu')`, which also matches **"Korterelamu" / "Muu kolme või enama korteriga elamu"** — every apartment building was classified as a private house | KÜ-health card showed "Private house — no KÜ" for apartments; marketplace filtered comps to **houses** (`kvh_`) for apartment addresses | Match explicit house types, exclude `/korter/i`, add `isApartmentBuilding` |
| C2 | `/api/lookup` used the **whole building's** `closedNetArea` (e.g. 60,967 m²) for valuation → `mlEstimate.estimatedTotal = €242.6M` and `estimatedValue = €346M` for Riia 2, Tartu | Absurd estimates displayed in Market card + Investment card | Unit-area sanitization (10–1,000 m² clamp, /26 heuristic only for multi-unit buildings, `valuationArea` used for ML + marketplace) |
| C3 | In-ADS gazetteer response **never contains `katastritunnus`** — the field was always `undefined`, so cadastral-region constraint heuristics were dead code | No flood/heritage/utility constraints ever appeared | Route now prefers **EHR's** `ehitiseKatastriyksus[].katastritunnus` (verified present in v3 payload) |
| C4 | Coordinates were dropped: the route skipped In-ADS resolution whenever an `ehrCode` was present (always true when picking a suggestion), and the client never sent `lat/lon` | Transit, schools, and spatial comps silently fell back to **fabricated** data ("nearest stop 300 m, score 50"; schools at distance 0) | Client forwards `lat/lon/katastritunnus`; route always geocodes when an address exists; marketplace comparables now use real Haversine distance (87.4% of listings have coords) |

Verified after fix — Riia 2, Tartu: real transit stop (Kesklinn, 502 m, real
routes), schools with real distances (255 m), correct katastritunnus
79501:002:0069 → Emajõgi floodplain + heritage constraints appear; ML estimate
€175k instead of €242M. Aadli 2 (Kambja apartment building): `isHouse: false`,
unit area 59 m², estimates €133k–€154k instead of €3.9M–€4.2M, apartment comps,
real "Aadli" bus stop.

---

## 3. File-by-file analysis

### 3.1 `app/`

| File | Assessment |
|---|---|
| `layout.tsx` | Good. Fonts via `next/font/google` with CSS variables, `lang="et"`, proper metadata incl. OpenGraph. No issues. |
| `page.tsx` | Trivial shell. Fine. |
| `globals.css` | Good: Tailwind v4 `@theme`, design tokens, shimmer keyframes, reduced-motion support. The `:root` token block is partly redundant with `@theme inline` but harmless. |
| `components/Dashboard.tsx` | Clean composition + orchestration. **Fixed:** dead `selectedAddress` state; missing `lat/lon/katastritunnus` in fetch body; broken EHR link (`?ehrCode=` returns 400 — EHR only accepts `ehr_code=`); InvestmentCard no longer receives whole-building area for apartment buildings. Remaining nit: JSX indentation of Rows 4–5 (cosmetic). |
| `components/AddressSearch.tsx` | Good glassmorphism autocomplete with keyboard nav + click-outside. **Fixed:** stale-response race (no sequence guard before — an old slow response could overwrite newer results); `tunnus` from KATASTRIYKSUS entries (e.g. `28301:001:2491`) was passed as an EHR code — now only numeric building codes become `ehrCode`, cadastral entries set `katastritunnus`; debounce cleanup on unmount. Remaining nits: no `aria-activedescendant`/`role="combobox"` (a11y), no Home/End keys. |
| `components/BuildingHealthCard.tsx` | Good visual hierarchy. **Fixed:** permit badge now distinguishes "Active" / "Pending" / **"No EHR Records"** — previously every building showed amber "Pending"/"No valid occupancy permit found", which falsely implied missing permits. Root cause: EHR v3 `buildingData` returns `ehitiseDokumendid: []` for every building tested (permits live behind a different service). |
| `components/PropertyDetailsCard.tsx` | Clean spec grid. `formatHeating` keys `raw.toLowerCase().replace(/\s/g,'')` but `HEATING_LABELS` keys contain no spaces (e.g. `'kaugküte'`) — correct, since the replace removes spaces from the *input*. OK. |
| `components/KUHealthCard.tsx` | Good. **Fixed:** removed unused `Euro` import. `taxDebt.toLocaleString()` would throw on undefined, but the type requires the field — acceptable. The "Private house — no KÜ" branch now correctly only triggers for real houses after C1. |
| `components/LocationEnvironmentCard.tsx` | Good. **Fixed:** removed 6 unused imports + unused `constraints` prop; hardcoded heading "Municipal Plans (Kambja vald)" → "Municipal Plans". Nits: schools link all point to generic ehis.ee rather than the school's own record; environmental panel is 100% heuristic (see §4 honesty notes). |
| `components/MarketContextCard.tsx` | The richest card. **Fixed:** typed `mlEstimate.modelInfo` (was `any`), unused `Calendar` import, unused destructured props, estimate line renders `{displayArea || buildingArea}` properly. Nit: `priceStats.avg` label "Avg/m²" is correct (it is per-m²). |
| `components/AffordabilityCard.tsx` | **Fixed:** `any[]` → `MarketplaceListing[]`, NaN guard on budget input, unused `Search` import. Nit: no debounce on the button; fine for MVP. |
| `components/InvestmentCard.tsx` | **Fixed:** `react-hooks/set-state-in-effect` violation (synchronous `setLoading(true)` in effect body); added `AbortController` cancellation; typed the response. The mortgage math (0.5%/mo on 70% LTV, interest-only) is documented now — it's a simplification, not a bug. |
| `components/SkeletonCards.tsx` | Good shimmer implementation. No issues. |
| `api/lookup/route.ts` | The orchestration hub — **rewritten** (see C2–C4). Now: validates `ehrCode` shape (`/^\d+$/`), always geocodes, derives `katastritunnus` from EHR, computes `estimatedApartmentArea` only for apartment-suffixed or multi-unit buildings, clamps valuation area, uses `Promise.allSettled` with labeled errors (good pattern already). |
| `api/valuate/route.ts` | **Fixed:** 9 × `any` removed (typed `RentalRecord`), area clamp (10–1,000 m², else 60), rooms/floor/year validation, rental matcher now excludes listings in *other* cities (a Tartu query previously matched "Tartu mnt, **Tallinn**" via the `tartu` token — verified in live output), `err` now logged. |
| `api/afford/route.ts` | **Fixed:** unused `err`, typed body access. Note: `comparison` output is never displayed by the UI (feature 6 half-implemented). |

### 3.2 `lib/`

| File | Assessment |
|---|---|
| `types.ts` | Coherent domain model. **Added:** `isApartmentBuilding`, `MlModelInfo`, `lat/lon` on listings and lookup request, `katastritunnus` in request. |
| `inads.ts` | **Fixed:** removed the `getAddressById` stub (always returned `null` — dead code with a misleading name); `tunnus` handling now distinguishes EHR codes from cadastral codes. API verified: `viitepunkt_b/l` are correct lat/lon; CORS `*` confirmed (client-side search works). |
| `ehr.ts` | Solid normalizer. **Fixed:** C1 + added `EHITIS_SEISUND_OLEMA` to the status map (the API emits this code; previously unmapped). Verified against live payloads: field names (`suletud_netopind`, `tehnilineNaitaja[].klKood`, `energiamargis`, `ehitiseKatastriyksus[].katastritunnus`) all match. Note: material extraction only reads `KONS_KKONSTR`/`KONS_VSEIN` — `KONS_VLAED`, `KONS_VALISV` etc. are ignored (acceptable). |
| `maaamet.ts` | **Fixed:** removed the always-attached fake "Public Water Supply Protection Zone" constraint (every property previously showed a made-up easement). Heuristics are now purely region/address-keyword based. `getDistrictPrice` returns `medianPricePerSqm: 0` and its result is **never rendered** by MarketContextCard (destructured, unused) — the whole district-price path is effectively a stub; either integrate the Maa-amet CSV or drop it. |
| `ariregister.ts` | **Fixed:** removed the fabrication of a "generic healthy KÜ" for every Tallinn/Tartu/Pärnu address (presented as registry data with reg. code `''`). Static demo cache remains for known entities (Riia 2, etc.). Live REST fallback endpoint (`/api/v1/company/{code}`) is unverified and likely 404s — the live integration genuinely needs the e-Äriregister gateway. |
| `chimney.ts` | **Fixed:** `Math.random()` non-determinism — the same property could show "valid" on one request and "invalid" on the next. Now a stable address hash drives the fallback heuristic; honest comment that real data needs the Päästeamet feed. |
| `environmental.ts` | Pure keyword heuristics, honest comments. Fine for MVP, but the UI presents radon/noise as measured values — consider labeling "estimated". County matching works because In-ADS addresses contain "X maakond". |
| `transit.ts` | **Fixed:** removed the fabricated "300 m / score 50" fallback — returns `null` without coordinates so the UI hides the section. Distance math (equirectangular) is fine for <50 km. Score logic is reasonable. Note: the curated dataset is 29 stops, not the "229" the old comment claimed (corrected). |
| `schools.ts` | Fine. With coordinates it returns top-2 per category with real distances. Without coordinates it returns county schools at distance 0 (UI hides distance) — acceptable after C4 makes the coordinate path actually work. No max-distance cap: a "nearby school" can be 30 km away in rural areas; consider capping at ~5 km. |
| `pria.ts` / `municipal.ts` | Curated demo data, clearly commented. `municipal-plans.ts` generates dynamic search URLs — good idea. Plans only match when the address contains the municipality name (works with canonical In-ADS addresses). |
| `marketplace.ts` | The engine. **Fixed:** street extraction took the *last* comma-part (county) instead of the first (street); 30-second cache TTL (pointless in serverless, thrashed the 16 MB parse) → permanent module cache; `findNearbyListings` now blends text scoring with real Haversine proximity bonuses/penalties using listing `lat/lon`; typed lat/lon exposure; afford summary city names deduped/stripped of "linn/vald" suffixes. Remaining honest gaps: 92.3% of listings have no room count (see §4), `priceStats` comes from only the top-15 matches. |
| `ml-model.js` | Compact, correct array-format XGBoost evaluator. Verified against the shipped `avm_v3_all.json` (1,200 trees, `base_score` 2,843.89, `num_feature: 20` — feature order matches `FEATURE_KEYS`). Edge behavior: with all-zero features it returns the base score (~€2,846/m²) — the model is dominated by `comp_avg_price_sqm_1km`, which the README honestly admits. **Fixed:** lint disables with justification comment; unused catch var. |
| `data/*.ts` | Curated static datasets with real coordinates. Transit comment corrected (29 stops, not 229). |

### 3.3 `scripts/` & `data/`

- Scrapers are standard Puppeteer + remote-debug-Chrome patterns; `scrape-rentals.js` writes `rental_yields.json` which is **empty** (`total: 0, yields: []`) — the yield computation never completed.
- `geo_cache.json` is `{}` — the geocoding cache was never populated; `features.json` (17,020 vectors, 11.4 MB) is a build artifact, correctly gitignored.
- 5 separate one-off geocode scripts (`geocode-all/clean/curl/retry.js`) are legacy debris; one maintained script would be cleaner.
- ESLint now ignores `scripts/**` and `tests/**` (CommonJS tooling outside the Next.js toolchain) with a documented reason.

---

## 4. Data-quality findings (documented, not fully fixable in code)

1. **Room counts: 7.7% coverage, not 99%** as SYSTEM_INVENTORY claimed — filter-pass results were never merged into the final dataset. This silently weakens "same room count" comparables, `valueteProperty` room scoring and AVM room features. Docs corrected.
2. **1,154 listings** still contain "BRONEERITUD" text in `addressRaw`; several address strings are truncated/garbled (e.g. "äe, Tartu linn").
3. Heating coverage ~0%, energy class 52.8%, material 69.7%, year 83% — matches README limitations.
4. `rental_yields.json` empty; rental yield computed live in `/api/valuate` instead (fine).
5. `geo_cache.json` empty, `features.json` is the effective training snapshot.

---

## 5. Architecture assessment & recommendations

**Good:**
- Clean separation: `lib/` data access vs `app/` presentation; typed domain model; API routes thin.
- `Promise.allSettled` fan-out with graceful degradation + user-visible `errors[]`.
- Timeouts on all external fetches (`AbortSignal.timeout`).
- XGBoost inference without Python/ONNX runtime — 6.8 MB model evaluated in pure JS, correct format.
- `data/` committed so the app runs out of the box.

**Recommendations (in priority order):**
1. **Integrate Maa-amet transaction CSV** — `getDistrictPrice` is currently a dead stub whose output isn't even rendered. Either wire it or remove the card prop.
2. **e-Äriregister live gateway** — replace the static KÜ/developer cache (X-Road/e-Business Register API).
3. **Päästeamet chimney feed** — replace the deterministic heuristic.
4. **EHR documents/energy-cert endpoint** — find the correct service so permits aren't "no records" forever.
5. **Serverless hardening** — 16 MB JSON parse per cold start; consider pre-aggregating `data/listings.compact.json` (id, price, ppsqm, area, rooms, year, lat, lon, city/district, energy, material) and precomputing a spatial grid to avoid the O(19k) scan per request.
6. **Rate limiting + caching headers** on API routes (public endpoints, trivial to hammer).
7. **Merge the 5 geocode scripts into one**; delete `geocode-curl.js` (shells out to curl per address — the slowest option).
8. **A11y pass**: combobox semantics on AddressSearch, aria-labels on icon links, focus styles.
9. Add `Sentry`/`pino` structured logging — errors are currently console-only.

---

## 6. Verification results (post-fix)

```
npx tsc --noEmit     ✅ clean
npx eslint .         ✅ clean (0 problems)
npm test             ✅ 12/12 pass (4 ML + 8 marketplace/valuation)
npm run build        ✅ production build OK
Live API tests       ✅ /api/lookup, /api/valuate, /api/afford all sane
```

Before/after live comparison (Riia 2, Tartu):

| Metric | Before | After |
|---|---|---|
| ML estimate | €242,586,897 | €175,200 |
| estimatedValue | €346,000,000 (building × median) | null (no unit area — honest) |
| Transit | fake "300 m, score 50" | real Kesklinn stop, 502 m, score 100 |
| Schools | distance 0 (county list) | real 255 m kindergarten |
| Constraints | 1 fabricated water-supply easement | 2 real region constraints (flood + heritage) |
| Katastritunnus | undefined | 79501:002:0069 (from EHR) |
