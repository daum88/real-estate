/**
 * EHR (Ehitisregister) API — Building Registry
 *
 * Base: https://livekluster.ehr.ee/api/building
 *
 * Pipeline: In-ADS address lookup returns `tunnus` (the EHR building code).
 * That code is used directly with v3 buildingData — no intermediate search needed.
 */

import type { EhrBuildingData, EhrDocument, EnergyCertificate, TechnicalParameters } from './types';

const EHR_V3 = 'https://livekluster.ehr.ee/api/building/v3/buildingData';

/**
 * Fetch full building data by EHR code.
 * The ehrCode comes from In-ADS response field `tunnus`.
 */
export async function getBuildingData(ehrCode: string): Promise<EhrBuildingData | null> {
  try {
    const res = await fetch(`${EHR_V3}?ehr_code=${encodeURIComponent(ehrCode)}`, {
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) throw new Error(`EHR v3 returned ${res.status}`);

    const raw = await res.json();
    return normalizeBuildingData(raw, ehrCode);
  } catch (err) {
    console.error(`[EHR] getBuildingData failed for ${ehrCode}:`, err);
    return null;
  }
}

/**
 * Normalize the EHR v3 response structure into our flat types.
 *
 * EHR v3 response shape:
 * {
 *   ehitis: {
 *     ehitiseAndmed: { ehrKood, taisaadress, seisundTxt, esmaneKasutus, ehitiseDokumendid[], ... },
 *     ehitisePohiandmed: { suletud_netopind, korgus, maxKorrusteArv, ... },
 *     ehitiseEnergiamargised: { energiamargis: { energiaylass, valjastamiseKp, ... } | [...] },
 *   }
 * }
 */
/**
 * NOTE: most EHR numeric fields arrive as JSON strings (e.g.
 * suletud_netopind: "150.5") — always coerce before use.
 */
function toNum(v: unknown): number | undefined {
  if (v === null || v === undefined || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function normalizeBuildingData(raw: Record<string, unknown>, ehrCode: string): EhrBuildingData {
  const ehitis = (raw.ehitis || raw) as Record<string, unknown>;

  // ── Core info (ehitiseAndmed) ──
  const andmed = (ehitis.ehitiseAndmed || ehitis.ehitisAndmed || {}) as Record<string, unknown>;

  const address = (andmed.taisaadress as string) || '';
  const status = (andmed.seisundTxt as string) || (andmed.seisund as string) || '';
  const statusCode = (andmed.seisund as string) || '';
  const buildingYear = toNum(andmed.esmaneKasutus) ??
    toNum(andmed.ehitiseEhitusaasta) ??
    toNum(andmed.esmaneKasutuselevotuAasta);

  // Map Estonian status codes and text to short codes
  const statusMap: Record<string, string> = {
    'Olemas': 'K', 'Ehitusel': 'E', 'Püstitamisel': 'E',
    'Kavandatav': 'P', 'Kavandatud': 'P',
    'EHITIS_SEISUND_OLEMA': 'K', 'EHITIS_SEISUND_PYSTI': 'E',
    'EHITIS_SEISUND_KASUTUSES': 'K', 'EHITIS_SEISUND_EHITUSEL': 'E',
    'EHITIS_SEISUND_KAVAN': 'P', 'EHITIS_SEISUND_KAVANDATUD': 'P',
    'Projekteerimisel': 'P', 'Lammutatud': 'L',
  };
  const shortStatus = statusMap[status] || statusMap[statusCode] || statusCode || 'K';

  // ── Documents ──
  const docsRaw = andmed.ehitiseDokumendid as unknown[];
  const documents: EhrDocument[] = Array.isArray(docsRaw)
    ? docsRaw.map((d: unknown) => {
        const item = d as Record<string, unknown>;
        return {
          documentType: (item.dokumendiLiik || item.dokumendiliik || item.documentType || '') as string,
          documentStatus: (item.dokumendiSeisund || item.dokumendiseisund || item.documentStatus || '') as string,
          documentDate: (item.dokumendiKuupaev || item.dokumendikuupaev || item.documentDate) as string | undefined,
          registrationDate: (item.registreerimiseKp || item.registrationDate) as string | undefined,
        };
      })
    : [];

  // ── Energy Certificates ──
  const energiamargised = (ehitis.ehitiseEnergiamargised || {}) as Record<string, unknown>;
  let ecList: unknown[] = [];

  const emData = energiamargised.energiamargis;
  if (Array.isArray(emData)) {
    ecList = emData;
  } else if (emData && typeof emData === 'object') {
    ecList = [emData];
  }

  const energyCertificates: EnergyCertificate[] = ecList.map((ec: unknown) => {
    const item = ec as Record<string, unknown>;
    return {
      energyClass: (item.energiaklass || item.energyClass || '') as string,
      issueDate: (item.valjastamiseKp || item.issueDate) as string | undefined,
      expirationDate: (item.kehtivuseLoppKp || item.expirationDate) as string | undefined,
      certificateType: (item.margiseTuup || item.certificateType) as string | undefined,
      energyPerformanceValue: (item.energiaarvutuslikKasu || item.energyPerformanceValue) as number | undefined,
    };
  });

  // ── Technical Parameters ──
  const tp = (ehitis.ehitisePohiandmed || ehitis.ehitiseTehnilisedNaitajad || {}) as Record<string, unknown>;

  // Construction materials from ehitiseTehnilisedNaitajad
  const tehnaList = (ehitis.ehitiseTehnilisedNaitajad as Record<string, unknown>)?.tehnilineNaitaja as unknown[] || [];
  const materials: string[] = [];
  const heatingSystems: string[] = [];
  for (const t of tehnaList) {
    const item = t as Record<string, unknown>;
    const klKood = (item.klKood as string) || '';
    const nimetus = (item.nimetus as string) || '';
    if (klKood === 'KONS_KKONSTR' || klKood === 'KONS_VSEIN') materials.push(nimetus);
    if (klKood === 'TEHNO_SOOJAVLIIK' || klKood === 'TEHNO_SOOJUSA') heatingSystems.push(nimetus);
    if (klKood === 'TEHNO_ENERGIA' && !heatingSystems.includes(nimetus)) heatingSystems.push(nimetus);
  }
  // Also check ehitiseOsaTehnosysteemid for heating
  const kehandList = (ehitis.ehitiseKehand as Record<string, unknown>)?.kehand as unknown[] || [];
  for (const k of kehandList) {
    const osad = ((k as Record<string, unknown>).ehitiseOsad as Record<string, unknown>)?.ehitiseOsa as unknown[] || [];
    for (const o of osad) {
      const tehnosysteemid = ((o as Record<string, unknown>).ehitiseOsaTehnosysteemid as Record<string, unknown>)?.energiaTehnosysteem as unknown[] || [];
      for (const ts of tehnosysteemid) {
        const liik = ((ts as Record<string, unknown>).energiaTehnosysteemiLiik as string) || '';
        if (liik === 'TEHNO_SOOJUSA') {
          const nimetus = ((ts as Record<string, unknown>).energiaallikaLiikNimetus as string) || '';
          if (nimetus && !heatingSystems.includes(nimetus)) heatingSystems.push(nimetus);
        }
      }
    }
  }

  // Rooms from EHR
  const ehrRooms = parseInt((tp.tubadeArv as string) || '0') || undefined;

  // Cadastral code
  const katastriList = (ehitis.ehitiseKatastriyksused as Record<string, unknown>)?.ehitiseKatastriyksus as unknown[] || [];
  const cadastralCode = katastriList.length > 0 ? (katastriList[0] as Record<string, unknown>).katastritunnus as string : undefined;

  const technicalParameters: TechnicalParameters = {
    totalArea: toNum(tp.suletud_netopind ?? tp.ehitisePindala ?? tp.pindala),
    closedNetArea: toNum(tp.suletud_netopind ?? tp.suletudNetopind),
    buildingYear: buildingYear as number | undefined,
    floors: toNum(tp.maxKorrusteArv ?? tp.maapealseteKorrusteArv),
    height: toNum(tp.korgus ?? tp.ehitiseKorgus),
    buildingMaterial: materials.length > 0 ? materials.join(', ') : undefined,
    heatingSystem: heatingSystems.length > 0 ? heatingSystems.join(', ') : undefined,
  };

  // Building type from EHR.
  // NOTE: 'elamu' alone matches apartment buildings too ('Korterelamu',
  // 'Muu kolme või enama korteriga elamu'), so match house-only types
  // explicitly and exclude anything containing 'korter'.
  const buildingType = (andmed.kaosIdTxt as string) || (andmed.nimetus as string) || '';
  const HOUSE_TYPES = ['Üksikelamu', 'Kaksikelamu', 'Ridaelamu', 'Taluelamu', 'Suvila', 'Aiamaja'];
  const isHouse =
    !/korter/i.test(buildingType) &&
    HOUSE_TYPES.some((t) => buildingType.toLowerCase().includes(t.toLowerCase()));
  const isApartmentBuilding = /korter/i.test(buildingType);

  return {
    ehrCode,
    address,
    status: shortStatus,
    buildingType,
    isHouse,
    isApartmentBuilding,
    documents,
    energyCertificates,
    technicalParameters,
    ehrRooms,
    cadastralCode,
  };
}

/**
 * Determine if building has a valid occupancy permit.
 */
export function hasOccupancyPermit(building: EhrBuildingData): boolean {
  return building.documents.some(
    (doc) =>
      doc.documentType.toUpperCase() === 'KASUTUSLUBA' &&
      (doc.documentStatus === 'VASTU_VÕETUD' ||
       doc.documentStatus === 'REGISTREERITUD' ||
       doc.documentStatus === 'KEHTIV')
  );
}

/**
 * Get the latest valid energy certificate class.
 */
export function getLatestEnergyClass(building: EhrBuildingData): string | null {
  const valid = building.energyCertificates.filter((ec) => {
    if (!ec.expirationDate) return true;
    return new Date(ec.expirationDate) > new Date();
  });

  if (valid.length === 0) return null;

  valid.sort((a, b) => {
    const da = a.issueDate ? new Date(a.issueDate).getTime() : 0;
    const db = b.issueDate ? new Date(b.issueDate).getTime() : 0;
    return db - da;
  });

  return valid[0].energyClass || null;
}
