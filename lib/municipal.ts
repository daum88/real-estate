import { MUNICIPAL_PLANS, getPlanUrl } from './data/municipal-plans';
import type { MunicipalPlan } from './types';

export async function getMunicipalPlans(params: {
  address?: string;
  katastritunnus?: string;
}): Promise<MunicipalPlan[]> {
  const addr = params.address?.toLowerCase() || '';
  if (!addr) return [];

  const allPlans: MunicipalPlan[] = [];

  for (const municipality of MUNICIPAL_PLANS) {
    const munLower = municipality.municipality.toLowerCase();
    if (addr.includes(munLower)) {
      // Generate dynamic search URL for each plan based on the address
      const plans = municipality.plans.map(plan => ({
        ...plan,
        url: getPlanUrl(plan, params.address),
      }));
      allPlans.push(...plans);
    }
  }

  return allPlans;
}
