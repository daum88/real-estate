/**
 * Re-geocode failed addresses with better cleaning
 */
const fs = require('fs');
const path = require('path');

const DB = path.join(__dirname, '..', 'data', 'all_listings.json');
const IN_ADS = 'https://inaadress.maaamet.ee/inaadress/gazetteer';
const delay = ms => new Promise(r => setTimeout(r, ms));

function cleanAddress(raw) {
  if (!raw) return '';
  let addr = raw
    .replace(/BRONEERITUD\s+\d+\s+/gi, '')
    .replace(/\(Broneeritud\)/gi, '')
    .trim();
  
  // Split at description keywords
  const descMarkers = /\s{2,}(Korrus|ehitusaasta|Müüa|müüa|UUS HIND|Kiirmüük|Kliendipäev|Täielikult|Hubane|Avar|Suurepärane)/i;
  addr = addr.split(descMarkers)[0].trim();
  
  // Take comma-separated parts, skip non-location parts
  const parts = addr.split(',');
  const cleanParts = [];
  for (const p of parts) {
    const t = p.trim();
    if (t.length < 2) continue;
    if (/^(Korrus|ehitusaasta|Müüa|Hind|€|www\.|\d{4,}|UUS|Kliendipäev|Täna)/i.test(t)) break;
    if (/^\d+\s*$/.test(t)) continue; // standalone number
    cleanParts.push(t);
  }
  
  return cleanParts.join(', ').trim();
}

async function geocode(addr) {
  try {
    const url = `${IN_ADS}?address=${encodeURIComponent(addr)}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const data = await res.json();
    const m = data.addresses?.[0];
    if (!m?.viitepunkt_b) return null;
    return { lat: Number(m.viitepunkt_b), lon: Number(m.viitepunkt_l), adr_id: m.adr_id };
  } catch { return null; }
}

async function main() {
  const data = JSON.parse(fs.readFileSync(DB, 'utf-8'));
  const listings = data.listings;
  
  // Only process failed ones
  const failed = listings.filter(l => !l.adr_id && l.addressRaw && l.addressRaw.length > 10);
  console.log(`Failed to retry: ${failed.length}`);
  
  let fixed = 0, stillFailed = 0;
  
  for (let i = 0; i < failed.length; i++) {
    const l = failed[i];
    const clean = cleanAddress(l.addressRaw);
    
    if (clean.length < 10) { stillFailed++; continue; }
    
    const geo = await geocode(clean);
    
    if (geo) {
      l.lat = geo.lat; l.lon = geo.lon; l.adr_id = geo.adr_id;
      fixed++;
    } else {
      // Try just first 2 parts as fallback
      const parts = clean.split(',').slice(0, 2).join(',');
      if (parts.length > 5 && parts !== clean) {
        const geo2 = await geocode(parts);
        if (geo2) { l.lat = geo2.lat; l.lon = geo2.lon; l.adr_id = geo2.adr_id; fixed++; continue; }
      }
      stillFailed++;
    }
    
    if (i % 1000 === 0 && i > 0) {
      console.log(`  ${i}/${failed.length} (${fixed} fixed, ${stillFailed} failed)`);
      data.listings = listings;
      fs.writeFileSync(DB, JSON.stringify(data, null, 2));
    }
    
  }
  
  data.listings = listings;
  fs.writeFileSync(DB, JSON.stringify(data, null, 2));
  console.log(`\nDone: ${fixed} fixed, ${stillFailed} still failed`);
  console.log(`Total precise: ${listings.filter(l=>l.adr_id).length}/${listings.length}`);
}

main().catch(console.error);
