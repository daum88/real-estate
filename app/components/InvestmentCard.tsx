'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Clock, Euro, Percent } from 'lucide-react';

interface InvestmentProps {
  address?: string;
  estimatedValue?: number;
  buildingArea?: number;
  delay?: number;
}

function fmtEur(n: number): string {
  if (n >= 1_000_000) return '€' + (n / 1_000_000).toFixed(2) + 'M';
  if (n >= 1000) return '€' + (n / 1000).toFixed(1) + 'k';
  return '€' + n;
}

export default function InvestmentCard({ address, estimatedValue, buildingArea, delay = 0 }: InvestmentProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (!address || !estimatedValue) return;
    setLoading(true);
    fetch('/api/valuate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address, area: buildingArea || 60 }),
    })
      .then(r => r.json())
      .then(d => { if (d.success) setData(d.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [address, estimatedValue, buildingArea]);

  const inv = data?.investment;
  if (!inv && !loading) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.23, 1, 0.32, 1] }}
      className="relative overflow-hidden bg-white/70 backdrop-blur-xl border border-teal-100/60 rounded-2xl shadow-lg shadow-teal-900/5 p-6"
    >
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 to-teal-500" />

      <div className="mb-4">
        <p className="text-xs font-semibold tracking-widest uppercase text-teal-500/70 mb-1 font-[family-name:var(--font-heading)]">
          Investment
        </p>
        <h3 className="text-lg font-semibold text-teal-900 font-[family-name:var(--font-heading)]">
          Rental & ROI
        </h3>
      </div>

      {loading ? (
        <div className="space-y-3">
          <div className="h-12 bg-teal-100/40 rounded-xl animate-pulse" />
          <div className="h-12 bg-teal-100/40 rounded-xl animate-pulse" />
        </div>
      ) : inv ? (
        <div className="space-y-3">
          {/* Rental estimate */}
          <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-100/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Euro className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-medium text-emerald-700 font-[family-name:var(--font-body)]">Est. Monthly Rent</span>
              </div>
              <span className="text-lg font-bold text-emerald-800 font-[family-name:var(--font-heading)]">
                {fmtEur(inv.estimatedMonthlyRent)}/mo
              </span>
            </div>
          </div>

          {/* Yield + Cash-on-cash */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 bg-teal-50/50 rounded-xl border border-teal-100/30 text-center">
              <div className="flex items-center justify-center gap-1 text-teal-500 mb-1">
                <Percent className="w-3.5 h-3.5" />
                <span className="text-[10px] uppercase font-[family-name:var(--font-heading)]">Gross Yield</span>
              </div>
              <span className="text-lg font-bold text-teal-700 font-[family-name:var(--font-heading)]">
                {inv.grossYield ? inv.grossYield + '%' : '—'}
              </span>
            </div>
            <div className="p-3 bg-teal-50/50 rounded-xl border border-teal-100/30 text-center">
              <div className="flex items-center justify-center gap-1 text-teal-500 mb-1">
                <TrendingUp className="w-3.5 h-3.5" />
                <span className="text-[10px] uppercase font-[family-name:var(--font-heading)]">Cash/Cash</span>
              </div>
              <span className="text-lg font-bold text-teal-700 font-[family-name:var(--font-heading)]">
                {inv.cashOnCashReturn ? inv.cashOnCashReturn + '%' : '—'}
              </span>
            </div>
          </div>

          {/* Break-even + monthly cash flow */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 bg-teal-50/50 rounded-xl border border-teal-100/30 text-center">
              <div className="flex items-center justify-center gap-1 text-teal-500 mb-1">
                <Clock className="w-3.5 h-3.5" />
                <span className="text-[10px] uppercase font-[family-name:var(--font-heading)]">Break-even</span>
              </div>
              <span className="text-lg font-bold text-teal-700 font-[family-name:var(--font-heading)]">
                {inv.breakEvenYears ? inv.breakEvenYears + 'y' : '—'}
              </span>
            </div>
            <div className="p-3 bg-teal-50/50 rounded-xl border border-teal-100/30 text-center">
              <div className="flex items-center justify-center gap-1 text-teal-500 mb-1">
                <Euro className="w-3.5 h-3.5" />
                <span className="text-[10px] uppercase font-[family-name:var(--font-heading)]">Cash Flow</span>
              </div>
              <span className={`text-lg font-bold font-[family-name:var(--font-heading)] ${(inv.monthlyCashFlow || 0) >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                {inv.monthlyCashFlow ? fmtEur(inv.monthlyCashFlow) + '/mo' : '—'}
              </span>
            </div>
          </div>

          {/* Down payment */}
          <p className="text-[10px] text-teal-400 text-center font-[family-name:var(--font-body)]">
            30% down: {fmtEur(inv.downPayment30pct || 0)} · Mortgage: {fmtEur(inv.monthlyMortgage || 0)}/mo
          </p>
        </div>
      ) : null}
    </motion.div>
  );
}
