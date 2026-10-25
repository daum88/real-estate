/**
 * Public Transport Accessibility — GTFS Data from Transpordiamet
 *
 * Uses real transit stop data from lib/data/transit-stops.ts
 * covering all 15 Estonian counties.
 *
 * In production: download the full GTFS static dataset from peatus.ee,
 * index stops.txt into PostgreSQL with PostGIS for sub-meter proximity queries.
 */

import { ALL_TRANSIT_STOPS, TransitStopData, TransitRouteData } from './data/transit-stops';
import type { TransitScore, TransitRoute } from './types';

/**
 * Simple Euclidean distance (good enough for < 50km radius).
 */
function approxDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const la1 = +lat1, lo1 = +lon1, la2 = +lat2, lo2 = +lon2;
  const dLat = (la2 - la1) * 111_320;
  const dLon = (lo2 - lo1) * 111_320 * Math.cos(((la1 + la2) / 2) * (Math.PI / 180));
  return Math.sqrt(dLat * dLat + dLon * dLon);
}

function walkTimeMinutes(meters: number): number {
  return Math.round((meters / 83.33) * 10) / 10;
}

function calculateScore(stop: TransitStopData, distance: number): number {
  let score = 100;

  // Distance penalty: -1 per 100m (capped at -50)
  score -= Math.min(50, Math.round(distance / 100));

  // Frequency bonus
  const highFreqPatterns = ['every 8', 'every 10', 'every 12', 'every 15'];
  const hasHighFreq = stop.routes.some(
    (r) => highFreqPatterns.some((p) => r.frequency.includes(p))
  );
  if (!hasHighFreq) score -= 15;

  // Train bonus
  if (stop.routes.some((r) => r.type === 'train')) score += 10;

  // Route variety bonus
  if (stop.routes.length >= 4) score += 5;

  return Math.max(0, Math.min(100, score));
}

function toTransitRoute(r: TransitRouteData): TransitRoute {
  return {
    routeNumber: r.routeNumber,
    routeName: r.routeName,
    type: r.type,
    frequency: r.frequency,
    keyDestinations: r.keyDestinations,
  };
}

export async function getTransitScore(params: {
  address?: string;
  coordinates?: { lat: number; lon: number };
}): Promise<TransitScore | null> {
  if (ALL_TRANSIT_STOPS.length === 0) return null;

  // Without coordinates we cannot compute a real distance — returning a
  // fabricated "300 m / score 50" would misrepresent the data, so return
  // null and let the UI hide the section.
  if (!params.coordinates) {
    return null;
  }

  // Find the nearest stop from ALL stops across Estonia
  let nearest = ALL_TRANSIT_STOPS[0];
  let minDist = Infinity;

  for (const stop of ALL_TRANSIT_STOPS) {
    const dist = approxDistanceMeters(
      params.coordinates.lat, params.coordinates.lon,
      stop.lat, stop.lon
    );
    if (dist < minDist) {
      minDist = dist;
      nearest = stop;
    }
  }

  // If the nearest stop is very far (>10km), return a generic rural score
  if (minDist > 10000) {
    return {
      score: 30,
      nearestStopName: 'Nearest county bus stop',
      nearestStopDistance: Math.round(minDist),
      walkTimeMinutes: walkTimeMinutes(minDist),
      routes: [{ routeNumber: '', routeName: 'Rural bus service', type: 'bus', frequency: 'every 60–120 min', keyDestinations: ['County center', 'Nearest town'] }],
    };
  }

  const walkTime = walkTimeMinutes(minDist);
  const score = calculateScore(nearest, minDist);

  return {
    score,
    nearestStopName: nearest.name,
    nearestStopDistance: Math.round(minDist),
    walkTimeMinutes: walkTime,
    routes: nearest.routes.map(toTransitRoute),
  };
}
