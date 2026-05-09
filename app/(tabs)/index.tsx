import { useFocusEffect } from '@react-navigation/native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { GEAR_CATEGORIES } from '@/types/gear';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { supabase } from '@/lib/supabase';
import { loadGearItems } from '@/storage/gear-storage';
import type { GearItem, GearStatus } from '@/types/gear';
import { GEAR_CATEGORY_LABELS } from '@/types/gear';
import { calculateGearStatus } from '@/utils/gear-status';
import { formatDate } from '@/utils/route-utils';

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
    case 'Manually Retired':
      return styles.statusManuallyRetired;
    default:
      return styles.statusSafe;
  }
}

export default function GearListScreen() {
  const router = useRouter();
  const backgroundColor = useThemeColor({}, 'background');
  const hasLoadedOnceRef = useRef(false);
  const [gearItems, setGearItems] = useState<GearItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const loadItems = useCallback(async (showLoader: boolean) => {
    setError('');
    if (showLoader) {
      setIsLoading(true);
    }

    try {
      const { data } = await supabase.auth.getUser();
      const items = await loadGearItems(data.user?.id);
      setGearItems(items);
    } catch {
      setError('Failed to load gear items.');
    } finally {
      if (showLoader) {
        setIsLoading(false);
      }
      hasLoadedOnceRef.current = true;
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadItems(!hasLoadedOnceRef.current);
    }, [loadItems])
  );

  const filteredItems = gearItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor }]} edges={['top', 'bottom']}>
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

        <View style={styles.searchContainer}>
          <FontAwesome name="search" size={16} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search gear..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery !== '' && (
            <Pressable onPress={() => setSearchQuery('')}>
              <FontAwesome name="times-circle" size={16} color="#999" />
            </Pressable>
          )}
        </View>

        <View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
            <Pressable
              style={[styles.categoryChip, selectedCategory === null && styles.categoryChipActive]}
              onPress={() => setSelectedCategory(null)}
            >
              <ThemedText style={[styles.categoryText, selectedCategory === null && styles.categoryTextActive]}>All</ThemedText>
            </Pressable>
            {GEAR_CATEGORIES.map((cat) => (
              <Pressable
                key={cat}
                style={[styles.categoryChip, selectedCategory === cat && styles.categoryChipActive]}
                onPress={() => setSelectedCategory(cat)}
              >
                <ThemedText style={[styles.categoryText, selectedCategory === cat && styles.categoryTextActive]}>
                  {GEAR_CATEGORY_LABELS[cat]}
                </ThemedText>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {isLoading ? (
          <ThemedView style={styles.loadingBlock}>
            <ActivityIndicator size="small" />
          </ThemedView>
        ) : null}

        {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}

        <ScrollView
          style={styles.list}
          contentContainerStyle={[styles.listContent, { paddingBottom: 80 }]}
          showsVerticalScrollIndicator={false}>
          {!isLoading && filteredItems.length === 0 ? (
            <ThemedView style={styles.emptyState}>
              <ThemedText>
                {gearItems.length === 0 ? "No gear yet. Add your first item." : "No gear matches your search."}
              </ThemedText>
            </ThemedView>
          ) : null}

          {filteredItems.map((item) => {
            const result = calculateGearStatus(item);
            const daysRemaining = Math.max(0, result.daysRemaining);
            const isManuallyRetired = result.status === 'Manually Retired';

            return (
              <Pressable
                key={item.id}
                onPress={() => router.push({ pathname: '/gear/[id]', params: { id: item.id } })}
                style={({ pressed }) => [styles.gridItem, pressed && styles.cardPressed]}>
                <ThemedView style={styles.card}>
                  {item.photoUri ? (
                    <Image source={{ uri: item.photoUri }} style={styles.cardImage} contentFit="cover" />
                  ) : (
                    <ThemedView style={styles.cardImagePlaceholder}>
                      <ThemedText style={styles.cardImagePlaceholderText}>No photo</ThemedText>
                    </ThemedView>
                  )}
                  <ThemedText type="subtitle" numberOfLines={1}>
                    {item.name}
                  </ThemedText>
                  <ThemedText style={styles.metaText} numberOfLines={1}>
                    {GEAR_CATEGORY_LABELS[item.category]}
                  </ThemedText>
                  {isManuallyRetired ? (
                    <ThemedText style={styles.metaText}>
                      Retired manually{item.retiredAt ? ` on ${formatDate(item.retiredAt)}` : ''}
                      Retired manually{item.retiredAt ? ` on ${item.retiredAt.slice(0, 10)}` : ''}
                    </ThemedText>
                  ) : (
                    <ThemedText style={styles.metaText}>Days left: {daysRemaining}</ThemedText>
                  )}
                  <ThemedText style={[styles.statusBadge, getStatusStyle(result.status)]}>
                    {result.status}
                  </ThemedText>
                </ThemedView>
              </Pressable>
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
    color: '#7a271a',
    backgroundColor: '#ffe2e0',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#cc5555',
    borderRadius: 8,
    padding: 10,
  },
  loadingBlock: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  errorText: {
    color: '#d64545',
  },
  list: {
    flex: 1,
  },
  listContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    flexGrow: 1,
    paddingBottom: 24,
    gap: 12,
  },
  emptyState: {
    width: '100%',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#8f8f8f66',
    borderRadius: 12,
    padding: 14,
  },
  gridItem: {
    width: '48%',
  },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#8f8f8f66',
    borderRadius: 12,
    padding: 10,
    gap: 6,
  },
  cardPressed: {
    opacity: 0.75,
  },
  cardImage: {
    width: '100%',
    height: 96,
    borderRadius: 10,
  },
  cardImagePlaceholder: {
    width: '100%',
    height: 96,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#8f8f8f66',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardImagePlaceholderText: {
    opacity: 0.7,
    fontSize: 12,
  },
  metaText: {
    fontSize: 13,
    opacity: 0.85,
  },
  statusBadge: {
    marginTop: 2,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    overflow: 'hidden',
    fontWeight: '600',
    fontSize: 12,
    textAlign: 'center',
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
  statusManuallyRetired: {
    color: '#475467',
    backgroundColor: '#f2f4f7',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f2f4f7',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 14,
    color: '#000',
  },
  categoryScroll: {
    gap: 8,
    paddingRight: 16,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#f2f4f7',
    borderWidth: 1,
    borderColor: '#e4e7ec',
  },
  categoryChipActive: {
    backgroundColor: '#cc5555',
    borderColor: '#cc5555',
  },
  categoryText: {
    fontSize: 13,
    color: '#475467',
  },
  categoryTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
});
