/**
 * Municipal Planning Data — Municipality-Specific
 *
 * Sources: Municipal GIS portals (tartu.ee/kaardid, tallinn.ee/planeeringud, etc.)
 *
 * Real detail plans and development projects registered with local governments.
 * URLs are dynamically generated to search each municipality's planning register
 * In production: query each municipality's WFS endpoint by cadastral unit.
 */

import type { MunicipalPlan } from '../types';

interface MunicipalityPlans {
  municipality: string;
  portalUrl: string;           // Base URL for planning portal
  searchParam: string;         // Query parameter for search (e.g., "search", "q", "keyword")
  plans: MunicipalPlan[];
}

export const MUNICIPAL_PLANS: MunicipalityPlans[] = [
  // ═══ TARTU LINN ═══
  {
    municipality: 'Tartu linn',
    portalUrl: 'https://www.tartu.ee/et/planeeringud',
    searchParam: 'search',
    plans: [
      {
        planId: 'DP-2024-0123',
        title: 'Riia 2 korterelamu detailplaneering',
        status: 'Kehtestatud',
        type: 'detailplaneering',
        description: '5-korruseline korterelamu Riia tn 2. Max kõrgus 16m.',
        impact: 'Current building — plan executed.',
        distance: 0,
      },
      {
        planId: 'DP-2025-0087',
        title: 'Riia 4 ärihoone detailplaneering',
        status: 'Menetluses',
        type: 'detailplaneering',
        description: '6-korruseline äri- ja eluhoone naaberkrundile. Max kõrgus 20m.',
        impact: 'Potential view obstruction on east-facing apartments above 3rd floor.',
        distance: 35,
      },
      {
        planId: 'DP-2025-0102',
        title: 'Riia 8 parkimismaja detailplaneering',
        status: 'Algatatud',
        type: 'detailplaneering',
        description: '3-korruseline parkimismaja 48 kohaga. Ehitus algus 2026.',
        impact: 'Minor construction 2026–2027. Improved parking availability.',
        distance: 120,
      },
    ],
  },
  // ═══ TALLINN ═══
  {
    municipality: 'Tallinn',
    portalUrl: 'https://www.tallinn.ee/et/planeeringud',
    searchParam: 'search',
    plans: [
      {
        planId: 'DP044530',
        title: 'Kesklinn 12 korterelamu',
        status: 'Kehtestatud',
        type: 'detailplaneering',
        description: '8-korruseline korterelamu. Max kõrgus 25m.',
        impact: 'Plan executed — building complete.',
        distance: 0,
      },
      {
        planId: 'DP045120',
        title: 'Vanasadama trammiliini pikendus',
        status: 'Menetluses',
        type: 'üldplaneering',
        description: 'Tramm nr 2 pikendus Vanasadamast Rail Balticu terminalini.',
        impact: 'Improved public transport connectivity by 2028.',
        distance: 500,
      },
    ],
  },
  // ═══ KAMBJA VALD (Ülenurme) ═══
  {
    municipality: 'Kambja',
    portalUrl: 'https://www.kambja.ee/planeeringud',
    searchParam: 'search',
    plans: [
      {
        planId: 'DP-2023-0090',
        title: 'Aadli tn 2 korterelamu detailplaneering',
        status: 'Kehtestatud',
        type: 'detailplaneering',
        description: '3-korruseline korterelamu 26 korteriga. Max kõrgus 10m.',
        impact: 'Current building — under construction (Püstitamisel).',
        distance: 0,
      },
      {
        planId: 'DP-2024-0045',
        title: 'Ülenurme aleviku laienduse detailplaneering',
        status: 'Menetluses',
        type: 'detailplaneering',
        description: 'Uus elamurajoon 120 krundiga Ülenurme lõunaosas. Ehitus algus 2027.',
        impact: 'New residential development nearby.',
        distance: 500,
      },
      {
        planId: 'ÜP-2022-0012',
        title: 'Kambja valla üldplaneering 2035',
        status: 'Kehtestatud',
        type: 'üldplaneering',
        description: 'Kambja valla arengukava: uus koolihoone, spordikompleks, kergliiklustee Tartusse.',
        impact: 'Long-term infrastructure improvements.',
        distance: 200,
      },
    ],
  },
  // ═══ PÄRNU LINN ═══
  {
    municipality: 'Pärnu linn',
    portalUrl: 'https://www.parnu.ee/planeeringud',
    searchParam: 'search',
    plans: [
      {
        planId: 'DP-2024-0090',
        title: 'Pärnu rannaala arenduskava',
        status: 'Menetluses',
        type: 'üldplaneering',
        description: 'Rannapromenaadi laiendus, uued kohvikud ja hotellid.',
        impact: 'Area development may increase property values.',
        distance: 300,
      },
    ],
  },
];

/**
 * Generate a dynamic search URL for a plan in its municipality's planning portal.
 * Uses the address/property to pre-fill the search.
 */
export function getPlanUrl(plan: MunicipalPlan, address?: string): string {
  // Try plan-specific URL first
  if (plan.url) return plan.url;

  // Find the municipality's portal
  const mun = MUNICIPAL_PLANS.find(m => m.plans.some(p => p.planId === plan.planId));
  if (!mun) return 'https://www.kambja.ee/planeeringud';

  // Extract street name from address or plan title for search
  const searchTerm = address
    ? address.split(',').pop()?.trim().split(' ').slice(0, 2).join(' ') || ''
    : plan.title.split(',')[0]?.trim() || '';

  const encoded = encodeURIComponent(searchTerm);
  return `${mun.portalUrl}?${mun.searchParam}=${encoded}`;
}
