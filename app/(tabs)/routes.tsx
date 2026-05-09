import React, { useState, useCallback } from 'react';
import { StyleSheet, FlatList, Pressable, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { TextInput } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { loadGearItems } from '@/storage/gear-storage';
import { GearItem } from '@/types/gear';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { loadRoutes, deleteRoute } from '@/storage/route-storage';
import type { Route } from '@/types/route';
import { supabase } from '@/lib/supabase';
import { formatDate } from '@/utils/route-utils';

export default function RoutesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ gearId?: string }>();
  
  const [routes, setRoutes] = useState<Route[]>([]);
  const [gearItems, setGearItems] = useState<GearItem[]>([]);
  const [userId, setUserId] = useState<string | undefined>();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGearId, setSelectedGearId] = useState<string | null>(params.gearId || null);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

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
        style={styles.card}
        onPress={() => router.push({ pathname: '/route/[id]', params: { id: item.id } })}
      >
        <View style={styles.cardHeader}>
          <ThemedText style={styles.title}>{item.name}</ThemedText>
          <ThemedText style={styles.date}>{date}</ThemedText>
        </View>
        <ThemedText style={styles.subtitle}>Points: {pointCount}</ThemedText>
        
        <Pressable style={styles.deleteButton} onPress={() => handleDelete(item.id)}>
          <ThemedText style={styles.deleteText}>Delete</ThemedText>
        </Pressable>
      </Pressable>
    );
  };

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.headerRow}>
        <ThemedText type="title">Your Routes</ThemedText>
        <Pressable 
          style={styles.sortButton} 
          onPress={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
        >
          <FontAwesome name={sortOrder === 'desc' ? "sort-amount-desc" : "sort-amount-asc"} size={16} color="#666" />
          <ThemedText style={styles.sortButtonText}>{sortOrder === 'desc' ? 'Newest' : 'Oldest'}</ThemedText>
        </Pressable>
      </View>
      
      <View style={styles.searchContainer}>
        <FontAwesome name="search" size={16} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search routes by name..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery !== '' && (
          <Pressable onPress={() => setSearchQuery('')}>
            <FontAwesome name="times-circle" size={16} color="#999" />
          </Pressable>
        )}
      </View>

      {selectedGearId && (
        <View style={styles.filterBar}>
          <ThemedText style={styles.filterText}>
            Filtering by: {gearItems.find(g => g.id === selectedGearId)?.name || 'Unknown Gear'}
          </ThemedText>
          <Pressable onPress={() => setSelectedGearId(null)} style={styles.clearFilter}>
            <ThemedText style={styles.clearFilterText}>Clear</ThemedText>
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
              <ThemedText style={styles.mapButtonText}>Go to Map</ThemedText>
            </Pressable>
          ) : (
            <Pressable style={styles.clearFilter} onPress={() => { setSearchQuery(''); setSelectedGearId(null); }}>
              <ThemedText style={styles.clearFilterText}>Clear all filters</ThemedText>
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
    alignSelf: 'flex-end',
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
});
