import React, { useState, useCallback, useEffect } from 'react';
import { StyleSheet, Alert, Pressable, View, Text, ScrollView, ActivityIndicator, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import MapView, { UrlTile, Polyline, Marker, MapPressEvent } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { loadGearItems } from '@/storage/gear-storage';
import { addRoute } from '@/storage/route-storage';
import type { GearItem } from '@/types/gear';
import type { Waypoint, Route } from '@/types/route';
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

  useEffect(() => {
    async function loadData() {
      const { data } = await supabase.auth.getUser();
      setUserId(data.user?.id);
      const items = await loadGearItems(data.user?.id);
      setGearItems(items);
    }
    loadData();
  }, []);

  const handleMapPress = async (event: MapPressEvent) => {
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
        style={styles.map}
        initialRegion={{
          latitude: 43.2220, // Almaty approximate location
          longitude: 76.8512,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
        onPress={handleMapPress}
      >
        <UrlTile
          urlTemplate="https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png"
          maximumZ={19}

        />
        {waypoints.length > 0 && (
          <Polyline 
            coordinates={waypoints} 
            strokeColor="#cc5555" 
            strokeWidth={4} 
          />
        )}
        {waypoints.map((wp, index) => (
          <Marker 
            key={wp.id} 
            coordinate={{ latitude: wp.latitude, longitude: wp.longitude }}
            title={`Point ${index + 1}`}
            description={`Elev: ${wp.elevation ?? '...'}m | Gear: ${gearItems.find(g => g.id === wp.gearId)?.name ?? 'None'}`}
          />
        ))}
      </MapView>

      <KeyboardAvoidingView 
        style={[styles.controlsOverlay, { paddingBottom: 80 }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        pointerEvents="box-none"
      >
        <View style={styles.card}>
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
            <ThemedText style={styles.statsText}>Points: {waypoints.length}</ThemedText>
            {waypoints.length > 0 && waypoints[waypoints.length - 1].elevation !== undefined && (
              <ThemedText style={styles.statsText}>
                Last Elev: {waypoints[waypoints.length - 1].elevation}m
              </ThemedText>
            )}
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
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    justifyContent: 'flex-end',
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
    color: '#333',
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
  },
  statsText: {
    fontSize: 14,
    color: '#666',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
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
