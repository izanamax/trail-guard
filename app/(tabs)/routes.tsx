import React, { useState, useCallback } from 'react';
import { StyleSheet, FlatList, Pressable, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { loadRoutes, deleteRoute } from '@/storage/route-storage';
import type { Route } from '@/types/route';
import { supabase } from '@/lib/supabase';

export default function RoutesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [routes, setRoutes] = useState<Route[]>([]);
  const [userId, setUserId] = useState<string | undefined>();

  const fetchRoutes = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    setUserId(data.user?.id);
    const loadedRoutes = await loadRoutes(data.user?.id);
    // Sort by date descending
    loadedRoutes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setRoutes(loadedRoutes);
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchRoutes();
    }, [fetchRoutes])
  );

  const handleDelete = async (id: string) => {
    await deleteRoute(id, userId);
    fetchRoutes();
  };

  const renderItem = ({ item }: { item: Route }) => {
    const pointCount = item.waypoints.length;
    const date = new Date(item.createdAt).toLocaleDateString();

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
      <ThemedText type="title" style={styles.header}>Your Routes</ThemedText>
      
      {routes.length === 0 ? (
        <View style={styles.emptyState}>
          <ThemedText>No routes saved yet.</ThemedText>
          <Pressable style={styles.mapButton} onPress={() => router.navigate('/(tabs)/map')}>
            <ThemedText style={styles.mapButtonText}>Go to Map</ThemedText>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={routes}
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
});
