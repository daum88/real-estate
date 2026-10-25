'use client';

import { motion } from 'framer-motion';
import { ShieldCheck, ShieldAlert, ShieldX, Zap, Calendar, FileCheck, Flame, ExternalLink } from 'lucide-react';
import type { EhrBuildingData } from '@/lib/types';

interface BuildingHealthCardProps {
  building: EhrBuildingData | null;
  hasOccupancyPermit: boolean;
  latestEnergyClass: string | null;
  ehrCode?: string;
  delay?: number;
}

const ENERGY_GRADES: Record<string, { color: string; label: string }> = {
  A: { color: 'from-emerald-400 to-green-500', label: 'Near Zero Energy' },
  B: { color: 'from-lime-400 to-green-400', label: 'Very Efficient' },
  C: { color: 'from-yellow-300 to-amber-400', label: 'Efficient' },
  D: { color: 'from-orange-300 to-orange-400', label: 'Moderate' },
  E: { color: 'from-orange-400 to-red-400', label: 'Above Average Use' },
  F: { color: 'from-red-400 to-red-500', label: 'High Consumption' },
  G: { color: 'from-red-500 to-rose-600', label: 'Very High Consumption' },
  H: { color: 'from-red-600 to-rose-700', label: 'Highest Consumption' },
};

export default function BuildingHealthCard({
  building,
  hasOccupancyPermit,
  latestEnergyClass,
  ehrCode,
  delay = 0,
}: BuildingHealthCardProps) {
  if (!building) {
    return (
      <EmptyState
        title="Building Health"
        description="No building data available"
        icon={<ShieldX className="w-8 h-8 text-teal-300" />}
        delay={delay}
      />
    );
  }

  const energy = latestEnergyClass ? ENERGY_GRADES[latestEnergyClass] || ENERGY_GRADES['D'] : null;

  // Find last permit document date
  const lastDoc = [...building.documents]
    .filter((d) => d.documentDate)
    .sort((a, b) => new Date(b.documentDate!).getTime() - new Date(a.documentDate!).getTime())[0];

  const chimney = building.chimneySweepCert;

  const permitCount = building.documents.filter(
    (d) => d.documentType.toUpperCase() === 'KASUTUSLUBA'
  ).length;

  // EHR's v3 buildingData endpoint does not currently return permit
  // documents for most buildings (empty ehitiseDokumendid array), so
  // distinguish "no permit found" from "no records available at all".
  const hasDocumentRecords = building.documents.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.23, 1, 0.32, 1] }}
      className="
        relative overflow-hidden
        bg-white/70 backdrop-blur-xl
        border border-teal-100/60 rounded-2xl
        shadow-lg shadow-teal-900/5
        p-6
      "
    >
      {/* Subtle top accent bar */}
      <div
        className={`
          absolute top-0 left-0 right-0 h-1
          ${hasOccupancyPermit ? 'bg-gradient-to-r from-emerald-400 to-teal-400' : 'bg-gradient-to-r from-amber-300 to-orange-400'}
        `}
      />

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase text-teal-500/70 mb-1 font-[family-name:var(--font-heading)]">
            Building Health
          </p>
          <h3 className="text-lg font-semibold text-teal-900 font-[family-name:var(--font-heading)]">
            Permit & Energy
          </h3>
        </div>

        {hasOccupancyPermit ? (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200/60 rounded-full">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-medium text-emerald-700">Active</span>
          </div>
        ) : hasDocumentRecords ? (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200/60 rounded-full">
            <ShieldAlert className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-medium text-amber-700">Pending</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200/60 rounded-full">
            <ShieldAlert className="w-4 h-4 text-gray-400" />
            <span className="text-xs font-medium text-gray-600">No EHR Records</span>
          </div>
        )}
      </div>

      {/* Occupancy Permit Status */}
      <div className="mb-6 p-4 bg-teal-50/50 rounded-xl border border-teal-100/40">
        <div className="flex items-center gap-3 mb-2">
          <FileCheck className="w-5 h-5 text-teal-600" />
          <span className="text-sm font-medium text-teal-800 font-[family-name:var(--font-body)]">
            Occupancy Permit (Kasutusluba)
          </span>
        </div>
        <p className="text-sm text-teal-600/80 ml-8 font-[family-name:var(--font-body)]">
          {hasOccupancyPermit
            ? `Active — ${permitCount} permit${permitCount !== 1 ? 's' : ''} on record`
            : hasDocumentRecords
              ? 'No valid occupancy permit found among EHR documents.'
              : 'EHR building data has no permit documents on record.'}
          {ehrCode && (
            <a
              href={`https://livekluster.ehr.ee/api/building/v3/buildingData?ehr_code=${ehrCode}`}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-1.5 inline-flex items-center gap-0.5 text-teal-500 hover:text-teal-700 underline font-medium"
            >
              Verify on EHR <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </p>
        {lastDoc && (
          <p className="text-xs text-teal-400 ml-8 mt-1 font-[family-name:var(--font-body)]">
            Last document: {new Date(lastDoc.documentDate!).toLocaleDateString('et-EE')}
          </p>
        )}
      </div>

      {/* Energy Certificate */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="w-4 h-4 text-teal-600" />
          <span className="text-sm font-medium text-teal-800 font-[family-name:var(--font-body)]">
            Energy Performance Certificate
          </span>
        </div>

        {energy ? (
          <div className="flex items-center gap-4">
            {/* Energy grade badge */}
            <div
              className={`
                w-16 h-16 rounded-2xl flex items-center justify-center
                bg-gradient-to-br ${energy.color}
                shadow-lg shadow-teal-900/10
              `}
            >
              <span className="text-2xl font-bold text-white font-[family-name:var(--font-heading)]">
                {latestEnergyClass}
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-teal-800 font-[family-name:var(--font-body)]">
                {energy.label}
              </p>
              <p className="text-xs text-teal-500 mt-0.5 font-[family-name:var(--font-body)]">
                Energy class {latestEnergyClass}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 p-4 bg-amber-50/50 rounded-xl border border-amber-100/40">
            <Calendar className="w-5 h-5 text-amber-500" />
            <div>
              <p className="text-sm text-amber-700 font-[family-name:var(--font-body)]">
                No active energy certificate on record.
              </p>
              {ehrCode && (
                <a
                  href={`https://livekluster.ehr.ee/api/building/v3/buildingData?ehr_code=${ehrCode}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-amber-600 hover:text-amber-800 underline flex items-center gap-1 mt-1 font-[family-name:var(--font-body)]"
                >
                  Check EHR energy data <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Chimney Sweep Certificate */}
      {chimney && (
        <div className="mt-5 space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <Flame className="w-4 h-4 text-orange-500" />
            <span className="text-sm font-medium text-teal-800 font-[family-name:var(--font-body)]">
              Chimney Sweep (Päästeamet)
            </span>
          </div>
          <div className={`p-4 rounded-xl border ${chimney.valid ? 'bg-emerald-50/50 border-emerald-200/40' : 'bg-red-50/50 border-red-200/40'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${chimney.valid ? 'text-emerald-800' : 'text-red-800'} font-[family-name:var(--font-body)]`}>
                  {chimney.valid ? 'Certificate Valid' : 'Certificate Issue'}
                </p>
                {chimney.lastInspectionDate && (
                  <p className="text-xs text-teal-500 mt-0.5 font-[family-name:var(--font-body)]">
                    Last inspection: {new Date(chimney.lastInspectionDate).toLocaleDateString('et-EE')}
                  </p>
                )}
                {chimney.nextInspectionDue && (
                  <p className={`text-xs mt-0.5 font-[family-name:var(--font-body)] ${chimney.valid ? 'text-teal-500' : 'text-red-500'}`}>
                    Next due: {chimney.valid && chimney.nextInspectionDue.match(/^\d{4}-\d{2}-\d{2}/)
                      ? new Date(chimney.nextInspectionDue).toLocaleDateString('et-EE')
                      : chimney.nextInspectionDue}
                  </p>
                )}
              </div>
              {chimney.valid ? (
                <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0" />
              ) : (
                <ShieldAlert className="w-5 h-5 text-red-500 shrink-0" />
              )}
            </div>
            {chimney.systemType && (
              <p className="text-[10px] text-teal-400 mt-2 pt-2 border-t border-teal-200/30 font-[family-name:var(--font-body)]">
                System: {chimney.systemType}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Document count */}
      <div className="mt-5 pt-4 border-t border-teal-100/50">
        <p className="text-xs text-teal-400 font-[family-name:var(--font-body)]">
          {building.documents.length} document{building.documents.length !== 1 ? 's' : ''} on EHR record
          {' · '}
          Status: {building.status === 'K' ? 'In Use (Kasutuses)' : building.status === 'E' ? 'Under Construction' : building.status}
        </p>
      </div>
    </motion.div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────
function EmptyState({
  title,
  description,
  icon,
  delay = 0,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.23, 1, 0.32, 1] }}
      className="
        bg-white/40 backdrop-blur-sm
        border border-teal-100/40 rounded-2xl
        p-8 flex flex-col items-center justify-center text-center
      "
    >
      {icon}
      <h3 className="mt-3 text-sm font-semibold text-teal-700 font-[family-name:var(--font-heading)]">
        {title}
      </h3>
      <p className="mt-1 text-xs text-teal-400 font-[family-name:var(--font-body)]">
        {description}
      </p>
    </motion.div>
  );
}
