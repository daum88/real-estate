import fs from 'fs';
import path from 'path';
import type { MarketplaceListing } from './types';

const DB_PATH = path.join(process.cwd(), 'data', 'all_listings.json');

interface ScrapedListing {
  id: string; url: string; priceEur: number; pricePerSqm: number;
  area: number; rooms: number; floor: string; year: number;
  addressRaw: string; energyClass?: string; heating?: string;
  material?: string; condition?: string; ownership?: string;
}

interface ParsedListing extends ScrapedListing {
  city: string;
  district: string;
  street: string;
  pricePerSqm: number;
}

// ═══════════════════════════════════════════════════════════════
// Database loading with cache
// ═══════════════════════════════════════════════════════════════

let _db: ParsedListing[] | null = null;
let _dbTime = 0;

function loadDB(): ParsedListing[] {
  if (_db && (Date.now() - _dbTime) < 30000) return _db;
  try {
    if (!fs.existsSync(DB_PATH)) return (_db = []);
    const raw = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
    const listings: ScrapedListing[] = raw.listings || [];
    _db = listings.map(parseAddress).filter(l => 
      l.priceEur > 0 && l.area > 0 && l.area < 400 && l.pricePerSqm > 100
    );
    _dbTime = Date.now();
    return _db;
  } catch { return (_db = []); }
}

// ═══════════════════════════════════════════════════════════════
// Address parsing — extract city, district, street from raw text
// ═══════════════════════════════════════════════════════════════

function parseAddress(l: ScrapedListing): ParsedListing {
  const raw = (l.addressRaw || '').replace(/BRONEERITUD\s+\d+\s+/, '').trim();
  const parts = raw.split(',').map(p => p.trim()).filter(Boolean);

  // KV.ee format: "Street, District, City linn, County" or "District, City, County"
  let street = parts[0] || '';
  let district = '';
  let city = '';

  if (parts.length >= 3) {
    street = parts[0];
    district = parts[1];
    city = parts[2];
  } else if (parts.length === 2) {
    district = parts[0];
    city = parts[1];
  } else {
    city = raw;
  }

  // Clean up city
  city = city.replace(/linn$/, '').trim();
  district = district.replace(/linnaosa$/, '').trim();

  // Ensure price per sqm is calculated
  const ppsqm = l.pricePerSqm > 0 ? l.pricePerSqm 
    : l.area > 0 ? Math.round(l.priceEur / l.area) : 0;

  return { ...l, city, district, street, pricePerSqm: ppsqm };
}

// ═══════════════════════════════════════════════════════════════
// Normalize text for matching
// ═══════════════════════════════════════════════════════════════

function norm(s: string): string {
  return s.toLowerCase()
    .replace(/[ä]/g, 'a').replace(/[ö]/g, 'o')
    .replace(/[ü]/g, 'u').replace(/[õ]/g, 'o')
    .replace(/[^a-z0-9]/g, ' ');
}

// ═══════════════════════════════════════════════════════════════
// Find listings near an address
// ═══════════════════════════════════════════════════════════════

export interface NearbyResult {
  listings: MarketplaceListing[];
  priceStats: {
    median: number;
    avg: number;
    min: number;
    max: number;
    count: number;
    medianPerSqm: number;
  };
  estimatedValue: number | null;
  similarByRooms: MarketplaceListing[];
  similarByArea: MarketplaceListing[];
}

export function findNearbyListings(
  address: string,
  buildingArea?: number,
  buildingRooms?: number,
  limit = 15,
  isHouse?: boolean
): NearbyResult {
  let db = loadDB();
  
  // Filter by property type
  if (isHouse === true) {
    db = db.filter(l => (l.id || '').startsWith('kvh_'));
  } else if (isHouse === false) {
    db = db.filter(l => !(l.id || '').startsWith('kvh_'));
  }
  if (!db.length) return emptyResult();

  // Parse the search address
  const addrNorm = norm(address);
  const addrParts = address.toLowerCase().split(',').map(p => p.trim());

  // Extract city and district from address
  const cityPart = addrParts.find(p => p.includes('linn') || p.includes('vald') || p.includes('alevik')) || '';
  const cityName = cityPart.split(' ')[0]?.replace('linn', '').replace('vald', '') || '';
  const districtPart = addrParts.find(p => p.includes('linnaosa') || p.includes('asum')) || '';
  const streetPart = addrParts[addrParts.length - 1]?.split(' ')[0] || '';

  // Score each listing
  const scored = db.map(l => {
    let score = 0;
    const ln = norm(l.city + ' ' + l.district + ' ' + l.street + ' ' + l.addressRaw);

    // City match
    if (cityName && norm(l.city).includes(norm(cityName))) score += 20;
    // District match
    if (districtPart && norm(l.district).includes(norm(districtPart.split(' ')[0] || ''))) score += 10;
    // Street match
    if (streetPart && norm(l.street).includes(norm(streetPart))) score += 15;
    // County match
    const county = addrParts.find(p => p.includes('maakond'));
    if (county && ln.includes(norm(county))) score += 5;
    // Token overlap
    for (const token of addrNorm.split(/\s+/).filter(t => t.length > 3)) {
      if (ln.includes(token)) score += 2;
    }

    return { listing: l, score };
  });

  // Get scored matches
  const matches = scored
    .filter(s => s.score >= 5)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  // If no good matches, use city-level matches
  const useListings = matches.length >= 3 ? matches 
    : scored.filter(s => s.score >= 2).sort((a, b) => b.score - a.score).slice(0, limit);

  const nearbyListings = useListings.map(s => s.listing);

  // Price statistics from nearby
  const prices = nearbyListings.map(l => l.pricePerSqm).filter(p => p > 0).sort((a, b) => a - b);
  const priceStats = {
    median: prices.length > 0 ? prices[Math.floor(prices.length / 2)] : 0,
    avg: prices.length > 0 ? Math.round(prices.reduce((s, p) => s + p, 0) / prices.length) : 0,
    min: prices[0] || 0,
    max: prices[prices.length - 1] || 0,
    count: prices.length,
    medianPerSqm: prices.length > 0 ? prices[Math.floor(prices.length / 2)] : 0,
  };

  // Estimated value
  const estimatedValue = buildingArea && priceStats.medianPerSqm > 0
    ? Math.round(buildingArea * priceStats.medianPerSqm)
    : null;

  // Similar by rooms
  const similarByRooms = buildingRooms
    ? db.filter(l => l.rooms === buildingRooms && l.city === (nearbyListings[0]?.city || ''))
        .sort((a, b) => a.pricePerSqm - b.pricePerSqm)
        .slice(0, 8)
    : [];

  // Similar by area
  const similarByArea = buildingArea
    ? db.filter(l => {
        const areaDiff = Math.abs(l.area - buildingArea);
        return areaDiff < 20 && l.city === (nearbyListings[0]?.city || '');
      })
      .sort((a, b) => a.pricePerSqm - b.pricePerSqm)
      .slice(0, 8)
    : [];

  return {
    listings: nearbyListings.map(toMarketplace),
    priceStats,
    estimatedValue,
    similarByRooms: similarByRooms.map(toMarketplace),
    similarByArea: similarByArea.map(toMarketplace),
  };
}

// ═══════════════════════════════════════════════════════════════
// Search/filter listings
// ═══════════════════════════════════════════════════════════════

export function searchListings(filters: {
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  minArea?: number;
  maxArea?: number;
  rooms?: number;
  minYear?: number;
  material?: string;
  limit?: number;
}): MarketplaceListing[] {
  let results = loadDB();

  if (filters.city) {
    const cn = norm(filters.city);
    results = results.filter(l => norm(l.city).includes(cn) || norm(l.district).includes(cn));
  }
  if (filters.minPrice) results = results.filter(l => l.priceEur >= filters.minPrice!);
  if (filters.maxPrice) results = results.filter(l => l.priceEur <= filters.maxPrice!);
  if (filters.minArea) results = results.filter(l => l.area >= filters.minArea!);
  if (filters.maxArea) results = results.filter(l => l.area <= filters.maxArea!);
  if (filters.rooms) results = results.filter(l => l.rooms === filters.rooms);
  if (filters.minYear) results = results.filter(l => l.year >= filters.minYear!);
  if (filters.material) results = results.filter(l => l.material === filters.material);

  return results
    .sort((a, b) => a.pricePerSqm - b.pricePerSqm)
    .slice(0, filters.limit || 50)
    .map(toMarketplace);
}

// ═══════════════════════════════════════════════════════════════
// Database stats
// ═══════════════════════════════════════════════════════════════

export function getDatabaseStats() {
  const db = loadDB();
  const cities: Record<string, number> = {};
  const materials: Record<string, number> = {};
  const rooms: Record<string, number> = {};
  let totalPrice = 0, totalArea = 0;

  db.forEach(l => {
    const c = l.city || 'Unknown';
    cities[c] = (cities[c] || 0) + 1;
    if (l.material) materials[l.material] = (materials[l.material] || 0) + 1;
    rooms[String(l.rooms)] = (rooms[String(l.rooms)] || 0) + 1;
    totalPrice += l.priceEur;
    totalArea += l.area;
  });

  return {
    total: db.length,
    avgPrice: db.length > 0 ? Math.round(totalPrice / db.length) : 0,
    avgArea: db.length > 0 ? Math.round(totalArea / db.length) : 0,
    avgPricePerSqm: db.length > 0 ? Math.round(totalPrice / totalArea) : 0,
    cities: Object.entries(cities).sort((a, b) => b[1] - a[1]).slice(0, 15),
    materials,
    rooms,
  };
}

// ═══════════════════════════════════════════════════════════════
// Convert to MarketplaceListing type
// ═══════════════════════════════════════════════════════════════

function toMarketplace(l: ParsedListing): MarketplaceListing {
  return {
    id: l.id,
    source: 'kv.ee',
    url: l.url,
    currentPrice: l.priceEur,
    pricePerSqm: l.pricePerSqm,
    area: l.area,
    rooms: l.rooms,
    floorNumber: l.floor,
    daysOnMarket: 0,
    priceHistory: [],
    addressRaw: l.addressRaw,
    title: `${l.rooms > 0 ? l.rooms + '-room ' : ''}${l.area}m² ${l.city}${l.year > 0 ? ' (' + l.year + ')' : ''}`,
    year: l.year,
    energyClass: l.energyClass || '',
    heating: l.heating || '',
    material: l.material || '',
  };
}

function emptyResult(): NearbyResult {
  return {
    listings: [],
    priceStats: { median: 0, avg: 0, min: 0, max: 0, count: 0, medianPerSqm: 0 },
    estimatedValue: null,
    similarByRooms: [],
    similarByArea: [],
  };
}

// ═══════════════════════════════════════════════════════════════
// 1. Apartment-level price estimation
// ═══════════════════════════════════════════════════════════════

export interface ApartmentEstimate {
  estimatedTotal: number;
  estimatedPerSqm: number;
  comparableCount: number;
  comparables: MarketplaceListing[];
}

export function estimateApartmentPrice(address: string, apartmentArea: number, rooms?: number): ValuationResult {
  return valuateProperty(address, { area: apartmentArea, rooms });
}

export interface PropertyFeatures {
  area: number; rooms?: number; floor?: number; totalFloors?: number;
  year?: number; material?: string; energyClass?: string; condition?: string;
  heating?: string; city?: string; district?: string;
  hasSauna?: boolean; hasBalcony?: boolean; hasParking?: boolean; hasStorage?: boolean;
}

export interface ValuationResult {
  estimatedTotal: number; estimatedPerSqm: number;
  priceRange: { low: number; high: number };
  confidence: 'high' | 'medium' | 'low';
  comparableCount: number; comparables: MarketplaceListing[];
  adjustments: { feature: string; impact: string; amount: number }[];
  neighborhoodStats: { median: number; avg: number; count: number };
}

export function valuateProperty(address: string, f: PropertyFeatures): ValuationResult {
  const db = loadDB();
  const addrNorm = norm(address);
  const tokens = addrNorm.split(/\s+/).filter((t: string) => t.length > 3);
  const city = f.city || tokens.find((t: string) => t.length > 4) || '';

  // Step 1: Find comps in same area
  let comps = db.filter(l => {
    if (l.area <= 0 || l.pricePerSqm <= 0 || l.pricePerSqm < 100) return false;
    const ln = norm(l.city + ' ' + l.district + ' ' + l.addressRaw);
    return tokens.some((t: string) => ln.includes(t));
  });
  if (comps.length < 10) comps = db.filter(l => l.area > 0 && l.pricePerSqm >= 100 && norm(l.city).includes(city));
  if (comps.length < 5) comps = db.filter(l => l.area > 0 && l.pricePerSqm >= 100);

  // Step 2: Score by similarity (weighted)
  const scored = comps.map(comp => {
    let s = 100;
    const ad = Math.abs(comp.area - f.area) / f.area;
    if (ad < 0.1) s += 20; else if (ad < 0.2) s += 15; else if (ad < 0.35) s += 5;
    if (f.rooms && comp.rooms > 0) {
      if (comp.rooms === f.rooms) s += 15; else if (Math.abs(comp.rooms - f.rooms) === 1) s += 7;
    }
    if (f.year && comp.year > 0) {
      const yd = Math.abs(comp.year - f.year);
      if (yd <= 5) s += 10; else if (yd <= 15) s += 5;
    }
    if (f.material && comp.material === f.material) s += 5;
    if (f.energyClass && comp.energyClass === f.energyClass) s += 5;
    if (f.floor && comp.floor) {
      const cf = parseInt(comp.floor.split('/')[0]) || 0;
      if (Math.abs(cf - f.floor) <= 2) s += 5;
    }
    return { comp, score: s };
  });

  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, 20);
  const prices = top.map(s => s.comp.pricePerSqm).sort((a, b) => a - b);

  let tw = 0, ws = 0;
  for (const { comp, score } of top) { const w = Math.max(1, score); ws += comp.pricePerSqm * w; tw += w; }
  const ppsqm = tw > 0 ? Math.round(ws / tw) : 0;

  return {
    estimatedTotal: ppsqm > 0 ? Math.round(f.area * ppsqm) : 0,
    estimatedPerSqm: ppsqm,
    priceRange: { low: Math.round(f.area * (prices[Math.floor(prices.length*0.1)]||0)), high: Math.round(f.area * (prices[Math.floor(prices.length*0.9)]||0)) },
    confidence: top.length >= 15 ? 'high' : top.length >= 8 ? 'medium' : 'low',
    comparableCount: top.length,
    comparables: top.slice(0, 10).map(s => toMarketplace(s.comp)),
    adjustments: [],
    neighborhoodStats: { median: prices[Math.floor(prices.length/2)]||0, avg: Math.round(prices.reduce((a,b)=>a+b,0)/prices.length)||0, count: top.length },
  };
}

// ═══════════════════════════════════════════════════════════════
// 2. Comparable filter by rooms  
// ═══════════════════════════════════════════════════════════════

export function getComparablesByRooms(address: string, rooms: number, limit = 12): MarketplaceListing[] {
  if (!rooms) return [];
  const db = loadDB();
  const addrNorm = norm(address);
  const tokens = addrNorm.split(/\s+/).filter(t => t.length > 3);

  return db
    .filter(l => l.rooms === rooms && l.pricePerSqm > 0)
    .sort((a, b) => {
      const aMatch = tokens.filter(t => norm(a.addressRaw).includes(t)).length;
      const bMatch = tokens.filter(t => norm(b.addressRaw).includes(t)).length;
      return bMatch - aMatch;
    })
    .slice(0, limit)
    .map(toMarketplace);
}

// ═══════════════════════════════════════════════════════════════
// 3. Energy class distribution in area
// ═══════════════════════════════════════════════════════════════

export interface EnergyDistribution {
  total: number;
  classes: { class: string; count: number; pct: number }[];
}

export function getEnergyDistribution(address: string): EnergyDistribution {
  const db = loadDB();
  const addrNorm = norm(address);
  const tokens = addrNorm.split(/\s+/).filter(t => t.length > 3);

  const nearby = db.filter(l => {
    if (!l.energyClass) return false;
    const ln = norm(l.city + ' ' + l.district);
    return tokens.some(t => ln.includes(t));
  });

  const dist: Record<string, number> = {};
  nearby.forEach(l => { if (l.energyClass) dist[l.energyClass] = (dist[l.energyClass] || 0) + 1; });

  const total = nearby.length;
  const classes = ['A','B','C','D','E','F','G','H'].map(c => ({
    class: c, count: dist[c] || 0, pct: total > 0 ? Math.round((dist[c] || 0) / total * 100) : 0,
  })).filter(c => c.count > 0);

  return { total, classes };
}

// ═══════════════════════════════════════════════════════════════
// 4. Price/m² trend by building year
// ═══════════════════════════════════════════════════════════════

export interface PriceTrend {
  label: string;
  minYear: number;
  maxYear: number;
  avgPricePerSqm: number;
  count: number;
}

export function getPriceTrendByYear(address: string): PriceTrend[] {
  const db = loadDB();
  const addrNorm = norm(address);
  const tokens = addrNorm.split(/\s+/).filter(t => t.length > 3);

  const nearby = db.filter(l => {
    if (l.year <= 0 || l.pricePerSqm <= 0) return false;
    const ln = norm(l.city + ' ' + l.district);
    return tokens.some(t => ln.includes(t));
  });

  const decades = [
    { label: 'Pre-1970', min: 0, max: 1969 },
    { label: '1970s', min: 1970, max: 1979 },
    { label: '1980s', min: 1980, max: 1989 },
    { label: '1990s', min: 1990, max: 1999 },
    { label: '2000s', min: 2000, max: 2009 },
    { label: '2010s', min: 2010, max: 2019 },
    { label: '2020+', min: 2020, max: 9999 },
  ];

  return decades.map(d => {
    const inRange = nearby.filter(l => l.year >= d.min && l.year <= d.max);
    return {
      label: d.label,
      minYear: d.min, maxYear: d.max,
      avgPricePerSqm: inRange.length > 0 ? Math.round(inRange.reduce((s,l) => s + l.pricePerSqm, 0) / inRange.length) : 0,
      count: inRange.length,
    };
  }).filter(t => t.count > 0);
}

// ═══════════════════════════════════════════════════════════════
// 5. "What can I afford?" calculator
// ═══════════════════════════════════════════════════════════════

export interface AffordabilityResult {
  budget: number;
  possibleListings: MarketplaceListing[];
  summary: string;
}

export function whatCanIAfford(budget: number, city?: string, minRooms?: number): AffordabilityResult {
  const db = loadDB();
  let matches = db.filter(l => l.priceEur > 0 && l.priceEur <= budget);
  if (city) {
    const cn = norm(city);
    matches = matches.filter(l => norm(l.city + ' ' + l.district).includes(cn));
  }
  if (minRooms) matches = matches.filter(l => l.rooms >= minRooms);

  matches.sort((a, b) => b.area - a.area); // Biggest first
  const top = matches.slice(0, 50);

  const avgArea = top.length > 0 ? Math.round(top.reduce((s,l) => s + l.area, 0) / top.length) : 0;
  // Get clean city names — parse from raw address since city field may be garbled
  const cityNames = [...new Set(top.map(l => {
    const parts = (l.addressRaw || '').split(',').map(p => p.trim());
    return parts[2] || parts[1] || '';
  }).filter(Boolean))];

  return {
    budget,
    possibleListings: top.map(toMarketplace),
    summary: top.length > 0
      ? `With €${budget.toLocaleString()} you can get ~${avgArea}m² in ${cityNames.slice(0,3).join(', ')} (${top.length} options)`
      : `No listings found under €${budget.toLocaleString()}`,
  };
}

// ═══════════════════════════════════════════════════════════════
// 6. Property comparison
// ═══════════════════════════════════════════════════════════════

export function getPropertyComparison(address: string, area?: number, rooms?: number): MarketplaceListing[] {
  const db = loadDB();
  const addrNorm = norm(address);
  const tokens = addrNorm.split(/\s+/).filter(t => t.length > 3);

  // Find best matches in same area with similar specs
  return db
    .filter(l => {
      if (l.pricePerSqm <= 0 || l.area <= 0) return false;
      const ln = norm(l.addressRaw);
      const matchCount = tokens.filter(t => ln.includes(t)).length;
      if (matchCount < 2) return false;
      if (rooms && l.rooms > 0 && l.rooms !== rooms) return false;
      if (area && Math.abs(l.area - area) / area > 0.4) return false;
      return true;
    })
    .sort((a, b) => {
      const aAreaDiff = area ? Math.abs(a.area - area) : 0;
      const bAreaDiff = area ? Math.abs(b.area - area) : 0;
      return aAreaDiff - bAreaDiff;
    })
    .slice(0, 8)
    .map(toMarketplace);
}

// ═══════════════════════════════════════════════════════════════
// Portal search links
// ═══════════════════════════════════════════════════════════════

export function getPortalSearchUrls(address: string): { portal: string; url: string }[] {
  if (!address) return [];
  const encoded = encodeURIComponent(address.trim());
  return [
    { portal: 'KV.ee', url: `https://www.kv.ee/search?keyword=${encoded}&type=apartment&dealType=1` },
    { portal: 'City24.ee', url: `https://www.city24.ee/et/search?address=${encoded}&dealType=1&objectType=1` },
    { portal: 'Kinnisvara24.ee', url: `https://kinnisvara24.ee/kinnisvara/otsing?q=${encoded}&deal_type=sale` },
    { portal: 'Rendin.ee', url: `https://rendin.ee/search?address=${encoded}` },
  ];
}

export async function getMarketplaceListings(params: {
  address?: string; buildingArea?: number; isHouse?: boolean;
}): Promise<{
  listings: MarketplaceListing[];
  portalUrls: { portal: string; url: string }[];
  priceStats: NearbyResult['priceStats'];
  estimatedValue: number | null;
  similarByRooms: MarketplaceListing[];
  similarByArea: MarketplaceListing[];
  apartmentEstimate: ApartmentEstimate | null;
  energyDistribution: EnergyDistribution | null;
  priceTrend: PriceTrend[];
}> {
  const address = params.address || '';
  const result = findNearbyListings(address, params.buildingArea, undefined, 15, params.isHouse);

  // Feature 1: Apartment-level estimate (use 60m² as default for apartments)
  const aptArea = params.buildingArea && params.buildingArea < 500 ? params.buildingArea : 60;
  const apartmentEstimate = estimateApartmentPrice(address, aptArea);

  // Feature 3: Energy distribution
  const energyDistribution = getEnergyDistribution(address);

  // Feature 4: Price trend by year
  const priceTrend = getPriceTrendByYear(address);

  return {
    listings: result.listings,
    portalUrls: getPortalSearchUrls(address),
    priceStats: result.priceStats,
    estimatedValue: result.estimatedValue,
    similarByRooms: result.similarByRooms,
    similarByArea: result.similarByArea,
    apartmentEstimate,
    energyDistribution,
    priceTrend,
  };
}
