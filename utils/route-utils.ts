import type { Waypoint } from '@/types/route';

/**
 * Calculates the distance between two waypoints using the Haversine formula.
 * Returns distance in kilometers.
 */
export function calculateDistance(wp1: Waypoint, wp2: Waypoint): number {
  const R = 6371; // Radius of the Earth in km
  const dLat = (wp2.latitude - wp1.latitude) * (Math.PI / 180);
  const dLon = (wp2.longitude - wp1.longitude) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(wp1.latitude * (Math.PI / 180)) *
      Math.cos(wp2.latitude * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculates the total distance of a route in kilometers.
 */
export function calculateRouteDistance(waypoints: Waypoint[]): number {
  let total = 0;
  for (let i = 0; i < waypoints.length - 1; i++) {
    total += calculateDistance(waypoints[i], waypoints[i + 1]);
  }
  return total;
}

/**
 * Calculates the total elevation gain of a route in meters.
 */
export function calculateElevationGain(waypoints: Waypoint[]): number {
  let gain = 0;
  for (let i = 0; i < waypoints.length - 1; i++) {
    const e1 = waypoints[i].elevation || 0;
    const e2 = waypoints[i + 1].elevation || 0;
    const diff = e2 - e1;
    if (diff > 0) {
      gain += diff;
    }
  }
  return gain;
}
