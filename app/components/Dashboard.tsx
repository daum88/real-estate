'use client';

import { useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, Building, ExternalLink } from 'lucide-react';
import AddressSearch from './AddressSearch';
import BuildingHealthCard from './BuildingHealthCard';
import PropertyDetailsCard from './PropertyDetailsCard';
import MarketContextCard from './MarketContextCard';
import KUHealthCard from './KUHealthCard';
import LocationEnvironmentCard from './LocationEnvironmentCard';
import AffordabilityCard from './AffordabilityCard';
import InvestmentCard from './InvestmentCard';
import { SkeletonDashboard } from './SkeletonCards';
import type { InAdsAddress, DashboardData } from '@/lib/types';

export default function Dashboard() {
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAddressSelect = useCallback(async (address: InAdsAddress) => {
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: address.address,
          adrId: address.adr_id || undefined,
          ehrCode: address.ehrCode || undefined,
          // Forward coordinates from the In-ADS suggestion so the server can
          // compute real distances (transit, schools, spatial comparables).
          lat: address.lat,
          lon: address.lon,
          katastritunnus: address.katastritunnus,
        }),
      });

      const json = await res.json();

      if (!json.success || !json.data) {
        setError(json.error || 'Lookup failed. Please try again.');
        setData(null);
      } else {
        setData(json.data);
        if (json.data.errors.length > 0) {
          setError(json.data.errors.join(' '));
        }
      }
    } catch {
      setError('Network error. Please check your connection and try again.');
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50/60 via-white to-cyan-50/40">
      {/* Decorative background elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-teal-200/10 blur-3xl" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-cyan-200/10 blur-3xl" />
        <div className="absolute top-[40%] left-[60%] w-[300px] h-[300px] rounded-full bg-indigo-200/8 blur-3xl" />
        <div className="absolute top-[60%] left-[20%] w-[350px] h-[350px] rounded-full bg-violet-200/6 blur-3xl" />
      </div>

      <div className="relative z-10">
        {/* Hero Header */}
        <motion.header
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
          className="pt-16 pb-10 px-4 text-center"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15, duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
            className="inline-flex items-center gap-2 px-3 py-1.5 mb-6 bg-white/60 backdrop-blur-sm border border-teal-200/40 rounded-full shadow-sm"
          >
            <Building className="w-3.5 h-3.5 text-teal-500" />
            <span className="text-[11px] font-semibold tracking-widest uppercase text-teal-600 font-[family-name:var(--font-heading)]">
              Kinnisvara Transparency
            </span>
          </motion.div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-teal-900 tracking-tight font-[family-name:var(--font-heading)]">
            Property Intelligence
            <span className="text-teal-500"> Report</span>
          </h1>
          <p className="mt-4 text-base sm:text-lg text-teal-600/70 max-w-2xl mx-auto font-[family-name:var(--font-body)] font-light leading-relaxed">
            Instant 360° building compliance, KÜ health, environmental risks, transit access,
            and market valuation — from Estonia&apos;s national registries.
          </p>
        </motion.header>

        {/* Search */}
        <div className="px-4 pb-8">
          <AddressSearch onSelect={handleAddressSelect} isLoading={isLoading} />
        </div>

        {/* Error Banner */}
        <AnimatePresence>
          {error && !isLoading && (
            <motion.div
              initial={{ opacity: 0, y: -8, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -8, height: 0 }}
              className="max-w-6xl mx-auto px-4 pb-6"
            >
              <div className="flex items-start gap-3 p-4 bg-amber-50/80 backdrop-blur-sm border border-amber-200/60 rounded-xl">
                <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                <p className="text-sm text-amber-800 font-[family-name:var(--font-body)]">{error}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results Area */}
        <div className="pb-20 px-4">
          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <SkeletonDashboard />
              </motion.div>
            ) : data ? (
              <motion.div
                key="results"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
              >
                {/* Address bar */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="max-w-6xl mx-auto mb-6 flex items-center gap-3"
                >
                  <div className="flex-1 p-3.5 bg-white/60 backdrop-blur-sm border border-teal-100/40 rounded-xl">
                    <p className="text-xs text-teal-400 uppercase tracking-wide font-[family-name:var(--font-heading)]">
                      Property Address
                    </p>
                    <p className="text-sm font-medium text-teal-800 mt-0.5 font-[family-name:var(--font-body)]">
                      {data.address}
                    </p>
                  </div>
                  {data.building?.ehrCode && (
                    <a
                      href={`https://livekluster.ehr.ee/api/building/v3/buildingData?ehr_code=${data.building.ehrCode}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="
                        shrink-0 flex items-center gap-1.5 px-3.5 py-2.5
                        bg-white/60 backdrop-blur-sm border border-teal-100/40
                        rounded-xl text-[11px] text-teal-500 hover:text-teal-700
                        hover:border-teal-200/60 transition-all duration-200
                        font-[family-name:var(--font-body)]
                      "
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      EHR Source
                    </a>
                  )}
                </motion.div>

                {/* 2-Column Bento Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl mx-auto">
                  {/* Row 1: Building Health (full-width) */}
                  <div className="lg:col-span-2">
                    <BuildingHealthCard
                      building={data.building}
                      hasOccupancyPermit={data.hasOccupancyPermit}
                      latestEnergyClass={data.latestEnergyClass}
                      ehrCode={data.building?.ehrCode}
                      delay={0}
                    />
                  </div>

                  {/* Row 2: KÜ Health + Location & Environment */}
                  <KUHealthCard
                    kuHealth={data.kuHealth}
                    developer={data.developer}
                    isHouse={data.building?.isHouse}
                    delay={0.15}
                  />
                  <LocationEnvironmentCard
                    transitScore={data.transitScore}
                    environmental={data.environmental}
                    schools={data.schools}
                    municipalPlans={data.municipalPlans}
                    agriculturalParcels={data.agriculturalParcels}
                    delay={0.2}
                  />

                  {/* Row 3: Property Details + Market Context */}
                  <PropertyDetailsCard
                    building={data.building}
                    delay={0.25}
                  />
                  <MarketContextCard
                    districtPrice={data.districtPrice}
                    marketplaceListings={data.marketplaceListings}
                    portalSearchUrls={data.portalSearchUrls}
                    priceStats={data.priceStats}
                    estimatedValue={data.estimatedValue}
                    similarByRooms={data.similarByRooms}
                    similarByArea={data.similarByArea}
                    apartmentEstimate={data.apartmentEstimate}
                    mlEstimate={data.mlEstimate}
                    energyDistribution={data.energyDistribution}
                    priceTrend={data.priceTrend}
                    constraints={data.constraints}
                    buildingArea={
                      data.building?.isApartmentBuilding
                        ? undefined
                        : data.building?.technicalParameters?.closedNetArea
                    }
                    displayArea={data.estimatedApartmentArea}
                    delay={0.3}
                  />

                {/* Row 4: Affordability Calculator */}
                <div className="lg:col-span-2">
                  <AffordabilityCard initialBudget={150000} delay={0.35} />
                </div>

                {/* Row 5: Investment Insights */}
                <InvestmentCard
                  address={data.address}
                  estimatedValue={data.estimatedValue || undefined}
                  buildingArea={
                    data.estimatedApartmentArea ||
                    (data.building?.isApartmentBuilding
                      ? undefined
                      : data.building?.technicalParameters?.closedNetArea)
                  }
                  delay={0.4}
                />
              </div>
            </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <footer className="pb-10 text-center">
          <p className="text-xs text-teal-300 font-[family-name:var(--font-body)]">
            Data sourced from{' '}
            <a href="https://livekluster.ehr.ee" className="underline hover:text-teal-400 transition-colors">EHR</a>
            {' '}·{' '}
            <a href="https://inaadress.maaamet.ee" className="underline hover:text-teal-400 transition-colors">In-ADS</a>
            {' '}·{' '}
            <a href="https://ariregister.rik.ee" className="underline hover:text-teal-400 transition-colors">e-Äriregister</a>
            {' '}·{' '}
            <a href="https://kitsendused.maaamet.ee" className="underline hover:text-teal-400 transition-colors">Maa-amet</a>
          </p>
          <p className="text-[10px] text-teal-200 mt-2 font-[family-name:var(--font-body)]">
            Individual sale prices restricted. 9,695 real KV.ee listings.
          </p>
        </footer>
      </div>
    </div>
  );
}
