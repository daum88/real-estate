/**
 * Maa-amet (Land Board) Spatial & Transaction APIs
 *
 * District pricing: Maa-amet Tehingute Statistika publishes quarterly XLSX/CSV
 * at https://www.maaamet.ee/kinnisvara/tehingute-statistika
 *
 * Individual sale prices are RESTRICTED per Land Registry Act §6.
 * Only aggregated district medians are available.
 *
 * NO HARDCODED PRICES — in production, download and parse the Maa-amet CSV
 * updated by the 20th of each month.
 */

import type { SpatialConstraint, DistrictPriceData } from './types';

// ─── Static Constraint Heuristics (based on cadastral region + address) ───

const CONSTRAINT_HEURISTICS: Record<string, SpatialConstraint[]> = {
  '784': [
    { type: 'heritage', label: 'UNESCO Old Town Buffer Zone', description: 'Tallinn Old Town UNESCO World Heritage buffer area — strict façade and volume regulations apply.', severity: 'high' },
  ],
  '795': [
    { type: 'flood_risk', label: 'Emajõgi Floodplain', description: 'Property lies within the Emajõe river flood risk zone (1% annual probability).', severity: 'medium' },
    { type: 'heritage', label: 'Tartu Heritage Conservation Area', description: 'Miljööväärtuslik hoonestusala — exterior alterations require heritage board approval.', severity: 'medium' },
  ],
  '625': [
    { type: 'flood_risk', label: 'Pärnu Bay Coastal Flood Zone', description: 'Coastal flood and storm surge risk zone. Building height and foundation regulations apply.', severity: 'high' },
    { type: 'nature_reserve', label: 'Pärnu Beach Nature Protection Zone', description: 'Ranna kaitsevöönd — restrictions on construction within 100m of shoreline.', severity: 'high' },
  ],
  '511': [
    { type: 'utility_easement', label: 'High-Voltage Power Line Easement', description: 'Elektripaigaldise kaitsevöönd — building restrictions within buffer zone of overhead lines.', severity: 'medium' },
  ],
  'default': [] as SpatialConstraint[],
};

export async function getSpatialConstraints(params: {
  katastritunnus?: string;
  address?: string;
}): Promise<SpatialConstraint[]> {
  const constraints: SpatialConstraint[] = [];

  if (params.katastritunnus) {
    const regionPrefix = params.katastritunnus.substring(0, 3);
    const regionConstraints = CONSTRAINT_HEURISTICS[regionPrefix] || CONSTRAINT_HEURISTICS['default'];
    constraints.push(...regionConstraints);
  }

  if (params.address) {
    const addr = params.address.toLowerCase();

    const natureKeywords: [string, string, string][] = [
      ['lahemaa', 'Lahemaa National Park', 'Rahvuspark — strict building height and material regulations in designated zones.'],
      ['soomaa', 'Soomaa National Park', 'Rahvuspark — flood-meadow protection zone. Seasonal flooding restricts permanent structures.'],
      ['matsalu', 'Matsalu National Park', 'Rahvuspark — bird sanctuary protection zone. Construction restricted March–August.'],
      ['vilsandi', 'Vilsandi National Park', 'Rahvuspark — coastal/island protection zone. Height restrictions and materials review required.'],
    ];

    for (const [keyword, label, desc] of natureKeywords) {
      if (addr.includes(keyword)) {
        constraints.push({ type: 'nature_reserve', label, description: desc, severity: 'high' });
        break;
      }
    }

    if (addr.includes('ranna') || addr.includes('mere') || addr.includes('sadam') || addr.includes('kai ')) {
      constraints.push({
        type: 'nature_reserve',
        label: 'Coastal Protection Zone (Ranna ehituskeeluvöönd)',
        description: 'Building ban within 100m and restriction zone within 200m of the shoreline unless detailed plan exists.',
        severity: 'high',
      });
    }

    if (addr.includes('jõe') || addr.includes('oja ') || addr.includes('kalda') || addr.includes('üleujutus')) {
      constraints.push({
        type: 'flood_risk',
        label: 'Water Body Proximity Flood Risk',
        description: 'Property is within proximity of a water body. Confirm flood hazard maps for specific risk assessment.',
        severity: 'medium',
      });
    }
  }

  const seen = new Set<string>();
  const unique = constraints.filter((c) => {
    if (seen.has(c.label)) return false;
    seen.add(c.label);
    return true;
  });

  // Only return constraints we actually derived from the cadastral region or
  // address keywords — no invented defaults.
  return unique;
}

// ─── District Price Data ─────────────────────────────────────────

/**
 * Returns Maa-amet transaction statistics link for the given address.
 * NO hardcoded prices — users are directed to the official Maa-amet portal
 * where they can download the latest quarterly XLSX/CSV with median prices.
 *
 * In production: download and parse the CSV from:
 * https://www.maaamet.ee/kinnisvara/tehingute-statistika
 */
export async function getDistrictPrice(address?: string): Promise<DistrictPriceData | null> {
  // No hardcoded prices. Link to official Maa-amet statistics.
  // The CSV is published quarterly with district-level medians.
  // In production, fetch and parse: /kinnisvara/tehingute-statistika

  if (!address) return null;

  const addr = address.toLowerCase();
  let district = 'Estonia';

  // Extract city/district from address for the label
  const cities = ['tallinn', 'tartu', 'pärnu', 'narva', 'rakvere', 'viljandi',
    'kuressaare', 'haapsalu', 'valga', 'võru', 'põlva', 'jõgeva', 'paide', 'rapla', 'kärdla',
    'ülenurme', 'kambja', 'elva'];
  for (const city of cities) {
    if (addr.includes(city)) {
      district = city.charAt(0).toUpperCase() + city.slice(1);
      break;
    }
  }

  // Return only metadata with a link to the official source
  // Price must be fetched from Maa-amet CSV in production
  return {
    district,
    medianPricePerSqm: 0, // Must be fetched from Maa-amet CSV
    dateRange: 'Available at Maa-amet',
  };
}
