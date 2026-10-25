'use client';

import { motion } from 'framer-motion';
import {
  AlertTriangle, ExternalLink, BarChart3, Search, Building2,
  TrendingUp, DollarSign, Home, Maximize, Zap,
} from 'lucide-react';
import type { DistrictPriceData, MarketplaceListing, SpatialConstraint } from '@/lib/types';

interface PriceStats { median: number; avg: number; min: number; max: number; count: number; medianPerSqm: number; }

interface ModelInfo { available: boolean; trees: number; features: string[]; }

interface MarketContextCardProps {
  districtPrice: DistrictPriceData | null;
  marketplaceListings: MarketplaceListing[];
  portalSearchUrls: { portal: string; url: string }[];
  priceStats: PriceStats;
  estimatedValue: number | null;
  similarByRooms: MarketplaceListing[];
  similarByArea: MarketplaceListing[];
  apartmentEstimate: { estimatedTotal: number; estimatedPerSqm: number; comparableCount: number; comparables: MarketplaceListing[] } | null;
  mlEstimate: { estimatedTotal: number; estimatedPerSqm: number; modelInfo: ModelInfo | null } | null;
  energyDistribution: { total: number; classes: { class: string; count: number; pct: number }[] } | null;
  priceTrend: { label: string; avgPricePerSqm: number; count: number }[];
  constraints: SpatialConstraint[];
  buildingArea?: number;
  displayArea?: number;  // For apartments: estimated unit area instead of building area
  delay?: number;
}

const CONSTRAINT_ICONS: Record<string, string> = {
  flood_risk: '🌊', nature_reserve: '🌲', utility_easement: '⚡', heritage: '🏛️',
};

function fmtEur(n: number): string {
  if (n >= 1_000_000) return '€' + (n / 1_000_000).toFixed(2) + 'M';
  if (n >= 1000) return '€' + (n / 1000).toFixed(1) + 'k';
  return '€' + n;
}

export default function MarketContextCard({
  marketplaceListings, portalSearchUrls,
  priceStats, estimatedValue, similarByRooms,
  apartmentEstimate, energyDistribution, priceTrend, mlEstimate,
  constraints, buildingArea, displayArea, delay = 0,
}: MarketContextCardProps) {
  const hasData = marketplaceListings.length > 0;
  const highConstraints = constraints.filter(c => c.severity === 'high');

  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.23, 1, 0.32, 1] }}
      className="relative overflow-hidden bg-white/70 backdrop-blur-xl border border-teal-100/60 rounded-2xl shadow-lg shadow-teal-900/5"
    >
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-400 to-purple-400" />
      <div className="p-6 space-y-5">
        {/* Header */}
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase text-teal-500/70 mb-1 font-[family-name:var(--font-heading)]">Market Context</p>
          <h3 className="text-lg font-semibold text-teal-900 font-[family-name:var(--font-heading)]">Comparable Listings</h3>
        </div>

        {/* Price stats from nearby comparables */}
        {priceStats.count > 0 && (
          <div className="p-5 bg-gradient-to-br from-indigo-50/80 to-purple-50/60 rounded-xl border border-indigo-100/50">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="w-4 h-4 text-indigo-500" />
              <span className="text-xs font-semibold text-indigo-700 uppercase tracking-wide font-[family-name:var(--font-heading)]">
                Market Analysis ({priceStats.count} comparable listings)
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <StatBox icon={<DollarSign className="w-3.5 h-3.5" />} label="Median/m²" value={fmtEur(priceStats.medianPerSqm)} />
              <StatBox icon={<TrendingUp className="w-3.5 h-3.5" />} label="Avg/m²" value={fmtEur(priceStats.avg)} />
              <StatBox icon={<Maximize className="w-3.5 h-3.5" />} label="Range" value={`${fmtEur(priceStats.min)}–${fmtEur(priceStats.max)}`} />
            </div>

            {estimatedValue && buildingArea && (
              <div className="mt-4 pt-4 border-t border-indigo-200/50">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-indigo-500 font-[family-name:var(--font-body)]">
                    Estimated value ({displayArea || buildingArea} m² × median {priceStats.medianPerSqm} €/m²)
                  </span>
                  <span className="text-xl font-bold text-indigo-700 font-[family-name:var(--font-heading)]">
                    {fmtEur(estimatedValue)}
                  </span>
                </div>
                <p className="text-[10px] text-indigo-400 mt-1 font-[family-name:var(--font-body)]">
                  Based on {priceStats.count} nearby sales listings. Individual prices are restricted data.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Apartment estimate */}
        {apartmentEstimate && apartmentEstimate.comparableCount > 0 && (
          <div className="p-4 bg-gradient-to-br from-emerald-50/80 to-green-50/60 rounded-xl border border-emerald-100/50">
            <div className="flex items-center gap-2 mb-2">
              <Home className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wide font-[family-name:var(--font-heading)]">
                Apartment Estimate ({apartmentEstimate.comparableCount} comps)
              </span>
            </div>
            <p className="text-2xl font-bold text-emerald-800 font-[family-name:var(--font-heading)]">
              {fmtEur(apartmentEstimate.estimatedTotal)}
            </p>
            <p className="text-xs text-emerald-600 font-[family-name:var(--font-body)]">
              {fmtEur(apartmentEstimate.estimatedPerSqm)}/m² · based on similar-sized nearby apartments
            </p>
          </div>
        )}

        {/* ML Model estimate */}
        {mlEstimate && (
          <div className="p-4 bg-gradient-to-br from-violet-50/80 to-purple-50/60 rounded-xl border border-violet-100/50">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-violet-600" />
              <span className="text-xs font-semibold text-violet-700 uppercase tracking-wide font-[family-name:var(--font-heading)]">
                ML Model Estimate
              </span>
              <span className="ml-auto text-[9px] text-violet-400 bg-violet-100/60 px-1.5 py-0.5 rounded-full font-[family-name:var(--font-body)]">
                {mlEstimate.modelInfo?.trees || '?'} trees
              </span>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-2xl font-bold text-violet-800 font-[family-name:var(--font-heading)]">
                  {fmtEur(mlEstimate.estimatedTotal)}
                </p>
                <p className="text-xs text-violet-600 font-[family-name:var(--font-body)]">
                  {fmtEur(mlEstimate.estimatedPerSqm)}/m² · XGBoost regression
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Energy distribution mini-chart */}
        {energyDistribution && energyDistribution.total > 0 && (
          <div className="p-4 bg-gradient-to-br from-amber-50/80 to-yellow-50/60 rounded-xl border border-amber-100/50">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-amber-600" />
              <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide font-[family-name:var(--font-heading)]">
                Energy Classes Nearby ({energyDistribution.total})
              </span>
            </div>
            <div className="flex gap-1 h-8 items-end">
              {energyDistribution.classes.map(c => (
                <div key={c.class} className="flex-1 flex flex-col items-center" title={`${c.class}: ${c.count} (${c.pct}%)`}>
                  <span className="text-[9px] text-amber-600 font-semibold mb-1 font-[family-name:var(--font-body)]">{c.pct}%</span>
                  <div className="w-full rounded-t" style={{
                    height: Math.max(4, c.pct * 0.6) + 'px',
                    backgroundColor: ['A','B'].includes(c.class) ? '#10b981' : ['C','D'].includes(c.class) ? '#f59e0b' : '#ef4444'
                  }} />
                </div>
              ))}
            </div>
            <div className="flex gap-1 mt-1">
              {energyDistribution.classes.map(c => (
                <span key={c.class} className="flex-1 text-center text-[9px] text-amber-500 font-[family-name:var(--font-body)]">{c.class}</span>
              ))}
            </div>
          </div>
        )}

        {/* Price trend by decade */}
        {priceTrend.length > 0 && (
          <div className="p-4 bg-gradient-to-br from-blue-50/80 to-indigo-50/60 rounded-xl border border-blue-100/50">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide font-[family-name:var(--font-heading)]">
                Price Trend by Decade
              </span>
            </div>
            <div className="flex gap-1 h-10 items-end">
              {priceTrend.map(t => {
                const maxVal = Math.max(...priceTrend.map(x => x.avgPricePerSqm));
                const h = maxVal > 0 ? Math.max(6, (t.avgPricePerSqm / maxVal) * 40) : 4;
                return (
                  <div key={t.label} className="flex-1 flex flex-col items-center" title={`${t.label}: ${fmtEur(t.avgPricePerSqm)}/m² (${t.count})`}>
                    <span className="text-[8px] text-blue-500 font-semibold mb-0.5 font-[family-name:var(--font-body)]">{fmtEur(t.avgPricePerSqm)}</span>
                    <div className="w-full rounded-t bg-blue-400/70" style={{ height: h + 'px' }} />
                    <span className="text-[8px] text-blue-400 mt-0.5 font-[family-name:var(--font-body)]">{t.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Nearby listings with links */}
        {hasData && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="w-4 h-4 text-teal-600" />
              <span className="text-xs font-semibold text-teal-700 uppercase tracking-wide font-[family-name:var(--font-heading)]">
                Nearby Properties
              </span>
            </div>
            <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
              {marketplaceListings.map((l, i) => (
                <a key={i} href={l.url || '#'} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 p-2.5 rounded-lg bg-teal-50/30 border border-teal-100/20 hover:bg-teal-50/60 hover:border-teal-300/40 transition-all group">
                  <div className="w-12 h-12 rounded-lg bg-teal-100/50 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-teal-600 font-[family-name:var(--font-heading)]">
                      {fmtEur(l.pricePerSqm)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-teal-800 font-[family-name:var(--font-body)]">
                        {fmtEur(l.currentPrice)}
                      </span>
                      {(l.rooms ?? 0) > 0 && <span className="text-[10px] text-teal-400">{l.rooms}r</span>}
                    </div>
                    <p className="text-[11px] text-teal-500 truncate font-[family-name:var(--font-body)]">
                      {l.area}m² {l.floorNumber ? '· Floor ' + l.floorNumber : ''}
                      {l.year ? ' · ' + l.year : ''} {l.material ? '· ' + l.material : ''}
                      {l.energyClass ? ' · ' + l.energyClass : ''}
                    </p>
                    <p className="text-[10px] text-teal-400 truncate font-[family-name:var(--font-body)]">
                      {l.addressRaw?.substring(0, 60)}
                    </p>
                  </div>
                  <ExternalLink className="w-3 h-3 text-teal-400 group-hover:text-teal-600 shrink-0" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Similar by rooms */}
        {similarByRooms.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Home className="w-4 h-4 text-teal-600" />
              <span className="text-xs font-semibold text-teal-700 uppercase tracking-wide font-[family-name:var(--font-heading)]">
                Same Room Count
              </span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {similarByRooms.slice(0, 6).map((l, i) => (
                <a key={i} href={l.url || '#'} target="_blank" rel="noopener noreferrer"
                  className="shrink-0 w-36 p-3 rounded-lg bg-teal-50/30 border border-teal-100/20 hover:bg-teal-50/60 hover:border-teal-300/40 transition-all group">
                  <p className="text-sm font-bold text-teal-700 font-[family-name:var(--font-heading)]">{fmtEur(l.currentPrice)}</p>
                  <p className="text-[10px] text-teal-500 font-[family-name:var(--font-body)]">{l.area}m² · {fmtEur(l.pricePerSqm)}/m²</p>
                  <p className="text-[9px] text-teal-400 truncate mt-1 font-[family-name:var(--font-body)]">{l.addressRaw?.substring(0, 30)}</p>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Portal search links */}
        {portalSearchUrls.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Search className="w-4 h-4 text-teal-600" />
              <span className="text-xs font-semibold text-teal-700 uppercase tracking-wide font-[family-name:var(--font-heading)]">Search Portals</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {portalSearchUrls.map(p => (
                <a key={p.portal} href={p.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-between p-2.5 rounded-lg bg-teal-50/50 border border-teal-100/30 hover:bg-teal-100/50 hover:border-teal-300/50 transition-all group">
                  <span className="text-xs font-semibold text-teal-700 group-hover:text-teal-900 font-[family-name:var(--font-body)]">{p.portal}</span>
                  <ExternalLink className="w-3 h-3 text-teal-400 group-hover:text-teal-600" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Critical constraints */}
        {highConstraints.length > 0 && (
          <div className="p-3 bg-red-50/50 rounded-xl border border-red-200/40">
            <div className="flex items-center gap-2 mb-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
              <span className="text-[11px] font-semibold text-red-700 uppercase font-[family-name:var(--font-heading)]">Critical Constraints</span>
            </div>
            {highConstraints.map((c, i) => (
              <p key={i} className="text-[10px] text-red-700/80 font-[family-name:var(--font-body)]">
                {CONSTRAINT_ICONS[c.type] || '⚠️'} {c.label}
              </p>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 pb-4 flex gap-3">
        <a href="https://kitsendused.maaamet.ee/" target="_blank" rel="noopener noreferrer"
          className="text-[10px] text-teal-500 hover:text-teal-700 flex items-center gap-1 font-[family-name:var(--font-body)]">
          Maa-amet <ExternalLink className="w-2.5 h-2.5" />
        </a>
        <a href="https://www.maaamet.ee/kinnisvara/tehingute-statistika" target="_blank" rel="noopener noreferrer"
          className="text-[10px] text-teal-500 hover:text-teal-700 flex items-center gap-1 font-[family-name:var(--font-body)]">
          Transaction stats <ExternalLink className="w-2.5 h-2.5" />
        </a>
      </div>
    </motion.div>
  );
}

function StatBox({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="p-3 rounded-lg bg-white/60 text-center">
      <div className="flex items-center justify-center gap-1 text-indigo-500 mb-1">{icon}</div>
      <p className="text-[9px] text-indigo-400 uppercase font-[family-name:var(--font-heading)]">{label}</p>
      <p className="text-sm font-bold text-indigo-700 font-[family-name:var(--font-heading)]">{value}</p>
    </div>
  );
}
