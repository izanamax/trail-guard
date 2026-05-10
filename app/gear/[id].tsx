import { useFocusEffect } from '@react-navigation/native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { supabase } from '@/lib/supabase';
import { deleteGearItem, findGearItemById, updateGearItem } from '@/storage/gear-storage';
import { GEAR_CATEGORY_LABELS, type GearItem, type GearStatus } from '@/types/gear';
import { calculateGearStatus } from '@/utils/gear-status';
import { loadRoutes } from '@/storage/route-storage';
import { calculateRouteDistance, formatDate } from '@/utils/route-utils';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useAccessibility } from '@/context/accessibility-context';

function getStatusStyle(status: GearStatus, colors: any) {
  switch (status) {
    case 'Safe':
      return { color: colors.safe, backgroundColor: colors.safeBg };
    case 'Warning':
      return { color: colors.warning, backgroundColor: colors.warningBg };
    case 'Retire Soon':
      return { color: colors.retireSoon, backgroundColor: colors.retireSoonBg };
    case 'Expired':
      return { color: colors.expired, backgroundColor: colors.expiredBg };
    case 'Manually Retired':
      return { color: colors.manuallyRetired, backgroundColor: colors.manuallyRetiredBg };
    default:
      return { color: colors.safe, backgroundColor: colors.safeBg };
  }
}

export default function GearDetailsScreen() {
  const router = useRouter();
  const { colors } = useAccessibility();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const backgroundColor = useThemeColor({}, 'background');
  const gearId = useMemo(() => {
    if (Array.isArray(params.id)) return params.id[0] ?? '';
    return params.id ?? '';
  }, [params.id]);

  const [gearItem, setGearItem] = useState<GearItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdatingRetirement, setIsUpdatingRetirement] = useState(false);
  const [error, setError] = useState('');
  const [usageStats, setUsageStats] = useState({ distance: 0, count: 0, elevationGain: 0 });

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

      // Load usage stats
      const routes = await loadRoutes(data.user?.id);
      const gearRoutes = routes.filter(r => r.waypoints.some(wp => wp.gearId === gearId));
      let totalDist = 0;
      let totalGain = 0;
      gearRoutes.forEach(route => {
        for (let i = 0; i < route.waypoints.length - 1; i++) {
          const wp1 = route.waypoints[i];
          const wp2 = route.waypoints[i+1];
          // Add distance/gain if the segment is tagged with this gear
          if (wp2.gearId === gearId) {
            totalDist += calculateRouteDistance([wp1, wp2]);
            if (wp1.elevation !== undefined && wp2.elevation !== undefined) {
              const diff = wp2.elevation - wp1.elevation;
              if (diff > 0) totalGain += diff;
            }
          }
        }
      });
      setUsageStats({ distance: totalDist, count: gearRoutes.length, elevationGain: totalGain });
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
    if (!gearItem || isDeleting || isUpdatingRetirement) return;

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
    if (!gearItem || isDeleting || isUpdatingRetirement) return;

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

  const setRetirementState = async (retire: boolean) => {
    if (!gearItem || isDeleting || isUpdatingRetirement) return;

    setIsUpdatingRetirement(true);
    setError('');

    try {
      const nextItem: GearItem = retire
        ? {
            ...gearItem,
            retiredAt: new Date().toISOString(),
            retirementNote: 'Manually retired by user.',
          }
        : {
            ...gearItem,
            retiredAt: undefined,
            retirementNote: undefined,
          };

      const updated = await updateGearItem(nextItem);
      if (!updated) {
        setError('Failed to update retirement status.');
        return;
      }

      setGearItem(nextItem);
    } catch {
      setError('Failed to update retirement status.');
    } finally {
      setIsUpdatingRetirement(false);
    }
  };

  const handleRetireNow = () => {
    if (!gearItem || isDeleting || isUpdatingRetirement) return;

    Alert.alert(
      'Retire this gear now?',
      'Use this if the item is damaged or should no longer be used, even before the calculated date.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Retire now',
          style: 'destructive',
          onPress: () => {
            void setRetirementState(true);
          },
        },
      ]
    );
  };

  const handleUndoRetirement = () => {
    if (!gearItem || isDeleting || isUpdatingRetirement) return;

    Alert.alert('Undo manual retirement?', 'The item will return to calculated lifecycle status.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Undo',
        onPress: () => {
          void setRetirementState(false);
        },
      },
    ]);
  };

  const statusResult = gearItem ? calculateGearStatus(gearItem) : null;
  const statusStyle = statusResult ? getStatusStyle(statusResult.status, colors) : null;
  const daysRemaining = statusResult ? Math.max(0, statusResult.daysRemaining) : 0;
  const isManuallyRetired = statusResult?.status === 'Manually Retired';

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
              <ThemedText style={styles.metaText}>
                Purchased: {formatDate(gearItem.purchaseDate)}
              </ThemedText>
              {gearItem.retiredAt && (
                <ThemedText style={styles.metaText}>
                  Retired: {formatDate(gearItem.retiredAt)}
                </ThemedText>
              )}
              <ThemedText>
                Manufacture Date: {gearItem.manufactureDate ? formatDate(gearItem.manufactureDate) : `${formatDate(gearItem.purchaseDate)} (from purchase)`}
              </ThemedText>
              {isManuallyRetired ? (
                <ThemedText>Manual Retirement Date: {gearItem.retiredAt?.slice(0, 10) || 'Unknown'}</ThemedText>
              ) : null}
              {gearItem.retirementNote ? <ThemedText>Retirement Note: {gearItem.retirementNote}</ThemedText> : null}
              <ThemedText>Lifespan Used: {statusResult.percentageUsed}%</ThemedText>
              <ThemedText>Days Remaining: {daysRemaining}</ThemedText>
              {statusStyle && (
                <View style={[styles.statusBadge, { backgroundColor: statusStyle.backgroundColor }]}>
                  <Text style={{ color: statusStyle.color, fontWeight: '600' }}>
                    Status: {statusResult?.status}
                  </Text>
                </View>
              )}
              <ThemedText style={styles.safetyNote}>
                Inspect before every use. Follow manufacturer instructions.
              </ThemedText>

              <Pressable 
                style={styles.usageCard}
                onPress={() => router.push({ pathname: '/(tabs)/routes', params: { gearId: gearItem.id } })}
              >
                <View style={styles.usageHeader}>
                  <ThemedText type="defaultSemiBold" style={styles.usageTitle}>Usage Statistics</ThemedText>
                  <ThemedText style={styles.usageHint}>Tap to see routes <FontAwesome name="chevron-right" size={10} /></ThemedText>
                </View>
                <View style={styles.usageRow}>
                  <View style={styles.usageStat}>
                    <ThemedText style={styles.usageValue}>{usageStats.distance.toFixed(1)} km</ThemedText>
                    <ThemedText style={styles.usageLabel}>Distance</ThemedText>
                  </View>
                  <View style={styles.usageStat}>
                    <ThemedText style={styles.usageValue}>{usageStats.elevationGain.toFixed(0)} m</ThemedText>
                    <ThemedText style={styles.usageLabel}>Gain</ThemedText>
                  </View>
                  <View style={styles.usageStat}>
                    <ThemedText style={styles.usageValue}>{usageStats.count}</ThemedText>
                    <ThemedText style={styles.usageLabel}>Routes</ThemedText>
                  </View>
                </View>
              </Pressable>

              <ThemedView style={styles.actions}>
                <Pressable
                  style={styles.editButton}
                  disabled={isDeleting || isUpdatingRetirement}
                  onPress={() => router.push({ pathname: '/add-gear', params: { id: gearItem.id } })}>
                  <ThemedText type="defaultSemiBold">Edit Gear</ThemedText>
                </Pressable>
                {isManuallyRetired ? (
                  <Pressable
                    style={[styles.undoRetireButton, isUpdatingRetirement && styles.buttonDisabled]}
                    disabled={isDeleting || isUpdatingRetirement}
                    onPress={handleUndoRetirement}>
                    <ThemedText type="defaultSemiBold">
                      {isUpdatingRetirement ? 'Updating...' : 'Undo Retirement'}
                    </ThemedText>
                  </Pressable>
                ) : (
                  <Pressable
                    style={[styles.retireButton, isUpdatingRetirement && styles.buttonDisabled]}
                    disabled={isDeleting || isUpdatingRetirement}
                    onPress={handleRetireNow}>
                    <ThemedText type="defaultSemiBold" style={styles.retireButtonText}>
                      {isUpdatingRetirement ? 'Updating...' : 'Retire Now'}
                    </ThemedText>
                  </Pressable>
                )}
                <Pressable
                  style={[styles.deleteButton, isDeleting && styles.buttonDisabled]}
                  disabled={isDeleting || isUpdatingRetirement}
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
  safetyNote: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    opacity: 0.82,
  },
  statusManuallyRetired: {
    color: '#475467',
    backgroundColor: '#f2f4f7',
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
  retireButton: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#c67800',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#fff4d9',
  },
  retireButtonText: {
    color: '#8a5a00',
  },
  undoRetireButton: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#8f8f8f66',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  usageCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
  },
  usageTitle: {
    fontSize: 14,
    color: '#333',
  },
  usageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  usageHint: {
    fontSize: 11,
    color: '#cc5555',
    fontWeight: '500',
  },
  usageRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  usageStat: {
    alignItems: 'center',
  },
  usageValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#cc5555',
  },
  usageLabel: {
    fontSize: 12,
    color: '#666',
  },
});
