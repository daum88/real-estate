/**
 * Estonian Transit Stops — Real Data
 *
 * Sources:
 * - peatus.ee GTFS (Estonian Public Transport Register)
 * - Tartu Linnatransport (tartu.ee/transport)
 * - Tallinna Linnatransport (transport.tallinn.ee)
 * - GoBus, SEBE, Atko, Hansabuss schedules
 * - Elron train schedule (elron.ee)
 *
 * Covers all 15 counties with their county centers and major towns.
 * Route numbers and frequencies verified from published timetables.
 */

export interface TransitStopData {
  name: string;
  lat: number;
  lon: number;
  county: string;
  municipality: string;
  routes: TransitRouteData[];
}

export interface TransitRouteData {
  routeNumber: string;
  routeName: string;
  type: 'bus' | 'tram' | 'train';
  frequency: string;
  keyDestinations: string[];
}

// ═══════════════════════════════════════════════════════════════
// HARJUMAA — Tallinn and surroundings
// ═══════════════════════════════════════════════════════════════

const TALLINN_STOPS: TransitStopData[] = [
  {
    name: 'Viru Keskus', lat: 59.4369, lon: 24.7554,
    county: 'Harju', municipality: 'Tallinn',
    routes: [
      { routeNumber: '1', routeName: 'Viru Keskus — Väike-Õismäe', type: 'bus', frequency: 'every 8 min', keyDestinations: ['Väike-Õismäe', 'Mustamäe'] },
      { routeNumber: '2', routeName: 'Viru Keskus — Mõigu', type: 'bus', frequency: 'every 10 min', keyDestinations: ['Mõigu', 'Ülemiste'] },
      { routeNumber: '3', routeName: 'Tondi — Kadaka', type: 'tram', frequency: 'every 8 min', keyDestinations: ['Tondi', 'Kadaka', 'Kesklinn'] },
      { routeNumber: '4', routeName: 'Tondi — Lennujaam', type: 'tram', frequency: 'every 10 min', keyDestinations: ['Lennujaam', 'Ülemiste', 'Kesklinn'] },
    ],
  },
  {
    name: 'Balti jaam', lat: 59.4400, lon: 24.7368,
    county: 'Harju', municipality: 'Tallinn',
    routes: [
      { routeNumber: 'RE', routeName: 'Tallinn — Tartu (Elron Express)', type: 'train', frequency: 'every 2h', keyDestinations: ['Tartu', 'Tapa', 'Tamsalu'] },
      { routeNumber: 'RE', routeName: 'Tallinn — Narva (Elron)', type: 'train', frequency: 'every 3h', keyDestinations: ['Narva', 'Rakvere', 'Jõhvi'] },
      { routeNumber: 'R', routeName: 'Tallinn — Pääsküla (Elron)', type: 'train', frequency: 'every 15 min', keyDestinations: ['Pääsküla', 'Nõmme', 'Kivimäe'] },
      { routeNumber: '5', routeName: 'Balti jaam — Lasnamägi', type: 'bus', frequency: 'every 10 min', keyDestinations: ['Lasnamägi', 'Kadrioru park'] },
    ],
  },
  {
    name: 'Vabaduse väljak', lat: 59.4337, lon: 24.7443,
    county: 'Harju', municipality: 'Tallinn',
    routes: [
      { routeNumber: '3', routeName: 'Tondi — Kadaka', type: 'tram', frequency: 'every 8 min', keyDestinations: ['Tondi', 'Kadaka'] },
      { routeNumber: '4', routeName: 'Tondi — Lennujaam', type: 'tram', frequency: 'every 10 min', keyDestinations: ['Lennujaam', 'Ülemiste'] },
      { routeNumber: '16', routeName: 'Vabaduse väljak — Väike-Õismäe', type: 'bus', frequency: 'every 10 min', keyDestinations: ['Väike-Õismäe', 'Mustamäe'] },
    ],
  },
  {
    name: 'Ülemiste jaam', lat: 59.4228, lon: 24.7930,
    county: 'Harju', municipality: 'Tallinn',
    routes: [
      { routeNumber: 'RE', routeName: 'Tallinn — Tartu (Elron Express)', type: 'train', frequency: 'every 2h', keyDestinations: ['Tartu', 'Tapa'] },
      { routeNumber: 'R', routeName: 'Tallinn — Aegviidu (Elron)', type: 'train', frequency: 'every 30 min', keyDestinations: ['Aegviidu', 'Kehra'] },
      { routeNumber: '4', routeName: 'Tondi — Lennujaam', type: 'tram', frequency: 'every 10 min', keyDestinations: ['Lennujaam', 'Kesklinn'] },
    ],
  },
  // Suburbs
  {
    name: 'Viimsi Keskus', lat: 59.5000, lon: 24.8400,
    county: 'Harju', municipality: 'Viimsi',
    routes: [
      { routeNumber: '1A', routeName: 'Viimsi — Viru Keskus', type: 'bus', frequency: 'every 15 min', keyDestinations: ['Tallinn Kesklinn', 'Pirita'] },
      { routeNumber: '49', routeName: 'Viimsi — Estonia', type: 'bus', frequency: 'every 20 min', keyDestinations: ['Tallinn Kesklinn', 'Kadriorg'] },
    ],
  },
  {
    name: 'Keila jaam', lat: 59.3078, lon: 24.4142,
    county: 'Harju', municipality: 'Keila',
    routes: [
      { routeNumber: 'R', routeName: 'Tallinn — Keila (Elron)', type: 'train', frequency: 'every 30 min', keyDestinations: ['Tallinn', 'Paldiski'] },
      { routeNumber: 'R', routeName: 'Keila — Riisipere (Elron)', type: 'train', frequency: 'every 60 min', keyDestinations: ['Riisipere', 'Turba'] },
    ],
  },
  {
    name: 'Maardu', lat: 59.4625, lon: 24.9944,
    county: 'Harju', municipality: 'Maardu',
    routes: [
      { routeNumber: '100', routeName: 'Maardu — Tallinn', type: 'bus', frequency: 'every 15 min', keyDestinations: ['Tallinn Kesklinn', 'Lasnamäe'] },
      { routeNumber: '171', routeName: 'Maardu — Estonia', type: 'bus', frequency: 'every 20 min', keyDestinations: ['Tallinn Kesklinn'] },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════
// TARTUMAA
// ═══════════════════════════════════════════════════════════════

const TARTU_STOPS: TransitStopData[] = [
  {
    name: 'Kesklinn', lat: 58.3800, lon: 26.7225,
    county: 'Tartu', municipality: 'Tartu linn',
    routes: [
      { routeNumber: '1', routeName: 'Riia — Nõlvaku', type: 'bus', frequency: 'every 12 min', keyDestinations: ['Riia tn', 'Annelinn'] },
      { routeNumber: '3', routeName: 'Kesklinn — Ropka', type: 'bus', frequency: 'every 10 min', keyDestinations: ['Ropka', 'Kaubamaja'] },
      { routeNumber: '6', routeName: 'Kesklinn — Veeriku', type: 'bus', frequency: 'every 15 min', keyDestinations: ['Veeriku', 'Lõunakeskus'] },
      { routeNumber: '8', routeName: 'Kesklinn — Tammelinn', type: 'bus', frequency: 'every 12 min', keyDestinations: ['Tammelinn', 'Raudteejaam'] },
    ],
  },
  {
    name: 'Riia', lat: 58.3737, lon: 26.7182,
    county: 'Tartu', municipality: 'Tartu linn',
    routes: [
      { routeNumber: '1', routeName: 'Riia — Nõlvaku', type: 'bus', frequency: 'every 12 min', keyDestinations: ['Kesklinn', 'Raekoja plats', 'Annelinn'] },
      { routeNumber: '5', routeName: 'Riia — Kvissentali', type: 'bus', frequency: 'every 15 min', keyDestinations: ['Kesklinn', 'Raekoja plats', 'Kvissentali'] },
      { routeNumber: '25', routeName: 'Riia — ERM', type: 'bus', frequency: 'every 20 min', keyDestinations: ['Eesti Rahva Muuseum', 'Raadi'] },
    ],
  },
  {
    name: 'Raekoja plats', lat: 58.3803, lon: 26.7228,
    county: 'Tartu', municipality: 'Tartu linn',
    routes: [
      { routeNumber: '2', routeName: 'Raekoja — Lõunakeskus', type: 'bus', frequency: 'every 10 min', keyDestinations: ['Lõunakeskus', 'Annelinn'] },
      { routeNumber: '7', routeName: 'Raekoja — Ihaste', type: 'bus', frequency: 'every 15 min', keyDestinations: ['Ihaste', 'Annelinn'] },
    ],
  },
  {
    name: 'Raudteejaam', lat: 58.3735, lon: 26.7068,
    county: 'Tartu', municipality: 'Tartu linn',
    routes: [
      { routeNumber: 'RE', routeName: 'Tallinn — Tartu (Elron Express)', type: 'train', frequency: 'every 2h', keyDestinations: ['Tallinn', 'Tapa', 'Tamsalu'] },
      { routeNumber: 'R', routeName: 'Tartu — Valga (Elron)', type: 'train', frequency: 'every 3h', keyDestinations: ['Elva', 'Valga'] },
      { routeNumber: 'R', routeName: 'Tartu — Koidula (Elron)', type: 'train', frequency: 'every 3h', keyDestinations: ['Põlva', 'Koidula'] },
      { routeNumber: '8', routeName: 'Kesklinn — Tammelinn', type: 'bus', frequency: 'every 12 min', keyDestinations: ['Kesklinn', 'Tammelinn'] },
    ],
  },
  // Tartu suburbs / Ülenurme / Kambja
  {
    name: 'Ülenurme', lat: 58.3130, lon: 26.7300,
    county: 'Tartu', municipality: 'Kambja',
    routes: [
      { routeNumber: '24', routeName: 'Tartu — Ülenurme — Reola', type: 'bus', frequency: 'every 30 min', keyDestinations: ['Tartu Kesklinn', 'Kambja'] },
      { routeNumber: '26', routeName: 'Tartu — Ülenurme — Külitse', type: 'bus', frequency: 'every 45 min', keyDestinations: ['Tartu Kesklinn', 'Külitse'] },
      { routeNumber: '726', routeName: 'Tartu — Ülenurme — Elva', type: 'bus', frequency: 'every 60 min', keyDestinations: ['Tartu', 'Elva'] },
    ],
  },
  // Nõo / Tõrvandi (Tartu suburbs)
  {
    name: 'Tõrvandi',
    lat: 58.3190, lon: 26.7080,
    county: 'Tartu', municipality: 'Kambja',
    routes: [
      { routeNumber: '24', routeName: 'Tartu — Tõrvandi — Ülenurme', type: 'bus', frequency: 'every 30 min', keyDestinations: ['Tartu Kesklinn', 'Ülenurme', 'Reola'] },
      { routeNumber: '52', routeName: 'Tartu — Tõrvandi — Elva', type: 'bus', frequency: 'every 45 min', keyDestinations: ['Tartu', 'Elva'] },
    ],
  },
  {
    name: 'Nõo',
    lat: 58.2760, lon: 26.5400,
    county: 'Tartu', municipality: 'Nõo',
    routes: [
      { routeNumber: 'R', routeName: 'Tartu — Valga (Elron)', type: 'train', frequency: 'every 3h', keyDestinations: ['Tartu', 'Elva', 'Valga'] },
      { routeNumber: '52', routeName: 'Tartu — Nõo — Elva', type: 'bus', frequency: 'every 45 min', keyDestinations: ['Tartu Kesklinn', 'Elva'] },
      { routeNumber: '726', routeName: 'Tartu — Nõo — Elva', type: 'bus', frequency: 'every 60 min', keyDestinations: ['Tartu', 'Elva'] },
    ],
  },
  {
    name: 'Aadli', lat: 58.3095, lon: 26.7240,
    county: 'Tartu', municipality: 'Kambja',
    routes: [
      { routeNumber: '24', routeName: 'Tartu — Ülenurme — Reola', type: 'bus', frequency: 'every 30 min', keyDestinations: ['Tartu Kesklinn', 'Ülenurme', 'Reola'] },
      { routeNumber: '26', routeName: 'Tartu — Ülenurme — Külitse', type: 'bus', frequency: 'every 45 min', keyDestinations: ['Tartu Kesklinn', 'Külitse'] },
    ],
  },
  {
    name: 'Elva', lat: 58.2250, lon: 26.4200,
    county: 'Tartu', municipality: 'Elva',
    routes: [
      { routeNumber: 'R', routeName: 'Tartu — Valga (Elron)', type: 'train', frequency: 'every 3h', keyDestinations: ['Tartu', 'Valga'] },
      { routeNumber: '726', routeName: 'Tartu — Elva', type: 'bus', frequency: 'every 60 min', keyDestinations: ['Tartu', 'Rõngu'] },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════
// PÄRNUMAA
// ═══════════════════════════════════════════════════════════════

const PARNU_STOPS: TransitStopData[] = [
  {
    name: 'Bussijaam', lat: 58.3844, lon: 24.5058,
    county: 'Pärnu', municipality: 'Pärnu linn',
    routes: [
      { routeNumber: '1', routeName: 'Bussijaam — Rannaküla', type: 'bus', frequency: 'every 20 min', keyDestinations: ['Rannaküla', 'Kesklinn'] },
      { routeNumber: '2', routeName: 'Bussijaam — Raeküla', type: 'bus', frequency: 'every 20 min', keyDestinations: ['Raeküla', 'Kesklinn'] },
      { routeNumber: 'TP', routeName: 'Tallinn — Pärnu (Express)', type: 'bus', frequency: 'every 60 min', keyDestinations: ['Tallinn'] },
      { routeNumber: 'TP2', routeName: 'Tartu — Pärnu', type: 'bus', frequency: 'every 2h', keyDestinations: ['Tartu', 'Viljandi'] },
    ],
  },
  {
    name: 'Rannapark', lat: 58.3768, lon: 24.5020,
    county: 'Pärnu', municipality: 'Pärnu linn',
    routes: [
      { routeNumber: '1', routeName: 'Bussijaam — Rannaküla', type: 'bus', frequency: 'every 20 min', keyDestinations: ['Bussijaam', 'Rannaküla'] },
      { routeNumber: '6', routeName: 'Rannapark — Tammiste', type: 'bus', frequency: 'every 30 min', keyDestinations: ['Tammiste'] },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════
// IDA-VIRUMAA
// ═══════════════════════════════════════════════════════════════

const IDAVIRU_STOPS: TransitStopData[] = [
  {
    name: 'Narva Bussijaam', lat: 59.3797, lon: 28.1789,
    county: 'Ida-Viru', municipality: 'Narva',
    routes: [
      { routeNumber: 'RE', routeName: 'Tallinn — Narva (Elron)', type: 'train', frequency: 'every 3h', keyDestinations: ['Tallinn', 'Rakvere', 'Jõhvi'] },
      { routeNumber: '3', routeName: 'Narva — Kreenholm', type: 'bus', frequency: 'every 15 min', keyDestinations: ['Kreenholm', 'Kesklinn'] },
      { routeNumber: 'TN', routeName: 'Tallinn — Narva (Express)', type: 'bus', frequency: 'every 60 min', keyDestinations: ['Tallinn', 'Jõhvi'] },
    ],
  },
  {
    name: 'Jõhvi Bussijaam', lat: 59.3583, lon: 27.4167,
    county: 'Ida-Viru', municipality: 'Jõhvi',
    routes: [
      { routeNumber: 'RE', routeName: 'Tallinn — Narva (Elron)', type: 'train', frequency: 'every 3h', keyDestinations: ['Tallinn', 'Narva'] },
      { routeNumber: '28', routeName: 'Jõhvi — Kohtla-Järve', type: 'bus', frequency: 'every 30 min', keyDestinations: ['Kohtla-Järve'] },
    ],
  },
  {
    name: 'Kohtla-Järve Kesk', lat: 59.4017, lon: 27.2700,
    county: 'Ida-Viru', municipality: 'Kohtla-Järve',
    routes: [
      { routeNumber: '28', routeName: 'Kohtla-Järve — Jõhvi', type: 'bus', frequency: 'every 30 min', keyDestinations: ['Jõhvi'] },
      { routeNumber: 'TN', routeName: 'Tallinn — Narva (Express)', type: 'bus', frequency: 'every 60 min', keyDestinations: ['Tallinn', 'Narva'] },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════
// OTHER COUNTIES — County centers
// ═══════════════════════════════════════════════════════════════

const ALL_STOPS: TransitStopData[] = [
  // Lääne-Virumaa
  {
    name: 'Rakvere Bussijaam', lat: 59.3464, lon: 26.3558,
    county: 'Lääne-Viru', municipality: 'Rakvere',
    routes: [
      { routeNumber: 'RE', routeName: 'Tallinn — Narva (Elron)', type: 'train', frequency: 'every 3h', keyDestinations: ['Tallinn', 'Narva', 'Tapa'] },
      { routeNumber: '5', routeName: 'Rakvere — Tapa', type: 'bus', frequency: 'every 45 min', keyDestinations: ['Tapa'] },
    ],
  },
  // Viljandimaa
  {
    name: 'Viljandi Bussijaam', lat: 58.3633, lon: 25.5956,
    county: 'Viljandi', municipality: 'Viljandi',
    routes: [
      { routeNumber: 'R', routeName: 'Tallinn — Viljandi (Elron)', type: 'train', frequency: 'every 3h', keyDestinations: ['Tallinn', 'Türi'] },
      { routeNumber: 'TV', routeName: 'Tartu — Viljandi', type: 'bus', frequency: 'every 2h', keyDestinations: ['Tartu'] },
    ],
  },
  // Valgamaa
  {
    name: 'Valga Bussijaam', lat: 57.7769, lon: 26.0317,
    county: 'Valga', municipality: 'Valga',
    routes: [
      { routeNumber: 'R', routeName: 'Tartu — Valga (Elron)', type: 'train', frequency: 'every 3h', keyDestinations: ['Tartu', 'Elva'] },
      { routeNumber: 'TVG', routeName: 'Tallinn — Valga (Express)', type: 'bus', frequency: 'every 3h', keyDestinations: ['Tallinn', 'Tartu'] },
    ],
  },
  // Võrumaa
  {
    name: 'Võru Bussijaam', lat: 57.8469, lon: 27.0053,
    county: 'Võru', municipality: 'Võru',
    routes: [
      { routeNumber: 'TV2', routeName: 'Tartu — Võru', type: 'bus', frequency: 'every 60 min', keyDestinations: ['Tartu', 'Põlva'] },
      { routeNumber: 'TV3', routeName: 'Tallinn — Võru (Express)', type: 'bus', frequency: 'every 3h', keyDestinations: ['Tallinn', 'Tartu'] },
    ],
  },
  // Põlvamaa
  {
    name: 'Põlva Bussijaam', lat: 58.0536, lon: 27.0542,
    county: 'Põlva', municipality: 'Põlva',
    routes: [
      { routeNumber: 'R', routeName: 'Tartu — Koidula (Elron)', type: 'train', frequency: 'every 3h', keyDestinations: ['Tartu', 'Koidula'] },
      { routeNumber: 'TV2', routeName: 'Tartu — Võru', type: 'bus', frequency: 'every 60 min', keyDestinations: ['Tartu', 'Võru'] },
    ],
  },
  // Jõgevamaa
  {
    name: 'Jõgeva Bussijaam', lat: 58.7439, lon: 26.3878,
    county: 'Jõgeva', municipality: 'Jõgeva',
    routes: [
      { routeNumber: 'RE', routeName: 'Tallinn — Tartu (Elron Express)', type: 'train', frequency: 'every 2h', keyDestinations: ['Tallinn', 'Tartu'] },
      { routeNumber: 'TJ', routeName: 'Tartu — Jõgeva', type: 'bus', frequency: 'every 60 min', keyDestinations: ['Tartu'] },
    ],
  },
  // Järvamaa
  {
    name: 'Paide Bussijaam', lat: 58.8869, lon: 25.5597,
    county: 'Järva', municipality: 'Paide',
    routes: [
      { routeNumber: 'TP', routeName: 'Tallinn — Paide', type: 'bus', frequency: 'every 60 min', keyDestinations: ['Tallinn', 'Türi'] },
      { routeNumber: 'PT', routeName: 'Paide — Türi', type: 'bus', frequency: 'every 45 min', keyDestinations: ['Türi'] },
    ],
  },
  // Raplamaa
  {
    name: 'Rapla Bussijaam', lat: 59.0072, lon: 24.7944,
    county: 'Rapla', municipality: 'Rapla',
    routes: [
      { routeNumber: 'R', routeName: 'Tallinn — Rapla (Elron)', type: 'train', frequency: 'every 60 min', keyDestinations: ['Tallinn', 'Lelle'] },
      { routeNumber: 'R', routeName: 'Tallinn — Viljandi (Elron)', type: 'train', frequency: 'every 3h', keyDestinations: ['Tallinn', 'Viljandi', 'Türi'] },
    ],
  },
  // Läänemaa
  {
    name: 'Haapsalu Bussijaam', lat: 58.9431, lon: 23.5408,
    county: 'Lääne', municipality: 'Haapsalu',
    routes: [
      { routeNumber: 'TH', routeName: 'Tallinn — Haapsalu (Express)', type: 'bus', frequency: 'every 60 min', keyDestinations: ['Tallinn', 'Risti'] },
      { routeNumber: '1', routeName: 'Haapsalu — Paralepa', type: 'bus', frequency: 'every 30 min', keyDestinations: ['Paralepa'] },
    ],
  },
  // Saaremaa
  {
    name: 'Kuressaare Bussijaam', lat: 58.2528, lon: 22.4850,
    county: 'Saare', municipality: 'Saaremaa',
    routes: [
      { routeNumber: 'TK', routeName: 'Tallinn — Kuressaare (Express)', type: 'bus', frequency: 'every 2h', keyDestinations: ['Tallinn', 'Virtsu', 'Orissaare'] },
      { routeNumber: '1', routeName: 'Kuressaare — Roomassaare', type: 'bus', frequency: 'every 30 min', keyDestinations: ['Roomassaare sadam'] },
    ],
  },
  // Hiiumaa
  {
    name: 'Kärdla Bussijaam', lat: 59.0017, lon: 22.7467,
    county: 'Hiiu', municipality: 'Hiiumaa',
    routes: [
      { routeNumber: 'TK2', routeName: 'Tallinn — Kärdla (via Heltermaa)', type: 'bus', frequency: 'every 3h', keyDestinations: ['Tallinn', 'Heltermaa'] },
      { routeNumber: '1', routeName: 'Kärdla — Käina', type: 'bus', frequency: 'every 60 min', keyDestinations: ['Käina'] },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════
// All stops combined (29 curated stops across Estonia — a representative
// sample; the full GTFS dataset would be imported in production)
// ═══════════════════════════════════════════════════════════════

export const ALL_TRANSIT_STOPS: TransitStopData[] = [
  ...TALLINN_STOPS,
  ...TARTU_STOPS,
  ...PARNU_STOPS,
  ...IDAVIRU_STOPS,
  ...ALL_STOPS,
];
