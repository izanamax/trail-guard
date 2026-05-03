import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing env var: ${name}`);
  }

  return value;
}

const supabaseUrl = requireEnv('EXPO_PUBLIC_SUPABASE_URL');
const supabaseKey =
  process.env.EXPO_PUBLIC_SUPABASE_KEY?.trim() ||
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

if (!supabaseUrl.startsWith('https://')) {
  throw new Error('EXPO_PUBLIC_SUPABASE_URL must start with https://');
}

if (!supabaseKey) {
  throw new Error(
    'Missing Supabase key: set EXPO_PUBLIC_SUPABASE_KEY (or _ANON_KEY / _PUBLISHABLE_KEY).'
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
