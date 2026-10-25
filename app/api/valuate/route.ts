import { NextRequest, NextResponse } from 'next/server';
import { valuateProperty } from '@/lib/marketplace';
import { predictPricePerSqm, getModelInfo } from '@/lib/ml-model';
import fs from 'fs';
import path from 'path';

// ─── Typed shape of a rental record in data/rentals.json ─────────
interface RentalRecord {
  id: string;
  monthlyRent?: number;
  area?: number;
  rentPerSqm?: number;
  rooms?: number;
  addressRaw?: string;
  city_name?: string;
  url?: string;
}

function loadRentals(): RentalRecord[] {
  try {
    const p = path.join(process.cwd(), 'data', 'rentals.json');
    const raw = JSON.parse(fs.readFileSync(p, 'utf-8')) as { rentals?: RentalRecord[] };
    return raw.rentals || [];
  } catch {
    return [];
  }
}

function norm(s: string): string {
  return s.toLowerCase().replace(
    /[äõüö]/g,
    (a) => ({ ä: 'a', õ: 'o', ü: 'u', ö: 'o' }[a as 'ä' | 'õ' | 'ü' | 'ö'] || a)
  );
}

// Find matching rental listings in the same area.
// Excludes listings whose address mentions a DIFFERENT major city, which the
// naive token matcher used to let through (e.g. "Tartu mnt, Tallinn" matching
// a Tartu query via the "tartu" token).
function findNearbyRentals(address: string, area: number) {
  const rentals = loadRentals();
  const addrNorm = norm(address);
  const tokens = addrNorm.split(/\s+/).filter((t: string) => t.length > 3);

  // City name of the search address, when present.
  const cityMatch = address.toLowerCase().match(/\b(tallinn|tartu|pärnu|narva|rakvere|viljandi|kuressaare|haapsalu|valga|võru|põlva|jõgeva|paide|rapla|kärdla)\b/);
  const searchCity = cityMatch ? cityMatch[1] : null;

  return rentals
    .filter((r) => {
      if (!r.monthlyRent || r.monthlyRent < 50 || r.monthlyRent > 5000) return false;
      if (!r.area || r.area < 5) return false;
      const rn = norm((r.addressRaw || '') + ' ' + (r.city_name || ''));
      if (searchCity) {
        const otherCities = ['tallinn', 'tartu', 'pärnu', 'narva']
          .filter((c) => c !== searchCity);
        if (otherCities.some((c) => rn.includes(c))) return false;
      }
      return tokens.some((t: string) => rn.includes(t));
    })
    .sort((a, b) => Math.abs((a.area || 0) - area) - Math.abs((b.area || 0) - area))
    .slice(0, 15);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const address = typeof body.address === 'string' ? body.address.trim() : '';

    if (!address) {
      return NextResponse.json({ success: false, error: 'Address is required' }, { status: 400 });
    }

    // Guard against building-scale areas blowing up the valuation.
    const rawArea = Number(body.area);
    const area = Number.isFinite(rawArea) && rawArea >= 10 && rawArea <= 1000 ? rawArea : 60;

    const features = {
      area,
      rooms: Number(body.rooms) > 0 ? Number(body.rooms) : undefined,
      floor: Number(body.floor) > 0 ? Number(body.floor) : undefined,
      totalFloors: Number(body.totalFloors) > 0 ? Number(body.totalFloors) : undefined,
      year: Number(body.year) > 1800 ? Number(body.year) : undefined,
      material: body.material || undefined,
      energyClass: body.energyClass || undefined,
      condition: body.condition || undefined,
      heating: body.heating || undefined,
      hasSauna: body.hasSauna,
      hasBalcony: body.hasBalcony,
      hasParking: body.hasParking,
      hasStorage: body.hasStorage,
    };

    // Sale valuation
    const valuation = valuateProperty(address, features);

    // Rental yield
    const nearbyRentals = findNearbyRentals(address, area);
    const avgRent = nearbyRentals.length > 0
      ? Math.round(nearbyRentals.reduce((s: number, r) => s + (r.monthlyRent || 0), 0) / nearbyRentals.length)
      : 0;
    const avgRentPerSqm = nearbyRentals.length > 0
      ? Math.round(
          nearbyRentals.reduce(
            (s: number, r) => s + (r.rentPerSqm || (r.monthlyRent || 0) / (r.area || 1)),
            0
          ) / nearbyRentals.length
        )
      : 0;
    const estimatedRent = avgRent > 0
      ? avgRent
      : (valuation.estimatedPerSqm > 0 ? Math.round(area * valuation.estimatedPerSqm * 0.004) : 0);

    const grossYield = valuation.estimatedTotal > 0 && estimatedRent > 0
      ? parseFloat(((estimatedRent * 12 / valuation.estimatedTotal) * 100).toFixed(2))
      : null;

    // ROI with 30% down payment
    const downPayment = valuation.estimatedTotal * 0.3;
    const monthlyMortgage = valuation.estimatedTotal > 0
      ? Math.round((valuation.estimatedTotal * 0.7) * 0.005) // ~6% p.a. interest-only on 70% LTV
      : 0;
    const cashFlow = estimatedRent - monthlyMortgage;
    const cashOnCash = downPayment > 0 ? parseFloat(((cashFlow * 12 / downPayment) * 100).toFixed(1)) : null;

    // ML model prediction
    const mlPrediction = predictPricePerSqm(features, {
      comp_avg_price_sqm_1km: valuation.neighborhoodStats?.avg || valuation.estimatedPerSqm,
      comp_count_1km: valuation.comparableCount,
    });
    const mlInfo = getModelInfo();

    return NextResponse.json({
      success: true,
      data: {
        valuation: {
          estimatedTotal: valuation.estimatedTotal,
          estimatedPerSqm: valuation.estimatedPerSqm,
          priceRange: valuation.priceRange,
          confidence: valuation.confidence,
          comparableCount: valuation.comparableCount,
          comparables: valuation.comparables.slice(0, 5),
        },
        // ML model prediction (when available)
        ml: mlPrediction ? {
          estimatedTotal: Math.round(area * mlPrediction),
          estimatedPerSqm: mlPrediction,
          modelInfo: mlInfo,
        } : null,
        rental: {
          estimatedMonthlyRent: estimatedRent,
          rentPerSqm: avgRentPerSqm || (estimatedRent > 0 ? Math.round(estimatedRent / area) : 0),
          nearbyRentals: nearbyRentals.slice(0, 5).map((r) => ({
            monthlyRent: r.monthlyRent,
            area: r.area,
            rooms: r.rooms,
            address: (r.addressRaw || '').substring(0, 60),
            rentPerSqm: r.rentPerSqm || Math.round((r.monthlyRent || 0) / (r.area || 1)),
          })),
        },
        investment: {
          grossYield,
          estimatedMonthlyRent: estimatedRent,
          monthlyMortgage,
          monthlyCashFlow: cashFlow,
          cashOnCashReturn: cashOnCash,
          breakEvenYears: grossYield ? parseFloat((100 / grossYield).toFixed(1)) : null,
          downPayment30pct: Math.round(downPayment),
        },
      },
    });
  } catch (err) {
    console.error('[valuate] error:', err);
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 });
  }
}
