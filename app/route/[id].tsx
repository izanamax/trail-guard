import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import MapView, { UrlTile, Polyline, Marker } from 'react-native-maps';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { getRouteById } from '@/storage/route-storage';
import { loadGearItems } from '@/storage/gear-storage';
import { supabase } from '@/lib/supabase';
import type { Route } from '@/types/route';
import type { GearItem } from '@/types/gear';

export default function RouteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [route, setRoute] = useState<Route | null>(null);
  const [gearItems, setGearItems] = useState<GearItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDetails() {
      const { data } = await supabase.auth.getUser();
      const routeData = await getRouteById(id as string, data.user?.id);
      const items = await loadGearItems(data.user?.id);
      
      setRoute(routeData || null);
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
        <ThemedText type="title" style={styles.title}>{route.name}</ThemedText>
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
    marginBottom: 4,
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
