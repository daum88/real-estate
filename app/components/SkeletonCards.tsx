'use client';

import { motion } from 'framer-motion';

export function SkeletonPulse({ className = '' }: { className?: string }) {
  return (
    <div
      className={`
        relative overflow-hidden rounded-lg bg-teal-100/50
        before:absolute before:inset-0
        before:-translate-x-full
        before:animate-[shimmer_1.5s_infinite]
        before:bg-gradient-to-r
        before:from-transparent before:via-white/40 before:to-transparent
        ${className}
      `}
    />
  );
}

function SkeletonCardFull({ delay = 0 }: { delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.23, 1, 0.32, 1] }}
      className="
        bg-white/40 backdrop-blur-sm
        border border-teal-100/40 rounded-2xl
        p-6 space-y-4
      "
    >
      <div className="flex items-center justify-between">
        <SkeletonPulse className="h-3 w-28" />
        <SkeletonPulse className="h-6 w-20 rounded-full" />
      </div>
      <SkeletonPulse className="h-4 w-2/3" />
      <SkeletonPulse className="h-20 w-full rounded-xl" />
      <div className="flex gap-3">
        <SkeletonPulse className="h-16 w-16 rounded-2xl" />
        <div className="flex-1 space-y-2">
          <SkeletonPulse className="h-3 w-32" />
          <SkeletonPulse className="h-3 w-48" />
        </div>
      </div>
    </motion.div>
  );
}

function SkeletonCard({ delay = 0 }: { delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.23, 1, 0.32, 1] }}
      className="
        bg-white/40 backdrop-blur-sm
        border border-teal-100/40 rounded-2xl
        p-6 space-y-4
      "
    >
      <div className="flex items-center justify-between">
        <SkeletonPulse className="h-3 w-24" />
        <SkeletonPulse className="h-6 w-16 rounded-full" />
      </div>
      <SkeletonPulse className="h-4 w-3/4" />
      <SkeletonPulse className="h-16 w-full rounded-xl" />
      <div className="grid grid-cols-2 gap-3 pt-2">
        <SkeletonPulse className="h-14 rounded-xl" />
        <SkeletonPulse className="h-14 rounded-xl" />
        <SkeletonPulse className="h-14 rounded-xl" />
        <SkeletonPulse className="h-14 rounded-xl" />
      </div>
    </motion.div>
  );
}

export function SkeletonDashboard() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl mx-auto">
      <div className="lg:col-span-2">
        <SkeletonCardFull delay={0} />
      </div>
      <SkeletonCard delay={0.1} />
      <SkeletonCard delay={0.15} />
      <SkeletonCard delay={0.2} />
      <SkeletonCard delay={0.25} />
    </div>
  );
}
