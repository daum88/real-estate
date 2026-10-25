const { test } = require('node:test');
const assert = require('node:assert/strict');
const { predictPricePerSqm, getModelInfo } = require('../lib/ml-model.js');

const baseProps = {
  area: 60, rooms: 2, year: 2015, floorRatio: 0.6, energyNum: 3,
  lat: 59.4369, lon: 24.7536,
  matStone: 1, matWood: 0, matPanel: 0,
  isNew: 0, isRenovated: 1,
  comp_avg_price_sqm_1km: 3200, comp_count_1km: 40,
  hasBalcony: 1, hasSauna: 0, hasParking: 0, hasStorage: 1,
};

const spatial = { comp_avg_price_sqm_1km: 3200, comp_count_1km: 40 };

test('model loads with expected metadata', () => {
  const info = getModelInfo();
  assert.ok(info, 'model info should be available');
  assert.equal(info.available, true);
  assert.equal(info.trees, 1200);
  assert.equal(info.features.length, 20);
  assert.deepEqual(info.features.slice(0, 3), ['area', 'rooms', 'year']);
});

test('predicts a sane €/m² value for a typical apartment', () => {
  const v = predictPricePerSqm(baseProps, spatial);
  assert.equal(typeof v, 'number');
  assert.ok(v > 500 && v < 10000, `expected a plausible €/m², got ${v}`);
});

test('predicts lower values for a cheap rural property than a premium new build', () => {
  const cheap = predictPricePerSqm({
    ...baseProps, year: 1970, isNew: 0, isRenovated: 0, matStone: 0, matPanel: 1,
    energyNum: 7, comp_avg_price_sqm_1km: 700, comp_count_1km: 3,
    hasBalcony: 0, hasSauna: 0, hasParking: 0, hasStorage: 0,
  }, { comp_avg_price_sqm_1km: 700, comp_count_1km: 3 });

  const premium = predictPricePerSqm({
    ...baseProps, year: 2024, isNew: 1, isRenovated: 1, energyNum: 1,
    comp_avg_price_sqm_1km: 4500, comp_count_1km: 60,
    hasSauna: 1, hasParking: 1,
  }, { comp_avg_price_sqm_1km: 4500, comp_count_1km: 60 });

  assert.equal(typeof cheap, 'number');
  assert.equal(typeof premium, 'number');
  assert.ok(cheap <= premium, `expected cheap (${cheap}) <= premium (${premium})`);
});

test('returns a number when optional feature fields are missing', () => {
  const v = predictPricePerSqm({ area: 50, rooms: 2, year: 2005 }, {});
  assert.equal(typeof v, 'number');
});
