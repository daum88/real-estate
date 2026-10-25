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

  // Simulate certificate status based on building attributes
  // In production: query Päästeamet API with ehrCode or address
  const isNewBuilding = params.buildingStatus === 'E'; // Under construction

  if (isNewBuilding) {
    return {
      valid: false,
      systemType: params.heatingSystem,
      nextInspectionDue: 'Not yet required — building under construction',
    };
  }

  // Simulate: most properties have valid certs
  const valid = Math.random() > 0.15;
  const lastInspection = new Date();
  lastInspection.setMonth(lastInspection.getMonth() - Math.floor(Math.random() * 11));

  const nextDue = new Date(lastInspection);
  nextDue.setFullYear(nextDue.getFullYear() + 1);

  return {
    valid,
    lastInspectionDate: lastInspection.toISOString().split('T')[0],
    nextInspectionDue: valid ? nextDue.toISOString().split('T')[0] : 'Overdue — inspection needed',
    systemType: params.heatingSystem,
  };
}
