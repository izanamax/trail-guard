import AsyncStorage from '@react-native-async-storage/async-storage';

import type { GearItem } from '@/types/gear';

const LOCAL_GEAR_STORAGE_KEY = 'gear_items_local';
const LEGACY_GEAR_STORAGE_KEYS = ['gear_items'];

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
    return (parsed as GearItem[]).filter(
      (item) => typeof item?.id === 'string' && typeof item?.category === 'string'
    );
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

export async function findGearItemById(id: string, userId?: string): Promise<GearItem | undefined> {
  const existing = await loadGearItems(userId);
  return existing.find((item) => item.id === id);
}

export async function updateGearItem(item: GearItem): Promise<boolean> {
  const existing = await loadGearItems(item.userId);
  const itemIndex = existing.findIndex((entry) => entry.id === item.id);

  if (itemIndex === -1) return false;

  const nextItems = [...existing];
  nextItems[itemIndex] = item;

  await saveGearItems(nextItems, item.userId);
  return true;
}

export async function deleteGearItem(id: string, userId?: string): Promise<boolean> {
  const existing = await loadGearItems(userId);
  const nextItems = existing.filter((item) => item.id !== id);

  if (nextItems.length === existing.length) return false;

  await saveGearItems(nextItems, userId);
  return true;
}

export async function clearUserLocalData(userId?: string): Promise<void> {
  const keysToDelete = new Set<string>([LOCAL_GEAR_STORAGE_KEY, ...LEGACY_GEAR_STORAGE_KEYS]);

  if (userId) {
    keysToDelete.add(resolveStorageKey(userId));
  }

  try {
    const allKeys = await AsyncStorage.getAllKeys();
    for (const key of allKeys) {
      if (
        key.startsWith('gear_items_') || 
        key.startsWith('route_items_') || 
        key.includes('profile_cache')
      ) {
        keysToDelete.add(key);
      }
      if (!key.startsWith('gear_items_')) continue;
      keysToDelete.add(key);
    }
  } catch {
    // Ignore key enumeration failures and clear known keys only.
  }

  await AsyncStorage.multiRemove(Array.from(keysToDelete));
  // Also clear any legacy keys that might not fit the pattern
  await AsyncStorage.removeItem('trail_guard_profile_cache_v1');
}
