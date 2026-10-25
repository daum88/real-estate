import { NextRequest, NextResponse } from 'next/server';
import { whatCanIAfford, getPropertyComparison } from '@/lib/marketplace';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const budget = Number(body.budget) || 0;
    const city = body.city || undefined;
    const minRooms = Number(body.minRooms) || undefined;

    if (budget < 1000) {
      return NextResponse.json({ success: false, error: 'Budget must be at least €1,000' }, { status: 400 });
    }

    // Features 5 & 6
    const affordability = whatCanIAfford(budget, city, minRooms);
    const comparison = getPropertyComparison(
      typeof body.address === 'string' ? body.address : '',
      Number(body.area) > 0 ? Number(body.area) : undefined,
      Number(body.rooms) > 0 ? Number(body.rooms) : undefined
    );

    return NextResponse.json({
      success: true,
      data: {
        summary: affordability.summary,
        possibleListings: affordability.possibleListings.slice(0, 15),
        comparison: comparison.slice(0, 8),
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 });
  }
}
