import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, ScrollView, ActivityIndicator, TextInput, Pressable } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import MapView, { Polyline, Marker } from 'react-native-maps';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useColorScheme } from '@/hooks/use-color-scheme';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { getRouteById, updateRoute } from '@/storage/route-storage';
import { loadGearItems } from '@/storage/gear-storage';
import { supabase } from '@/lib/supabase';
import type { Route } from '@/types/route';
import type { GearItem } from '@/types/gear';
import { calculateRouteDistance, calculateElevationGain, formatDate } from '@/utils/route-utils';

const lightPalette = {
  mapBorder: '#cccccc',
  inputBorder: '#cccccc',
  inputText: '#11181C',
  saveButtonText: '#ffffff',
  cancelBg: '#f2f4f7',
  cancelText: '#344054',
  metaText: '#666666',
  statsBg: '#ffffff',
  statsBorder: '#eeeeee',
  statLabel: '#666666',
  pointCardBg: '#f9f9f9',
  pointCardBorder: '#eeeeee',
  pointTitle: '#333333',
  pointMeta: '#666666',
  pointBody: '#333333',
  pointCoords: '#999999',
};

const darkPalette = {
  mapBorder: '#3b4248',
  inputBorder: '#565d63',
  inputText: '#E8E8E8',
  saveButtonText: '#E8E8E8',
  cancelBg: '#2a2f34',
  cancelText: '#E8E8E8',
  metaText: '#a9b0b6',
  statsBg: '#23272b',
  statsBorder: '#3b4248',
  statLabel: '#a9b0b6',
  pointCardBg: '#202428',
  pointCardBorder: '#373e44',
  pointTitle: '#E8E8E8',
  pointMeta: '#b0b6bb',
  pointBody: '#E8E8E8',
  pointCoords: '#90979d',
};

export default function RouteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  const palette = colorScheme === 'dark' ? darkPalette : lightPalette;
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
      <View style={[styles.mapContainer, { borderColor: palette.mapBorder }]}>
        {initialRegion ? (
          <MapView 
            ref={mapRef}
            style={styles.map} 
            initialRegion={initialRegion}
            mapType="terrain">
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
                title={`Point ${index + 1}`}
                description={getGearName(wp.gearId)}
              />
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
              style={[
                styles.editNameInput,
                {
                  borderColor: palette.inputBorder,
                  color: palette.inputText,
                },
              ]}
              value={editName}
              onChangeText={setEditName}
            />
            <Pressable style={styles.saveBtn} onPress={handleSaveName}>
              <ThemedText style={[styles.saveBtnText, { color: palette.saveButtonText }]}>
                Save
              </ThemedText>
            </Pressable>
            <Pressable
              style={[styles.cancelBtn, { backgroundColor: palette.cancelBg }]}
              onPress={() => setIsEditingName(false)}>
              <ThemedText style={[styles.cancelBtnText, { color: palette.cancelText }]}>
                Cancel
              </ThemedText>
            </Pressable>
          </View>
        ) : (
          <View style={styles.nameRow}>
            <ThemedText type="title" style={styles.title}>{route.name}</ThemedText>
            <ThemedText style={[styles.date, { color: palette.metaText }]}>
              {formatDate(route.createdAt)}
            </ThemedText>
            <Pressable style={styles.editBtn} onPress={() => setIsEditingName(true)}>
              <FontAwesome name="pencil" size={18} color="#cc5555" />
            </Pressable>
          </View>
        )}
        <ThemedText style={[styles.subtitle, { color: palette.metaText }]}>
          Date: {formatDate(route.createdAt)}
        </ThemedText>

        <View
          style={[
            styles.statsRow,
            {
              backgroundColor: palette.statsBg,
              borderColor: palette.statsBorder,
            },
          ]}>
          <View style={styles.statBox}>
            <ThemedText style={styles.statValue}>{calculateRouteDistance(route.waypoints).toFixed(2)} km</ThemedText>
            <ThemedText style={[styles.statLabel, { color: palette.statLabel }]}>
              Distance
            </ThemedText>
          </View>
          <View style={styles.statBox}>
            <ThemedText style={styles.statValue}>{calculateElevationGain(route.waypoints).toFixed(0)} m</ThemedText>
            <ThemedText style={[styles.statLabel, { color: palette.statLabel }]}>
              Elev Gain
            </ThemedText>
          </View>
          <View style={styles.statBox}>
            <ThemedText style={styles.statValue}>{route.waypoints.length}</ThemedText>
            <ThemedText style={[styles.statLabel, { color: palette.statLabel }]}>
              Points
            </ThemedText>
          </View>
        </View>

        <ThemedText type="subtitle" style={styles.sectionTitle}>Waypoints & Gear</ThemedText>
        {route.waypoints.map((wp, index) => (
          <Pressable 
            key={wp.id} 
            style={[
              styles.pointCard,
              {
                backgroundColor: palette.pointCardBg,
                borderColor: palette.pointCardBorder,
              },
            ]}
            onPress={() => focusPoint(wp)}
            onLayout={(e) => {
              const { y } = e.nativeEvent.layout;
              setOffsets(prev => ({ ...prev, [wp.id]: y }));
            }}
          >
            <View style={styles.pointHeader}>
              <ThemedText style={[styles.pointTitle, { color: palette.pointTitle }]}>
                Point {index + 1}
              </ThemedText>
              <ThemedText style={[styles.pointElev, { color: palette.pointMeta }]}>
                Elev: {wp.elevation ? `${wp.elevation}m` : 'N/A'}
              </ThemedText>
            </View>
            <View style={styles.gearRow}>
              <View style={[styles.gearColorBar, { backgroundColor: wp.gearId ? `#${Math.abs(wp.gearId.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a; }, 0)).toString(16).substring(0, 6)}` : '#cc5555' }]} />
              <ThemedText style={[styles.pointGear, { color: palette.pointBody }]}>
                Active Gear: {getGearName(wp.gearId)}
              </ThemedText>
            </View>
            <ThemedText style={[styles.pointCoords, { color: palette.pointCoords }]}>
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
    borderRadius: 6,
  },
  cancelBtnText: { fontSize: 14 },
  subtitle: {
    fontSize: 14,
    marginBottom: 20,
  },
  sectionTitle: {
    marginBottom: 12,
    marginTop: 10,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: StyleSheet.hairlineWidth,
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
    marginTop: 2,
  },
  pointCard: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  pointHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  pointTitle: { fontWeight: '600' },
  pointElev: {
    fontSize: 12,
  },
  pointGear: { fontWeight: '500' },
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
  pointCoords: { fontSize: 12 },
});
