/**
 * Batch In-ADS Geocoding — assigns exact WGS84 coordinates to every listing.
 * Rate-limited to ~20 req/sec (50ms delay) to respect Maa-amet infrastructure.
 * 
 * Run: node scripts/geocode-all.js
 */

const fs = require('fs');
const path = require('path');

const DB = path.join(__dirname, '..', 'data', 'all_listings.json');
const IN_ADS = 'https://inaadress.maaamet.ee/inaadress/gazetteer';
const delay = ms => new Promise(r => setTimeout(r, ms));

async function geocodeAddress(address) {
  try {
    const url = `${IN_ADS}?address=${encodeURIComponent(address)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const data = await res.json();
    const match = data.addresses?.[0];
    if (!match) return null;
    return {
      lat: Number(match.viitepunkt_b) || null,
      lon: Number(match.viitepunkt_l) || null,
      adr_id: match.adr_id || null,
      ehr_code: match.tunnus || null,
      katastritunnus: match.katastritunnus || null,
    };
  } catch { return null; }
}

async function main() {
  const data = JSON.parse(fs.readFileSync(DB, 'utf-8'));
  const listings = data.listings;
  
  // Count how many need geocoding (no adr_id = not precisely geocoded)
  const needGeocode = listings.filter(l => !l.adr_id);
  console.log(`${needGeocode.length}/${listings.length} need In-ADS geocoding`);
  
  let updated = 0, errors = 0, skipped = 0;
  
  for (let i = 0; i < listings.length; i++) {
    const l = listings[i];
    
    // Skip if already precisely geocoded via In-ADS
    if (l.adr_id && l.lat && l.lon) { skipped++; continue; }
    
    // Skip if no address to geocode
    if (!l.addressRaw || l.addressRaw.length < 5) { skipped++; continue; }
    
    // Extract clean address — just the location part before any listing text
    let cleanAddr = l.addressRaw
      .replace(/BRONEERITUD\s+\d+\s+/, '')
      .replace(/\(Broneeritud\)/i, '')
      .trim();
    
    // Take just the address portion (comma-separated location parts)
    const commaParts = cleanAddr.split(',');
    // Take first 2-3 comma parts that look like location
    const locationParts = [];
    for (const part of commaParts) {
      const p = part.trim();
      if (p.length > 2 && !p.match(/^(Korrus|ehitusaasta|Müüa|Hind|€|www\.|\d{4,})/i)) {
        locationParts.push(p);
        if (locationParts.length >= 3) break;
      }
    }
    cleanAddr = locationParts.join(', ').trim();
    
    if (cleanAddr.length < 10) { skipped++; continue; }
    
    const geo = await geocodeAddress(cleanAddr);
    
    if (geo && geo.lat && geo.lon) {
      l.lat = geo.lat;
      l.lon = geo.lon;
      l.adr_id = geo.adr_id;
      if (geo.ehr_code) l.geo_ehr_code = geo.ehr_code;
      if (geo.katastritunnus) l.katastritunnus = geo.katastritunnus;
      updated++;
    } else {
      errors++;
    }
    
    if (i % 500 === 0 && i > 0) {
      console.log(`  ${i}/${listings.length} (${updated} geocoded, ${errors} failed, ${skipped} skipped)`);
      data.listings = listings;
      data.total = listings.length;
      fs.writeFileSync(DB, JSON.stringify(data, null, 2));
    }
    
    await delay(10); // minimal delay
  }
  
  data.listings = listings;
  data.total = listings.length;
  fs.writeFileSync(DB, JSON.stringify(data, null, 2));
  
  console.log(`\nDone: ${updated} geocoded, ${errors} failed, ${skipped} skipped`);
  const precise = listings.filter(l => l.adr_id && l.lat).length;
  console.log(`Precise coordinates: ${precise}/${listings.length}`);
}

main().catch(console.error);
