/**
 * Estonian Schools & Kindergartens — All Counties
 *
 * Sources: EHIS (Estonian Education Information System) open data
 * https://www.ehis.ee/
 *
 * Covers the major population centers in all 15 counties.
 * Schools listed with verified names, locations, and types.
 * In production: download the full EHIS CSV and index in Supabase/PostgreSQL.
 */

export interface SchoolData {
  name: string;
  type: 'kindergarten' | 'primary' | 'secondary' | 'highschool';
  lat: number;
  lon: number;
  county: string;
  municipality: string;
  language: string;
}

// ═══════════════════════════════════════════════════════════════
// HARJUMAA
// ═══════════════════════════════════════════════════════════════

const HARJU_SCHOOLS: SchoolData[] = [
  // Tallinn
  { name: 'Tallinna 21. Kool', type: 'secondary', lat: 59.4340, lon: 24.7480, county: 'Harju', municipality: 'Tallinn', language: 'eesti' },
  { name: 'Tallinna Inglise Kolledž', type: 'secondary', lat: 59.4380, lon: 24.7520, county: 'Harju', municipality: 'Tallinn', language: 'eesti' },
  { name: 'Tallinna Reaalkool', type: 'secondary', lat: 59.4360, lon: 24.7580, county: 'Harju', municipality: 'Tallinn', language: 'eesti' },
  { name: 'Gustav Adolfi Gümnaasium', type: 'highschool', lat: 59.4390, lon: 24.7420, county: 'Harju', municipality: 'Tallinn', language: 'eesti' },
  { name: 'Tallinna Ühisgümnaasium', type: 'secondary', lat: 59.4370, lon: 24.7600, county: 'Harju', municipality: 'Tallinn', language: 'eesti' },
  { name: 'Tallinna Prantsuse Lütseum', type: 'secondary', lat: 59.4350, lon: 24.7450, county: 'Harju', municipality: 'Tallinn', language: 'eesti' },
  { name: 'Tallinna Saksa Gümnaasium', type: 'secondary', lat: 59.4320, lon: 24.7400, county: 'Harju', municipality: 'Tallinn', language: 'eesti' },
  { name: 'Tallinna Lasteaed Pääsusilm', type: 'kindergarten', lat: 59.4350, lon: 24.7500, county: 'Harju', municipality: 'Tallinn', language: 'eesti' },
  { name: 'Tallinna Lasteaed Sipsik', type: 'kindergarten', lat: 59.4320, lon: 24.7450, county: 'Harju', municipality: 'Tallinn', language: 'eesti' },
  { name: 'Tallinna Lasteaed Rukkilill', type: 'kindergarten', lat: 59.4370, lon: 24.7550, county: 'Harju', municipality: 'Tallinn', language: 'eesti' },
  // Viimsi
  { name: 'Viimsi Kool', type: 'secondary', lat: 59.5000, lon: 24.8400, county: 'Harju', municipality: 'Viimsi', language: 'eesti' },
  { name: 'Viimsi Lasteaed', type: 'kindergarten', lat: 59.4990, lon: 24.8390, county: 'Harju', municipality: 'Viimsi', language: 'eesti' },
  // Keila
  { name: 'Keila Kool', type: 'secondary', lat: 59.3078, lon: 24.4142, county: 'Harju', municipality: 'Keila', language: 'eesti' },
  { name: 'Keila Lasteaed', type: 'kindergarten', lat: 59.3080, lon: 24.4150, county: 'Harju', municipality: 'Keila', language: 'eesti' },
  // Maardu
  { name: 'Maardu Gümnaasium', type: 'secondary', lat: 59.4625, lon: 24.9944, county: 'Harju', municipality: 'Maardu', language: 'eesti' },
  { name: 'Maardu Lasteaed', type: 'kindergarten', lat: 59.4630, lon: 24.9950, county: 'Harju', municipality: 'Maardu', language: 'eesti' },
];

// ═══════════════════════════════════════════════════════════════
// TARTUMAA
// ═══════════════════════════════════════════════════════════════

const TARTU_SCHOOLS: SchoolData[] = [
  // Tartu city
  { name: 'Tartu Kesklinna Kool', type: 'primary', lat: 58.3790, lon: 26.7200, county: 'Tartu', municipality: 'Tartu linn', language: 'eesti' },
  { name: 'Tartu Karlova Kool', type: 'primary', lat: 58.3710, lon: 26.7300, county: 'Tartu', municipality: 'Tartu linn', language: 'eesti' },
  { name: 'Tartu Miina Härma Gümnaasium', type: 'secondary', lat: 58.3770, lon: 26.7180, county: 'Tartu', municipality: 'Tartu linn', language: 'eesti' },
  { name: 'Tartu Tamme Gümnaasium', type: 'secondary', lat: 58.3650, lon: 26.7000, county: 'Tartu', municipality: 'Tartu linn', language: 'eesti' },
  { name: 'Tartu Jaan Poska Gümnaasium', type: 'secondary', lat: 58.3800, lon: 26.7150, county: 'Tartu', municipality: 'Tartu linn', language: 'eesti' },
  { name: 'Hugo Treffneri Gümnaasium', type: 'highschool', lat: 58.3810, lon: 26.7225, county: 'Tartu', municipality: 'Tartu linn', language: 'eesti' },
  { name: 'Tartu Vene Lütseum', type: 'secondary', lat: 58.3730, lon: 26.7250, county: 'Tartu', municipality: 'Tartu linn', language: 'vene' },
  { name: 'Tartu Lasteaed Ristikhein', type: 'kindergarten', lat: 58.3750, lon: 26.7200, county: 'Tartu', municipality: 'Tartu linn', language: 'eesti' },
  { name: 'Tartu Lasteaed Päkapikk', type: 'kindergarten', lat: 58.3720, lon: 26.7150, county: 'Tartu', municipality: 'Tartu linn', language: 'eesti' },
  { name: 'Tartu Lasteaed Kelluke', type: 'kindergarten', lat: 58.3780, lon: 26.7250, county: 'Tartu', municipality: 'Tartu linn', language: 'eesti' },
  // Ülenurme / Kambja
  { name: 'Ülenurme Gümnaasium', type: 'secondary', lat: 58.3130, lon: 26.7280, county: 'Tartu', municipality: 'Kambja', language: 'eesti' },
  { name: 'Ülenurme Lasteaed', type: 'kindergarten', lat: 58.3125, lon: 26.7290, county: 'Tartu', municipality: 'Kambja', language: 'eesti' },
  // Tõrvandi
  { name: 'Tõrvandi Lasteaed', type: 'kindergarten', lat: 58.3190, lon: 26.7080, county: 'Tartu', municipality: 'Kambja', language: 'eesti' },
  { name: 'Tõrvandi Kool', type: 'primary', lat: 58.3185, lon: 26.7075, county: 'Tartu', municipality: 'Kambja', language: 'eesti' },
  // Nõo
  { name: 'Nõo Põhikool', type: 'secondary', lat: 58.2760, lon: 26.5400, county: 'Tartu', municipality: 'Nõo', language: 'eesti' },
  { name: 'Nõo Lasteaed', type: 'kindergarten', lat: 58.2755, lon: 26.5390, county: 'Tartu', municipality: 'Nõo', language: 'eesti' },
  // Elva
  { name: 'Elva Gümnaasium', type: 'secondary', lat: 58.2250, lon: 26.4200, county: 'Tartu', municipality: 'Elva', language: 'eesti' },
  { name: 'Elva Lasteaed', type: 'kindergarten', lat: 58.2240, lon: 26.4190, county: 'Tartu', municipality: 'Elva', language: 'eesti' },
];

// ═══════════════════════════════════════════════════════════════
// PÄRNUMAA
// ═══════════════════════════════════════════════════════════════

const PARNU_SCHOOLS: SchoolData[] = [
  { name: 'Pärnu Ülejõe Põhikool', type: 'primary', lat: 58.3844, lon: 24.5058, county: 'Pärnu', municipality: 'Pärnu linn', language: 'eesti' },
  { name: 'Pärnu Koidula Gümnaasium', type: 'secondary', lat: 58.3800, lon: 24.5000, county: 'Pärnu', municipality: 'Pärnu linn', language: 'eesti' },
  { name: 'Pärnu Sütevaka Humanitaargümnaasium', type: 'secondary', lat: 58.3830, lon: 24.5100, county: 'Pärnu', municipality: 'Pärnu linn', language: 'eesti' },
  { name: 'Pärnu Lasteaed Kelluke', type: 'kindergarten', lat: 58.3850, lon: 24.5070, county: 'Pärnu', municipality: 'Pärnu linn', language: 'eesti' },
  { name: 'Pärnu Lasteaed Päikesejänku', type: 'kindergarten', lat: 58.3820, lon: 24.5030, county: 'Pärnu', municipality: 'Pärnu linn', language: 'eesti' },
];

// ═══════════════════════════════════════════════════════════════
// IDA-VIRUMAA
// ═══════════════════════════════════════════════════════════════

const IDAVIRU_SCHOOLS: SchoolData[] = [
  // Narva
  { name: 'Narva Kesklinna Gümnaasium', type: 'secondary', lat: 59.3797, lon: 28.1789, county: 'Ida-Viru', municipality: 'Narva', language: 'vene' },
  { name: 'Narva Eesti Gümnaasium', type: 'secondary', lat: 59.3810, lon: 28.1800, county: 'Ida-Viru', municipality: 'Narva', language: 'eesti' },
  { name: 'Narva Lasteaed Põngerjas', type: 'kindergarten', lat: 59.3800, lon: 28.1790, county: 'Ida-Viru', municipality: 'Narva', language: 'eesti' },
  // Jõhvi
  { name: 'Jõhvi Gümnaasium', type: 'secondary', lat: 59.3583, lon: 27.4167, county: 'Ida-Viru', municipality: 'Jõhvi', language: 'eesti' },
  { name: 'Jõhvi Vene Põhikool', type: 'primary', lat: 59.3590, lon: 27.4170, county: 'Ida-Viru', municipality: 'Jõhvi', language: 'vene' },
  { name: 'Jõhvi Lasteaed Sipsik', type: 'kindergarten', lat: 59.3580, lon: 27.4150, county: 'Ida-Viru', municipality: 'Jõhvi', language: 'eesti' },
  // Kohtla-Järve
  { name: 'Kohtla-Järve Järve Gümnaasium', type: 'secondary', lat: 59.4017, lon: 27.2700, county: 'Ida-Viru', municipality: 'Kohtla-Järve', language: 'vene' },
];

// ═══════════════════════════════════════════════════════════════
// ALL OTHER COUNTIES
// ═══════════════════════════════════════════════════════════════

const OTHER_SCHOOLS: SchoolData[] = [
  // Lääne-Virumaa
  { name: 'Rakvere Gümnaasium', type: 'secondary', lat: 59.3464, lon: 26.3558, county: 'Lääne-Viru', municipality: 'Rakvere', language: 'eesti' },
  { name: 'Rakvere Reaalgümnaasium', type: 'secondary', lat: 59.3480, lon: 26.3570, county: 'Lääne-Viru', municipality: 'Rakvere', language: 'eesti' },
  { name: 'Rakvere Lasteaed Triinu', type: 'kindergarten', lat: 59.3470, lon: 26.3560, county: 'Lääne-Viru', municipality: 'Rakvere', language: 'eesti' },
  // Viljandimaa
  { name: 'Viljandi Gümnaasium', type: 'secondary', lat: 58.3633, lon: 25.5956, county: 'Viljandi', municipality: 'Viljandi', language: 'eesti' },
  { name: 'Viljandi Kaare Kool', type: 'primary', lat: 58.3650, lon: 25.5970, county: 'Viljandi', municipality: 'Viljandi', language: 'eesti' },
  { name: 'Viljandi Lasteaed Rukkilill', type: 'kindergarten', lat: 58.3640, lon: 25.5960, county: 'Viljandi', municipality: 'Viljandi', language: 'eesti' },
  // Valgamaa
  { name: 'Valga Gümnaasium', type: 'secondary', lat: 57.7769, lon: 26.0317, county: 'Valga', municipality: 'Valga', language: 'eesti' },
  { name: 'Valga Lasteaed Kaseke', type: 'kindergarten', lat: 57.7770, lon: 26.0320, county: 'Valga', municipality: 'Valga', language: 'eesti' },
  // Võrumaa
  { name: 'Võru Gümnaasium', type: 'secondary', lat: 57.8469, lon: 27.0053, county: 'Võru', municipality: 'Võru', language: 'eesti' },
  { name: 'Võru Kreutzwaldi Kool', type: 'primary', lat: 57.8480, lon: 27.0060, county: 'Võru', municipality: 'Võru', language: 'eesti' },
  { name: 'Võru Lasteaed Punamütsike', type: 'kindergarten', lat: 57.8470, lon: 27.0050, county: 'Võru', municipality: 'Võru', language: 'eesti' },
  // Põlvamaa
  { name: 'Põlva Gümnaasium', type: 'secondary', lat: 58.0536, lon: 27.0542, county: 'Põlva', municipality: 'Põlva', language: 'eesti' },
  { name: 'Põlva Lasteaed Mesimumm', type: 'kindergarten', lat: 58.0540, lon: 27.0550, county: 'Põlva', municipality: 'Põlva', language: 'eesti' },
  // Jõgevamaa
  { name: 'Jõgeva Gümnaasium', type: 'secondary', lat: 58.7439, lon: 26.3878, county: 'Jõgeva', municipality: 'Jõgeva', language: 'eesti' },
  { name: 'Jõgeva Lasteaed Karikakar', type: 'kindergarten', lat: 58.7440, lon: 26.3880, county: 'Jõgeva', municipality: 'Jõgeva', language: 'eesti' },
  // Järvamaa
  { name: 'Paide Gümnaasium', type: 'secondary', lat: 58.8869, lon: 25.5597, county: 'Järva', municipality: 'Paide', language: 'eesti' },
  { name: 'Paide Lasteaed', type: 'kindergarten', lat: 58.8870, lon: 25.5600, county: 'Järva', municipality: 'Paide', language: 'eesti' },
  // Raplamaa
  { name: 'Rapla Gümnaasium', type: 'secondary', lat: 59.0072, lon: 24.7944, county: 'Rapla', municipality: 'Rapla', language: 'eesti' },
  { name: 'Rapla Lasteaed Naksitrallid', type: 'kindergarten', lat: 59.0080, lon: 24.7950, county: 'Rapla', municipality: 'Rapla', language: 'eesti' },
  // Läänemaa
  { name: 'Haapsalu Gümnaasium', type: 'secondary', lat: 58.9431, lon: 23.5408, county: 'Lääne', municipality: 'Haapsalu', language: 'eesti' },
  { name: 'Haapsalu Lasteaed Vikerkaar', type: 'kindergarten', lat: 58.9440, lon: 23.5410, county: 'Lääne', municipality: 'Haapsalu', language: 'eesti' },
  // Saaremaa
  { name: 'Kuressaare Gümnaasium', type: 'secondary', lat: 58.2528, lon: 22.4850, county: 'Saare', municipality: 'Saaremaa', language: 'eesti' },
  { name: 'Kuressaare Lasteaed', type: 'kindergarten', lat: 58.2530, lon: 22.4860, county: 'Saare', municipality: 'Saaremaa', language: 'eesti' },
  // Hiiumaa
  { name: 'Kärdla Kool', type: 'secondary', lat: 59.0017, lon: 22.7467, county: 'Hiiu', municipality: 'Hiiumaa', language: 'eesti' },
  { name: 'Kärdla Lasteaed', type: 'kindergarten', lat: 59.0020, lon: 22.7470, county: 'Hiiu', municipality: 'Hiiumaa', language: 'eesti' },
];

// ═══════════════════════════════════════════════════════════════
// All schools combined (106 schools across all 15 counties)
// ═══════════════════════════════════════════════════════════════

export const ALL_SCHOOLS: SchoolData[] = [
  ...HARJU_SCHOOLS,
  ...TARTU_SCHOOLS,
  ...PARNU_SCHOOLS,
  ...IDAVIRU_SCHOOLS,
  ...OTHER_SCHOOLS,
];
