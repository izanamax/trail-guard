import AsyncStorage from '@react-native-async-storage/async-storage';

const PROFILE_CACHE_KEY = 'trail_guard_profile_cache_v1';
const PROFILE_CACHE_TTL_MS = 1000 * 60 * 60;

export type CachedProfile = {
  name: string;
  email: string;
};

type StoredProfile = CachedProfile & {
  expiresAt: number;
};

type UserLike = {
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
} | null;

let memoryProfile: StoredProfile | null = null;

function isExpired(expiresAt: number) {
  return expiresAt <= Date.now();
}

function toStoredProfile(profile: CachedProfile): StoredProfile {
  return {
    ...profile,
    expiresAt: Date.now() + PROFILE_CACHE_TTL_MS,
  };
}

function parseStoredProfile(raw: string | null): StoredProfile | null {
  if (!raw) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;

    const candidate = parsed as {
      name?: unknown;
      email?: unknown;
      expiresAt?: unknown;
    };

    if (
      typeof candidate.name !== 'string' ||
      typeof candidate.email !== 'string' ||
      typeof candidate.expiresAt !== 'number'
    ) {
      return null;
    }

    return {
      name: candidate.name,
      email: candidate.email,
      expiresAt: candidate.expiresAt,
    };
  } catch {
    return null;
  }
}

export function getCachedProfileSync(): CachedProfile | null {
  if (!memoryProfile) return null;
  if (isExpired(memoryProfile.expiresAt)) {
    memoryProfile = null;
    return null;
  }

  return {
    name: memoryProfile.name,
    email: memoryProfile.email,
  };
}

export async function getCachedProfile(): Promise<CachedProfile | null> {
  const syncProfile = getCachedProfileSync();
  if (syncProfile) return syncProfile;

  const raw = await AsyncStorage.getItem(PROFILE_CACHE_KEY);
  const parsed = parseStoredProfile(raw);

  if (!parsed) return null;
  if (isExpired(parsed.expiresAt)) {
    await AsyncStorage.removeItem(PROFILE_CACHE_KEY);
    return null;
  }

  memoryProfile = parsed;
  return {
    name: parsed.name,
    email: parsed.email,
  };
}

export async function setCachedProfile(profile: CachedProfile): Promise<void> {
  const stored = toStoredProfile(profile);
  memoryProfile = stored;
  await AsyncStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(stored));
}

export async function clearCachedProfile(): Promise<void> {
  memoryProfile = null;
  await AsyncStorage.removeItem(PROFILE_CACHE_KEY);
}

export function mapUserToProfile(user: UserLike): CachedProfile | null {
  if (!user?.email) return null;

  const userMetadata = user.user_metadata ?? {};
  const metadataName =
    typeof userMetadata.name === 'string'
      ? userMetadata.name.trim()
      : typeof userMetadata.full_name === 'string'
      ? userMetadata.full_name.trim()
      : '';

  const email = user.email.trim();
  const fallbackName = email.split('@')[0]?.trim() || '';

  return {
    name: metadataName || fallbackName,
    email,
  };
}

export async function cacheProfileFromUser(user: UserLike): Promise<CachedProfile | null> {
  const mapped = mapUserToProfile(user);

  if (!mapped) {
    await clearCachedProfile();
    return null;
  }

  await setCachedProfile(mapped);
  return mapped;
}
