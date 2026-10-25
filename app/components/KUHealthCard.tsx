'use client';

import { motion } from 'framer-motion';
import {
  Building2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileText,
  Users,
  ExternalLink,
} from 'lucide-react';
import type { KUHealth, CompanyProfile } from '@/lib/types';

interface KUHealthCardProps {
  kuHealth: KUHealth | null;
  developer: CompanyProfile | null;
  isHouse?: boolean;
  delay?: number;
}

export default function KUHealthCard({ kuHealth, developer, isHouse, delay = 0 }: KUHealthCardProps) {
  // Private houses don't have KÜ
  if (isHouse) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay, ease: [0.23, 1, 0.32, 1] }}
        className="relative overflow-hidden bg-white/70 backdrop-blur-xl border border-teal-100/60 rounded-2xl shadow-lg shadow-teal-900/5 p-6"
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-400 to-purple-400" />
        <div className="mb-5">
          <p className="text-xs font-semibold tracking-widest uppercase text-teal-500/70 mb-1 font-[family-name:var(--font-heading)]">Entity Health</p>
          <h3 className="text-lg font-semibold text-teal-900 font-[family-name:var(--font-heading)]">KÜ & Developer</h3>
        </div>
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <Building2 className="w-8 h-8 text-teal-200 mb-2" />
          <p className="text-sm text-teal-500 font-[family-name:var(--font-body)]">Private house — no apartment association (KÜ).</p>
        </div>
      </motion.div>
    );
  }
  const hasAnyData = kuHealth || developer;
  const kuIsHealthy = kuHealth && kuHealth.taxDebt === 0 && kuHealth.annualReportUpToDate;
  const devIsHealthy = developer && developer.taxDebt === 0 && developer.annualReportFiled;

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
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-400 to-purple-400" />

      <div className="mb-5">
        <p className="text-xs font-semibold tracking-widest uppercase text-teal-500/70 mb-1 font-[family-name:var(--font-heading)]">
          Entity Health
        </p>
        <h3 className="text-lg font-semibold text-teal-900 font-[family-name:var(--font-heading)]">
          KÜ & Developer
        </h3>
      </div>

      {hasAnyData ? (
        <div className="space-y-4">
          {/* KÜ Section */}
          {kuHealth && (
            <div className={`p-4 rounded-xl border ${kuIsHealthy ? 'bg-emerald-50/60 border-emerald-200/50' : 'bg-red-50/60 border-red-200/50'}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-teal-600" />
                  <span className="text-sm font-semibold text-teal-800 font-[family-name:var(--font-body)]">
                    {kuHealth.name || 'Apartment Association'}
                  </span>
                </div>
                {kuIsHealthy ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 mt-3">
                <StatBadge
                  label="Tax Debt"
                  value={kuHealth.taxDebt === 0 ? '€0' : `€${kuHealth.taxDebt.toLocaleString()}`}
                  ok={kuHealth.taxDebt === 0}
                />
                <StatBadge
                  label="Reports"
                  value={kuHealth.annualReportUpToDate ? 'Filed' : `Overdue (last ${kuHealth.lastAnnualReportYear})`}
                  ok={kuHealth.annualReportUpToDate}
                />
              </div>

              {kuHealth.registrikood && (
                <div className="mt-3 pt-3 border-t border-teal-200/30 flex items-center justify-between">
                  <span className="text-[10px] text-teal-400 font-[family-name:var(--font-body)]">
                    Reg. {kuHealth.registrikood}
                  </span>
                  <a
                    href={`https://ariregister.rik.ee/est/company/${kuHealth.registrikood}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-teal-500 hover:text-teal-700 flex items-center gap-1 transition-colors font-[family-name:var(--font-body)]"
                  >
                    e-Äriregister <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Developer Section */}
          {developer && (
            <div className={`p-4 rounded-xl border ${devIsHealthy ? 'bg-indigo-50/60 border-indigo-200/50' : 'bg-red-50/60 border-red-200/50'}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-600" />
                  <span className="text-sm font-semibold text-indigo-800 font-[family-name:var(--font-body)]">
                    {developer.name}
                  </span>
                </div>
                {devIsHealthy ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500" />
                )}
              </div>

              <div className="text-[11px] text-indigo-600/80 mb-2 font-[family-name:var(--font-body)]">
                {developer.legalForm} · {developer.status === 'R' ? 'Registered' : developer.status}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <StatBadge
                  label="Tax Debt"
                  value={developer.taxDebt === 0 ? '€0' : `€${developer.taxDebt!.toLocaleString()}`}
                  ok={developer.taxDebt === 0}
                />
                <StatBadge
                  label="Annual Report"
                  value={developer.annualReportFiled ? `Filed (${developer.lastAnnualReportYear})` : 'Not filed'}
                  ok={developer.annualReportFiled || false}
                />
              </div>

              {developer.registrikood && (
                <div className="mt-3 pt-3 border-t border-indigo-200/30 flex items-center justify-between">
                  <span className="text-[10px] text-indigo-400 font-[family-name:var(--font-body)]">
                    Reg. {developer.registrikood}
                  </span>
                  <a
                    href={`https://ariregister.rik.ee/est/company/${developer.registrikood}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-indigo-500 hover:text-indigo-700 flex items-center gap-1 transition-colors font-[family-name:var(--font-body)]"
                  >
                    e-Äriregister <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          )}

          {/* No KÜ found */}
          {!kuHealth && developer && (
            <div className="p-3.5 bg-teal-50/50 rounded-xl border border-teal-100/30 flex items-center gap-2">
              <FileText className="w-4 h-4 text-teal-400" />
              <p className="text-xs text-teal-600 font-[family-name:var(--font-body)]">
                No apartment association (KÜ) data found for this address.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Building2 className="w-10 h-10 text-teal-200 mb-3" />
          <p className="text-sm text-teal-500 font-[family-name:var(--font-body)]">
            No entity data available.
          </p>
          <p className="text-xs text-teal-400 mt-1 font-[family-name:var(--font-body)]">
            KÜ and developer information from e-Äriregister.
          </p>
        </div>
      )}
    </motion.div>
  );
}

function StatBadge({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className={`p-2.5 rounded-lg text-center ${ok ? 'bg-white/60' : 'bg-red-100/60'}`}>
      <p className="text-[10px] uppercase tracking-wide text-teal-500 font-[family-name:var(--font-heading)]">
        {label}
      </p>
      <p className={`text-sm font-semibold mt-0.5 font-[family-name:var(--font-body)] ${ok ? 'text-teal-800' : 'text-red-700'}`}>
        {value}
      </p>
    </div>
  );
}
