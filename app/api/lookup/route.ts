import { NextRequest, NextResponse } from 'next/server';
import { searchAddresses, getAddressById } from '@/lib/inads';
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

export async function POST(req: NextRequest) {
  const start = Date.now();

  try {
    const body = await req.json().catch(() => ({}));
    const address = typeof body.address === 'string' ? body.address.trim() : '';
    const adrId = typeof body.adrId === 'number' ? body.adrId : undefined;
    const ehrCode = typeof body.ehrCode === 'string' ? body.ehrCode.trim().split('-')[0] : undefined;
    const registrikood = typeof body.registrikood === 'string' ? body.registrikood.trim() : undefined;

    if (!address && !adrId && !ehrCode) {
      return NextResponse.json(
        { success: false, error: 'At least one of address, adrId, or ehrCode is required.' },
        { status: 400 }
      );
    }

    const errors: string[] = [];
    let resolvedAddress = address;
    let resolvedAdrId = adrId;
    let resolvedEhrCode = ehrCode;
    let katastritunnus: string | undefined;
    let coordinates: { lat: number; lon: number } | undefined;

    // ═══ Step 1: Resolve address via In-ADS ═══
    if (address && !ehrCode) {
      const addresses = await searchAddresses(address, 1);
      if (addresses.length > 0) {
        const match = addresses[0];
        resolvedAddress = match.address;
        resolvedAdrId = resolvedAdrId || match.adr_id;
        katastritunnus = match.katastritunnus;
        if (match.lat && match.lon) coordinates = { lat: match.lat, lon: match.lon };
        // In-ADS provides the EHR building code directly via `tunnus`
        // Some apartment addresses return "ehrCode-aptCode" — strip the apt suffix
        if (!resolvedEhrCode && match.ehrCode) {
          resolvedEhrCode = match.ehrCode.includes('-') ? match.ehrCode.split('-')[0] : match.ehrCode;
        }
      } else {
        errors.push('Address not found in In-ADS. Try a more specific address.');
      }
    }

    // Resolve adrId fully if we need more data
    if (resolvedAdrId && (!katastritunnus || !coordinates)) {
      const detail = await getAddressById(resolvedAdrId);
      if (detail) {
        resolvedAddress = detail.address;
        katastritunnus = katastritunnus || detail.katastritunnus;
        if (detail.lat && detail.lon) coordinates = { lat: detail.lat, lon: detail.lon };
        if (!resolvedEhrCode && detail.ehrCode) resolvedEhrCode = detail.ehrCode;
      }
    }

    // ═══ Step 2: EHR — building data ═══
    let building = null;
    let hasPermit = false;
    let latestEnergyClass: string | null = null;

    if (resolvedEhrCode) {
      building = await getBuildingData(resolvedEhrCode);
      if (building) {
        hasPermit = hasOccupancyPermit(building);
        latestEnergyClass = getLatestEnergyClass(building);

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
    } else {
      errors.push('No EHR building code found for this address.');
    }

    // ═══ Step 3: Parallel data fetches ═══
    // Calculate estimated apartment area if this is an apartment address
    const isApartment = /(\d+)-(\d+)$/.test(resolvedAddress);
    const estimatedApartmentArea = isApartment && building?.technicalParameters?.closedNetArea
      ? Math.round(building.technicalParameters.closedNetArea / 26) : undefined;

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
      getMarketplaceListings({ address: resolvedAddress, buildingArea: estimatedApartmentArea || building?.technicalParameters?.closedNetArea, isHouse: building?.isHouse }),
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

    // ═══ Step 4: Assemble ═══
    // Detect apartment address and estimate unit area

    const data: DashboardData = {
      address: resolvedAddress || address || `EHR ${resolvedEhrCode}`,
      adrId: resolvedAdrId || 0,
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

    // ML model prediction
    try {
      const lookupArea = data.estimatedApartmentArea || building?.technicalParameters?.closedNetArea || 60;
      const buildingYear = building?.technicalParameters?.buildingYear;
      const mlPrediction = predictPricePerSqm({
        area: lookupArea,
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
        
        // Blend weight: 0 = full ML, 1 = full comps
        // High when: many comps AND tight price range
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
          estimatedTotal: Math.round(lookupArea * finalPpsqm),
          estimatedPerSqm: finalPpsqm,
          modelInfo: getModelInfo(),
        };
      }
    } catch (e: any) {
      console.error('[ML] prediction failed:', e?.message || e);
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
