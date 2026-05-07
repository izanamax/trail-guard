import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { cacheProfileFromUser } from '@/lib/profile-cache';
import { supabase } from '@/lib/supabase';

export default function SettingsScreen() {
  const params = useLocalSearchParams<{ name?: string; email?: string }>();
  const prefilledName = typeof params.name === 'string' ? params.name : '';
  const prefilledEmail = typeof params.email === 'string' ? params.email : '';

  const [name, setName] = useState(prefilledName);
  const [email, setEmail] = useState(prefilledEmail);
  const [initialName, setInitialName] = useState(prefilledName);
  const [initialEmail, setInitialEmail] = useState(prefilledEmail);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadUser = async () => {
      setIsLoading(true);
      setError('');

      try {
        const { data, error: userError } = await supabase.auth.getUser();
        if (userError) {
          throw new Error(userError.message);
        }

        const user = data.user;
        const metadataName =
          typeof user?.user_metadata?.name === 'string'
            ? user.user_metadata.name.trim()
            : typeof user?.user_metadata?.full_name === 'string'
            ? user.user_metadata.full_name.trim()
            : '';

        const nextName = metadataName || user?.email?.split('@')[0]?.trim() || '';
        const nextEmail = user?.email?.trim() || '';

        if (!isMounted) return;

        setName((currentValue) => (currentValue.trim() ? currentValue : nextName));
        setInitialName(nextName);
        setEmail((currentValue) => (currentValue.trim() ? currentValue : nextEmail));
        setInitialEmail(nextEmail);
      } catch (loadError) {
        if (!isMounted) return;
        const nextError = loadError instanceof Error ? loadError.message : 'Failed to load profile data.';
        setError(nextError);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadUser();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSave = async () => {
    if (isSaving || isLoading) return;

    const nextName = name.trim();
    const nextEmail = email.trim().toLowerCase();
    const normalizedInitialEmail = initialEmail.trim().toLowerCase();

    setError('');
    setMessage('');

    if (!nextName) {
      setError('Name is required.');
      return;
    }

    if (!nextEmail) {
      setError('Email is required.');
      return;
    }

    const nameChanged = nextName !== initialName;
    const emailChanged = nextEmail !== normalizedInitialEmail;

    if (!nameChanged && !emailChanged) {
      setMessage('No changes to save.');
      return;
    }

    setIsSaving(true);

    try {
      if (nameChanged) {
        const { error: nameError } = await supabase.auth.updateUser({
          data: {
            name: nextName,
            full_name: nextName,
          },
        });
        if (nameError) {
          throw new Error(nameError.message);
        }
      }

      if (emailChanged) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: nextEmail,
        });
        if (emailError) {
          throw new Error(emailError.message);
        }
      }

      setInitialName(nextName);
      if (!emailChanged) {
        setInitialEmail(nextEmail);
      }

      const { data: refreshedData } = await supabase.auth.getUser();
      await cacheProfileFromUser(refreshedData.user ?? null);

      setMessage(
        emailChanged
          ? 'Profile updated. Check your inbox to confirm the new email address.'
          : 'Profile updated successfully.'
      );
    } catch (saveError) {
      const nextError = saveError instanceof Error ? saveError.message : 'Failed to update profile.';
      setError(nextError);
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
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <ThemedView style={styles.form}>
            <ThemedText type="defaultSemiBold">Name</ThemedText>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Enter your name"
              placeholderTextColor="#9a9a9a"
              style={styles.input}
              editable={!isSaving}
            />

            <ThemedText type="defaultSemiBold">Email</ThemedText>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor="#9a9a9a"
              style={styles.input}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              editable={!isSaving}
            />

            {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}
            {message ? <ThemedText style={styles.messageText}>{message}</ThemedText> : null}

            <Pressable
              onPress={handleSave}
              disabled={isSaving || isLoading}
              style={[styles.saveButton, (isSaving || isLoading) && styles.saveButtonDisabled]}>
              <ThemedText type="defaultSemiBold">{isSaving ? 'Saving...' : 'Save Changes'}</ThemedText>
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
  errorText: {
    color: '#d64545',
  },
  messageText: {
    color: '#0e7a3c',
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
