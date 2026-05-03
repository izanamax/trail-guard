import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { supabase } from '@/lib/supabase';
import { addGearItem } from '@/storage/gear-storage';
import { GEAR_CATEGORIES, GEAR_CATEGORY_LABELS, type GearCategory } from '@/types/gear';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function isValidDateInput(value: string): boolean {
  if (!DATE_REGEX.test(value)) return false;

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function isFutureDate(value: string): boolean {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return date.getTime() > today.getTime();
}

function createGearId() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export default function AddGearScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [category, setCategory] = useState<GearCategory | ''>('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [manufactureDate, setManufactureDate] = useState('');
  const [photoUri, setPhotoUri] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const validate = () => {
    if (!name.trim()) return 'Name is required.';
    if (!category) return 'Category is required.';
    if (!isValidDateInput(purchaseDate)) return 'Purchase date must be valid YYYY-MM-DD.';
    if (isFutureDate(purchaseDate)) return 'Purchase date cannot be in the future.';

    if (manufactureDate.trim()) {
      if (!isValidDateInput(manufactureDate)) {
        return 'Manufacture date must be valid YYYY-MM-DD.';
      }
      if (isFutureDate(manufactureDate)) {
        return 'Manufacture date cannot be in the future.';
      }
    }

    return '';
  };

  const handlePickPhoto = async () => {
    setError('');

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Photo permission is required to select gear image.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.7,
    });

    if (result.canceled) return;

    const selected = result.assets[0]?.uri;
    if (selected) {
      setPhotoUri(selected);
    }
  };

  const handleSave = async () => {
    setError('');

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSaving(true);

    try {
      const { data } = await supabase.auth.getUser();
      const userId = data.user?.id;

      await addGearItem({
        id: createGearId(),
        userId,
        name: name.trim(),
        category: category as GearCategory,
        purchaseDate,
        manufactureDate: manufactureDate.trim(),
        photoUri: photoUri || undefined,
        createdAt: new Date().toISOString(),
      });

      router.back();
    } catch {
      setError('Failed to save gear item.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ThemedView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <ThemedText type="title">Add Gear</ThemedText>

          <ThemedView style={styles.form}>
            <ThemedText type="defaultSemiBold">Name</ThemedText>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Enter gear name"
              placeholderTextColor="#9a9a9a"
              style={styles.input}
            />

            <ThemedText type="defaultSemiBold">Category</ThemedText>
            <ThemedView style={styles.categoryRow}>
              {GEAR_CATEGORIES.map((item) => (
                <Pressable
                  key={item}
                  onPress={() => setCategory(item)}
                  style={[styles.categoryButton, category === item && styles.categoryButtonActive]}>
                  <ThemedText style={category === item ? styles.categoryTextActive : undefined}>
                    {GEAR_CATEGORY_LABELS[item]}
                  </ThemedText>
                </Pressable>
              ))}
            </ThemedView>

            <ThemedText type="defaultSemiBold">Purchase Date (YYYY-MM-DD)</ThemedText>
            <TextInput
              value={purchaseDate}
              onChangeText={setPurchaseDate}
              placeholder="2024-01-15"
              placeholderTextColor="#9a9a9a"
              style={styles.input}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <ThemedText type="defaultSemiBold">Manufacture Date (optional, YYYY-MM-DD)</ThemedText>
            <TextInput
              value={manufactureDate}
              onChangeText={setManufactureDate}
              placeholder="2023-11-01"
              placeholderTextColor="#9a9a9a"
              style={styles.input}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <ThemedText type="defaultSemiBold">Gear Photo (optional)</ThemedText>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.photoPreview} contentFit="cover" />
            ) : (
              <ThemedView style={styles.photoPlaceholder}>
                <ThemedText>No photo selected.</ThemedText>
              </ThemedView>
            )}
            <Pressable style={styles.photoButton} onPress={handlePickPhoto}>
              <ThemedText type="defaultSemiBold">
                {photoUri ? 'Change Photo' : 'Add Photo'}
              </ThemedText>
            </Pressable>

            {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}

            <Pressable
              onPress={handleSave}
              disabled={isSaving}
              style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}>
              <ThemedText type="defaultSemiBold">{isSaving ? 'Saving...' : 'Save Gear'}</ThemedText>
            </Pressable>
          </ThemedView>
        </ScrollView>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  content: {
    paddingTop: 8,
    paddingBottom: 24,
    gap: 12,
  },
  form: {
    gap: 10,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#8f8f8f66',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111',
    backgroundColor: '#fff',
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryButton: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#8f8f8f66',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  categoryButtonActive: {
    borderColor: '#0a7ea4',
    backgroundColor: '#e7f6fb',
  },
  categoryTextActive: {
    color: '#0a7ea4',
    fontWeight: '600',
  },
  errorText: {
    color: '#d64545',
  },
  photoPreview: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#8f8f8f66',
  },
  photoPlaceholder: {
    width: '100%',
    height: 100,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#8f8f8f66',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoButton: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#8f8f8f66',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  saveButton: {
    marginTop: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#8f8f8f66',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
});
