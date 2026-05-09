export interface Waypoint {
  id: string;
  latitude: number;
  longitude: number;
  elevation?: number;
  gearId?: string | null;
}

export interface Route {
  id: string;
  userId?: string;
  name: string;
  date: string;
  waypoints: Waypoint[];
  createdAt: string;
}
