import { useFocusEffect } from '@react-navigation/native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { GEAR_CATEGORIES, GEAR_CATEGORY_LABELS, type GearItem, type GearStatus } from '@/types/gear';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { supabase } from '@/lib/supabase';
import { loadGearItems } from '@/storage/gear-storage';
import { calculateGearStatus } from '@/utils/gear-status';
import { formatDate } from '@/utils/route-utils';
import { useAccessibility } from '@/context/accessibility-context';

const lightPalette = {
  addButtonBg: '#ffffff',
  addButtonBorder: '#8f8f8f66',
  addButtonText: '#11181C',
  disclaimerText: '#7a271a',
  disclaimerBg: '#ffe2e0',
  disclaimerBorder: '#cc5555',
  errorText: '#d64545',
  searchBg: '#f2f4f7',
  searchBorder: '#e4e7ec',
  searchIcon: '#666666',
  searchText: '#11181C',
  searchPlaceholder: '#98a2b3',
  clearIcon: '#999999',
  emptyBg: '#ffffff',
  emptyBorder: '#8f8f8f66',
  cardBg: '#ffffff',
  cardBorder: '#8f8f8f66',
  cardPlaceholderBg: '#f8fafc',
  cardPlaceholderBorder: '#8f8f8f66',
  metaText: '#475467',
  categoryChipBg: '#f2f4f7',
  categoryChipBorder: '#e4e7ec',
  categoryChipText: '#475467',
  categoryChipActiveBg: '#cc5555',
  categoryChipActiveText: '#ffffff',
};

const darkPalette = {
  addButtonBg: '#23272b',
  addButtonBorder: '#4a5158',
  addButtonText: '#E8E8E8',
  disclaimerText: '#f0c4bf',
  disclaimerBg: '#3b2325',
  disclaimerBorder: '#8f4b4b',
  errorText: '#ef8f87',
  searchBg: '#2a2f34',
  searchBorder: '#3b4248',
  searchIcon: '#a9b0b6',
  searchText: '#E8E8E8',
  searchPlaceholder: '#8f979e',
  clearIcon: '#a9b0b6',
  emptyBg: '#23272b',
  emptyBorder: '#3b4248',
  cardBg: '#23272b',
  cardBorder: '#3b4248',
  cardPlaceholderBg: '#1f2327',
  cardPlaceholderBorder: '#3b4248',
  metaText: '#b0b6bb',
  categoryChipBg: '#2a2f34',
  categoryChipBorder: '#3b4248',
  categoryChipText: '#d3d8dc',
  categoryChipActiveBg: '#cc5555',
  categoryChipActiveText: '#E8E8E8',
};

type StatusColors = ReturnType<typeof useAccessibility>['colors'];

function getStatusStyle(status: GearStatus, colors: StatusColors) {
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

export default function GearListScreen() {
  const router = useRouter();
  const { colors } = useAccessibility();
  const colorScheme = useColorScheme();
  const palette = colorScheme === 'dark' ? darkPalette : lightPalette;
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
          <Pressable
            style={[
              styles.addButton,
              {
                backgroundColor: palette.addButtonBg,
                borderColor: palette.addButtonBorder,
              },
            ]}
            onPress={() => router.push('/add-gear')}>
            <ThemedText type="defaultSemiBold" style={{ color: palette.addButtonText }}>
              Add Gear
            </ThemedText>
          </Pressable>
        </ThemedView>

        <ThemedText
          style={[
            styles.disclaimer,
            {
              color: palette.disclaimerText,
              backgroundColor: palette.disclaimerBg,
              borderColor: palette.disclaimerBorder,
            },
          ]}>
          The calculated status is only a reminder. Always inspect gear manually and follow
          manufacturer instructions.
        </ThemedText>

        <View
          style={[
            styles.searchContainer,
            {
              backgroundColor: palette.searchBg,
              borderColor: palette.searchBorder,
            },
          ]}>
          <FontAwesome name="search" size={16} color={palette.searchIcon} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: palette.searchText }]}
            placeholder="Search gear..."
            placeholderTextColor={palette.searchPlaceholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery !== '' && (
            <Pressable onPress={() => setSearchQuery('')}>
              <FontAwesome name="times-circle" size={16} color={palette.clearIcon} />
            </Pressable>
          )}
        </View>

        <View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
            <Pressable
              style={[
                styles.categoryChip,
                {
                  backgroundColor: palette.categoryChipBg,
                  borderColor: palette.categoryChipBorder,
                },
                selectedCategory === null && {
                  backgroundColor: palette.categoryChipActiveBg,
                  borderColor: palette.categoryChipActiveBg,
                },
              ]}
              onPress={() => setSelectedCategory(null)}
            >
              <ThemedText
                style={[
                  styles.categoryText,
                  { color: palette.categoryChipText },
                  selectedCategory === null && {
                    color: palette.categoryChipActiveText,
                    fontWeight: '600',
                  },
                ]}>
                All
              </ThemedText>
            </Pressable>
            {GEAR_CATEGORIES.map((cat) => (
              <Pressable
                key={cat}
                style={[
                  styles.categoryChip,
                  {
                    backgroundColor: palette.categoryChipBg,
                    borderColor: palette.categoryChipBorder,
                  },
                  selectedCategory === cat && {
                    backgroundColor: palette.categoryChipActiveBg,
                    borderColor: palette.categoryChipActiveBg,
                  },
                ]}
                onPress={() => setSelectedCategory(cat)}
              >
                <ThemedText
                  style={[
                    styles.categoryText,
                    { color: palette.categoryChipText },
                    selectedCategory === cat && {
                      color: palette.categoryChipActiveText,
                      fontWeight: '600',
                    },
                  ]}>
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

        {error ? <ThemedText style={[styles.errorText, { color: palette.errorText }]}>{error}</ThemedText> : null}

        <ScrollView
          style={styles.list}
          contentContainerStyle={[styles.listContent, { paddingBottom: 80 }]}
          showsVerticalScrollIndicator={false}>
          {!isLoading && filteredItems.length === 0 ? (
            <ThemedView
              style={[
                styles.emptyState,
                {
                  backgroundColor: palette.emptyBg,
                  borderColor: palette.emptyBorder,
                },
              ]}>
              <ThemedText>
                {gearItems.length === 0 ? "No gear yet. Add your first item." : "No gear matches your search."}
              </ThemedText>
            </ThemedView>
          ) : null}

          {filteredItems.map((item) => {
            const result = calculateGearStatus(item);
            const statusStyle = getStatusStyle(result.status, colors);
            const daysRemaining = Math.max(0, result.daysRemaining);
            const isManuallyRetired = result.status === 'Manually Retired';

            return (
              <Pressable
                key={item.id}
                onPress={() => router.push({ pathname: '/gear/[id]', params: { id: item.id } })}
                style={({ pressed }) => [styles.gridItem, pressed && styles.cardPressed]}>
                <ThemedView
                  style={[
                    styles.card,
                    {
                      backgroundColor: palette.cardBg,
                      borderColor: palette.cardBorder,
                    },
                  ]}>
                  {item.photoUri ? (
                    <Image source={{ uri: item.photoUri }} style={styles.cardImage} contentFit="cover" />
                  ) : (
                    <ThemedView
                      style={[
                        styles.cardImagePlaceholder,
                        {
                          backgroundColor: palette.cardPlaceholderBg,
                          borderColor: palette.cardPlaceholderBorder,
                        },
                      ]}>
                      <ThemedText style={styles.cardImagePlaceholderText}>No photo</ThemedText>
                    </ThemedView>
                  )}
                  <ThemedText type="subtitle" numberOfLines={1}>
                    {item.name}
                  </ThemedText>
                  <ThemedText style={[styles.metaText, { color: palette.metaText }]} numberOfLines={1}>
                    {GEAR_CATEGORY_LABELS[item.category]}
                  </ThemedText>
                  {isManuallyRetired ? (
                    <ThemedText style={[styles.metaText, { color: palette.metaText }]}>
                      Retired manually{item.retiredAt ? ` on ${formatDate(item.retiredAt)}` : ''}
                    </ThemedText>
                  ) : (
                    <ThemedText style={[styles.metaText, { color: palette.metaText }]}>
                      Days left: {daysRemaining}
                    </ThemedText>
                  )}
                  <ThemedText style={[styles.statusBadge, statusStyle]}>
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
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    padding: 10,
  },
  loadingBlock: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  errorText: {
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
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
  },
  categoryScroll: {
    gap: 8,
    paddingRight: 16,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryText: {
    fontSize: 13,
  },
});
