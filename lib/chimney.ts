/**
 * Päästeamet — Chimney Sweep Certificate & Fire Safety
 *
 * Chimney sweep inspection certificates (korstnapühkimise akt) are
 * required for properties with solid fuel heating systems (wood stove,
 * fireplace, pellet boiler).
 *
 * In production: Päästeamet maintains a registry of valid chimney sweep
 * certificates. The data is accessible via the rescue board's open data
 * or integrated into EHR building records.
 *
 * For the MVP, we infer chimney sweep requirements from the building's
 * heating system type and return a simulated certificate status.
 */

import type { ChimneySweepCert } from './types';

// Heating systems that require chimney sweep certification
const REQUIRES_CHIMNEY_SWEEP = [
  'ahiküte',        // stove heating
  'puit',           // wood burning
  'pellet',         // pellet heating
  'tahkekütus',     // solid fuel
  'kamin',          // fireplace
  'pliit',          // stove
  'keskkütteahi',   // central heating furnace
];

/**
 * Deterministic fallback: derive a stable pseudo-status from the address so
 * the same property always renders the same result (no Math.random()).
 * Real certificate data must come from Päästeamet in production.
 */
function deterministicStatus(address: string): {
  valid: boolean;
  lastInspectionMonthsAgo: number;
} {
  let hash = 0;
  for (let i = 0; i < address.length; i++) {
    hash = (hash * 31 + address.charCodeAt(i)) >>> 0;
  }
  return {
    valid: hash % 100 > 15, // ~85% valid, stable per address
    lastInspectionMonthsAgo: hash % 11, // 0–10 months ago
  };
}

/**
 * Determine if a chimney sweep certificate is required and its status.
 */
export async function getChimneySweepStatus(params: {
  heatingSystem?: string;
  buildingStatus?: string;
  address?: string;
}): Promise<ChimneySweepCert | null> {
  const heating = params.heatingSystem?.toLowerCase().replace(/\s/g, '') || '';

  // Check if the heating system type requires chimney sweep
  const requires = REQUIRES_CHIMNEY_SWEEP.some((type) => heating.includes(type));

  if (!requires) {
    return null; // Not applicable for this property
  }

  // Under construction — certificate not yet required
  if (params.buildingStatus === 'E') {
    return {
      valid: false,
      systemType: params.heatingSystem,
      nextInspectionDue: 'Not yet required — building under construction',
    };
  }

  // Deterministic fallback for the MVP (no live Päästeamet feed yet).
  const status = deterministicStatus(params.address || params.heatingSystem || 'unknown');
  const lastInspection = new Date();
  lastInspection.setMonth(lastInspection.getMonth() - status.lastInspectionMonthsAgo);

  const nextDue = new Date(lastInspection);
  nextDue.setFullYear(nextDue.getFullYear() + 1);

  return {
    valid: status.valid,
    lastInspectionDate: lastInspection.toISOString().split('T')[0],
    nextInspectionDue: status.valid
      ? nextDue.toISOString().split('T')[0]
      : 'Overdue — inspection needed',
    systemType: params.heatingSystem,
  };
}
