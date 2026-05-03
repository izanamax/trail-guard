import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { supabase } from '@/lib/supabase';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const [userName, setUserName] = useState('Trail Guard User');
  const [userEmail, setUserEmail] = useState('maxim.mussin@trailguard.app');
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const metadataName =
        typeof data.user?.user_metadata?.name === 'string'
          ? data.user.user_metadata.name.trim()
          : typeof data.user?.user_metadata?.full_name === 'string'
          ? data.user.user_metadata.full_name.trim()
          : '';

      if (metadataName) {
        setUserName(metadataName);
      }

      if (data.user?.email) {
        setUserEmail(data.user.email);
        if (!metadataName) {
          const fallbackName = data.user.email.split('@')[0]?.trim();
          if (fallbackName) {
            setUserName(fallbackName);
          }
        }
      }
    });
  }, []);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await supabase.auth.signOut();
    setIsSigningOut(false);
  };

  return (
    <ThemedView style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          {
            paddingTop: insets.top + 12,
            paddingBottom: insets.bottom + 24,
          },
        ]}
        showsVerticalScrollIndicator={false}>
        <ThemedView style={styles.header}>
          <Image
            source={require('@/assets/images/icon.png')}
            style={styles.avatar}
            contentFit="cover"
          />
          <ThemedText type="title" style={styles.centerText}>
            {userName}
          </ThemedText>
          <ThemedText style={styles.centerText}>{userEmail}</ThemedText>
        </ThemedView>

        <ThemedView style={styles.statsRow}>
          <ThemedView style={styles.statCard}>
            <ThemedText type="subtitle">24</ThemedText>
            <ThemedText style={styles.statLabel}>Trips</ThemedText>
          </ThemedView>
          <ThemedView style={styles.statCard}>
            <ThemedText type="subtitle">156 km</ThemedText>
            <ThemedText style={styles.statLabel}>Distance</ThemedText>
          </ThemedView>
        </ThemedView>

        <Pressable style={styles.signOutButton} onPress={handleSignOut} disabled={isSigningOut}>
          <ThemedText type="defaultSemiBold">
            {isSigningOut ? 'Signing out...' : 'Sign out'}
          </ThemedText>
        </Pressable>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  container: {
    paddingHorizontal: 20,
    gap: 20,
    minHeight: '100%',
  },
  header: {
    alignItems: 'center',
    gap: 6,
  },
  centerText: {
    textAlign: 'center',
    maxWidth: '100%',
  },
  avatar: {
    width: 92,
    height: 92,
    borderRadius: 46,
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#8f8f8f66',
    paddingVertical: 14,
    alignItems: 'center',
    gap: 4,
  },
  statLabel: {
    textAlign: 'center',
    width: '100%',
    flexShrink: 1,
  },
  signOutButton: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#cc5555',
    paddingHorizontal: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
});
