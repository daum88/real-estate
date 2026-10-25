/**
 * e-PRIA (Agricultural Registers and Information Board) data
 *
 * Source: https://geoportaal.masto.ee/ (PRIA WFS vector layers)
 * Data: Active agricultural parcels, organic farming zones, livestock registries.
 *
 * In production: query PRIA WFS service by bounding box around property coordinates.
 * For the MVP, use parcel data heuristics based on address and cadastral region.
 */

import type { AgriculturalParcel } from './types';

interface ParcelHeuristic {
  cadastralPrefix: string;     // first 3 digits of katastritunnus
  cityKeyword: string;
  parcels: AgriculturalParcel[];
}

const KNOWN_PARCELS: ParcelHeuristic[] = [
  {
    cadastralPrefix: '795',    // Tartu region
    cityKeyword: 'tartu',
    parcels: [
      {
        parcelId: '79501:001:0115',
        cropType: 'Cereal grains (wheat, barley)',
        isOrganic: false,
        distance: 850,
        pesticideRisk: 'medium',
        livestockRisk: 'none',
      },
      {
        parcelId: '79501:001:0230',
        cropType: 'Organic vegetables',
        isOrganic: true,
        distance: 1200,
        pesticideRisk: 'none',
        livestockRisk: 'none',
      },
      {
        parcelId: '79401:002:0045',
        cropType: 'Dairy cattle pasture',
        isOrganic: false,
        distance: 2500,
        pesticideRisk: 'low',
        livestockRisk: 'medium',
      },
    ],
  },
  {
    cadastralPrefix: '784',    // Tallinn
    cityKeyword: 'tallinn',
    parcels: [],                // Minimal agricultural in urban Tallinn
  },
  {
    cadastralPrefix: '625',    // Pärnu
    cityKeyword: 'pärnu',
    parcels: [
      {
        parcelId: '62501:001:0088',
        cropType: 'Conventional rapeseed',
        isOrganic: false,
        distance: 1600,
        pesticideRisk: 'high',
        livestockRisk: 'none',
      },
      {
        parcelId: '62501:002:0012',
        cropType: 'Hay meadow (permanent grassland)',
        isOrganic: true,
        distance: 900,
        pesticideRisk: 'none',
        livestockRisk: 'low',
      },
    ],
  },
  {
    cadastralPrefix: '511',    // Narva
    cityKeyword: 'narva',
    parcels: [],
  },
];

/**
 * Find agricultural parcels near the given property.
 */
export async function getAgriculturalParcels(params: {
  katastritunnus?: string;
  address?: string;
}): Promise<AgriculturalParcel[]> {
  const addr = params.address?.toLowerCase() || '';
  const katPrefix = params.katastritunnus?.substring(0, 3);

  const matches: AgriculturalParcel[] = [];

  for (const heuristic of KNOWN_PARCELS) {
    // Match by cadastral prefix or city keyword
    const cadastralMatch = katPrefix && heuristic.cadastralPrefix === katPrefix;
    const keywordMatch = heuristic.cityKeyword && addr.includes(heuristic.cityKeyword);

    if (cadastralMatch || keywordMatch) {
      matches.push(...heuristic.parcels);
    }
  }

  // Deduplicate by parcelId
  const seen = new Set<string>();
  const unique = matches.filter((p) => {
    if (seen.has(p.parcelId)) return false;
    seen.add(p.parcelId);
    return true;
  });

  return unique;
}
