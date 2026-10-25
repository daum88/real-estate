import { NextRequest, NextResponse } from 'next/server';
import { searchAddresses } from '@/lib/inads';
import { getBuildingData, hasOccupancyPermit, getLatestEnergyClass } from '@/lib/ehr';
import { getSpatialConstraints, getDistrictPrice } from '@/lib/maaamet';
import { getKUHealth, findDeveloper } from '@/lib/ariregister';
import { getEnvironmentalProfile } from '@/lib/environmental';
import { getTransitScore } from '@/lib/transit';
import { getSchoolProximity } from '@/lib/schools';
import { getAgriculturalParcels } from '@/lib/pria';
import { getMunicipalPlans } from '@/lib/municipal';
import { getMarketplaceListings } from '@/lib/marketplace';
import { predictPricePerSqm, getModelInfo } from '@/lib/ml-model';
import { getChimneySweepStatus } from '@/lib/chimney';
import type { DashboardData } from '@/lib/types';

/** Clamp a candidate "unit area" into something a single housing unit can have. */
function sanitizeUnitArea(area: unknown): number | undefined {
  const n = typeof area === 'number' ? area : Number(area);
  if (!Number.isFinite(n)) return undefined;
  // A single apartment/house between 10 and 1,000 m²; anything else is a
  // building-level figure that would produce absurd valuations.
  if (n < 10 || n > 1000) return undefined;
  return Math.round(n);
}

export async function POST(req: NextRequest) {
  const start = Date.now();

  try {
    const body = await req.json().catch(() => ({}));
    const address = typeof body.address === 'string' ? body.address.trim() : '';
    const adrId = typeof body.adrId === 'number' && body.adrId > 0 ? body.adrId : undefined;
    // The client sends `ehrCode` from the In-ADS suggestion; strip any apt suffix.
    const ehrCode = typeof body.ehrCode === 'string' ? body.ehrCode.trim().split('-')[0] : undefined;
    const registrikood = typeof body.registrikood === 'string' ? body.registrikood.trim() : undefined;
    const clientLat = typeof body.lat === 'number' ? body.lat : undefined;
    const clientLon = typeof body.lon === 'number' ? body.lon : undefined;
    const clientKatastritunnus =
      typeof body.katastritunnus === 'string' ? body.katastritunnus.trim() : undefined;

    if (!address && !adrId && !ehrCode) {
      return NextResponse.json(
        { success: false, error: 'At least one of address, adrId, or ehrCode is required.' },
        { status: 400 }
      );
    }

    const errors: string[] = [];
    let resolvedAddress = address;
    let resolvedEhrCode = ehrCode;
    let katastritunnus = clientKatastritunnus;
    let coordinates =
      clientLat && clientLon ? { lat: clientLat, lon: clientLon } : undefined;

    // ═══ Step 1: Resolve via In-ADS ═══
    // Always geocode when we have an address — even if the client already sent
    // an ehrCode — so we get coordinates, the canonical address and cadastral
    // info. Previously this step was skipped whenever ehrCode was present,
    // which silently dropped coordinates and disabled all distance-based data
    // (transit, schools, spatial comparables).
    if (address) {
      const addresses = await searchAddresses(address, 3);
      if (addresses.length > 0) {
        // Prefer a building entry with an EHR code when the client didn't
        // already give us one.
        const match =
          addresses.find((a) => a.ehrCode) ||
          (resolvedEhrCode ? addresses.find((a) => a.adr_id === adrId) : undefined) ||
          addresses[0];

        resolvedAddress = match.address || resolvedAddress;
        katastritunnus = katastritunnus || match.katastritunnus;
        if (!coordinates && match.lat && match.lon) {
          coordinates = { lat: match.lat, lon: match.lon };
        }
        // In-ADS provides the EHR building code directly via `tunnus`.
        if (!resolvedEhrCode && match.ehrCode) {
          resolvedEhrCode = match.ehrCode.includes('-')
            ? match.ehrCode.split('-')[0]
            : match.ehrCode;
        }
      } else {
        errors.push('Address not found in In-ADS. Try a more specific address.');
      }
    }

    // ═══ Step 2: EHR — building data ═══
    let building = null;
    let hasPermit = false;
    let latestEnergyClass: string | null = null;

    if (resolvedEhrCode && /^\d+$/.test(resolvedEhrCode)) {
      building = await getBuildingData(resolvedEhrCode);
      if (building) {
        hasPermit = hasOccupancyPermit(building);
        latestEnergyClass = getLatestEnergyClass(building);

        // The gazetteer never returns katastritunnus — EHR does. Prefer it.
        katastritunnus = katastritunnus || building.cadastralCode;

        // Chimney sweep certificate
        const chimney = await getChimneySweepStatus({
          heatingSystem: building.technicalParameters.heatingSystem,
          buildingStatus: building.status,
          address: resolvedAddress,
        });
        if (chimney) building.chimneySweepCert = chimney;
      } else {
        errors.push(`EHR building data unavailable for code ${resolvedEhrCode}.`);
      }
    } else if (resolvedEhrCode) {
      errors.push(`Invalid EHR code: ${resolvedEhrCode}`);
    } else {
      errors.push('No EHR building code found for this address.');
    }

    // ═══ Step 3: Unit-area heuristic ═══
    // For multi-unit buildings EHR only reports the WHOLE building's net area.
    // Valuing a €/m² against 60,000 m² produces absurd totals, so estimate a
    // single unit's area instead. Only apartment-suffixed addresses or
    // apartment buildings get this treatment; houses use the building area.
    const isApartment = /(\d+)-(\d+)$/.test(resolvedAddress);
    const isApartmentBuilding =
      building?.isApartmentBuilding === true ||
      (!building?.isHouse && /elamu|korter/i.test(building?.buildingType || ''));
    const wholeBuildingArea = building?.technicalParameters?.closedNetArea;

    const estimatedApartmentArea = sanitizeUnitArea(
      isApartment && wholeBuildingArea
        ? wholeBuildingArea / 26
        : isApartmentBuilding && wholeBuildingArea && wholeBuildingArea > 1000
          ? wholeBuildingArea / 26
          : undefined
    );

    // The area used for valuation: unit area when we have one, otherwise the
    // building area only if it looks like a house/commercial unit itself.
    const valuationArea = sanitizeUnitArea(
      estimatedApartmentArea ??
        (isApartmentBuilding ? undefined : wholeBuildingArea)
    );

    // ═══ Step 4: Parallel data fetches ═══
    const parallelResults = await Promise.allSettled([
      getSpatialConstraints({ katastritunnus, address: resolvedAddress }),
      getDistrictPrice(resolvedAddress),
      getKUHealth({ registrikood, address: resolvedAddress }),
      findDeveloper({ registrikood, address: resolvedAddress }),
      getEnvironmentalProfile({ address: resolvedAddress, katastritunnus, coordinates }),
      getTransitScore({ address: resolvedAddress, coordinates }),
      getSchoolProximity({ address: resolvedAddress, coordinates }),
      getAgriculturalParcels({ katastritunnus, address: resolvedAddress }),
      getMunicipalPlans({ address: resolvedAddress, katastritunnus }),
      getMarketplaceListings({
        address: resolvedAddress,
        buildingArea: valuationArea,
        isHouse: building?.isHouse,
        coordinates,
      }),
    ]);

    const [
      constraintsResult, districtPriceResult, kuHealthResult, developerResult,
      environmentalResult, transitResult, schoolsResult, agriculturalResult,
      plansResult, marketplaceResult,
    ] = parallelResults;

    const parallelErrors: string[] = [];
    const labels = [
      'Spatial constraints', 'District pricing', 'KÜ health', 'Developer',
      'Environmental profile', 'Transit score', 'School proximity',
      'Agricultural data', 'Municipal plans', 'Marketplace listings',
    ];
    parallelResults.forEach((r, i) => {
      if (r.status === 'rejected') parallelErrors.push(`${labels[i]} lookup failed.`);
    });

    // ═══ Step 5: Assemble ═══
    const data: DashboardData = {
      address: resolvedAddress || address || `EHR ${resolvedEhrCode}`,
      adrId: adrId || 0,
      coordinates,
      katastritunnus,
      isApartment,
      estimatedApartmentArea,
      building,
      hasOccupancyPermit: hasPermit,
      latestEnergyClass,

      kuHealth: kuHealthResult.status === 'fulfilled' ? kuHealthResult.value : null,
      developer: developerResult.status === 'fulfilled' ? developerResult.value : null,

      constraints: constraintsResult.status === 'fulfilled' ? constraintsResult.value : [],
      agriculturalParcels: agriculturalResult.status === 'fulfilled' ? agriculturalResult.value : [],
      municipalPlans: plansResult.status === 'fulfilled' ? plansResult.value : [],
      transitScore: transitResult.status === 'fulfilled' ? transitResult.value : null,
      schools: schoolsResult.status === 'fulfilled' ? schoolsResult.value : [],
      environmental: environmentalResult.status === 'fulfilled'
        ? environmentalResult.value
        : { radonRiskLevel: 'unknown', floodRisk: 'none' },

      districtPrice: districtPriceResult.status === 'fulfilled' ? districtPriceResult.value : null,
      marketplaceListings: marketplaceResult.status === 'fulfilled' ? marketplaceResult.value.listings : [],
      portalSearchUrls: marketplaceResult.status === 'fulfilled' ? marketplaceResult.value.portalUrls : [],
      priceStats: marketplaceResult.status === 'fulfilled' ? marketplaceResult.value.priceStats : { median: 0, avg: 0, min: 0, max: 0, count: 0, medianPerSqm: 0 },
      estimatedValue: marketplaceResult.status === 'fulfilled' ? marketplaceResult.value.estimatedValue : null,
      similarByRooms: marketplaceResult.status === 'fulfilled' ? marketplaceResult.value.similarByRooms : [],
      similarByArea: marketplaceResult.status === 'fulfilled' ? marketplaceResult.value.similarByArea : [],
      apartmentEstimate: marketplaceResult.status === 'fulfilled' ? marketplaceResult.value.apartmentEstimate : null,
      mlEstimate: null,  // populated below
      energyDistribution: marketplaceResult.status === 'fulfilled' ? marketplaceResult.value.energyDistribution : null,
      priceTrend: marketplaceResult.status === 'fulfilled' ? marketplaceResult.value.priceTrend : [],

      errors: [...errors, ...parallelErrors],
    };

    // ML model prediction — only against a plausible single-unit area so the
    // total never explodes into building-scale nonsense.
    try {
      const mlArea = valuationArea || 60;
      const buildingYear = building?.technicalParameters?.buildingYear;
      const mlPrediction = predictPricePerSqm({
        area: mlArea,
        year: buildingYear || 2000,
        rooms: building?.ehrRooms || undefined,
        floorRatio: 0.5,
        lat: coordinates?.lat,
        lon: coordinates?.lon,
      }, {
        comp_avg_price_sqm_1km: data.priceStats?.medianPerSqm || 2000,
        comp_count_1km: data.priceStats?.count || 10,
      });
      if (mlPrediction) {
        // Adaptive blending: trust comps when they're dense and consistent
        const compAvg = data.priceStats?.medianPerSqm || 0;
        const compCount = data.priceStats?.count || 0;
        const compRange = (data.priceStats?.max || 0) - (data.priceStats?.min || 0);

        // Blend weight: 0 = full ML, 1 = full comps.
        // High when: many comps AND tight price range.
        let compWeight = 0;
        if (compCount >= 15 && compAvg > 0 && compRange < compAvg * 0.5) {
          compWeight = 0.8;  // Dense, similar comps → trust them
        } else if (compCount >= 8 && compAvg > 0) {
          compWeight = 0.4;  // Moderate comps → partial trust
        }

        const finalPpsqm = compWeight > 0
          ? Math.round(mlPrediction * (1 - compWeight) + compAvg * compWeight)
          : mlPrediction;

        data.mlEstimate = {
          estimatedTotal: Math.round(mlArea * finalPpsqm),
          estimatedPerSqm: finalPpsqm,
          modelInfo: getModelInfo(),
        };
      }
    } catch (e) {
      console.error('[ML] prediction failed:', e instanceof Error ? e.message : e);
    }

    console.log(`[lookup] Completed in ${Date.now() - start}ms for "${resolvedAddress}"`);
    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('[lookup] Unhandled error:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error during property lookup.' },
      { status: 500 }
    );
  }
}
