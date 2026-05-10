import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform, Share } from 'react-native';

import {
  DEFAULT_GPX_SHARE_MESSAGE,
  DEFAULT_UNKNOWN_ROUTE_AUTHOR,
  DEFAULT_UNTITLED_ROUTE_NAME,
  formatRouteGpxFileName,
} from '@/constants/gpx-export';
import { getCachedProfile } from '@/lib/profile-cache';
import type { Route, Waypoint } from '@/types/route';

const GPX_MIME_TYPE = 'application/gpx+xml';

function normalizeAuthorName(profileName?: string, profileEmail?: string): string {
  const trimmedName = profileName?.trim();
  if (trimmedName) return trimmedName;

  const emailPrefix = profileEmail?.split('@')[0]?.trim();
  return emailPrefix || DEFAULT_UNKNOWN_ROUTE_AUTHOR;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildTrackPoint(point: Waypoint): string {
  const elevation =
    typeof point.elevation === 'number' && Number.isFinite(point.elevation)
      ? `\n        <ele>${point.elevation}</ele>`
      : '';

  return `      <trkpt lat="${point.latitude.toFixed(7)}" lon="${point.longitude.toFixed(7)}">${elevation}\n      </trkpt>`;
}

function normalizeFileNamePart(value: string): string {
  const normalized = value
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/\.+$/g, '')
    .trim();

  return normalized || 'route';
}

function downloadOnWeb(content: string, fileName: string) {
  const blob = new Blob([content], { type: GPX_MIME_TYPE });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 0);
}

export function buildRouteGpx(route: Route): string {
  if (route.waypoints.length === 0) {
    throw new Error('Route has no waypoints to export.');
  }

  const routeName = route.name.trim() || DEFAULT_UNTITLED_ROUTE_NAME;
  const createdAt = new Date(route.createdAt);
  const timestamp = Number.isNaN(createdAt.getTime()) ? null : createdAt.toISOString();
  const metadataTime = timestamp ? `\n    <time>${timestamp}</time>` : '';
  const trackPoints = route.waypoints.map(buildTrackPoint).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Trail Guard" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${escapeXml(routeName)}</name>${metadataTime}
  </metadata>
  <trk>
    <name>${escapeXml(routeName)}</name>
    <trkseg>
${trackPoints}
    </trkseg>
  </trk>
</gpx>
`;
}

export async function exportRouteAsGpx(route: Route): Promise<string> {
  const profile = await getCachedProfile();
  const routeName = route.name.trim() || DEFAULT_UNTITLED_ROUTE_NAME;
  const authorName = normalizeAuthorName(profile?.name, profile?.email);
  const fileName = formatRouteGpxFileName(
    normalizeFileNamePart(routeName),
    normalizeFileNamePart(authorName)
  );
  const gpxContent = buildRouteGpx(route);

  if (Platform.OS === 'web') {
    downloadOnWeb(gpxContent, fileName);
    return fileName;
  }

  const file = new File(Paths.cache, fileName);
  file.create({ intermediates: true, overwrite: true });
  file.write(gpxContent);

  if (Platform.OS === 'ios') {
    await Share.share(
      {
        url: file.uri,
        message: DEFAULT_GPX_SHARE_MESSAGE,
      },
      {
        subject: fileName,
      }
    );

    return file.uri;
  }

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error('File sharing is not available on this device.');
  }

  await Sharing.shareAsync(file.uri, {
    mimeType: GPX_MIME_TYPE,
    UTI: 'public.xml',
    dialogTitle: DEFAULT_GPX_SHARE_MESSAGE,
  });

  return file.uri;
}
