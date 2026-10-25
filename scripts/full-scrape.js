/**
 * COMPREHENSIVE SCRAPER — All filters, all pages, all listings
 * 
 * Connect to Chrome: /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug
 * Then: node scripts/full-scrape.js [apartments|houses]
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');
puppeteer.use(StealthPlugin());

const delay = ms => new Promise(r => setTimeout(r, ms));
const OUT = path.join(__dirname, '..', 'data', 'all_listings.json');

function loadDB() {
  // Create backup before touching
  const bak = OUT.replace('.json', '_backup_' + new Date().toISOString().replace(/:/g,'-').substring(0,19) + '.json');
  if (fs.existsSync(OUT)) fs.copyFileSync(OUT, bak);
  try { return JSON.parse(fs.readFileSync(OUT, 'utf-8')); } catch { return { listings: [] }; }
} }
function saveDB(d) { fs.writeFileSync(OUT, JSON.stringify(d, null, 2)); }

async function scrapeAllPages(page, baseParams, guaranteedFields, label) {
  const allIds = [];
  let emptyStreak = 0;

  for (let start = 0; start < 5000; start += 50) {
    const url = start === 0
      ? `https://www.kv.ee/search?${baseParams}`
      : `https://www.kv.ee/search?${baseParams}&start=${start}`;
    
    try { await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 }); await delay(300); }
    catch { break; }

    const { ids, noResults } = await page.evaluate(() => {
      const body = document.body?.textContent || '';
      if (body.includes('tulemusi ei leitud') || body.includes('ei andnud tulemust')) return { ids: [], noResults: true };
      return {
        noResults: false,
        ids: Array.from(document.querySelectorAll('article.object-type-apartment'))
          .map(a => a.getAttribute('data-object-id')).filter(Boolean)
      };
    });

    if (noResults || ids.length === 0) { emptyStreak++; if (emptyStreak >= 2) break; continue; }
    
    // If first page has 0 new listings, this filter is done (all already in DB)
    if (start === 0 && ids.every(id => allIds.includes(id))) { console.log(' (already in DB)'); break; }
    
    emptyStreak = 0;
    const newIds = ids.filter(id => !allIds.includes(id));
    allIds.push(...ids);
    if (start === 0) process.stdout.write(`  ${label}: ${ids.length}`);
    else process.stdout.write(newIds.length > 0 ? ` +${newIds.length}` : '.');
    
    if (newIds.length === 0) { emptyStreak++; if (emptyStreak >= 2) { console.log(' done'); break; } }
    await delay(200);
  }

  // Merge guaranteed fields into DB
  const db = loadDB();
  let updated = 0, created = 0;
  for (const rawId of allIds) {
    const id = (baseParams.includes('type=house') ? 'kvh_' : 'kv_') + rawId;
    let entry = db.listings.find(l => l.id === id);
    if (!entry) {
      entry = { id, url: '', priceEur: 0, pricePerSqm: 0, area: 0, rooms: 0, floor: '', year: 0, energyClass: '', heating: '', material: '', condition: '', addressRaw: '' };
      db.listings.push(entry); created++;
    }
    let changed = false;
    for (const [k, v] of Object.entries(guaranteedFields)) {
      if (!entry[k] || entry[k] === '' || entry[k] === 0) { entry[k] = v; changed = true; }
    }
    if (changed) updated++;
  }
  saveDB(db);
  console.log(` → ${[...new Set(allIds)].length} unique, ${updated} upd, ${created} new`);
  return { updated, created };
}

async function main() {
  const type = process.argv[2] || 'apartments';
  const typeParam = type === 'houses' ? 'type=house' : 'type=apartment';
  console.log(`FULL SCRAPE: ${type} (${typeParam})\n`);

  const browser = await puppeteer.connect({ browserURL: 'http://localhost:9222', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages[0] || await browser.newPage();

  let total = 0;

  // AMENITIES (skip if already have good coverage)
  console.log('=== AMENITIES ===');
  for (const [code, name] of [['14','sauna'],['31','balcony'],['38','parking'],['84','storage']]) {
    const r = await scrapeAllPages(page, `${typeParam}&dealType=1&f%5B${code}%5D=1`, {}, name);
    console.log(`  ${name}: ${r.updated} upd, ${r.created} new`);
    total += r.updated + r.created;
  }

  // 6. ALL LISTINGS BULK — use broader search to catch everything
  console.log('\n=== ALL LISTINGS (bulk) ===');
  // Use a keywordless search with no filters to get EVERY listing
  for (let start = 0; start < 10000; start += 50) {
    const url = start === 0
      ? `https://www.kv.ee/search?${typeParam}&dealType=1`
      : `https://www.kv.ee/search?${typeParam}&dealType=1&start=${start}`;
    try { await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 }); await delay(300); } catch { break; }
    
    const result = await page.evaluate(() => {
      const body = document.body?.textContent || '';
      if (body.includes('tulemusi ei leitud')) return { ids: [], done: true };
      const ids = Array.from(document.querySelectorAll('article.object-type-apartment'))
        .map(a => a.getAttribute('data-object-id')).filter(Boolean);
      // Also extract price, area, rooms, floor, year, address from table
      const listings = [];
      document.querySelectorAll('article.object-type-apartment').forEach(a => {
        try {
          const id = a.getAttribute('data-object-id') || '';
          const objUrl = a.getAttribute('data-object-url') || '';
          const url = objUrl ? 'https://www.kv.ee' + objUrl : '';
          let tRooms = 0, tArea = 0, tPrice = 0, tPPSqm = 0;
          a.querySelectorAll('tr').forEach(row => {
            const c = row.querySelectorAll('td');
            if (c.length >= 4) {
              if (c[1]?.textContent?.trim()?.match(/^\d+$/)) tRooms = parseInt(c[1].textContent.trim());
              const am = c[2]?.textContent?.trim()?.match(/(\d+[.,]\d+|\d+)\s*m²/i);
              if (am) tArea = parseFloat(am[1].replace(',','.'));
              const pp = (c[4]?.textContent?.trim()||'').split(/\s{2,}/);
              tPrice = parseInt((pp[0]||'').replace(/[^\d]/g,''))||0;
              tPPSqm = parseInt((pp[1]||'').replace(/[^\d]/g,''))||0;
            }
          });
          const fullText = a.textContent.trim();
          const am2 = fullText.match(/(\d+[.,]\d+|\d+)\s*m²/i);
          const ar = tArea || (am2 ? parseFloat(am2[1].replace(',','.')) : 0);
          const rm = tRooms || 0;
          const fm = fullText.match(/Korrus\s+(\d+)\s*\/\s*(\d+)/i);
          const ym = fullText.match(/ehitusaasta\s+(\d{4})/i);
          const em = fullText.match(/energiaklass\s+([A-H])/i);
          const mm = fullText.match(/(kivimaja|puitmaja|paneelmaja|monoliit|palkmaja)/i);
          const hm = fullText.match(/(?:keskküte|gaasiküte|ahiküte|soojuspump)/i);
          const addr = fullText.split(/Korrus|ehitusaasta/)[0].trim().substring(0,200);
          if (tPrice > 100 && ar > 0 && url) {
            listings.push({ id, url, priceEur: tPrice, pricePerSqm: tPPSqm||Math.round(tPrice/ar), area: ar, rooms: rm,
              floor: fm?fm[1]+'/'+fm[2]:'', year: ym?parseInt(ym[1]):0, energyClass: em?em[1].toUpperCase():'',
              heating: hm?hm[1]:'', material: mm?mm[1]:'', addressRaw: addr });
          }
        } catch {}
      });
      return { ids, listings, done: false };
    });

    if (result.done) break;
    
    // Merge into DB
    const db = loadDB();
    const prefix = typeParam.includes('house') ? 'kvh_' : 'kv_';
    let added = 0, updated = 0;
    for (const l of result.listings) {
      const fullId = prefix + l.id;
      let entry = db.listings.find(e => e.id === fullId);
      if (!entry) {
        entry = { ...l, id: fullId, energyClass: l.energyClass||'', heating: l.heating||'', material: l.material||'', condition: '' };
        db.listings.push(entry); added++;
      } else {
        let ch = false;
        for (const k of ['priceEur','pricePerSqm','area','rooms','floor','year','energyClass','heating','material']) {
          if (l[k] && (!entry[k] || entry[k] === 0 || entry[k] === '')) { entry[k] = l[k]; ch = true; }
        }
        if (ch) updated++;
        if (!entry.url && l.url) entry.url = l.url;
      }
    }
    saveDB(db);
    process.stdout.write(start === 0 ? `\n  p1: +${added} new, ${updated} upd` : ` +${added}`);
    if (result.listings.length < 10) break;
    await delay(500);
  }

  const db = loadDB();
  console.log(`\n=== DONE: ${total} fields filled ===`);
  console.log(`Total DB: ${db.listings.length} listings`);
  const l = db.listings;
  console.log(`  Rooms: ${l.filter(x=>x.rooms>0).length} (${(l.filter(x=>x.rooms>0).length/l.length*100).toFixed(0)}%)`);
  console.log(`  Energy: ${l.filter(x=>x.energyClass).length}`);
  console.log(`  Material: ${l.filter(x=>x.material).length} (${(l.filter(x=>x.material).length/l.length*100).toFixed(0)}%)`);
  console.log(`  Condition: ${l.filter(x=>x.condition).length}`);
  await browser.disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
