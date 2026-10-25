'use client';

import { motion } from 'framer-motion';
import {
  Bus,
  Radiation,
  Volume2,
  GraduationCap,
  MapPin,
  Trees,
  Sprout,
  AlertTriangle,
  CheckCircle,
  Clock,
  ExternalLink,
  Waves,
  Construction,
} from 'lucide-react';
import type { TransitScore, EnvironmentalProfile, SchoolProximity, MunicipalPlan, AgriculturalParcel, SpatialConstraint } from '@/lib/types';

interface LocationEnvironmentCardProps {
  transitScore: TransitScore | null;
  environmental: EnvironmentalProfile;
  schools: SchoolProximity[];
  municipalPlans: MunicipalPlan[];
  agriculturalParcels: AgriculturalParcel[];
  constraints: SpatialConstraint[];
  delay?: number;
}

const RADON_COLORS: Record<string, string> = {
  low: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  normal: 'text-blue-600 bg-blue-50 border-blue-200',
  high: 'text-orange-600 bg-orange-50 border-orange-200',
  very_high: 'text-red-600 bg-red-50 border-red-200',
  unknown: 'text-gray-500 bg-gray-50 border-gray-200',
};

const PLAN_STATUS_BADGE: Record<string, string> = {
  'Kehtestatud': 'bg-emerald-100 text-emerald-700',
  'Menetluses': 'bg-amber-100 text-amber-700',
  'Algatatud': 'bg-blue-100 text-blue-700',
};

export default function LocationEnvironmentCard({
  transitScore,
  environmental,
  schools,
  municipalPlans,
  agriculturalParcels,
  constraints,
  delay = 0,
}: LocationEnvironmentCardProps) {
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
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-green-400 to-emerald-400" />

      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase text-teal-500/70 mb-1 font-[family-name:var(--font-heading)]">
            Location Profile
          </p>
          <h3 className="text-lg font-semibold text-teal-900 font-[family-name:var(--font-heading)]">
            Environment & Transit
          </h3>
        </div>
        {transitScore && (
          <TransitBadge score={transitScore.score} />
        )}
      </div>

      <div className="space-y-4">
        {/* ── Transit ── */}
        {transitScore && (
          <SectionBlock icon={<Bus className="w-4 h-4" />} title="Public Transport">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <p className="text-sm font-medium text-teal-800 font-[family-name:var(--font-body)]">
                  {transitScore.nearestStopName}
                </p>
                <p className="text-xs text-teal-500 mt-0.5 font-[family-name:var(--font-body)]">
                  {transitScore.nearestStopDistance}m · {transitScore.walkTimeMinutes} min walk
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-teal-400 uppercase tracking-wide font-[family-name:var(--font-heading)]">Routes</p>
                <p className="text-sm font-semibold text-teal-700 font-[family-name:var(--font-body)]">
                  {transitScore.routes.length}
                </p>
              </div>
            </div>
            {transitScore.routes.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {transitScore.routes.slice(0, 4).map((r) => (
                  <span
                    key={r.routeNumber}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-teal-100/70 text-[10px] font-medium text-teal-700 font-[family-name:var(--font-body)]"
                  >
                    {r.type === 'train' ? '🚆' : '🚌'} {r.routeName} · {r.frequency}
                  </span>
                ))}
              </div>
            )}
          </SectionBlock>
        )}

        {/* ── Environmental ── */}
        <div className="grid grid-cols-3 gap-2">
          {/* Radon */}
          <div className={`p-3 rounded-xl border ${RADON_COLORS[environmental.radonRiskLevel]}`}>
            <Radiation className="w-4 h-4 mb-1.5" />
            <p className="text-[10px] font-semibold uppercase font-[family-name:var(--font-heading)]">Radon</p>
            <p className="text-xs mt-0.5 capitalize font-[family-name:var(--font-body)]">
              {environmental.radonRiskLevel.replace('_', ' ')}
            </p>
          </div>

          {/* Noise */}
          <div className={`p-3 rounded-xl border ${environmental.noiseLevel && environmental.noiseLevel > 55 ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
            <Volume2 className="w-4 h-4 mb-1.5" />
            <p className="text-[10px] font-semibold uppercase font-[family-name:var(--font-heading)]">Noise</p>
            <p className="text-xs mt-0.5 font-[family-name:var(--font-body)]">
              {environmental.noiseLevel ? `${environmental.noiseLevel} dB` : '—'}
            </p>
          </div>

          {/* Flood */}
          <div className={`p-3 rounded-xl border ${environmental.floodRisk === 'none' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
            <Waves className="w-4 h-4 mb-1.5" />
            <p className="text-[10px] font-semibold uppercase font-[family-name:var(--font-heading)]">Flood</p>
            <p className="text-xs mt-0.5 capitalize font-[family-name:var(--font-body)]">
              {environmental.floodRisk}
            </p>
          </div>
        </div>

        {/* ── Schools ── */}
        {schools.length > 0 && (
          <SectionBlock icon={<GraduationCap className="w-4 h-4" />} title="Nearby Schools">
            <div className="space-y-2">
              {schools.slice(0, 4).map((s, i) => (
                <a
                  key={i}
                  href="https://www.ehis.ee/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between text-xs p-1.5 rounded hover:bg-teal-50/60 transition-colors"
                >
                  <span className="font-medium text-teal-700 font-[family-name:var(--font-body)]">
                    {s.name}
                  </span>
                  <span className="text-teal-400 font-[family-name:var(--font-body)] flex items-center gap-1">
                    {s.distance > 0 ? `${s.distance}m · ${s.walkTimeMinutes} min` : ''}
                    <span className="ml-1.5 px-1.5 py-0.5 rounded bg-teal-100/70 text-[10px]">{s.type}</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </span>
                </a>
              ))}
            </div>
          </SectionBlock>
        )}

        {/* ── Municipal Plans ── */}
        {municipalPlans.length > 0 && (
          <SectionBlock icon={<Construction className="w-4 h-4" />} title="Municipal Plans (Kambja vald)">
            <div className="space-y-2">
              {municipalPlans.slice(0, 3).map((plan, i) => (
                <a
                  key={i}
                  href={plan.url || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-3 rounded-xl bg-amber-50/50 border border-amber-100/40 hover:bg-amber-100/60 hover:border-amber-300/50 transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-amber-800 font-[family-name:var(--font-body)]">
                      {plan.title}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium font-[family-name:var(--font-body)] ${PLAN_STATUS_BADGE[plan.status] || 'bg-gray-100 text-gray-600'}`}>
                      {plan.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-700/80 font-[family-name:var(--font-body)]">
                    {plan.impact || plan.description}
                  </p>
                  <ExternalLink className="w-3 h-3 text-amber-400 mt-1" />
                </a>
              ))}
            </div>
          </SectionBlock>
        )}

        {/* ── Agricultural ── */}
        {agriculturalParcels.length > 0 && (
          <SectionBlock icon={<Sprout className="w-4 h-4" />} title="Nearby Agriculture (PRIA)">
            <div className="space-y-2">
              {agriculturalParcels.map((p, i) => (
                <a
                  key={i}
                  href="https://pria.ee/kaart/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start justify-between text-xs p-2 rounded-lg bg-lime-50/50 border border-lime-100/40 hover:bg-lime-100/60 hover:border-lime-300/50 transition-all"
                >
                  <div>
                    <span className="font-medium text-teal-700 font-[family-name:var(--font-body)]">
                      {p.cropType || 'Agricultural parcel'}
                    </span>
                    <span className="text-teal-400 ml-2 font-[family-name:var(--font-body)]">{p.distance}m</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {p.isOrganic && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-700">Organic</span>
                    )}
                    {p.pesticideRisk !== 'none' && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${p.pesticideRisk === 'high' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                        {p.pesticideRisk} pesticide risk
                      </span>
                    )}
                    <ExternalLink className="w-3 h-3 text-lime-400" />
                  </div>
                </a>
              ))}
            </div>
          </SectionBlock>
        )}
      </div>

      {/* External links footer */}
      <div className="px-6 pb-4 flex flex-wrap gap-2">
        <a href="https://www.ehis.ee/" target="_blank" rel="noopener noreferrer"
          className="text-[10px] text-teal-500 hover:text-teal-700 flex items-center gap-1 font-[family-name:var(--font-body)]">
          EHIS schools <ExternalLink className="w-2.5 h-2.5" />
        </a>
        {municipalPlans.length > 0 && (
          <a href="https://www.tartu.ee/et/planeeringud" target="_blank" rel="noopener noreferrer"
            className="text-[10px] text-teal-500 hover:text-teal-700 flex items-center gap-1 font-[family-name:var(--font-body)]">
            Municipal plans <ExternalLink className="w-2.5 h-2.5" />
          </a>
        )}
        {agriculturalParcels.length > 0 && (
          <a href="https://pria.ee/kaart/" target="_blank" rel="noopener noreferrer"
            className="text-[10px] text-teal-500 hover:text-teal-700 flex items-center gap-1 font-[family-name:var(--font-body)]">
            PRIA map <ExternalLink className="w-2.5 h-2.5" />
          </a>
        )}
        <a href="https://geoloogia.ee/radoon" target="_blank" rel="noopener noreferrer"
          className="text-[10px] text-teal-500 hover:text-teal-700 flex items-center gap-1 font-[family-name:var(--font-body)]">
          Radon map <ExternalLink className="w-2.5 h-2.5" />
        </a>
      </div>
    </motion.div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────

function TransitBadge({ score }: { score: number }) {
  const color =
    score >= 80 ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
    score >= 60 ? 'bg-lime-100 text-lime-700 border-lime-200' :
    score >= 40 ? 'bg-amber-100 text-amber-700 border-amber-200' :
    'bg-red-100 text-red-700 border-red-200';

  return (
    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${color}`}>
      <Bus className="w-3.5 h-3.5" />
      <span className="text-sm font-bold font-[family-name:var(--font-heading)]">{score}</span>
      <span className="text-[10px] opacity-70 font-[family-name:var(--font-body)]">/100</span>
    </div>
  );
}

function SectionBlock({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="p-3.5 rounded-xl bg-teal-50/30 border border-teal-100/30">
      <div className="flex items-center gap-2 mb-2.5">
        <span className="text-teal-600">{icon}</span>
        <span className="text-xs font-semibold text-teal-700 uppercase tracking-wide font-[family-name:var(--font-heading)]">
          {title}
        </span>
      </div>
      {children}
    </div>
  );
}
