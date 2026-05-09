import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Route } from '@/types/route';

const LOCAL_ROUTE_STORAGE_KEY = 'route_items_local';

function resolveStorageKey(userId?: string): string {
  if (userId) {
    return `route_items_${userId}`;
  }
  return LOCAL_ROUTE_STORAGE_KEY;
}

export async function loadRoutes(userId?: string): Promise<Route[]> {
  const key = resolveStorageKey(userId);
  const raw = await AsyncStorage.getItem(key);

  if (!raw) return [];

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as Route[];
  } catch {
    return [];
  }
}

export async function saveRoutes(items: Route[], userId?: string): Promise<void> {
  const key = resolveStorageKey(userId);
  await AsyncStorage.setItem(key, JSON.stringify(items));
}

export async function addRoute(item: Route): Promise<void> {
  const existing = await loadRoutes(item.userId);
  await saveRoutes([item, ...existing], item.userId);
}

export async function getRouteById(id: string, userId?: string): Promise<Route | undefined> {
  const existing = await loadRoutes(userId);
  return existing.find((item) => item.id === id);
}

export async function deleteRoute(id: string, userId?: string): Promise<boolean> {
  const existing = await loadRoutes(userId);
  const nextItems = existing.filter((item) => item.id !== id);

  if (nextItems.length === existing.length) return false;

  await saveRoutes(nextItems, userId);
  return true;
}

export async function updateRoute(item: Route): Promise<boolean> {
  const existing = await loadRoutes(item.userId);
  const itemIndex = existing.findIndex((entry) => entry.id === item.id);

  if (itemIndex === -1) return false;

  const nextItems = [...existing];
  nextItems[itemIndex] = item;

  await saveRoutes(nextItems, item.userId);
  return true;
}
