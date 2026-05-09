import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import 'react-native-reanimated';
import type { Session } from '@supabase/supabase-js';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { cacheProfileFromUser, clearCachedProfile } from '@/lib/profile-cache';
import { supabase } from '@/lib/supabase';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const segments = useSegments();
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!isMounted) return;
      setSession(data.session);

      try {
        if (data.session?.user) {
          await cacheProfileFromUser(data.session.user);
        } else {
          await clearCachedProfile();
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);

      if (nextSession?.user) {
        void cacheProfileFromUser(nextSession.user);
      } else {
        void clearCachedProfile();
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login');
      return;
    }

    if (session && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [isLoading, router, segments, session]);

  if (isLoading) {
    return (
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
        </View>
        <StatusBar style="auto" />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="add-gear"
          options={{
            title: 'Add Gear',
            headerBackTitle: 'Back',
            headerTransparent: false,
            headerStyle: { backgroundColor: colorScheme === 'dark' ? '#151718' : '#fff' },
          }}
        />
        <Stack.Screen
          name="gear/[id]"
          options={{
            title: 'Gear Details',
            headerBackTitle: 'Back',
            headerTransparent: false,
            headerStyle: { backgroundColor: colorScheme === 'dark' ? '#151718' : '#fff' },
          }}
        />
        <Stack.Screen
          name="route/[id]"
          options={{
            title: 'Route Details',
            headerBackTitle: 'Back',
            headerTransparent: false,
            headerStyle: { backgroundColor: colorScheme === 'dark' ? '#151718' : '#fff' },
          }}
        />
        <Stack.Screen
          name="settings"
          options={{
            title: 'Settings',
            headerBackTitle: 'Back',
            headerTransparent: false,
            headerStyle: { backgroundColor: colorScheme === 'dark' ? '#151718' : '#fff' },
          }}
        />
        <Stack.Screen
          name="security"
          options={{
            title: 'Security',
            headerBackTitle: 'Back',
            headerTransparent: false,
            headerStyle: { backgroundColor: colorScheme === 'dark' ? '#151718' : '#fff' },
          }}
        />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
