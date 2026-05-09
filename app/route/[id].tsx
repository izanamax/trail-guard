import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, Text, ScrollView, ActivityIndicator, TextInput, Pressable } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import MapView, { UrlTile, Polyline, Marker } from 'react-native-maps';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { getRouteById, updateRoute } from '@/storage/route-storage';
import { loadGearItems } from '@/storage/gear-storage';
import { supabase } from '@/lib/supabase';
import type { Route } from '@/types/route';
import type { GearItem } from '@/types/gear';
import { calculateRouteDistance, calculateElevationGain } from '@/utils/route-utils';

export default function RouteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [route, setRoute] = useState<Route | null>(null);
  const [gearItems, setGearItems] = useState<GearItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState('');
  const [offsets, setOffsets] = useState<{ [key: string]: number }>({});
  const mapRef = useRef<MapView>(null);
  const scrollRef = useRef<ScrollView>(null);

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

  const focusPoint = (wp: any) => {
    mapRef.current?.animateToRegion({
      latitude: wp.latitude,
      longitude: wp.longitude,
      latitudeDelta: 0.005,
      longitudeDelta: 0.005,
    }, 1000);
  };

  const scrollToPoint = (id: string) => {
    if (offsets[id] !== undefined) {
      scrollRef.current?.scrollTo({ y: offsets[id], animated: true });
    }
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
          <MapView 
            ref={mapRef}
            style={styles.map} 
            initialRegion={initialRegion}>
            <UrlTile
              urlTemplate="https://a.tile.opentopomap.org/{z}/{x}/{y}.png"
              maximumZ={17}
            />
            {route.waypoints.length > 1 && route.waypoints.map((wp, index) => {
              if (index === 0) return null;
              const prevWp = route.waypoints[index - 1];
              const gearColor = wp.gearId ? `#${Math.abs(wp.gearId.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a; }, 0)).toString(16).substring(0, 6)}` : '#cc5555';
              
              return (
                <Polyline 
                  key={`seg-${index}`}
                  coordinates={[prevWp, wp]} 
                  strokeColor={gearColor} 
                  strokeWidth={5} 
                />
              );
            })}
            {route.waypoints.length > 0 && route.waypoints.map((wp, index) => (
              <Marker 
                key={wp.id}
                coordinate={wp}
                onPress={() => scrollToPoint(wp.id)}
                pinColor={index === 0 ? 'green' : (index === route.waypoints.length - 1 ? 'blue' : 'red')}
              >
                <FontAwesome name="circle" size={10} color={wp.gearId ? '#cc5555' : '#666'} />
              </Marker>
            ))}
          </MapView>
        ) : (
          <View style={styles.center}>
            <ThemedText>No map data available</ThemedText>
          </View>
        )}
      </View>

      <ScrollView 
        ref={scrollRef}
        style={styles.detailsContainer}
        showsVerticalScrollIndicator={false}
      >
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
              <FontAwesome name="pencil" size={18} color="#cc5555" />
            </Pressable>
          </View>
        )}
        <ThemedText style={styles.subtitle}>
          Date: {new Date(route.createdAt).toLocaleDateString()}
        </ThemedText>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <ThemedText style={styles.statValue}>{calculateRouteDistance(route.waypoints).toFixed(2)} km</ThemedText>
            <ThemedText style={styles.statLabel}>Distance</ThemedText>
          </View>
          <View style={styles.statBox}>
            <ThemedText style={styles.statValue}>{calculateElevationGain(route.waypoints).toFixed(0)} m</ThemedText>
            <ThemedText style={styles.statLabel}>Elev Gain</ThemedText>
          </View>
          <View style={styles.statBox}>
            <ThemedText style={styles.statValue}>{route.waypoints.length}</ThemedText>
            <ThemedText style={styles.statLabel}>Points</ThemedText>
          </View>
        </View>

        <ThemedText type="subtitle" style={styles.sectionTitle}>Waypoints & Gear</ThemedText>
        {route.waypoints.map((wp, index) => (
          <Pressable 
            key={wp.id} 
            style={styles.pointCard}
            onPress={() => focusPoint(wp)}
            onLayout={(e) => {
              const { y } = e.nativeEvent.layout;
              setOffsets(prev => ({ ...prev, [wp.id]: y }));
            }}
          >
            <View style={styles.pointHeader}>
              <ThemedText style={styles.pointTitle}>Point {index + 1}</ThemedText>
              <ThemedText style={styles.pointElev}>Elev: {wp.elevation ? `${wp.elevation}m` : 'N/A'}</ThemedText>
            </View>
            <View style={styles.gearRow}>
              <View style={[styles.gearColorBar, { backgroundColor: wp.gearId ? `#${Math.abs(wp.gearId.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a; }, 0)).toString(16).substring(0, 6)}` : '#cc5555' }]} />
              <ThemedText style={styles.pointGear}>Active Gear: {getGearName(wp.gearId)}</ThemedText>
            </View>
            <ThemedText style={styles.pointCoords}>
              {wp.latitude.toFixed(5)}, {wp.longitude.toFixed(5)}
            </ThemedText>
          </Pressable>
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
    marginLeft: 8,
    padding: 4,
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
    color: '#ffffff',
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
    marginTop: 10,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#eee',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#cc5555',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
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
    color: '#333',
    fontWeight: '500',
  },
  gearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  gearColorBar: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  pointCoords: {
    fontSize: 12,
    color: '#999',
  },
});
