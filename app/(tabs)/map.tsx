import React, { useState, useCallback, useEffect, useRef } from 'react';
import { StyleSheet, Alert, Pressable, View, Text, ScrollView, ActivityIndicator, TextInput, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import MapView, { UrlTile, Polyline, Marker, MapPressEvent } from 'react-native-maps';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { loadGearItems } from '@/storage/gear-storage';
import { addRoute } from '@/storage/route-storage';
import type { GearItem } from '@/types/gear';
import type { Waypoint, Route } from '@/types/route';
import { calculateRouteDistance, calculateElevationGain } from '@/utils/route-utils';
import { supabase } from '@/lib/supabase';

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const backgroundColor = useThemeColor({}, 'background');
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [gearItems, setGearItems] = useState<GearItem[]>([]);
  const [activeGearId, setActiveGearId] = useState<string | null>(null);
  const [routeName, setRouteName] = useState<string>('New Route');
  const [isSaving, setIsSaving] = useState(false);
  const [userId, setUserId] = useState<string | undefined>();
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    async function loadData() {
      const { data } = await supabase.auth.getUser();
      setUserId(data.user?.id);
      const items = await loadGearItems(data.user?.id);
      setGearItems(items);
    }
    loadData();
  }, []);

  const jumpToLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required.');
        return;
      }

      // Get last known position first for instant jump
      const lastKnown = await Location.getLastKnownPositionAsync({});
      if (lastKnown) {
        mapRef.current?.animateToRegion({
          latitude: lastKnown.coords.latitude,
          longitude: lastKnown.coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }, 500);
      }

      // Then get fresh position with balanced accuracy (faster than highest)
      let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      mapRef.current?.animateToRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 1000);
    } catch (e) {
      Alert.alert('Error', 'Could not get your location.');
    }
  };

  const handleMapPress = async (event: MapPressEvent) => {
    Keyboard.dismiss();
    const { coordinate } = event.nativeEvent;
    
    // Create optimistic waypoint
    const newWaypoint: Waypoint = {
      id: Date.now().toString() + Math.random().toString(36).substring(7),
      latitude: coordinate.latitude,
      longitude: coordinate.longitude,
      gearId: activeGearId,
    };

    setWaypoints((prev) => [...prev, newWaypoint]);

    try {
      const response = await fetch(`https://api.open-elevation.com/api/v1/lookup?locations=${coordinate.latitude},${coordinate.longitude}`);
      const data = await response.json();
      if (data && data.results && data.results.length > 0) {
        const elevation = data.results[0].elevation;
        setWaypoints((prev) => 
          prev.map((wp) => wp.id === newWaypoint.id ? { ...wp, elevation } : wp)
        );
      }
    } catch (e) {
      console.error('Failed to fetch elevation:', e);
    }
  };

  const saveCurrentRoute = async () => {
    if (waypoints.length === 0) {
      Alert.alert('Empty Route', 'Please add some waypoints before saving.');
      return;
    }
    setIsSaving(true);
    const newRoute: Route = {
      id: Date.now().toString() + Math.random().toString(36).substring(7),
      userId: userId,
      name: routeName,
      date: new Date().toISOString(),
      waypoints,
      createdAt: new Date().toISOString(),
    };

    try {
      await addRoute(newRoute);
      Alert.alert('Success', 'Route saved successfully!');
      setWaypoints([]);
    } catch (e) {
      Alert.alert('Error', 'Failed to save route.');
    } finally {
      setIsSaving(false);
    }
  };

  const removeLastWaypoint = () => {
    setWaypoints((prev) => prev.slice(0, -1));
  };

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: 43.2220, 
          longitude: 76.8512,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
        onPress={handleMapPress}
      >
        <UrlTile
          urlTemplate="https://a.tile.opentopomap.org/{z}/{x}/{y}.png"
          maximumZ={17}
        />
        {waypoints.length > 1 && waypoints.map((wp, index) => {
          if (index === 0) return null;
          const prevWp = waypoints[index - 1];
          // Simple hash-based color for gear or default red
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
        {waypoints.length > 0 && (
          <>
            <Marker 
              coordinate={waypoints[0]}
              title="Start"
              pinColor="green"
            />
            {waypoints.length > 1 && (
              <Marker 
                coordinate={waypoints[waypoints.length - 1]}
                title="End"
                pinColor="blue"
              />
            )}
          </>
        )}
      </MapView>

      <Pressable style={[styles.locationButton, { top: insets.top + 60 }]} onPress={jumpToLocation}>
        <FontAwesome name="location-arrow" size={20} color="#333" />
      </Pressable>

      <KeyboardAvoidingView 
        style={StyleSheet.absoluteFillObject}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        pointerEvents="box-none"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 80}
      >
        <View style={styles.controlsOverlay} pointerEvents="box-none">
          <View style={[styles.card, { marginBottom: 100 }]}>
          <View style={styles.nameInputContainer}>
            <TextInput
              style={styles.nameInput}
              value={routeName}
              onChangeText={setRouteName}
              placeholder="Route Name"
            />
            <FontAwesome name="pencil" size={16} color="#666" style={styles.penIcon} />
          </View>
          <ThemedText style={styles.cardTitle}>Active Gear (for next point)</ThemedText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.gearScroll}>
            <Pressable
              style={[styles.gearChip, activeGearId === null && styles.gearChipActive]}
              onPress={() => setActiveGearId(null)}
            >
              <Text style={[styles.gearText, activeGearId === null && styles.gearTextActive]}>None</Text>
            </Pressable>
            {gearItems.map((gear) => (
              <Pressable
                key={gear.id}
                style={[styles.gearChip, activeGearId === gear.id && styles.gearChipActive]}
                onPress={() => setActiveGearId(gear.id)}
              >
                <Text style={[styles.gearText, activeGearId === gear.id && styles.gearTextActive]}>
                  {gear.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <ThemedText style={styles.statsLabel}>Points</ThemedText>
              <ThemedText style={styles.statsValue}>{waypoints.length}</ThemedText>
            </View>
            <View style={styles.statItem}>
              <ThemedText style={styles.statsLabel}>Distance</ThemedText>
              <ThemedText style={styles.statsValue}>{calculateRouteDistance(waypoints).toFixed(2)} km</ThemedText>
            </View>
            <View style={styles.statItem}>
              <ThemedText style={styles.statsLabel}>Gain</ThemedText>
              <ThemedText style={styles.statsValue}>{calculateElevationGain(waypoints).toFixed(0)} m</ThemedText>
            </View>
          </View>

          <View style={styles.actionRow}>
            <Pressable style={styles.buttonSecondary} onPress={removeLastWaypoint}>
              <Text style={styles.buttonSecondaryText}>Undo</Text>
            </Pressable>
            <Pressable style={styles.buttonPrimary} onPress={saveCurrentRoute} disabled={isSaving}>
              {isSaving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.buttonPrimaryText}>Save Route</Text>
              )}
            </Pressable>
          </View>
        </View>
        </View>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  controlsOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  nameInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#ccc',
    paddingBottom: 4,
  },
  nameInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  penIcon: {
    marginLeft: 8,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  gearScroll: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  gearChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  gearChipActive: {
    backgroundColor: '#cc5555',
  },
  gearText: {
    fontSize: 14,
    color: '#555',
  },
  gearTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 10,
  },
  statItem: {
    alignItems: 'center',
  },
  statsLabel: {
    fontSize: 10,
    color: '#666',
    textTransform: 'uppercase',
  },
  statsValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#cc5555',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  locationButton: {
    position: 'absolute',
    right: 16,
    backgroundColor: '#fff',
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 10,
  },
  buttonPrimary: {
    flex: 2,
    backgroundColor: '#cc5555',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimaryText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  buttonSecondary: {
    flex: 1,
    backgroundColor: '#f2f4f7',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSecondaryText: {
    color: '#344054',
    fontWeight: '600',
    fontSize: 16,
  },
});
