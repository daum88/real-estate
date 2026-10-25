import { NextRequest, NextResponse } from 'next/server';
import { valuateProperty } from '@/lib/marketplace';
import { predictPricePerSqm, getModelInfo } from '@/lib/ml-model';
import fs from 'fs';
import path from 'path';

// Load rental data for yield calculations
function loadRentals(): any[] {
  try {
    const p = path.join(process.cwd(), 'data', 'rentals.json');
    return JSON.parse(fs.readFileSync(p, 'utf-8')).rentals || [];
  } catch { return []; }
}

function norm(s: string): string {
  return s.toLowerCase().replace(/[äõüö]/g, a => ({ä:'a',õ:'o',ü:'u',ö:'o'}[a]||a));
}

// Find matching rental listings in same area
function findNearbyRentals(address: string, area: number, rooms?: number) {
  const rentals = loadRentals();
  const addrNorm = norm(address);
  const tokens = addrNorm.split(/\s+/).filter((t: string) => t.length > 3);

  return rentals
    .filter((r: any) => {
      if (!r.monthlyRent || r.monthlyRent < 50 || r.monthlyRent > 5000) return false;
      if (!r.area || r.area < 5) return false;
      const rn = norm((r.addressRaw || '') + ' ' + (r.city_name || ''));
      return tokens.some((t: string) => rn.includes(t));
    })
    .sort((a: any, b: any) => {
      const aDiff = Math.abs(a.area - area);
      const bDiff = Math.abs(b.area - area);
      return aDiff - bDiff;
    })
    .slice(0, 15);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const address = body.address || '';
    const features = {
      area: Number(body.area) || 60,
      rooms: Number(body.rooms) || undefined,
      floor: Number(body.floor) || undefined,
      totalFloors: Number(body.totalFloors) || undefined,
      year: Number(body.year) || undefined,
      material: body.material || undefined,
      energyClass: body.energyClass || undefined,
      condition: body.condition || undefined,
      heating: body.heating || undefined,
      hasSauna: body.hasSauna,
      hasBalcony: body.hasBalcony,
      hasParking: body.hasParking,
      hasStorage: body.hasStorage,
    };

    if (!address) {
      return NextResponse.json({ success: false, error: 'Address is required' }, { status: 400 });
    }

    // Sale valuation
    const valuation = valuateProperty(address, features);

    // Rental yield
    const nearbyRentals = findNearbyRentals(address, features.area, features.rooms);
    const avgRent = nearbyRentals.length > 0
      ? Math.round(nearbyRentals.reduce((s: number, r: any) => s + r.monthlyRent, 0) / nearbyRentals.length)
      : 0;
    const avgRentPerSqm = nearbyRentals.length > 0
      ? Math.round(nearbyRentals.reduce((s: number, r: any) => s + (r.rentPerSqm || r.monthlyRent/r.area), 0) / nearbyRentals.length)
      : 0;
    const estimatedRent = avgRent > 0 ? avgRent : (valuation.estimatedPerSqm > 0 ? Math.round(features.area * valuation.estimatedPerSqm * 0.004) : 0);

    const grossYield = valuation.estimatedTotal > 0 && estimatedRent > 0
      ? parseFloat(((estimatedRent * 12 / valuation.estimatedTotal) * 100).toFixed(2))
      : null;

    // ROI with 30% down payment
    const downPayment = valuation.estimatedTotal * 0.3;
    const monthlyMortgage = valuation.estimatedTotal > 0
      ? Math.round((valuation.estimatedTotal * 0.7) * 0.005) // ~5% annual interest on 70% LTV
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
          estimatedTotal: Math.round(features.area * mlPrediction),
          estimatedPerSqm: mlPrediction,
          modelInfo: mlInfo,
        } : null,
        rental: {
          estimatedMonthlyRent: estimatedRent,
          rentPerSqm: avgRentPerSqm || (estimatedRent > 0 ? Math.round(estimatedRent / features.area) : 0),
          nearbyRentals: nearbyRentals.slice(0, 5).map((r: any) => ({
            monthlyRent: r.monthlyRent,
            area: r.area,
            rooms: r.rooms,
            address: r.addressRaw?.substring(0, 60),
            rentPerSqm: r.rentPerSqm || Math.round(r.monthlyRent/r.area),
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
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 });
  }
}
