'use client';

import { motion } from 'framer-motion';
import { Building2, Ruler, Calendar, Thermometer, Layers, BrickWall } from 'lucide-react';
import type { EhrBuildingData } from '@/lib/types';

interface PropertyDetailsCardProps {
  building: EhrBuildingData | null;
  delay?: number;
}

const HEATING_LABELS: Record<string, string> = {
  'kaugküte': 'District Heating',
  'soojuspump': 'Heat Pump',
  'gaasiküte': 'Gas Heating',
  'elektriküte': 'Electric Heating',
  'ahiküte': 'Stove Heating',
  'puit': 'Wood Burning',
  'pellet': 'Pellet Heating',
  'õhksoojuspump': 'Air-to-Air Heat Pump',
  'maasoojuspump': 'Ground Source Heat Pump',
};

function formatArea(val?: number): string {
  if (!val) return '—';
  return `${val.toLocaleString('et-EE')} m²`;
}

function formatHeating(raw?: string): string {
  if (!raw) return '—';
  const key = raw.toLowerCase().replace(/\s/g, '');
  return HEATING_LABELS[key] || raw;
}

function formatMaterial(raw?: string): string {
  if (!raw) return '—';
  // Capitalize first letter
  return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
}

export default function PropertyDetailsCard({ building, delay = 0 }: PropertyDetailsCardProps) {
  const tp = building?.technicalParameters;

  const details: { icon: React.ReactNode; label: string; value: string }[] = [
    {
      icon: <Ruler className="w-4 h-4" />,
      label: 'Total Area',
      value: formatArea(tp?.totalArea || tp?.closedNetArea),
    },
    {
      icon: <Layers className="w-4 h-4" />,
      label: 'Closed Net Area',
      value: tp?.closedNetArea ? formatArea(tp.closedNetArea) : '—',
    },
    {
      icon: <Calendar className="w-4 h-4" />,
      label: 'Year Built',
      value: tp?.buildingYear ? tp.buildingYear.toString() : '—',
    },
    {
      icon: <Building2 className="w-4 h-4" />,
      label: 'Floors',
      value: tp?.floors ? tp.floors.toString() : '—',
    },
    {
      icon: <Thermometer className="w-4 h-4" />,
      label: 'Heating System',
      value: formatHeating(tp?.heatingSystem),
    },
    {
      icon: <BrickWall className="w-4 h-4" />,
      label: 'Construction Material',
      value: formatMaterial(tp?.buildingMaterial),
    },
  ];

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
      {/* Top accent */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-400 to-blue-400" />

      {/* Header */}
      <div className="mb-6">
        <p className="text-xs font-semibold tracking-widest uppercase text-teal-500/70 mb-1 font-[family-name:var(--font-heading)]">
          Property Details
        </p>
        <h3 className="text-lg font-semibold text-teal-900 font-[family-name:var(--font-heading)]">
          Specifications
        </h3>
      </div>

      {building ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {details.map((detail, i) => (
            <motion.div
              key={detail.label}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: delay + 0.3 + i * 0.06, duration: 0.3 }}
              className="
                flex items-center gap-3 p-3.5
                bg-teal-50/50 rounded-xl
                border border-teal-100/30
                hover:bg-teal-50 hover:border-teal-200/40
                transition-colors duration-200
              "
            >
              <div className="w-9 h-9 rounded-lg bg-teal-100/60 flex items-center justify-center shrink-0">
                <span className="text-teal-600">{detail.icon}</span>
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-teal-400 font-medium tracking-wide uppercase font-[family-name:var(--font-heading)]">
                  {detail.label}
                </p>
                <p className="text-sm font-semibold text-teal-900 truncate font-[family-name:var(--font-body)]">
                  {detail.value}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Building2 className="w-10 h-10 text-teal-200 mb-3" />
          <p className="text-sm text-teal-500 font-[family-name:var(--font-body)]">
            No building specifications available.
          </p>
          <p className="text-xs text-teal-400 mt-1 font-[family-name:var(--font-body)]">
            Enter an address to retrieve property details from EHR.
          </p>
        </div>
      )}

      {/* Building status footer */}
      {building && (
        <div className="mt-5 pt-4 border-t border-teal-100/50">
          <span
            className={`
              inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium
              ${building.status === 'K'
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-amber-50 text-amber-700'
              }
              font-[family-name:var(--font-body)]
            `}
          >
            {building.status === 'K' ? '● In Use' : building.status === 'E' ? '● Under Construction' : `● ${building.status}`}
          </span>
        </div>
      )}
    </motion.div>
  );
}
