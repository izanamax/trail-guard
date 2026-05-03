import AsyncStorage from '@react-native-async-storage/async-storage';

import type { GearItem } from '@/types/gear';

const LOCAL_GEAR_STORAGE_KEY = 'gear_items_local';

function resolveStorageKey(userId?: string): string {
  if (userId) {
    return `gear_items_${userId}`;
  }

  return LOCAL_GEAR_STORAGE_KEY;
}

export async function loadGearItems(userId?: string): Promise<GearItem[]> {
  const key = resolveStorageKey(userId);
  const raw = await AsyncStorage.getItem(key);

  if (!raw) return [];

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as GearItem[];
  } catch {
    return [];
  }
}

export async function saveGearItems(items: GearItem[], userId?: string): Promise<void> {
  const key = resolveStorageKey(userId);
  await AsyncStorage.setItem(key, JSON.stringify(items));
}

export async function addGearItem(item: GearItem): Promise<void> {
  const existing = await loadGearItems(item.userId);
  await saveGearItems([item, ...existing], item.userId);
}
