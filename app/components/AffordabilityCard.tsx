'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, ExternalLink, Home } from 'lucide-react';
import type { MarketplaceListing } from '@/lib/types';

interface AffordabilityProps {
  initialBudget?: number;
  delay?: number;
}

interface AffordabilityResult {
  summary: string;
  possibleListings: MarketplaceListing[];
}

function fmtEur(n: number): string {
  if (n >= 1_000_000) return '€' + (n / 1_000_000).toFixed(2) + 'M';
  if (n >= 1000) return '€' + (n / 1000).toFixed(1) + 'k';
  return '€' + n;
}

export default function AffordabilityCard({ initialBudget, delay = 0 }: AffordabilityProps) {
  const [budget, setBudget] = useState(initialBudget || 150000);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AffordabilityResult | null>(null);

  const handleSearch = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/afford', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ budget }),
      });
      const data = await res.json();
      if (data.success) setResult(data.data);
    } catch {} finally { setLoading(false); }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.23, 1, 0.32, 1] }}
      className="relative overflow-hidden bg-white/70 backdrop-blur-xl border border-teal-100/60 rounded-2xl shadow-lg shadow-teal-900/5 p-6"
    >
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-400 to-pink-400" />

      <div className="mb-5">
        <p className="text-xs font-semibold tracking-widest uppercase text-teal-500/70 mb-1 font-[family-name:var(--font-heading)]">
          Affordability
        </p>
        <h3 className="text-lg font-semibold text-teal-900 font-[family-name:var(--font-heading)]">
          What Can I Afford?
        </h3>
      </div>

      <div className="flex gap-2 mb-4">
        <div className="flex-1 relative">
          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-teal-400" />
          <input
            type="number"
            value={Number.isFinite(budget) ? budget : ''}
            onChange={e => setBudget(Number(e.target.value))}
            placeholder="Enter budget"
            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-teal-50/50 border border-teal-200/40 text-teal-900 text-sm font-[family-name:var(--font-body)] focus:outline-none focus:border-teal-400"
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={loading || !Number.isFinite(budget) || budget < 1000}
          className="px-5 py-2.5 rounded-xl bg-rose-500 text-white text-sm font-semibold hover:bg-rose-600 disabled:opacity-40 transition-all font-[family-name:var(--font-body)]"
        >
          {loading ? '...' : 'Search'}
        </button>
      </div>

      {result && (
        <div>
          <p className="text-sm font-medium text-teal-700 mb-3 font-[family-name:var(--font-body)]">
            {result.summary}
          </p>
          {result.possibleListings.length > 0 && (
            <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
              {result.possibleListings.slice(0, 10).map((l: MarketplaceListing, i: number) => (
                <a key={i} href={l.url || '#'} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 p-2.5 rounded-lg bg-teal-50/30 border border-teal-100/20 hover:bg-teal-50/60 transition-all group">
                  <div className="w-12 h-12 rounded-lg bg-rose-100/50 flex items-center justify-center shrink-0">
                    <Home className="w-5 h-5 text-rose-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-teal-800 font-[family-name:var(--font-body)]">
                        {fmtEur(l.currentPrice)}
                      </span>
                      <span className="text-[10px] text-teal-400">{l.rooms}r</span>
                    </div>
                    <p className="text-[11px] text-teal-500 truncate font-[family-name:var(--font-body)]">
                      {l.area}m² · {fmtEur(l.pricePerSqm)}/m² {l.material ? '· ' + l.material : ''}
                    </p>
                    <p className="text-[10px] text-teal-400 truncate font-[family-name:var(--font-body)]">
                      {l.addressRaw?.substring(0, 50)}
                    </p>
                  </div>
                  <ExternalLink className="w-3 h-3 text-teal-400 group-hover:text-teal-600 shrink-0" />
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
