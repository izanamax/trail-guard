import { useFocusEffect } from '@react-navigation/native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { supabase } from '@/lib/supabase';
import { loadGearItems } from '@/storage/gear-storage';
import type { GearItem, GearStatus } from '@/types/gear';
import { GEAR_CATEGORY_LABELS } from '@/types/gear';
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

export default function GearListScreen() {
  const router = useRouter();
  const [gearItems, setGearItems] = useState<GearItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadItems = useCallback(async () => {
    setError('');
    setIsLoading(true);

    try {
      const { data } = await supabase.auth.getUser();
      const items = await loadGearItems(data.user?.id);
      setGearItems(items);
    } catch {
      setError('Failed to load gear items.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadItems();
    }, [loadItems])
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ThemedView style={styles.container}>
        <ThemedView style={styles.header}>
          <ThemedText type="title">Gear List</ThemedText>
          <Pressable style={styles.addButton} onPress={() => router.push('/add-gear')}>
            <ThemedText type="defaultSemiBold">Add Gear</ThemedText>
          </Pressable>
        </ThemedView>

        <ThemedText style={styles.disclaimer}>
          The calculated status is only a reminder. Always inspect gear manually and follow
          manufacturer instructions.
        </ThemedText>

        {isLoading ? (
          <ThemedView style={styles.loadingBlock}>
            <ActivityIndicator size="small" />
          </ThemedView>
        ) : null}

        {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}

        <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
          {!isLoading && gearItems.length === 0 ? (
            <ThemedView style={styles.emptyState}>
              <ThemedText>No gear yet. Add your first item.</ThemedText>
            </ThemedView>
          ) : null}

          {gearItems.map((item) => {
            const result = calculateGearStatus(item);
            const daysRemaining = Math.max(0, result.daysRemaining);

            return (
              <ThemedView key={item.id} style={styles.card}>
                {item.photoUri ? (
                  <Image source={{ uri: item.photoUri }} style={styles.cardImage} contentFit="cover" />
                ) : null}
                <ThemedText type="subtitle">{item.name}</ThemedText>
                <ThemedText>Category: {GEAR_CATEGORY_LABELS[item.category]}</ThemedText>
                <ThemedText>Purchase Date: {item.purchaseDate}</ThemedText>
                <ThemedText>
                  Manufacture Date: {item.manufactureDate || `${item.purchaseDate} (from purchase)`}
                </ThemedText>
                <ThemedText>Lifespan Used: {result.percentageUsed}%</ThemedText>
                <ThemedText>Days Remaining: {daysRemaining}</ThemedText>
                <ThemedText style={[styles.statusBadge, getStatusStyle(result.status)]}>
                  Status: {result.status}
                </ThemedText>
              </ThemedView>
            );
          })}
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
    paddingTop: 8,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addButton: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#8f8f8f66',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  disclaimer: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.8,
  },
  loadingBlock: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  errorText: {
    color: '#d64545',
  },
  listContent: {
    paddingBottom: 24,
    gap: 12,
  },
  emptyState: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#8f8f8f66',
    borderRadius: 12,
    padding: 14,
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
    height: 140,
    borderRadius: 10,
    marginBottom: 6,
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
});
