import React, { useState, useCallback } from 'react';
import { Alert, StyleSheet, FlatList, Pressable, View, TextInput } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { loadGearItems } from '@/storage/gear-storage';
import { GearItem } from '@/types/gear';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { loadRoutes, deleteRoute } from '@/storage/route-storage';
import type { Route } from '@/types/route';
import { supabase } from '@/lib/supabase';
import { exportRouteAsGpx } from '@/utils/gpx';
import { formatDate } from '@/utils/route-utils';

const lightPalette = {
  cardBg: '#ffffff',
  cardBorder: '#8f8f8f66',
  cardTitle: '#000000',
  cardMeta: '#666666',
  cardBody: '#444444',
  controlBg: '#f2f4f7',
  controlText: '#666666',
  inputText: '#11181C',
  placeholder: '#667085',
  icon: '#666666',
  filterBg: '#fff4d9',
  filterBorder: '#ffecb3',
  filterText: '#8a5a00',
  linkText: '#cc5555',
  exportBg: '#ecfdf3',
  exportText: '#027a48',
  deleteBg: '#fee4e2',
  deleteText: '#d92d20',
  actionButtonText: '#ffffff',
};

const darkPalette = {
  cardBg: '#23272b',
  cardBorder: '#3b4248',
  cardTitle: '#E8E8E8',
  cardMeta: '#b0b6bb',
  cardBody: '#c0c5ca',
  controlBg: '#2a2f34',
  controlText: '#E8E8E8',
  inputText: '#E8E8E8',
  placeholder: '#8d949a',
  icon: '#c3c8cd',
  filterBg: '#3b301b',
  filterBorder: '#5a4931',
  filterText: '#f0d9a0',
  linkText: '#f0b1aa',
  exportBg: '#183528',
  exportText: '#9ad4b2',
  deleteBg: '#412324',
  deleteText: '#f0b1aa',
  actionButtonText: '#E8E8E8',
};

export default function RoutesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ gearId?: string }>();
  const colorScheme = useColorScheme();
  const palette = colorScheme === 'dark' ? darkPalette : lightPalette;
  
  const [routes, setRoutes] = useState<Route[]>([]);
  const [gearItems, setGearItems] = useState<GearItem[]>([]);
  const [userId, setUserId] = useState<string | undefined>();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGearId, setSelectedGearId] = useState<string | null>(params.gearId || null);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [exportingRouteId, setExportingRouteId] = useState<string | null>(null);

  // Sync param to state when it changes
  React.useEffect(() => {
    if (params.gearId) {
      setSelectedGearId(params.gearId);
    }
  }, [params.gearId]);

  const fetchRoutes = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    setUserId(data.user?.id);
    const loadedRoutes = await loadRoutes(data.user?.id);
    const loadedGear = await loadGearItems(data.user?.id);
    
    // Sort based on current order
    loadedRoutes.sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();
      return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
    });
    setRoutes(loadedRoutes);
    setGearItems(loadedGear);
  }, [sortOrder]);

  useFocusEffect(
    useCallback(() => {
      fetchRoutes();
    }, [fetchRoutes])
  );

  const handleDelete = async (id: string) => {
    await deleteRoute(id, userId);
    fetchRoutes();
  };

  const handleExport = async (route: Route) => {
    if (exportingRouteId) return;

    setExportingRouteId(route.id);

    try {
      await exportRouteAsGpx(route);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to export route as GPX.';
      Alert.alert('Export failed', message);
    } finally {
      setExportingRouteId(null);
    }
  };

  const filteredRoutes = routes.filter(route => {
    const matchesSearch = route.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGear = !selectedGearId || route.waypoints.some(wp => wp.gearId === selectedGearId);
    return matchesSearch && matchesGear;
  });

  const renderItem = ({ item }: { item: Route }) => {
    const pointCount = item.waypoints.length;
    const date = formatDate(item.createdAt);

    return (
      <Pressable 
        style={[
          styles.card,
          {
            backgroundColor: palette.cardBg,
            borderColor: palette.cardBorder,
          },
        ]}
        onPress={() => router.push({ pathname: '/route/[id]', params: { id: item.id } })}
      >
        <View style={styles.cardHeader}>
          <ThemedText style={[styles.title, { color: palette.cardTitle }]}>{item.name}</ThemedText>
          <ThemedText style={[styles.date, { color: palette.cardMeta }]}>{date}</ThemedText>
        </View>
        <ThemedText style={[styles.subtitle, { color: palette.cardBody }]}>
          Points: {pointCount}
        </ThemedText>

        <View style={styles.actionsRow}>
          <Pressable
            style={[
              styles.exportButton,
              { backgroundColor: palette.exportBg },
              (pointCount === 0 || exportingRouteId !== null) && styles.actionButtonDisabled,
            ]}
            onPress={(event) => {
              event.stopPropagation();
              void handleExport(item);
            }}
            disabled={pointCount === 0 || exportingRouteId !== null}>
            <ThemedText style={[styles.exportText, { color: palette.exportText }]}>
              {exportingRouteId === item.id ? 'Exporting...' : 'Export GPX'}
            </ThemedText>
          </Pressable>

          <Pressable
            style={[
              styles.deleteButton,
              { backgroundColor: palette.deleteBg },
              exportingRouteId === item.id && styles.actionButtonDisabled,
            ]}
            onPress={(event) => {
              event.stopPropagation();
              void handleDelete(item.id);
            }}
            disabled={exportingRouteId === item.id}>
            <ThemedText style={[styles.deleteText, { color: palette.deleteText }]}>
              Delete
            </ThemedText>
          </Pressable>
        </View>
      </Pressable>
    );
  };

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.headerRow}>
        <ThemedText type="title">Your Routes</ThemedText>
        <Pressable 
          style={[styles.sortButton, { backgroundColor: palette.controlBg }]} 
          onPress={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
        >
          <FontAwesome
            name={sortOrder === 'desc' ? "sort-amount-desc" : "sort-amount-asc"}
            size={16}
            color={palette.icon}
          />
          <ThemedText style={[styles.sortButtonText, { color: palette.controlText }]}>
            {sortOrder === 'desc' ? 'Newest' : 'Oldest'}
          </ThemedText>
        </Pressable>
      </View>
      
      <View style={[styles.searchContainer, { backgroundColor: palette.controlBg }]}>
        <FontAwesome name="search" size={16} color={palette.icon} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: palette.inputText }]}
          placeholder="Search routes by name..."
          placeholderTextColor={palette.placeholder}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery !== '' && (
          <Pressable onPress={() => setSearchQuery('')}>
            <FontAwesome name="times-circle" size={16} color={palette.icon} />
          </Pressable>
        )}
      </View>

      {selectedGearId && (
        <View
          style={[
            styles.filterBar,
            {
              backgroundColor: palette.filterBg,
              borderColor: palette.filterBorder,
            },
          ]}>
          <ThemedText style={[styles.filterText, { color: palette.filterText }]}>
            Filtering by: {gearItems.find(g => g.id === selectedGearId)?.name || 'Unknown Gear'}
          </ThemedText>
          <Pressable onPress={() => setSelectedGearId(null)} style={styles.clearFilter}>
            <ThemedText style={[styles.clearFilterText, { color: palette.linkText }]}>
              Clear
            </ThemedText>
          </Pressable>
        </View>
      )}

      {filteredRoutes.length === 0 ? (
        <View style={styles.emptyState}>
          <ThemedText>
            {routes.length === 0 ? "No routes saved yet." : "No routes match your search."}
          </ThemedText>
          {routes.length === 0 ? (
            <Pressable style={styles.mapButton} onPress={() => router.navigate('/(tabs)/map')}>
              <ThemedText style={[styles.mapButtonText, { color: palette.actionButtonText }]}>
                Go to Map
              </ThemedText>
            </Pressable>
          ) : (
            <Pressable style={styles.clearFilter} onPress={() => { setSearchQuery(''); setSelectedGearId(null); }}>
              <ThemedText style={[styles.clearFilterText, { color: palette.linkText }]}>
                Clear all filters
              </ThemedText>
            </Pressable>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredRoutes}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 80 }]}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  header: {
    marginVertical: 16,
  },
  listContent: {
    gap: 12,
  },
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#8f8f8f66',
    backgroundColor: '#fff',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  date: {
    fontSize: 14,
    color: '#666',
  },
  subtitle: {
    fontSize: 14,
    color: '#444',
    marginBottom: 12,
  },
  deleteButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#fee4e2',
  },
  deleteText: {
    color: '#d92d20',
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  mapButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#cc5555',
    borderRadius: 8,
  },
  mapButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f2f4f7',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
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
  filterBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff4d9',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ffecb3',
  },
  filterText: {
    fontSize: 13,
    color: '#8a5a00',
    fontWeight: '500',
  },
  clearFilter: {
    padding: 4,
  },
  clearFilterText: {
    fontSize: 13,
    color: '#cc5555',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 16,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f2f4f7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 6,
  },
  sortButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  exportButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#ecfdf3',
  },
  exportText: {
    color: '#027a48',
    fontWeight: '500',
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
});
