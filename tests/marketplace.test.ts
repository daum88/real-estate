const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  findNearbyListings,
  haversineMeters,
  valuateProperty,
} = require('../lib/marketplace.ts');

// ─── Haversine ──────────────────────────────────────────────────
test('haversineMeters: Tallinn → Tartu is ~165km', () => {
  const d = haversineMeters(59.4369, 24.7536, 58.378, 26.729);
  assert.ok(d > 160000 && d < 170000, `expected ~165km, got ${d}m`);
});

test('haversineMeters: identical points are 0m', () => {
  assert.equal(haversineMeters(58.37, 26.72, 58.37, 26.72), 0);
});

// ─── Comparable selection ───────────────────────────────────────
test('findNearbyListings returns sane stats for Tartu', () => {
  const r = findNearbyListings('Tartu maakond, Tartu linn, Tartu linn, Riia tn 2', 60);
  assert.ok(r.listings.length > 0, 'should find Tartu comps');
  assert.ok(r.priceStats.count > 0, 'should have price stats');
  assert.ok(
    r.priceStats.medianPerSqm > 500 && r.priceStats.medianPerSqm < 10000,
    `median €/m² should be plausible, got ${r.priceStats.medianPerSqm}`
  );
  assert.ok(r.estimatedValue > 10000, 'estimatedValue should be computed for 60m²');
});

test('findNearbyListings: coordinates prioritise true proximity', () => {
  // Riia tn 2, Tartu (58.376987, 26.728910)
  const r = findNearbyListings(
    'Tartu maakond, Tartu linn, Tartu linn, Riia tn 2',
    60,
    undefined,
    15,
    false,
    { lat: 58.376987, lon: 26.72891 }
  );
  assert.ok(r.listings.length >= 3);
  // All top results must be within a reasonable radius of Tartu center.
  for (const l of r.listings.slice(0, 5)) {
    if (l.lat && l.lon) {
      const d = haversineMeters(58.376987, 26.72891, l.lat, l.lon);
      assert.ok(d < 15000, `comparable should be near Tartu, got ${Math.round(d)}m: ${l.addressRaw}`);
    }
  }
});

test('findNearbyListings: house filter excludes apartments', () => {
  const houses = findNearbyListings('Kambja vald, Ülenurme alevik, Aadli tn 2', 120, undefined, 10, true);
  for (const l of houses.listings) {
    assert.ok((l.id || '').startsWith('kvh_'), `expected house listing, got ${l.id}`);
  }
});

test('findNearbyListings: apartment filter excludes houses', () => {
  const apts = findNearbyListings('Kambja vald, Ülenurme alevik, Aadli tn 2', 60, undefined, 10, false);
  for (const l of apts.listings) {
    assert.ok(!(l.id || '').startsWith('kvh_'), `expected apartment listing, got ${l.id}`);
  }
});

// ─── Valuation ──────────────────────────────────────────────────
test('valuateProperty returns a finite, plausible value', () => {
  const v = valuateProperty('Tartu maakond, Tartu linn, Riia tn 2', {
    area: 60, rooms: 2, year: 2016,
  });
  assert.ok(Number.isFinite(v.estimatedTotal));
  assert.ok(v.estimatedTotal > 20000 && v.estimatedTotal < 400000, `got ${v.estimatedTotal}`);
  assert.ok(v.comparableCount > 0);
  assert.ok(v.estimatedPerSqm > 500 && v.estimatedPerSqm < 10000);
  assert.ok(v.priceRange.low <= v.priceRange.high);
});

test('valuateProperty: bigger area yields bigger total', () => {
  const small = valuateProperty('Tartu linn, Riia tn 2', { area: 40 });
  const big = valuateProperty('Tartu linn, Riia tn 2', { area: 90 });
  assert.ok(big.estimatedTotal > small.estimatedTotal);
});
