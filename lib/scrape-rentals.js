/**
 * SCRAPE ALL RENTAL APARTMENTS from KV.ee
 * 
 * Connect to Chrome first: 
 * /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug
 * 
 * Then: node lib/scrape-rentals.js
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');
puppeteer.use(StealthPlugin());

const delay = ms => new Promise(r => setTimeout(r, ms));
const OUT = path.join(__dirname, '..', 'data', 'rentals.json');
const DB = path.join(__dirname, '..', 'data', 'all_listings.json');

async function scrapeRentals(page) {
  const all = [];
  
  for (let start = 0; start < 10000; start += 50) {
    const url = start === 0
      ? 'https://www.kv.ee/search?deal_type=2'
      : `https://www.kv.ee/search?deal_type=2&start=${start}`;
    
    try { await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 }); await delay(300); }
    catch { break; }

    const { listings, done } = await page.evaluate(() => {
      const body = document.body?.textContent || '';
      if (body.includes('tulemusi ei leitud') || body.includes('ei andnud tulemust') || body.includes('Selliste filtritega')) return { listings: [], done: true };
      
      const results = [];
      document.querySelectorAll('article.object-type-apartment').forEach(a => {
        try {
          const id = a.getAttribute('data-object-id') || '';
          const objUrl = a.getAttribute('data-object-url') || '';
          const url = objUrl ? 'https://www.kv.ee' + objUrl : '';
          
          let tRooms = 0, tArea = 0, tRent = 0;
          a.querySelectorAll('tr').forEach(row => {
            const c = row.querySelectorAll('td');
            if (c.length >= 4) {
              if (c[1]?.textContent?.trim()?.match(/^\d+$/)) tRooms = parseInt(c[1].textContent.trim());
              const am = c[2]?.textContent?.trim()?.match(/(\d+[.,]\d+|\d+)\s*m²/i);
              if (am) tArea = parseFloat(am[1].replace(',','.'));
              // Rental price: extract ONLY the number directly before € symbol
              const cellText = c[4]?.textContent || '';
              const m = cellText.match(/(\d{2,4})\s*€/);
              if (m) tRent = parseInt(m[1]);
            }
          });
          
          const fullText = a.textContent.trim();
          const am2 = fullText.match(/(\d+[.,]\d+|\d+)\s*m²/i);
          const ar = tArea || (am2 ? parseFloat(am2[1].replace(',','.')) : 0);
          const rm = tRooms || 0;
          // Fallback rent extraction
          let rent = tRent;
          if (!rent) {
            const priceEl = a.querySelector('.price');
            if (priceEl) {
              const pm = priceEl.textContent.trim().match(/(\d[\d\s]*)\s*€/);
              if (pm) rent = parseInt(pm[1].replace(/\s/g,''));
              if (rent > 10000) rent = 0;
            }
          }
          if (!rent) {
            const rm2 = fullText.match(/(\d[\d\s]*)\s*€\s*\/\s*kuu/i);
            if (rm2) rent = parseInt(rm2[1].replace(/\s/g,''));
            if (rent > 10000) rent = 0;
          }
          const fm = fullText.match(/Korrus\s+(\d+)\s*\/\s*(\d+)/i);
          const ym = fullText.match(/ehitusaasta\s+(\d{4})/i);
          const mm = fullText.match(/(kivimaja|puitmaja|paneelmaja|monoliit|palkmaja)/i);
          const em = fullText.match(/energiaklass\s+([A-H])/i);
          const addr = fullText.split(/Korrus|ehitusaasta/)[0].trim().substring(0,200);
          
          if (rent > 50 && ar > 0 && url) {
            results.push({
              type: 'rental', id: 'kvr_' + id, url, monthlyRent: rent, area: ar, rooms: rm,
              floor: fm?fm[1]+'/'+fm[2]:'', year: ym?parseInt(ym[1]):0,
              energyClass: em?em[1].toUpperCase():'', material: mm?mm[1]:'',
              addressRaw: addr, rentPerSqm: Math.round(rent/ar),
            });
          }
        } catch {}
      });
      return { listings: results, done: false };
    });

    if (done) break;
    
    const existingIds = new Set(all.map(l => l.id));
    const added = listings.filter(l => !existingIds.has(l.id));
    all.push(...added);
    
    if (start === 0) console.log(`  p1: ${added.length} rentals`);
    else console.log(`  +${added.length} (${all.length})`);
    
    if (all.length > 0 && all.length % 500 === 0) {
      fs.writeFileSync(OUT, JSON.stringify({ timestamp: new Date().toISOString(), total: all.length, rentals: all }, null, 2));
      console.log('  💾 saved');
    }
    
    if (listings.length < 10) break;
    await delay(500);
  }
  return all;
}

async function main() {
  console.log('Scraping RENTAL apartments with filters...\n');
  const browser = await puppeteer.connect({ browserURL: 'http://localhost:9222', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages[0] || await browser.newPage();
  
  const allRentals = [];

  // Filter passes — same as sale scraper but for rentals
  const filters = [
    ...['A','B','C','D','E','F','G','H'].map(ec => ({ label: `Energy ${ec}`, params: `energy_certs=${ec}`, field: {} })),
    ...[1,2,3,4,5,6].map(r => ({ label: `${r}r`, params: `rooms_min=${r}&rooms_max=${r}`, field: { rooms: r } })),
    { label: 'kivimaja', params: 'structure%5B0%5D=9', field: { material: 'kivimaja' } },
    { label: 'puitmaja', params: 'structure%5B0%5D=10', field: { material: 'puitmaja' } },
    { label: 'paneelmaja', params: 'structure%5B0%5D=11', field: { material: 'paneelmaja' } },
  ];

  for (const f of filters) {
    process.stdout.write(`  ${f.label}... `);
    const ids = [];
    let emptyStreak = 0;
    for (let start = 0; start < 5000; start += 50) {
      // Safety: if we've gone through 30+ pages of 40+ results each, these are suggestions
      const url = start === 0
        ? `https://www.kv.ee/search?deal_type=2&${f.params}`
        : `https://www.kv.ee/search?deal_type=2&${f.params}&start=${start}`;
      try { await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 8000 }); await delay(200); } catch { break; }
      const result = await page.evaluate(() => {
        const b = document.body?.textContent || '';
        if (b.includes('tulemusi ei leitud') || b.includes('ei andnud tulemust') || b.includes('Selliste filtritega')) return { ids: [], done: true };
        return { ids: Array.from(document.querySelectorAll('article.object-type-apartment')).map(a => a.getAttribute('data-object-id')).filter(Boolean), done: false };
      });
      if (result.done || result.ids.length === 0) { emptyStreak++; if (emptyStreak >= 2) break; continue; }
      emptyStreak = 0;
      const newIds = result.ids.filter(id => !ids.includes(id));
      ids.push(...result.ids);
      if (start === 0) process.stdout.write(`${result.ids.length}`);
      else if (newIds.length > 0) process.stdout.write(` +${newIds.length}`);
      else { process.stdout.write('.'); emptyStreak++; if (emptyStreak >= 2) break; }
      await delay(100);
    }
    const uniqueCount = [...new Set(ids)].length;
    console.log(` → ${uniqueCount} IDs`);
    
    // Update rental listings with guaranteed fields
    const prefix = 'kvr_';
    for (const rawId of ids) {
      const fullId = prefix + rawId;
      let entry = allRentals.find(l => l.id === fullId);
      if (!entry) {
        entry = { type: 'rental', id: fullId, url: '', monthlyRent: 0, area: 0, rooms: 0, floor: '', year: 0, energyClass: '', material: '', addressRaw: '', rentPerSqm: 0 };
        allRentals.push(entry);
      }
      for (const [k, v] of Object.entries(f.field)) {
        if (!entry[k] || entry[k] === 0 || entry[k] === '') entry[k] = v;
      }
    }
  }

  // Bulk scrape — get actual listing data
  console.log('\n--- Bulk scrape (all rentals) ---');
  const bulk = await scrapeRentals(page);
  for (const r of bulk) {
    const existing = allRentals.find(l => l.id === r.id);
    if (!existing) { allRentals.push(r); }
    else { Object.assign(existing, r); }
  }
  
  // Save rentals file
  fs.writeFileSync(OUT, JSON.stringify({ timestamp: new Date().toISOString(), total: allRentals.length, rentals: allRentals }, null, 2));
  console.log(`\nSaved ${allRentals.length} rentals to rentals.json`);
  
  // Calculate yield estimates from sale listings in same areas
  if (fs.existsSync(DB)) {
    const saleDB = JSON.parse(fs.readFileSync(DB, 'utf-8'));
    const sales = saleDB.listings || [];
    
    // Match rentals to sale listings by area/rooms/city for yield calc
    let yieldData = [];
    for (const r of allRentals.slice(0, 500)) {
      const matches = sales.filter(s => 
        s.type !== 'rental' && s.type !== 'house' &&
        Math.abs(s.area - r.area) / r.area < 0.2 &&
        s.rooms === r.rooms &&
        s.rooms > 0 && s.priceEur > 0
      );
      if (matches.length >= 3) {
        const avgPrice = matches.reduce((sum, s) => sum + s.priceEur, 0) / matches.length;
        const annualRent = r.monthlyRent * 12;
        const grossYield = ((annualRent / avgPrice) * 100).toFixed(1);
        yieldData.push({
          rentalId: r.id,
          address: r.addressRaw?.substring(0, 60),
          monthlyRent: r.monthlyRent,
          area: r.area,
          rooms: r.rooms,
          estimatedValue: Math.round(avgPrice),
          grossYield: parseFloat(grossYield),
          comparables: matches.length,
        });
      }
    }
    
    yieldData.sort((a, b) => b.grossYield - a.grossYield);
    fs.writeFileSync(path.join(__dirname, '..', 'data', 'rental_yields.json'), 
      JSON.stringify({ timestamp: new Date().toISOString(), total: yieldData.length, yields: yieldData }, null, 2));
    
    console.log(`Yield data: ${yieldData.length} properties with yield estimates`);
    console.log('Sample yields:');
    yieldData.slice(0, 5).forEach(y => 
      console.log(`  ${y.grossYield}% | €${y.monthlyRent}/mo | ${y.area}m² | ${y.rooms}r | ~€${y.estimatedValue} value | ${y.address}`)
    );
  }
  
  await browser.disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
