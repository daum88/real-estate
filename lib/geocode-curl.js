const fs = require('fs');
const { execSync } = require('child_process');

const d = JSON.parse(fs.readFileSync('data/all_listings.json','utf-8'));
const toGeocode = d.listings.filter(l => !l.isPrecise && l.fixedAddr && l.fixedAddr.length > 10);
console.log('Geocoding', toGeocode.length, 'with curl...');

let ok = 0;
for (let i = 0; i < toGeocode.length; i++) {
  const l = toGeocode[i];
  try {
    const result = execSync(
      'curl -s --max-time 3 "https://inaadress.maaamet.ee/inaadress/gazetteer?address=' + 
      encodeURIComponent(l.fixedAddr) + '"',
      { encoding: 'utf-8', timeout: 4000, stdio: ['pipe','pipe','ignore'] }
    );
    const data = JSON.parse(result);
    if (data.addresses?.[0]?.viitepunkt_b) {
      l.lat = Number(data.addresses[0].viitepunkt_b);
      l.lon = Number(data.addresses[0].viitepunkt_l);
      l.adr_id = data.addresses[0].adr_id;
      l.isPrecise = true; ok++;
    }
  } catch(e) {}
  if (i % 200 === 0) {
    console.log('  ' + i + '/' + toGeocode.length + ' (' + ok + ' ok)');
    fs.writeFileSync('data/all_listings.json', JSON.stringify(d, null, 2));
  }
}
fs.writeFileSync('data/all_listings.json', JSON.stringify(d, null, 2));
console.log('Done:', ok, 'ok');
console.log('Total precise:', d.listings.filter(l => l.isPrecise).length);
