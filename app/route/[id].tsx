import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, ActivityIndicator, TextInput, Pressable } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import MapView, { UrlTile, Polyline, Marker } from 'react-native-maps';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { getRouteById, updateRoute } from '@/storage/route-storage';
import { loadGearItems } from '@/storage/gear-storage';
import { supabase } from '@/lib/supabase';
import type { Route } from '@/types/route';
import type { GearItem } from '@/types/gear';

export default function RouteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [route, setRoute] = useState<Route | null>(null);
  const [gearItems, setGearItems] = useState<GearItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState('');

  useEffect(() => {
    async function fetchDetails() {
      const { data } = await supabase.auth.getUser();
      const routeData = await getRouteById(id as string, data.user?.id);
      const items = await loadGearItems(data.user?.id);
      
      setRoute(routeData || null);
      setEditName(routeData?.name || '');
      setGearItems(items);
      setLoading(false);
    }
    
    fetchDetails();
  }, [id]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!route) {
    return (
      <View style={styles.center}>
        <ThemedText>Route not found.</ThemedText>
      </View>
    );
  }

  const getGearName = (gearId?: string | null) => {
    if (!gearId) return 'None';
    return gearItems.find(g => g.id === gearId)?.name || 'Unknown Gear';
  };

  const handleSaveName = async () => {
    if (!route || !editName.trim()) return;
    const updatedRoute = { ...route, name: editName.trim() };
    await updateRoute(updatedRoute);
    setRoute(updatedRoute);
    setIsEditingName(false);
  };

  const initialRegion = route.waypoints.length > 0 
    ? {
        latitude: route.waypoints[0].latitude,
        longitude: route.waypoints[0].longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      } 
    : undefined;

  return (
    <ThemedView style={styles.container}>
      <View style={styles.mapContainer}>
        {initialRegion ? (
          <MapView style={styles.map} initialRegion={initialRegion}>
            <UrlTile
              urlTemplate="https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png"
              maximumZ={19}
            />
            <Polyline 
              coordinates={route.waypoints} 
              strokeColor="#cc5555" 
              strokeWidth={4} 
            />
            {route.waypoints.map((wp, index) => (
              <Marker 
                key={wp.id} 
                coordinate={{ latitude: wp.latitude, longitude: wp.longitude }}
                title={`Point ${index + 1}`}
                description={`Gear: ${getGearName(wp.gearId)}`}
              />
            ))}
          </MapView>
        ) : (
          <View style={styles.center}>
            <ThemedText>No map data available</ThemedText>
          </View>
        )}
      </View>

      <ScrollView style={styles.detailsContainer}>
        {isEditingName ? (
          <View style={styles.editNameRow}>
            <TextInput
              style={styles.editNameInput}
              value={editName}
              onChangeText={setEditName}
            />
            <Pressable style={styles.saveBtn} onPress={handleSaveName}>
              <ThemedText style={styles.saveBtnText}>Save</ThemedText>
            </Pressable>
            <Pressable style={styles.cancelBtn} onPress={() => setIsEditingName(false)}>
              <ThemedText style={styles.cancelBtnText}>Cancel</ThemedText>
            </Pressable>
          </View>
        ) : (
          <View style={styles.nameRow}>
            <ThemedText type="title" style={styles.title}>{route.name}</ThemedText>
            <Pressable style={styles.editBtn} onPress={() => setIsEditingName(true)}>
              <ThemedText style={styles.editBtnText}>Edit</ThemedText>
            </Pressable>
          </View>
        )}
        <ThemedText style={styles.subtitle}>
          Date: {new Date(route.createdAt).toLocaleDateString()}
        </ThemedText>

        <ThemedText type="subtitle" style={styles.sectionTitle}>Waypoints & Gear</ThemedText>
        {route.waypoints.map((wp, index) => (
          <View key={wp.id} style={styles.pointCard}>
            <View style={styles.pointHeader}>
              <ThemedText style={styles.pointTitle}>Point {index + 1}</ThemedText>
              <ThemedText style={styles.pointElev}>Elev: {wp.elevation ? `${wp.elevation}m` : 'N/A'}</ThemedText>
            </View>
            <ThemedText style={styles.pointGear}>Active Gear: {getGearName(wp.gearId)}</ThemedText>
            <ThemedText style={styles.pointCoords}>
              {wp.latitude.toFixed(5)}, {wp.longitude.toFixed(5)}
            </ThemedText>
          </View>
        ))}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapContainer: {
    height: '40%',
    width: '100%',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#ccc',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  detailsContainer: {
    flex: 1,
    padding: 16,
  },
  title: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    justifyContent: 'space-between',
  },
  editBtn: {
    padding: 6,
    backgroundColor: '#f2f4f7',
    borderRadius: 6,
    marginLeft: 10,
  },
  editBtnText: {
    fontSize: 14,
    color: '#344054',
  },
  editNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  editNameInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    borderBottomWidth: 1,
    borderColor: '#ccc',
    marginRight: 10,
    paddingVertical: 2,
  },
  saveBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#cc5555',
    borderRadius: 6,
    marginRight: 6,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  cancelBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#f2f4f7',
    borderRadius: 6,
  },
  cancelBtnText: {
    color: '#344054',
    fontSize: 14,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  pointCard: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#eee',
  },
  pointHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  pointTitle: {
    fontWeight: '600',
    color: '#333',
  },
  pointElev: {
    color: '#666',
    fontSize: 12,
  },
  pointGear: {
    color: '#cc5555',
    fontWeight: '500',
    marginBottom: 4,
  },
  pointCoords: {
    fontSize: 12,
    color: '#999',
  },
});
