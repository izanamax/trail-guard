import { useFocusEffect } from '@react-navigation/native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { supabase } from '@/lib/supabase';
import { deleteGearItem, findGearItemById } from '@/storage/gear-storage';
import { GEAR_CATEGORY_LABELS, type GearItem, type GearStatus } from '@/types/gear';
import { calculateGearStatus } from '@/utils/gear-status';

function getStatusStyle(status: GearStatus) {
  switch (status) {
    case 'Safe':
      return styles.statusSafe;
    case 'Warning':
      return styles.statusWarning;
    case 'Retire Soon':
      return styles.statusRetireSoon;
    case 'Expired':
      return styles.statusExpired;
    default:
      return styles.statusSafe;
  }
}

export default function GearDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const backgroundColor = useThemeColor({}, 'background');
  const gearId = useMemo(() => {
    if (Array.isArray(params.id)) return params.id[0] ?? '';
    return params.id ?? '';
  }, [params.id]);

  const [gearItem, setGearItem] = useState<GearItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');

  const loadGearItem = useCallback(async () => {
    if (!gearId) {
      setGearItem(null);
      setError('Gear item not found.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const { data } = await supabase.auth.getUser();
      const item = await findGearItemById(gearId, data.user?.id);

      if (!item) {
        setGearItem(null);
        setError('Gear item not found.');
        return;
      }

      setGearItem(item);
    } catch {
      setGearItem(null);
      setError('Failed to load gear item.');
    } finally {
      setIsLoading(false);
    }
  }, [gearId]);

  useFocusEffect(
    useCallback(() => {
      void loadGearItem();
    }, [loadGearItem])
  );

  const executeDelete = async () => {
    if (!gearItem || isDeleting) return;

    setIsDeleting(true);
    setError('');

    try {
      const { data } = await supabase.auth.getUser();
      const currentUserId = data.user?.id ?? gearItem.userId;
      const deleted = await deleteGearItem(gearItem.id, currentUserId);

      if (!deleted) {
        setError('Failed to delete gear item.');
        return;
      }

      router.back();
    } catch {
      setError('Failed to delete gear item.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDelete = () => {
    if (!gearItem || isDeleting) return;

    Alert.alert('Delete gear item', 'This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void executeDelete();
        },
      },
    ]);
  };

  const statusResult = gearItem ? calculateGearStatus(gearItem) : null;
  const daysRemaining = statusResult ? Math.max(0, statusResult.daysRemaining) : 0;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor }]} edges={['bottom']}>
      <ThemedView style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.content}
          contentInsetAdjustmentBehavior="never"
          showsVerticalScrollIndicator={false}>
          {isLoading ? (
            <ThemedView style={styles.loadingBlock}>
              <ActivityIndicator size="small" />
            </ThemedView>
          ) : null}

          {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}

          {!isLoading && !gearItem ? (
            <ThemedView style={styles.emptyState}>
              <ThemedText>This gear item is unavailable.</ThemedText>
              <Pressable style={styles.backButton} onPress={() => router.back()}>
                <ThemedText type="defaultSemiBold">Back to list</ThemedText>
              </Pressable>
            </ThemedView>
          ) : null}

          {!isLoading && gearItem && statusResult ? (
            <ThemedView style={styles.card}>
              {gearItem.photoUri ? (
                <Image source={{ uri: gearItem.photoUri }} style={styles.cardImage} contentFit="cover" />
              ) : null}

              <ThemedText type="subtitle">{gearItem.name}</ThemedText>
              <ThemedText>Category: {GEAR_CATEGORY_LABELS[gearItem.category]}</ThemedText>
              <ThemedText>Purchase Date: {gearItem.purchaseDate}</ThemedText>
              <ThemedText>
                Manufacture Date: {gearItem.manufactureDate || `${gearItem.purchaseDate} (from purchase)`}
              </ThemedText>
              <ThemedText>Lifespan Used: {statusResult.percentageUsed}%</ThemedText>
              <ThemedText>Days Remaining: {daysRemaining}</ThemedText>
              <ThemedText style={[styles.statusBadge, getStatusStyle(statusResult.status)]}>
                Status: {statusResult.status}
              </ThemedText>

              <ThemedView style={styles.actions}>
                <Pressable
                  style={styles.editButton}
                  disabled={isDeleting}
                  onPress={() => router.push({ pathname: '/add-gear', params: { id: gearItem.id } })}>
                  <ThemedText type="defaultSemiBold">Edit Gear</ThemedText>
                </Pressable>
                <Pressable
                  style={[styles.deleteButton, isDeleting && styles.buttonDisabled]}
                  disabled={isDeleting}
                  onPress={handleDelete}>
                  <ThemedText type="defaultSemiBold" style={styles.deleteButtonText}>
                    {isDeleting ? 'Deleting...' : 'Delete Gear'}
                  </ThemedText>
                </Pressable>
              </ThemedView>
            </ThemedView>
          ) : null}
        </ScrollView>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  content: {
    paddingTop: 8,
    paddingBottom: 24,
    gap: 12,
  },
  loadingBlock: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  errorText: {
    color: '#d64545',
  },
  emptyState: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#8f8f8f66',
    borderRadius: 12,
    padding: 14,
    gap: 12,
  },
  backButton: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#8f8f8f66',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#8f8f8f66',
    borderRadius: 12,
    padding: 14,
    gap: 4,
  },
  cardImage: {
    width: '100%',
    height: 180,
    borderRadius: 10,
    marginBottom: 8,
  },
  statusBadge: {
    marginTop: 8,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    overflow: 'hidden',
    fontWeight: '600',
  },
  statusSafe: {
    color: '#1c7c41',
    backgroundColor: '#e9f8ef',
  },
  statusWarning: {
    color: '#8a5a00',
    backgroundColor: '#fff4d9',
  },
  statusRetireSoon: {
    color: '#a15a00',
    backgroundColor: '#ffe9d4',
  },
  statusExpired: {
    color: '#b42318',
    backgroundColor: '#ffe2e0',
  },
  actions: {
    marginTop: 10,
    gap: 8,
  },
  editButton: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#8f8f8f66',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  deleteButton: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#cc5555',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#b42318',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
