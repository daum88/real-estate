/**
 * School & Kindergarten Proximity — EHIS (Estonian Education Information System)
 *
 * Uses real school data from lib/data/schools-data.ts
 * covering all 15 Estonian counties with verified school names and locations.
 *
 * In production: download the full EHIS institution CSV and index in PostgreSQL.
 */

import { ALL_SCHOOLS, SchoolData } from './data/schools-data';
import type { SchoolProximity } from './types';

function approxDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const la1 = +lat1, lo1 = +lon1, la2 = +lat2, lo2 = +lon2;
  const dLat = (la2 - la1) * 111_320;
  const dLon = (lo2 - lo1) * 111_320 * Math.cos(((la1 + la2) / 2) * (Math.PI / 180));
  return Math.sqrt(dLat * dLat + dLon * dLon);
}

function walkTimeMinutes(meters: number): number {
  return Math.round((meters / 83.33) * 10) / 10;
}

function toSchoolProximity(s: SchoolData, distance: number): SchoolProximity {
  return {
    name: s.name,
    type: s.type,
    distance: Math.round(distance),
    walkTimeMinutes: walkTimeMinutes(distance),
    language: s.language,
  };
}

export async function getSchoolProximity(params: {
  address?: string;
  coordinates?: { lat: number; lon: number };
}): Promise<SchoolProximity[]> {
  if (ALL_SCHOOLS.length === 0) return [];

  if (!params.coordinates) {
    // Return schools from the county matching the address
    const addr = params.address?.toLowerCase() || '';
    const countySchools = ALL_SCHOOLS.filter((s) => {
      if (!addr) return false;
      const county = s.county.toLowerCase();
      return addr.includes(county) || addr.includes(s.municipality.toLowerCase().split(' ')[0]);
    });

    const schools = countySchools.length > 0 ? countySchools : ALL_SCHOOLS.slice(0, 6);
    return schools.slice(0, 8).map((s) => toSchoolProximity(s, 0));
  }

  // Calculate distances and sort
  const withDistances = ALL_SCHOOLS
    .map((s) => ({
      school: s,
      distance: approxDistanceMeters(params.coordinates!.lat, params.coordinates!.lon, s.lat, s.lon),
    }))
    .sort((a, b) => a.distance - b.distance);

  // Return top 6: 2 kindergartens + 2 primary + 2 secondary
  const kindergartens = withDistances
    .filter((s) => s.school.type === 'kindergarten')
    .slice(0, 2);
  const primaries = withDistances
    .filter((s) => s.school.type === 'primary')
    .slice(0, 2);
  const secondaries = withDistances
    .filter((s) => s.school.type === 'secondary' || s.school.type === 'highschool')
    .slice(0, 2);

  return [...kindergartens, ...primaries, ...secondaries].map((d) =>
    toSchoolProximity(d.school, d.distance)
  );
}
