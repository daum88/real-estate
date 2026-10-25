import type { InAdsAddress } from './types';

const INADS_BASE = 'https://inaadress.maaamet.ee/inaadress/gazetteer';

/**
 * Search addresses via In-ADS for autocomplete.
 * Returns up to `limit` matches sorted by relevance.
 *
 * `tunnus` is the EHR building code for building entries (liik === 'E',
 * numeric) but a cadastral unit code (e.g. "79501:002:0069") for
 * KATASTRIYKSUS entries — never mix the two up.
 */
export async function searchAddresses(query: string, limit = 5): Promise<InAdsAddress[]> {
  if (!query || query.length < 2) return [];

  const url = `${INADS_BASE}?address=${encodeURIComponent(query)}&results=${limit}`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`In-ADS returned ${res.status}`);

    const raw = await res.json();
    const items = Array.isArray(raw.addresses) ? raw.addresses : [];

    return items.map((item: Record<string, unknown>) => {
      const tunnus = String(item.tunnus || '');
      const isBuildingEntry =
        item.liik === 'E' || item.liik === 'EHITISHOONE' || /^\d+$/.test(tunnus);

      return {
        adr_id: item.adr_id as number,
        address: (item.taisaadress || item.pikkaadress || item.aadresstekst) as string,
        katastritunnus:
          (item.katastritunnus as string) || (!isBuildingEntry ? tunnus : undefined),
        ehrCode: isBuildingEntry ? tunnus : undefined, // ← EHR building code
        adsOid: item.ads_oid as string | undefined,
        x: Number(item.viitepunkt_x) || undefined,
        y: Number(item.viitepunkt_y) || undefined,
        lat: Number(item.viitepunkt_b) || undefined, // b = latitude (~58°N)
        lon: Number(item.viitepunkt_l) || undefined, // l = longitude (~26°E)
      };
    });
  } catch (err) {
    console.error('[In-ADS] Address search failed:', err);
    return [];
  }
}
