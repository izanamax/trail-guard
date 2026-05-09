import { useFocusEffect } from '@react-navigation/native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { deleteAccountAndAllData } from '@/lib/account-delete';
import {
  cacheProfileFromUser,
  getCachedProfile,
  getCachedProfileSync,
  mapUserToProfile,
  type CachedProfile,
} from '@/lib/profile-cache';
import { supabase } from '@/lib/supabase';
import { loadGearItems } from '@/storage/gear-storage';
import { loadRoutes } from '@/storage/route-storage';
import { calculateGearStatus } from '@/utils/gear-status';
import { calculateRouteDistance } from '@/utils/route-utils';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const syncProfile = getCachedProfileSync();
  const [userName, setUserName] = useState(syncProfile?.name ?? '');
  const [userEmail, setUserEmail] = useState(syncProfile?.email ?? '');
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [actionError, setActionError] = useState('');
  const [totalGear, setTotalGear] = useState(0);
  const [attentionCount, setAttentionCount] = useState(0);
  const [totalRoutes, setTotalRoutes] = useState(0);
  const [totalDistance, setTotalDistance] = useState(0);

  const applyProfile = useCallback((profile: CachedProfile | null) => {
    if (!profile) return;
    setUserName(profile.name);
    setUserEmail(profile.email);
  }, []);

  const loadUserProfile = useCallback(async () => {
    try {
      const cached = await getCachedProfile();
      if (cached) {
        applyProfile(cached);
      }

      const { data } = await supabase.auth.getUser();
      const mapped = mapUserToProfile(data.user ?? null);
      if (mapped) {
        applyProfile(mapped);
        await cacheProfileFromUser(data.user ?? null);
      }

      // Load gear stats
      const items = await loadGearItems(data.user?.id);
      setTotalGear(items.length);
      const needsAttention = items.filter((item) => {
        const { status } = calculateGearStatus(item);
        return status === 'Warning' || status === 'Retire Soon' || status === 'Expired';
      });
      setAttentionCount(needsAttention.length);

      // Load route stats
      const routes = await loadRoutes(data.user?.id);
      setTotalRoutes(routes.length);
      const distance = routes.reduce((sum, r) => sum + calculateRouteDistance(r.waypoints), 0);
      setTotalDistance(distance);
    } catch {
      // Keep last known profile values if request fails.
    }
  }, [applyProfile]);

  useFocusEffect(
    useCallback(() => {
      void loadUserProfile();
    }, [loadUserProfile])
  );

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') {
        void loadUserProfile();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [loadUserProfile]);

  const handleSignOut = async () => {
    setActionError('');
    setIsSigningOut(true);
    try {
      await supabase.auth.signOut();
    } catch {
      setActionError('Failed to sign out.');
    }
    setIsSigningOut(false);
  };

  const runDeleteAccountFlow = async () => {
    if (isDeletingAccount || isSigningOut) return;

    setActionError('');
    setIsDeletingAccount(true);

    try {
      await deleteAccountAndAllData();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete account and data.';
      setActionError(message);
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const handleDeleteAccount = () => {
    if (isDeletingAccount || isSigningOut) return;

    Alert.alert(
      'Delete account and all data?',
      'This removes your account, cloud records, and local gear data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Final confirmation',
              'Confirm permanent deletion of your account and all Trail Guard data.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete permanently',
                  style: 'destructive',
                  onPress: () => {
                    void runDeleteAccountFlow();
                  },
                },
              ]
            );
          },
        },
      ]
    );
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
          {userName ? (
            <ThemedText type="title" style={styles.centerText}>
              {userName}
            </ThemedText>
          ) : null}
          {userEmail ? <ThemedText style={styles.centerText}>{userEmail}</ThemedText> : null}
        </ThemedView>

        <ThemedView style={styles.quickActions}>
          <Pressable
            style={styles.quickActionButton}
            onPress={() =>
              router.push({
                pathname: '/settings',
                params: {
                  name: userName,
                  email: userEmail,
                },
              })
            }>
            <ThemedText type="defaultSemiBold">Settings</ThemedText>
            <ThemedText style={styles.quickActionHint}>Change name and email</ThemedText>
          </Pressable>
          <Pressable style={styles.quickActionButton} onPress={() => router.push('/security')}>
            <ThemedText type="defaultSemiBold">Security</ThemedText>
            <ThemedText style={styles.quickActionHint}>Read safety guidance and limits</ThemedText>
          </Pressable>
        </ThemedView>

        <ThemedView style={styles.statsRow}>
          <ThemedView style={styles.statCard}>
            <ThemedText type="subtitle">{totalGear}</ThemedText>
            <ThemedText style={styles.statLabel}>Gear Items</ThemedText>
          </ThemedView>
          <ThemedView style={styles.statCard}>
            <ThemedText type="subtitle">{attentionCount}</ThemedText>
            <ThemedText style={styles.statLabel}>Attention</ThemedText>
          </ThemedView>
        </ThemedView>

        <ThemedView style={styles.statsRow}>
          <ThemedView style={styles.statCard}>
            <ThemedText type="subtitle">{totalRoutes}</ThemedText>
            <ThemedText style={styles.statLabel}>Routes</ThemedText>
          </ThemedView>
          <ThemedView style={styles.statCard}>
            <ThemedText type="subtitle">{totalDistance.toFixed(1)} km</ThemedText>
            <ThemedText style={styles.statLabel}>Distance</ThemedText>
          </ThemedView>
        </ThemedView>

        {actionError ? <ThemedText style={styles.errorText}>{actionError}</ThemedText> : null}

        <Pressable
          style={[styles.signOutButton, (isSigningOut || isDeletingAccount) && styles.buttonDisabled]}
          onPress={handleSignOut}
          disabled={isSigningOut || isDeletingAccount}>
          <ThemedText type="defaultSemiBold">
            {isSigningOut ? 'Signing out...' : 'Sign out'}
          </ThemedText>
        </Pressable>
        <Pressable
          style={[styles.deleteAccountButton, (isDeletingAccount || isSigningOut) && styles.buttonDisabled]}
          onPress={handleDeleteAccount}
          disabled={isDeletingAccount || isSigningOut}>
          <ThemedText type="defaultSemiBold" style={styles.deleteAccountText}>
            {isDeletingAccount ? 'Deleting account...' : 'Delete Account & All Data'}
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
  statCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#8f8f8f66',
    padding: 14,
    alignItems: 'center',
    gap: 2,
  },
  statLabel: {
    opacity: 0.75,
    fontSize: 12,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  noticeText: {
    opacity: 0.75,
  },
  quickActions: {
    gap: 10,
  },
  quickActionButton: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#8f8f8f66',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 2,
  },
  quickActionHint: {
    opacity: 0.75,
    fontSize: 14,
    lineHeight: 18,
  },
  signOutButton: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#cc5555',
    paddingHorizontal: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  deleteAccountButton: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#cc5555',
    backgroundColor: '#fff1f0',
    paddingHorizontal: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  deleteAccountText: {
    color: '#b42318',
  },
  errorText: {
    color: '#d64545',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
