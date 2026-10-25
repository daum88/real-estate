const fs = require('fs');

async function main() {
  const d = JSON.parse(fs.readFileSync('data/all_listings.json','utf-8'));
  const toGeocode = d.listings.filter(l => !l.isPrecise && l.cleanAddr && l.cleanAddr.length > 10);
  console.log('To geocode (cleaned):', toGeocode.length);

  let ok = 0, fail = 0;
  for (let i = 0; i < toGeocode.length; i++) {
    const l = toGeocode[i];
    const url = 'https://inaadress.maaamet.ee/inaadress/gazetteer?address=' + encodeURIComponent(l.cleanAddr);
    try {
      // Race fetch against a 3-second timeout
      const result = await Promise.race([
        fetch(url).then(r => r.json()),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
      ]);
      const m = result?.addresses?.[0];
      if (m?.viitepunkt_b) {
        l.lat = Number(m.viitepunkt_b); l.lon = Number(m.viitepunkt_l);
        l.adr_id = m.adr_id; l.isPrecise = true; ok++;
      } else { fail++; }
    } catch(e) { fail++; }
    if (i % 100 === 0) {
      console.log('  ' + i + '/' + toGeocode.length + ' (' + ok + ' ok, ' + fail + ' fail)');
      fs.writeFileSync('data/all_listings.json', JSON.stringify(d, null, 2));
    }
  }
  fs.writeFileSync('data/all_listings.json', JSON.stringify(d, null, 2));
  console.log('Done:', ok, 'ok,', fail, 'fail');
  console.log('Total precise:', d.listings.filter(l => l.isPrecise).length);
}
main().catch(e => { console.error(e); process.exit(1); });
