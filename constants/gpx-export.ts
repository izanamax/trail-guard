export const DEFAULT_GPX_SHARE_MESSAGE = 'Лучший маршрут — тот, которым делишься. Лови и выходи на тропу!';
export const DEFAULT_UNKNOWN_ROUTE_AUTHOR = 'Unknown Author';
export const DEFAULT_UNTITLED_ROUTE_NAME = 'Untitled Route';

export function formatRouteGpxFileName(routeName: string, authorName: string): string {
  return `${routeName} by ${authorName}.gpx`;
}
