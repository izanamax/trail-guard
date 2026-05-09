import FontAwesome from '@expo/vector-icons/FontAwesome';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Icon, Label, NativeTabs, VectorIcon } from 'expo-router/unstable-native-tabs';
import React from 'react';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <NativeTabs tintColor={Colors[colorScheme ?? 'light'].tint}>
      <NativeTabs.Trigger name="index">
        <Label>Gear</Label>
        <Icon src={<VectorIcon family={FontAwesome} name="gear" />} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="routes">
        <Label>Routes</Label>
        <Icon src={<VectorIcon family={FontAwesome} name="map-signs" />} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="map">
        <Label>Map</Label>
        <Icon src={<VectorIcon family={FontAwesome} name="map" />} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="profile">
        <Label>Profile</Label>
        <Icon src={<VectorIcon family={MaterialIcons} name="person" />} />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
