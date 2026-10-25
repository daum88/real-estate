/**
 * Scrape all HOUSE listings from KV.ee
 * Usage:
 *   1. Start Chrome: /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug
 *   2. In Chrome: go to kv.ee, accept cookies, solve captcha
 *   3. Run: node lib/scrape-houses.js
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');
puppeteer.use(StealthPlugin());

const OUTPUT = path.join(__dirname, '..', 'data', 'houses.json');
const delay = ms => new Promise(r => setTimeout(r, ms));

async function scrapeHouses(page, keyword = '', maxPages = 200, extraParams = '') {
  const all = [];
  let emptyStreak = 0;
  for (let start = 0; start < maxPages * 50; start += 50) {
    let baseUrl = keyword
      ? `https://www.kv.ee/search?keyword=${encodeURIComponent(keyword)}&type=house&dealType=1`
      : `https://www.kv.ee/search?type=house&dealType=1`;
    if (extraParams) baseUrl += '&' + extraParams;
    const url = start === 0 ? baseUrl : `${baseUrl}&start=${start}`;
    process.stdout.write(`  p${start/50+1}... `);
    try { await page.goto(url, { waitUntil: 'networkidle2', timeout: 15000 }); await delay(600); }
    catch { console.log('err'); break; }

    const listings = await page.evaluate(() => {
      const r = [];
      document.querySelectorAll('article.object-type-apartment, article.object-type-house').forEach(a => {
        try {
          const id = a.getAttribute('data-object-id') || '';
          const objUrl = a.getAttribute('data-object-url') || '';
          const url = objUrl ? 'https://www.kv.ee' + objUrl : '';
          const fullText = a.textContent.trim();
          // Table: Kirjeldus | Tube | Pind | Lisatud | Hind
          let tRooms = 0, tArea = 0, tPrice = 0, tPPSqm = 0;
          a.querySelectorAll('tr').forEach(row => {
            const c = row.querySelectorAll('td');
            if (c.length >= 4) {
              const rc = c[1]?.textContent?.trim(), ac = c[2]?.textContent?.trim(), pc = c[4]?.textContent?.trim();
              if (rc && /^\d+$/.test(rc)) tRooms = parseInt(rc);
              if (ac) { const m = ac.match(/(\d+[.,]\d+|\d+)\s*m²/i); if (m) tArea = parseFloat(m[1].replace(',','.')); }
              if (pc) { const pp = pc.split(/\s{2,}/); tPrice = parseInt((pp[0]||'').replace(/[^\d]/g,''))||0; tPPSqm = parseInt((pp[1]||'').replace(/[^\d]/g,''))||0; }
            }
          });
          const pe = tPrice || parseInt(((a.querySelector('.price')?.textContent||'').split(/\s{2,}/)[0]||'').replace(/[^\d]/g,''))||0;
          const ps = tPPSqm || parseInt(((a.querySelector('.price')?.textContent||'').split(/\s{2,}/)[1]||'').replace(/[^\d]/g,''))||0;
          const am = fullText.match(/(\d+[.,]\d+|\d+)\s*m²/i);
          const ar = tArea || (am ? parseFloat(am[1].replace(',','.')) : 0);
          let rm = tRooms;
          if (!rm) { const m = fullText.match(/(\d+)\s*[-:]?\s*(?:toaline|tubane|toal)/i) || fullText.match(/(\d+)\s*tuba/i); if (m) rm = parseInt(m[1]); }
          const fm = fullText.match(/Korrus\s+(\d+)\s*\/\s*(\d+)/i);
          const ym = fullText.match(/ehitusaasta\s+(\d{4})/i);
          const em = fullText.match(/energiaklass\s+([A-H])/i);
          const mm = fullText.match(/(kivimaja|puitmaja|paneelmaja|monoliit|palkmaja)/i);
          const hm = fullText.match(/(?:keskküte|gaasiküte|ahiküte|soojuspump|õhksoojuspump|maasoojuspump|elektriküte|pelleküte|kaugküte)/i);
          const addr = fullText.split(/Korrus|ehitusaasta/)[0].trim().substring(0,200);
          if (pe > 100 && ar > 0 && url) {
            r.push({ type:'house', id:'kvh_'+id, url, priceEur:pe, pricePerSqm:ps||Math.round(pe/ar), area:ar, rooms:rm,
              floor:fm?fm[1]+'/'+fm[2]:'', year:ym?parseInt(ym[1]):0, energyClass:em?em[1].toUpperCase():'',
              heating:hm?hm[1]:'', material:mm?mm[1]:'', addressRaw:addr });
          }
        } catch {}
      });
      return r;
    });

    const existingIds = new Set(all.map(l => l.id));
    const added = listings.filter(l => !existingIds.has(l.id));
    all.push(...added);
    console.log(`+${added.length} (${all.length})`);
    
    if (added.length === 0) {
      emptyStreak++;
      if (emptyStreak >= 3) { console.log('  No new listings — done!'); break; }
    } else {
      emptyStreak = 0;
    }
    
    // Save periodically
    if (all.length > 0 && all.length % 500 === 0) {
      fs.writeFileSync(OUTPUT, JSON.stringify({ timestamp: new Date().toISOString(), total: all.length, listings: all }, null, 2));
      process.stdout.write(' 💾');
    }
    
    if (listings.length < 10) break;
    await delay(500 + Math.random() * 500);
  }
  return all;
}

async function main() {
  console.log('Connecting to Chrome...');
  const browser = await puppeteer.connect({ browserURL: 'http://localhost:9222', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages[0] || await browser.newPage();
  console.log('Connected!\n');

  // PASS 1: Energy class filters for houses
  console.log('--- Energy class ---');
  let all = [];
  for (const ec of ['A','B','C','D','E','F','G','H']) {
    process.stdout.write(`  ${ec}... `);
    const l = await scrapeHouses(page, '', 3, `energy_certs=${ec}`);
    all.push(...l.filter(x => !all.find(e => e.id === x.id)));
    console.log(`+${l.length} (${all.length})`);
  }

  // PASS 2: ALL houses
  console.log('\n--- ALL houses ---');
  const bulk = await scrapeHouses(page, '', 200);
  all.push(...bulk.filter(x => !all.find(e => e.id === x.id)));
  console.log(`Total: ${all.length}`);

  // Merge with apartments DB
  const aptDB = path.join(__dirname, '..', 'data', 'all_listings.json');
  if (fs.existsSync(aptDB)) {
    const apt = JSON.parse(fs.readFileSync(aptDB, 'utf-8'));
    const aptIds = new Set((apt.listings||[]).map(l => l.id));
    const newHouses = all.filter(h => !aptIds.has(h.id));
    apt.listings.push(...newHouses);
    apt.total = apt.listings.length;
    fs.writeFileSync(aptDB, JSON.stringify(apt, null, 2));
    console.log(`Merged: +${newHouses.length} houses into all_listings.json (total: ${apt.listings.length})`);
  }

  // Also save standalone houses file
  fs.writeFileSync(OUTPUT, JSON.stringify({ timestamp: new Date().toISOString(), total: all.length, listings: all }, null, 2));
  console.log(`Saved houses.json: ${all.length}`);
  await browser.disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
