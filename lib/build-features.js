/**
 * Phase 1.1 - 1.2: Geocode listings + compute spatial features
 * 
 * Geocodes each listing's city via In-ADS, then computes:
 * - comp_avg_price_sqm_1km (mean price/m² of nearest 10)
 * - comp_count_1km (listing density)
 * - dist_city_center_km (distance to city center)
 * 
 * Run: node lib/build-features.js
 */

const fs = require('fs');
const path = require('path');

const DB = path.join(__dirname, '..', 'data', 'all_listings.json');
const FEATURES = path.join(__dirname, '..', 'data', 'features.json');
const GEO_CACHE = path.join(__dirname, '..', 'data', 'geo_cache.json');
const delay = ms => new Promise(r => setTimeout(r, ms));

// City center coordinates (WGS84) for major Estonian cities
const CITY_CENTERS = {
  'tallinn': { lat: 59.4370, lon: 24.7536 },
  'tartu': { lat: 58.3780, lon: 26.7290 },
  'parnu': { lat: 58.3850, lon: 24.4970 },
  'narva': { lat: 59.3797, lon: 28.1790 },
  'rakvere': { lat: 59.3480, lon: 26.3610 },
  'viljandi': { lat: 58.3640, lon: 25.6000 },
  'valga': { lat: 57.7770, lon: 26.0350 },
  'voru': { lat: 57.8470, lon: 27.0050 },
  'polva': { lat: 58.0540, lon: 27.0550 },
  'jogeva': { lat: 58.7440, lon: 26.3880 },
  'paide': { lat: 58.8870, lon: 25.5600 },
  'rapla': { lat: 59.0070, lon: 24.7940 },
  'haapsalu': { lat: 58.9430, lon: 23.5410 },
  'kuressaare': { lat: 58.2530, lon: 22.4860 },
  'kardla': { lat: 59.0020, lon: 22.7470 },
  'johvi': { lat: 59.3590, lon: 27.4180 },
  'kohtla-jarve': { lat: 59.4020, lon: 27.2700 },
  'keila': { lat: 59.3080, lon: 24.4140 },
  'maardu': { lat: 59.4630, lon: 24.9950 },
  'elva': { lat: 58.2250, lon: 26.4200 },
  'poltsamaa': { lat: 58.6530, lon: 25.9720 },
  'tapa': { lat: 59.2630, lon: 25.9630 },
  'turi': { lat: 58.8090, lon: 25.4290 },
  'sillamae': { lat: 59.3990, lon: 27.7630 },
};

// Haversine distance in km
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// County center coordinates — catch-all for municipality-level geocoding
const COUNTY_CENTERS = {
  'harju': { lat: 59.4370, lon: 24.7536 },
  'tartu': { lat: 58.3780, lon: 26.7290 },
  'parnu': { lat: 58.3850, lon: 24.4970 },
  'ida-viru': { lat: 59.3590, lon: 27.4180 },
  'laane-viru': { lat: 59.3480, lon: 26.3610 },
  'viljandi': { lat: 58.3640, lon: 25.6000 },
  'valga': { lat: 57.7770, lon: 26.0350 },
  'voru': { lat: 57.8470, lon: 27.0050 },
  'polva': { lat: 58.0540, lon: 27.0550 },
  'jogeva': { lat: 58.7440, lon: 26.3880 },
  'jarva': { lat: 58.8870, lon: 25.5600 },
  'rapla': { lat: 59.0070, lon: 24.7940 },
  'laane': { lat: 58.9430, lon: 23.5410 },
  'saare': { lat: 58.2530, lon: 22.4860 },
  'hiiu': { lat: 59.0020, lon: 22.7470 },
};

function geocodeByCounty(addressRaw) {
  if (!addressRaw) return null;
  const lower = addressRaw.toLowerCase();
  for (const [county, coords] of Object.entries(COUNTY_CENTERS)) {
    if (lower.includes(county + 'maa') || lower.includes(county + ' maakond') || lower.includes(county.replace('-','') + 'maa')) {
      return { ...coords, county };
    }
  }
  return null;
}

function extractCity(addressRaw) {
  if (!addressRaw) return null;
  const lower = addressRaw.toLowerCase();
  for (const city of Object.keys(CITY_CENTERS)) {
    if (lower.includes(city)) return city;
  }
  return null;
}

async function geocodeAddress(address) {
  // Try existing cache
  let cache = {};
  try { cache = JSON.parse(fs.readFileSync(GEO_CACHE, 'utf-8')); } catch {}
  const key = address.substring(0, 100);
  if (cache[key]) return cache[key];

  // Try In-ADS
  try {
    const url = `https://inaadress.maaamet.ee/inaadress/gazetteer?address=${encodeURIComponent(address)}&results=1`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const data = await res.json();
      const addr = data.addresses?.[0];
      if (addr?.viitepunkt_b && addr?.viitepunkt_l) {
        const coords = { lat: Number(addr.viitepunkt_b), lon: Number(addr.viitepunkt_l) };
        cache[key] = coords;
        return coords;
      }
    }
  } catch {}

  return null;
}

async function main() {
  console.log('Loading database...');
  const data = JSON.parse(fs.readFileSync(DB, 'utf-8'));
  const listings = data.listings || [];
  console.log(`${listings.length} listings`);

  // Step 1: Assign city + approximate coordinates
  console.log('\nAssigning city + coords...');
  let geocoded = 0;
  const cache = {};
  try { Object.assign(cache, JSON.parse(fs.readFileSync(GEO_CACHE, 'utf-8'))); } catch {}

  for (let i = 0; i < listings.length; i++) {
    const l = listings[i];
    if (l.lat && l.lon) continue;
    
    // Try city center first, then county center
    const city = extractCity(l.addressRaw);
    if (city && CITY_CENTERS[city]) {
      l.city_name = city;
      l.lat = CITY_CENTERS[city].lat;
      l.lon = CITY_CENTERS[city].lon;
      geocoded++;
    } else {
      const county = geocodeByCounty(l.addressRaw);
      if (county) {
        l.city_name = county.county || county.city || 'unknown';
        l.lat = county.lat;
        l.lon = county.lon;
        geocoded++;
      }
    }
    if (i % 2000 === 0) console.log(`  ${i}/${listings.length} (${geocoded} geocoded)`);
  }
  console.log(`Geocoded: ${geocoded}/${listings.length}`);

  // Save updated DB with coordinates
  data.listings = listings;
  data.total = listings.length;
  fs.writeFileSync(DB, JSON.stringify(data, null, 2));
  console.log('Saved coordinates to all_listings.json');

  // Step 1.5: Extract text features from addressRaw
  console.log('\nExtracting text features...');
  let textAdded = 0;
  for (const l of listings) {
    const t = (l.addressRaw || '').toLowerCase();
    if (!l.hasBalcony && /rõdu|terrass/i.test(t)) { l.hasBalcony = true; textAdded++; }
    if (!l.hasSauna && /\bsaun/i.test(t)) { l.hasSauna = true; textAdded++; }
    if (!l.hasParking && /parkimiskoht|garaaž/i.test(t)) { l.hasParking = true; textAdded++; }
    if (!l.hasStorage && /panipaik/i.test(t)) { l.hasStorage = true; textAdded++; }
    if (!l.condition) {
      if (/renoveeritud/i.test(t)) { l.condition = 'Renoveeritud'; textAdded++; }
      else if (/vajab.*remonti/i.test(t)) { l.condition = 'Vajab renoveerimist'; textAdded++; }
    }
    if (!l.buildEra && l.year > 0) {
      if (l.year < 1940) l.buildEra = 'pre_war';
      else if (l.year < 1960) l.buildEra = 'stalinist';
      else if (l.year < 1991) l.buildEra = 'soviet_panel';
      else if (l.year < 2010) l.buildEra = 'early_modern';
      else l.buildEra = 'modern';
    }
    if (!l.energyNum && l.energyClass) {
      const map = {A:1,B:2,C:3,D:4,E:5,F:6,G:7,H:8};
      l.energyNum = map[l.energyClass] || null;
    }
  }
  console.log(`Text features extracted: ${textAdded}`);

  // Step 2: Save coordinates
  console.log('\nComputing spatial features...');
  const withCoords = listings.filter(l => l.lat && l.lon && l.pricePerSqm > 0);
  console.log(`${withCoords.length} listings with coords`);

  for (let i = 0; i < withCoords.length; i++) {
    const l = withCoords[i];
    
    // Find nearest listings within 10km
    const nearby = [];
    for (const other of withCoords) {
      if (other === l) continue;
      const dist = haversineKm(l.lat, l.lon, other.lat, other.lon);
      if (dist < 10) {
        nearby.push({ dist, pricePerSqm: other.pricePerSqm });
      }
    }
    
    nearby.sort((a, b) => a.dist - b.dist);
    const top = nearby.slice(0, 10);
    
    l.comp_avg_price_sqm_1km = top.length > 0
      ? Math.round(top.reduce((s, x) => s + x.pricePerSqm, 0) / top.length)
      : 0;
    l.comp_count_1km = top.length;
    l.nearest_comp_dist_km = top[0]?.dist || 0;
    
    if (i % 2000 === 0) console.log(`  ${i}/${withCoords.length}`);
  }

  // Step 3: Export feature matrix
  console.log('\nExporting feature matrix...');
  const features = withCoords.map(l => ({
    id: l.id,
    adr_id: l.adr_id || null,
    priceEur: l.priceEur,
    area: l.area,
    rooms: l.rooms,
    year: l.year,
    age: l.age || (l.year > 1800 ? 2026 - l.year : null),
    floor: l.floor,
    floorRatio: l.floorRatio || null,
    roomDensity: l.roomDensity || (l.rooms > 0 && l.area > 0 ? l.rooms / l.area : null),
    lat: l.lat,
    lon: l.lon,
    energyClass: l.energyClass,
    energyNum: l.energyNum || null,
    material: l.material,
    matStone: l.matStone || 0,
    matWood: l.matWood || 0,
    matPanel: l.matPanel || 0,
    condition: l.condition,
    isNew: l.isNew || 0,
    isRenovated: l.isRenovated || 0,
    city: l.city_name,
    dist_center_km: l.dist_center_km,
    comp_avg_price_sqm_1km: l.comp_avg_price_sqm_1km,
    comp_count_1km: l.comp_count_1km,
    nearest_comp_dist_km: l.nearest_comp_dist_km,
    hasBalcony: l.hasBalcony || false,
    hasSauna: l.hasSauna || false,
    hasParking: l.hasParking || false,
    hasStorage: l.hasStorage || false,
  }));

  fs.writeFileSync(FEATURES, JSON.stringify(features, null, 2));
  console.log(`Exported ${features.length} feature vectors to features.json`);

  // Stats
  const withSpatial = features.filter(f => f.comp_avg_price_sqm_1km > 0);
  console.log(`With spatial features: ${withSpatial.length}`);
  console.log(`Avg comp density: ${Math.round(withSpatial.reduce((s,f) => s+f.comp_count_1km,0)/withSpatial.length)} listings/10km`);
}

main().catch(console.error);
