import { Image } from 'expo-image';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { supabase } from '@/lib/supabase';
import {
  addGearItem,
  findGearItemById,
  updateGearItem,
} from '@/storage/gear-storage';
import { GEAR_CATEGORIES, GEAR_CATEGORY_LABELS, type GearCategory, type GearItem } from '@/types/gear';

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
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ id?: string }>();
  const editingId = typeof params.id === 'string' ? params.id : '';
  const isEditMode = editingId.length > 0;

  const [name, setName] = useState('');
  const [category, setCategory] = useState<GearCategory | ''>('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [manufactureDate, setManufactureDate] = useState('');
  const [photoUri, setPhotoUri] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingGear, setIsLoadingGear] = useState(isEditMode);
  const [existingItem, setExistingItem] = useState<GearItem | null>(null);

  useEffect(() => {
    navigation.setOptions({
      title: isEditMode ? 'Edit Gear' : 'Add Gear',
    });
  }, [isEditMode, navigation]);

  useEffect(() => {
    if (!isEditMode) {
      setIsLoadingGear(false);
      setExistingItem(null);
      return;
    }

    let isMounted = true;

    const loadEditableItem = async () => {
      setError('');
      setIsLoadingGear(true);

      try {
        const { data } = await supabase.auth.getUser();
        const gear = await findGearItemById(editingId, data.user?.id);

        if (!gear) {
          if (!isMounted) return;
          setError('Gear item not found.');
          setExistingItem(null);
          setName('');
          setCategory('');
          setPurchaseDate('');
          setManufactureDate('');
          setPhotoUri('');
          return;
        }

        if (!isMounted) return;

        setExistingItem(gear);
        setName(gear.name);
        setCategory(gear.category);
        setPurchaseDate(gear.purchaseDate);
        setManufactureDate(gear.manufactureDate);
        setPhotoUri(gear.photoUri ?? '');
      } catch {
        if (!isMounted) return;
        setError('Failed to load gear item.');
      } finally {
        if (isMounted) {
          setIsLoadingGear(false);
        }
      }
    };

    void loadEditableItem();

    return () => {
      isMounted = false;
    };
  }, [editingId, isEditMode]);

  const validate = () => {
    if (isEditMode && !existingItem) return 'Unable to edit this gear item.';
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

  const pickFromGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Media library permission is required to select an image.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.7,
    });

    if (result.canceled) return;

    const selected = result.assets[0]?.uri;
    if (selected) setPhotoUri(selected);
  };

  const pickFromFiles = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'image/*',
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (result.canceled) return;

    const selected = result.assets[0]?.uri;
    if (selected) setPhotoUri(selected);
  };

  const pickFromCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setError('Camera permission is required to take a photo.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.7,
    });

    if (result.canceled) return;

    const selected = result.assets[0]?.uri;
    if (selected) setPhotoUri(selected);
  };

  const handlePhotoMenu = () => {
    setError('');

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Photo Library', 'Take Photo', 'Choose File', 'Cancel'],
          cancelButtonIndex: 3,
        },
        (selectedIndex) => {
          if (selectedIndex === 0) {
            void pickFromGallery();
            return;
          }

          if (selectedIndex === 1) {
            void pickFromCamera();
            return;
          }

          if (selectedIndex === 2) {
            void pickFromFiles();
          }
        }
      );
      return;
    }

    Alert.alert('Choose photo source', 'Select where to pick the image from.', [
      {
        text: 'Photo Library',
        onPress: () => {
          void pickFromGallery();
        },
      },
      {
        text: 'Take Photo',
        onPress: () => {
          void pickFromCamera();
        },
      },
      {
        text: 'Choose File',
        onPress: () => {
          void pickFromFiles();
        },
      },
      {
        text: 'Cancel',
        style: 'cancel',
      },
    ]);
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
      const currentUserId = data.user?.id ?? existingItem?.userId;
      const nextManufactureDate = manufactureDate.trim();
      const commonPayload = {
        userId: currentUserId,
        name: name.trim(),
        category: category as GearCategory,
        purchaseDate,
        manufactureDate: nextManufactureDate,
        photoUri: photoUri || undefined,
      };

      if (isEditMode && existingItem) {
        const saved = await updateGearItem({
          ...existingItem,
          ...commonPayload,
        });

        if (!saved) {
          setError('Failed to update gear item.');
          return;
        }
      } else {
        await addGearItem({
          ...commonPayload,
          id: createGearId(),
          createdAt: new Date().toISOString(),
        });
      }

      router.back();
    } catch {
      setError(isEditMode ? 'Failed to update gear item.' : 'Failed to save gear item.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ThemedView style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.content}
          contentInsetAdjustmentBehavior="never"
          showsVerticalScrollIndicator={false}>
          {isLoadingGear ? (
            <ThemedView style={styles.loadingBlock}>
              <ActivityIndicator size="small" />
            </ThemedView>
          ) : null}

          <ThemedView style={styles.form}>
            <ThemedText type="defaultSemiBold">Name</ThemedText>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Enter gear name"
              placeholderTextColor="#9a9a9a"
              style={styles.input}
              editable={!isLoadingGear}
            />

            <ThemedText type="defaultSemiBold">Category</ThemedText>
            <ThemedView style={styles.categoryRow}>
              {GEAR_CATEGORIES.map((item) => (
                <Pressable
                  key={item}
                  onPress={() => setCategory(item)}
                  disabled={isLoadingGear}
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
              editable={!isLoadingGear}
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
              editable={!isLoadingGear}
            />

            <ThemedText type="defaultSemiBold">Gear Photo (optional)</ThemedText>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.photoPreview} contentFit="cover" />
            ) : (
              <ThemedView style={styles.photoPlaceholder}>
                <ThemedText>No photo selected.</ThemedText>
              </ThemedView>
            )}

            <ThemedView style={styles.photoActions}>
              <Pressable style={styles.photoButton} onPress={handlePhotoMenu} disabled={isLoadingGear}>
                <ThemedText type="defaultSemiBold">
                  {photoUri ? 'Change Photo' : 'Add Photo'}
                </ThemedText>
              </Pressable>
              {photoUri ? (
                <Pressable
                  style={styles.clearPhotoButton}
                  onPress={() => setPhotoUri('')}
                  disabled={isLoadingGear}>
                  <ThemedText type="defaultSemiBold" style={styles.clearPhotoText}>
                    Remove Photo
                  </ThemedText>
                </Pressable>
              ) : null}
            </ThemedView>

            {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}

            <Pressable
              onPress={handleSave}
              disabled={isSaving || isLoadingGear}
              style={[styles.saveButton, (isSaving || isLoadingGear) && styles.saveButtonDisabled]}>
              <ThemedText type="defaultSemiBold">
                {isSaving ? 'Saving...' : isEditMode ? 'Save Changes' : 'Save Gear'}
              </ThemedText>
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
  loadingBlock: {
    paddingVertical: 12,
    alignItems: 'center',
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
  photoActions: {
    gap: 8,
  },
  photoButton: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#8f8f8f66',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  clearPhotoButton: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#cc5555',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  clearPhotoText: {
    color: '#b42318',
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
