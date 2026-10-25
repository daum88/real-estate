// ─── In-ADS Address Types ────────────────────────────────────────
export interface InAdsAddress {
  adr_id: number;
  address: string;
  katastritunnus?: string;
  ehrCode?: string;           // tunnus — EHR building code from In-ADS
  adsOid?: string;
  x?: number;
  y?: number;
  lat?: number;
  lon?: number;
}

// ─── EHR Building Types ──────────────────────────────────────────
export interface EhrDocument {
  documentType: string;
  documentStatus: string;
  documentDate?: string;
  registrationDate?: string;
}

export interface EnergyCertificate {
  energyClass: string;
  issueDate?: string;
  expirationDate?: string;
  certificateType?: string;
  energyPerformanceValue?: number;
}

export interface TechnicalParameters {
  totalArea?: number;
  closedNetArea?: number;
  buildingYear?: number;
  floors?: number;
  height?: number;
  buildingMaterial?: string;
  heatingSystem?: string;
}

export interface ChimneySweepCert {
  valid: boolean;
  lastInspectionDate?: string;
  nextInspectionDue?: string;
  systemType?: string;
}

export interface EhrBuildingData {
  ehrCode: string;
  address: string;
  status: string;
  buildingType?: string;
  isHouse?: boolean;
  documents: EhrDocument[];
  energyCertificates: EnergyCertificate[];
  technicalParameters: TechnicalParameters;
  chimneySweepCert?: ChimneySweepCert;
  ehrRooms?: number;
  cadastralCode?: string;
}

// ─── e-Äriregister Types ─────────────────────────────────────────
export interface CompanyProfile {
  registrikood: string;
  name: string;
  status: string;               // R = registered, L = liquidated, K = bankrupt
  legalForm?: string;           // OÜ, AS, MTÜ, etc.
  boardMembers?: string[];
  beneficialOwners?: string[];
  taxDebt?: number;
  taxDebtDate?: string;
  lastAnnualReportYear?: number;
  annualReportFiled?: boolean;
}

export interface KUHealth {
  registrikood: string;
  name: string;
  status: string;
  taxDebt: number;
  taxDebtDate?: string;
  annualReportUpToDate: boolean;
  lastAnnualReportYear?: number;
}

// ─── Spatial & Environmental ──────────────────────────────────────
export interface SpatialConstraint {
  type: string;
  label: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
}

export interface AgriculturalParcel {
  parcelId: string;
  cropType?: string;
  isOrganic: boolean;
  distance: number;             // meters from property
  pesticideRisk: 'none' | 'low' | 'medium' | 'high';
  livestockRisk: 'none' | 'low' | 'medium' | 'high';
}

export interface MunicipalPlan {
  planId: string;
  title: string;
  status: string;
  type: string;
  description: string;
  impact?: string;
  distance?: number;
  url?: string;
}

export interface TransitScore {
  score: number;                // 0–100
  nearestStopName: string;
  nearestStopDistance: number;   // meters
  walkTimeMinutes: number;
  routes: TransitRoute[];
}

export interface TransitRoute {
  routeNumber: string;
  routeName: string;
  type: 'bus' | 'tram' | 'train';
  frequency: string;            // e.g. "every 10 min"
  keyDestinations: string[];    // e.g. ["Tartu Kesklinn", "Railway Station"]
}

export interface SchoolProximity {
  name: string;
  type: 'kindergarten' | 'primary' | 'secondary' | 'highschool';
  distance: number;             // meters
  walkTimeMinutes: number;
  language?: string;            // eesti, vene, etc.
}

export interface EnvironmentalProfile {
  radonRiskLevel: 'low' | 'normal' | 'high' | 'very_high' | 'unknown';
  radonZone?: string;
  noiseLevel?: number;           // dB
  noiseCategory?: string;        // "Quiet", "Moderate", "Loud"
  floodRisk: 'none' | 'low' | 'medium' | 'high';
  soilType?: string;
}

// ─── Market & Valuation ──────────────────────────────────────────
export interface DistrictPriceData {
  district: string;
  medianPricePerSqm: number;
  dateRange: string;
  transactionCount?: number;
}

export interface MarketplaceListing {
  id?: string;
  source: string;               // kv.ee, city24.ee
  url?: string;
  currentPrice: number;
  originalPrice?: number;
  priceHistory: PriceChange[];
  daysOnMarket: number;
  pricePerSqm: number;
  rooms?: number;
  area?: number;
  floorNumber?: string;
  addressRaw?: string;
  title?: string;
  year?: number;
  energyClass?: string;
  heating?: string;
  material?: string;
}

export interface PriceChange {
  date: string;
  price: number;
  changePercent: number;
}

// ─── Combined Dashboard Payload ──────────────────────────────────
export interface DashboardData {
  // Address
  address: string;
  adrId: number;
  coordinates?: { lat: number; lon: number };
  katastritunnus?: string;
  isApartment?: boolean;
  estimatedApartmentArea?: number;

  // Building
  building: EhrBuildingData | null;
  hasOccupancyPermit: boolean;
  latestEnergyClass: string | null;

  // KÜ / Apartment Association
  kuHealth: KUHealth | null;

  // Developer / Builder
  developer: CompanyProfile | null;

  // Spatial & Environmental
  constraints: SpatialConstraint[];
  agriculturalParcels: AgriculturalParcel[];
  municipalPlans: MunicipalPlan[];
  transitScore: TransitScore | null;
  schools: SchoolProximity[];
  environmental: EnvironmentalProfile;

  // District pricing
  districtPrice: DistrictPriceData | null;

  // Marketplace
  marketplaceListings: MarketplaceListing[];
  portalSearchUrls: { portal: string; url: string }[];
  priceStats: { median: number; avg: number; min: number; max: number; count: number; medianPerSqm: number };
  estimatedValue: number | null;
  similarByRooms: MarketplaceListing[];
  similarByArea: MarketplaceListing[];
  apartmentEstimate: { estimatedTotal: number; estimatedPerSqm: number; comparableCount: number; comparables: MarketplaceListing[] } | null;
  mlEstimate: { estimatedTotal: number; estimatedPerSqm: number; modelInfo: any } | null;
  energyDistribution: { total: number; classes: { class: string; count: number; pct: number }[] } | null;
  priceTrend: { label: string; avgPricePerSqm: number; count: number }[];

  // Metadata
  errors: string[];
}

// ─── API Response/Request ────────────────────────────────────────
export interface LookupRequest {
  address?: string;
  adrId?: number;
  ehrCode?: string;
  registrikood?: string;        // for KÜ/developer direct lookup
}

export interface LookupResponse {
  success: boolean;
  data?: DashboardData;
  error?: string;
}
