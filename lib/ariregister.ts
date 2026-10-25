/**
 * e-Äriregister API — Estonian Commercial Register
 *
 * Public endpoints for company lookup, tax debt, beneficial owners.
 * Base: https://ariregister.rik.ee/ (XML/JSON via API)
 *
 * Architecture: The live API requires navigating the e-Business Register portal.
 * For the MVP we use the open data REST endpoints at ariregister.rik.ee.
 * In production, integrate with the official e-Äriregister XML gateway (X-Road).
 */

import type { CompanyProfile, KUHealth } from './types';

const ARIREGISTER_BASE = 'https://ariregister.rik.ee';

// ─── Static registry cache for common Estonian developers / KÜs ──
// In production: replace with live API call to ariregister.rik.ee
const STATIC_DEVELOPERS: Record<string, CompanyProfile> = {
  // Tartu
  '10256419': {
    registrikood: '10256419',
    name: 'Tartu Ehitus OÜ',
    status: 'R',
    legalForm: 'OÜ',
    boardMembers: ['Jaan Tamm', 'Mari Kask'],
    taxDebt: 0,
    taxDebtDate: '2025-06-01',
    lastAnnualReportYear: 2024,
    annualReportFiled: true,
  },
  '11234225': {
    registrikood: '11234225',
    name: 'Eesti Kinnisvaraarendus AS',
    status: 'R',
    legalForm: 'AS',
    boardMembers: ['Andres Kask', 'Liina Sepp'],
    taxDebt: 0,
    taxDebtDate: '2025-05-15',
    lastAnnualReportYear: 2024,
    annualReportFiled: true,
  },
  '14321290': {
    registrikood: '14321290',
    name: 'Nordecon Betoon OÜ',
    status: 'R',
    legalForm: 'OÜ',
    boardMembers: ['Toomas Mets'],
    taxDebt: 0,
    taxDebtDate: '2025-06-01',
    lastAnnualReportYear: 2024,
    annualReportFiled: true,
  },
  // Tallinn developers
  '10978326': {
    registrikood: '10978326',
    name: 'Merko Ehitus Eesti AS',
    status: 'R',
    legalForm: 'AS',
    boardMembers: ['Ivo Volkov', 'Tõnu Toomik'],
    taxDebt: 0,
    taxDebtDate: '2025-04-01',
    lastAnnualReportYear: 2024,
    annualReportFiled: true,
  },
  // Problematic developer (for demo contrast)
  '15678901': {
    registrikood: '15678901',
    name: 'Kiire Arendus OÜ',
    status: 'R',
    legalForm: 'OÜ',
    boardMembers: ['Anonymous Owner'],
    taxDebt: 12450,
    taxDebtDate: '2025-03-01',
    lastAnnualReportYear: 2023,
    annualReportFiled: false,
  },
};

const STATIC_KU: Record<string, KUHealth> = {
  // KÜ for Riia 2, Tartu
  '80591234': {
    registrikood: '80591234',
    name: 'KÜ Riia 2',
    status: 'R',
    taxDebt: 0,
    taxDebtDate: '2025-06-15',
    annualReportUpToDate: true,
    lastAnnualReportYear: 2024,
  },
  // Well-managed KÜ
  '80123456': {
    registrikood: '80123456',
    name: 'KÜ Emajõe Kaldad',
    status: 'R',
    taxDebt: 0,
    taxDebtDate: '2025-05-01',
    annualReportUpToDate: true,
    lastAnnualReportYear: 2024,
  },
  // Problematic KÜ
  '80789012': {
    registrikood: '80789012',
    name: 'KÜ Nõukogude 15',
    status: 'R',
    taxDebt: 8750,
    taxDebtDate: '2024-12-01',
    annualReportUpToDate: false,
    lastAnnualReportYear: 2022,
  },
};

/**
 * Look up a company/KÜ by its registrikood.
 *
 * In production: calls ariregister.rik.ee API or e-Business Register XML gateway.
 * For the MVP, uses static data based on known Estonian developers.
 */
export async function getCompanyByCode(registrikood: string): Promise<CompanyProfile | null> {
  if (STATIC_DEVELOPERS[registrikood]) {
    return STATIC_DEVELOPERS[registrikood];
  }

  // Try live API fallback
  try {
    const res = await fetch(
      `${ARIREGISTER_BASE}/api/v1/company/${encodeURIComponent(registrikood)}`,
      { signal: AbortSignal.timeout(8000) }
    );

    if (!res.ok) return null;

    const raw = await res.json() as Record<string, unknown>;
    return {
      registrikood,
      name: (raw.name || raw.nimi || '') as string,
      status: (raw.status || '') as string,
      legalForm: raw.legalForm as string | undefined,
      boardMembers: raw.boardMembers as string[] | undefined,
      taxDebt: raw.taxDebt as number | undefined,
      taxDebtDate: raw.taxDebtDate as string | undefined,
      lastAnnualReportYear: raw.lastAnnualReportYear as number | undefined,
      annualReportFiled: raw.annualReportFiled as boolean | undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Look up a KÜ (apartment association) by registrikood or address.
 */
export async function getKUHealth(params: {
  registrikood?: string;
  address?: string;
}): Promise<KUHealth | null> {
  if (params.registrikood && STATIC_KU[params.registrikood]) {
    return STATIC_KU[params.registrikood];
  }

  // Address-based lookup — match known KÜs by address keyword
  if (params.address) {
    const addr = params.address.toLowerCase();

    // Riia 2 → KÜ Riia 2
    if (addr.includes('riia 2') || addr.includes('riia tn 2')) {
      return STATIC_KU['80591234'];
    }

    // Emajõe / river-adjacent addresses → Emajõe Kaldad
    if (addr.includes('emajõe')) {
      return STATIC_KU['80123456'];
    }

    // Nõukogude street → problematic KÜ
    if (addr.includes('nõukogude')) {
      return STATIC_KU['80789012'];
    }

    // No live KÜ feed is integrated yet (e-Äriregister X-Road gateway).
    // Returning a fabricated "generic healthy KÜ" for every urban address
    // would misrepresent registry data, so return null instead — the UI
    // shows an explicit "no KÜ data found" state.
  }

  return null;
}

/**
 * Look up a developer by company name keyword match or registrikood.
 */
export async function findDeveloper(params: {
  registrikood?: string;
  name?: string;
  address?: string;
}): Promise<CompanyProfile | null> {
  if (params.registrikood) {
    return getCompanyByCode(params.registrikood);
  }

  // Name-based search through static data
  if (params.name) {
    const normalized = params.name.toLowerCase().trim();
    for (const profile of Object.values(STATIC_DEVELOPERS)) {
      if (profile.name.toLowerCase().includes(normalized)) {
        return profile;
      }
    }
  }

  // Address-based heuristic: new buildings in Tartu → Tartu Ehitus
  // Large developments in Tallinn → Merko
  if (params.address) {
    const addr = params.address.toLowerCase();
    if (addr.includes('tartu') && (addr.includes('uus') || addr.includes('arendus'))) {
      return STATIC_DEVELOPERS['10256419'];
    }
    if (addr.includes('tallinn') && addr.includes('kesklinn')) {
      return STATIC_DEVELOPERS['10978326'];
    }
  }

  return null;
}
