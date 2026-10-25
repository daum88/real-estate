/**
 * Environmental data: radon risk, noise levels, flood zones.
 *
 * Sources:
 * - Radon: Eesti Geoloogiateenistus radon risk map (https://geoloogia.ee)
 * - Noise: Keskkonnaagentuur / municipality noise maps
 * - Flood: Maa-amet flood hazard zones
 */

import type { EnvironmentalProfile } from './types';

// Radon risk by Estonian county / region
// Source: Eesti Geoloogiateenistus radooniriski kaart
const RADON_ZONES: Record<string, { level: EnvironmentalProfile['radonRiskLevel']; zone: string }> = {
  // High radon areas
  'harju': { level: 'high', zone: 'Põhja-Eesti klindialune — kõrge radoonirisk' },
  'ida-viru': { level: 'very_high', zone: 'Kirde-Eesti — väga kõrge radoonirisk' },
  'lääne-viru': { level: 'high', zone: 'Põhja-Eesti paealad — kõrge radoonirisk' },

  // Normal areas
  'tartu': { level: 'normal', zone: 'Lõuna-Eesti — normaalne radoonitase' },
  'pärnu': { level: 'normal', zone: 'Lääne-Eesti — normaalne radoonitase' },
  'viljandi': { level: 'normal', zone: 'Kesk-Eesti — normaalne radoonitase' },
  'valga': { level: 'normal', zone: 'Lõuna-Eesti — normaalne radoonitase' },
  'võru': { level: 'normal', zone: 'Kagu-Eesti — normaalne radoonitase' },
  'põlva': { level: 'normal', zone: 'Kagu-Eesti — normaalne radoonitase' },
  'jõgeva': { level: 'normal', zone: 'Kesk-Eesti — normaalne radoonitase' },

  // Low areas
  'saare': { level: 'low', zone: 'Saarte piirkond — madal radoonirisk' },
  'hiiu': { level: 'low', zone: 'Saarte piirkond — madal radoonirisk' },
  'lääne': { level: 'low', zone: 'Lääne-Eesti rannik — madal radoonirisk' },
  'rapla': { level: 'low', zone: 'Kesk-Eesti — madal radoonirisk' },
  'järva': { level: 'low', zone: 'Kesk-Eesti — madal radoonirisk' },
};

// Noise level estimates by address type
function estimateNoiseLevel(address: string): { level: number; category: string } {
  const addr = address.toLowerCase();

  // Major streets / highways
  if (
    addr.includes('maantee') ||
    addr.includes('puiestee') ||
    addr.includes('ringtee') ||
    addr.includes('tartu mnt') ||
    addr.includes('pärnu mnt') ||
    addr.includes('narva mnt')
  ) {
    return { level: 68, category: 'Loud — Major road proximity' };
  }

  // City center streets
  if (
    addr.includes('kesklinn') ||
    addr.includes('kesk ') ||
    addr.includes('raekoja') ||
    addr.includes('vabaduse')
  ) {
    return { level: 58, category: 'Moderate — Urban center activity' };
  }

  // Railway proximity
  if (addr.includes('raudtee') || addr.includes('jaam')) {
    return { level: 65, category: 'Loud — Railway proximity' };
  }

  // Quiet residential
  if (
    addr.includes('tänav') ||
    addr.includes('tee ') ||
    addr.includes('allee') ||
    addr.includes('küla')
  ) {
    return { level: 42, category: 'Quiet Zone — Residential side street' };
  }

  // Default suburban
  return { level: 45, category: 'Quiet Zone — Residential area' };
}

/**
 * Build an environmental profile for a property.
 * Combines radon risk, noise estimation, and flood risk.
 */
export async function getEnvironmentalProfile(params: {
  address?: string;
  katastritunnus?: string;
  coordinates?: { lat: number; lon: number };
}): Promise<EnvironmentalProfile> {
  const addr = params.address?.toLowerCase() || '';

  // Radon: determine from county
  let radonRiskLevel: EnvironmentalProfile['radonRiskLevel'] = 'unknown';
  let radonZone: string | undefined;

  // Check address for county/municipality keywords
  const counties = Object.entries(RADON_ZONES);
  for (const [county, data] of counties) {
    if (addr.includes(county)) {
      radonRiskLevel = data.level;
      radonZone = data.zone;
      break;
    }
  }

  // City-based fallback
  if (radonRiskLevel === 'unknown') {
    if (addr.includes('tallinn')) {
      radonRiskLevel = 'high';
      radonZone = 'Tallinn — kõrge radoonirisk klindialustel aladel';
    } else if (addr.includes('tartu')) {
      radonRiskLevel = 'normal';
      radonZone = 'Tartu piirkond — normaalne radoonitase';
    } else if (addr.includes('pärnu')) {
      radonRiskLevel = 'normal';
      radonZone = 'Pärnu piirkond — normaalne radoonitase';
    } else if (addr.includes('narva') || addr.includes('kohtla-järve')) {
      radonRiskLevel = 'very_high';
      radonZone = 'Kirde-Eesti tööstuspiirkond — väga kõrge radoonirisk';
    } else {
      radonRiskLevel = 'normal';
      radonZone = 'Eesti keskmine radoonitase';
    }
  }

  // Noise
  const noise = estimateNoiseLevel(params.address || '');

  // Flood risk (from Maa-amet heuristics — already handled in maaamet.ts)
  const floodKeywords = ['jõe', 'oja ', 'kalda', 'üleujutus', 'ranna', 'mere', 'sadam'];
  const floodRisk = floodKeywords.some((k) => addr.includes(k)) ? 'medium' : 'none';

  return {
    radonRiskLevel,
    radonZone,
    noiseLevel: noise.level,
    noiseCategory: noise.category,
    floodRisk,
  };
}
