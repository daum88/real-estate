import type { InAdsAddress } from './types';

const INADS_BASE = 'https://inaadress.maaamet.ee/inaadress/gazetteer';

/**
 * Search addresses via In-ADS for autocomplete.
 * Returns up to `limit` matches sorted by relevance.
 */
export async function searchAddresses(query: string, limit = 5): Promise<InAdsAddress[]> {
  if (!query || query.length < 2) return [];

  const url = `${INADS_BASE}?address=${encodeURIComponent(query)}&results=${limit}`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`In-ADS returned ${res.status}`);

    const raw = await res.json();
    const items = Array.isArray(raw.addresses) ? raw.addresses : [];

    return items.map((item: Record<string, unknown>) => ({
      adr_id: item.adr_id as number,
      address: (item.taisaadress || item.pikkaadress || item.aadresstekst) as string,
      katastritunnus: item.katastritunnus as string | undefined,
      ehrCode: (item.tunnus as string) || undefined,          // ← EHR building code
      adsOid: item.ads_oid as string | undefined,
      x: (item.viitepunkt_x as number) || undefined,
      y: (item.viitepunkt_y as number) || undefined,
      lat: Number(item.viitepunkt_b) || undefined,   // b = latitude (~58°N)
      lon: Number(item.viitepunkt_l) || undefined,   // l = longitude (~26°E)
    }));
  } catch (err) {
    console.error('[In-ADS] Address search failed:', err);
    return [];
  }
}

/**
 * Look up a single address by its internal adr_id.
 */
export async function getAddressById(adrId: number): Promise<InAdsAddress | null> {
  // In-ADS doesn't support direct adr_id lookup — use adrId in search returns nothing.
  // The searchAddresses call already gives us all needed fields (ehrCode, coords, etc).
  // This function exists as a placeholder for when the API supports direct ID lookup.
  return null;
}
