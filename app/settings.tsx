import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { deleteAccountAndAllData } from '@/lib/account-delete';
import { cacheProfileFromUser } from '@/lib/profile-cache';
import { supabase } from '@/lib/supabase';
import { useAccessibility } from '@/context/accessibility-context';

const lightPalette = {
  sectionBg: '#ffffff',
  sectionBorder: '#8f8f8f66',
  inputBg: '#ffffff',
  inputBorder: '#8f8f8f66',
  inputText: '#11181C',
  placeholder: '#9a9a9a',
  helperText: '#667085',
  errorText: '#d64545',
  successText: '#0e7a3c',
  dangerBg: '#fff8f7',
  dangerBorder: '#cc555566',
  destructiveBorder: '#cc5555',
  destructiveBg: '#fff1f0',
  destructiveText: '#b42318',
};

const darkPalette = {
  sectionBg: '#1c2124',
  sectionBorder: '#434a51',
  inputBg: '#23292d',
  inputBorder: '#4a535b',
  inputText: '#E8E8E8',
  placeholder: '#8e979d',
  helperText: '#98a0a6',
  errorText: '#eb938f',
  successText: '#76c897',
  dangerBg: '#2c1f20',
  dangerBorder: '#704646',
  destructiveBorder: '#996061',
  destructiveBg: '#402829',
  destructiveText: '#e6a9a2',
};

export default function SettingsScreen() {
  const { isColorblindMode, setColorblindMode } = useAccessibility();
  const colorScheme = useColorScheme();
  const backgroundColor = useThemeColor({}, 'background');
  const palette = colorScheme === 'dark' ? darkPalette : lightPalette;
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
  const [accountActionError, setAccountActionError] = useState('');
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

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

  const handleSignOut = async () => {
    if (isSigningOut || isDeletingAccount) return;

    setAccountActionError('');
    setIsSigningOut(true);

    try {
      await supabase.auth.signOut();
    } catch {
      setAccountActionError('Failed to sign out.');
    } finally {
      setIsSigningOut(false);
    }
  };

  const runDeleteAccountFlow = async () => {
    if (isDeletingAccount || isSigningOut) return;

    setAccountActionError('');
    setIsDeletingAccount(true);

    try {
      await deleteAccountAndAllData();
    } catch (deleteError) {
      const nextError =
        deleteError instanceof Error ? deleteError.message : 'Failed to delete account and data.';
      setAccountActionError(nextError);
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const handleDeleteAccount = () => {
    if (isDeletingAccount || isSigningOut) return;

    Alert.alert(
      'Delete account and all data?',
      'This removes your account, cloud records, and local gear data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Final confirmation',
              'Confirm permanent deletion of your account and all Trail Guard data.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete permanently',
                  style: 'destructive',
                  onPress: () => {
                    void runDeleteAccountFlow();
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor }]} edges={['bottom']}>
      <ThemedView style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.content}
          contentInsetAdjustmentBehavior="never"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <ThemedView
            style={[
              styles.form,
              {
                backgroundColor: palette.sectionBg,
                borderColor: palette.sectionBorder,
              },
            ]}>
            <ThemedText type="defaultSemiBold">Name</ThemedText>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Enter your name"
              placeholderTextColor={palette.placeholder}
              style={[
                styles.input,
                {
                  backgroundColor: palette.inputBg,
                  borderColor: palette.inputBorder,
                  color: palette.inputText,
                },
              ]}
              editable={!isSaving}
            />

            <ThemedText type="defaultSemiBold">Email</ThemedText>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={palette.placeholder}
              style={[
                styles.input,
                {
                  backgroundColor: palette.inputBg,
                  borderColor: palette.inputBorder,
                  color: palette.inputText,
                },
              ]}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              editable={!isSaving}
            />

            <ThemedView style={styles.divider} />

            <ThemedText type="defaultSemiBold">Accessibility</ThemedText>
            <ThemedView style={styles.settingRow}>
              <ThemedView style={styles.settingTextContainer}>
                <ThemedText>Colorblind Mode</ThemedText>
                <ThemedText style={styles.settingDescription}>
                  {isColorblindMode ? 'Status: ACTIVE (Purple Palette)' : 'Status: INACTIVE (Standard Palette)'}
                </ThemedText>
              </ThemedView>
              <Switch
                value={isColorblindMode}
                onValueChange={setColorblindMode}
                trackColor={{ false: '#767577', true: '#cc5555' }}
                thumbColor={isColorblindMode ? '#fff' : '#f4f3f4'}
              />
            </ThemedView>

            {error ? (
              <ThemedText style={[styles.errorText, { color: palette.errorText }]}>{error}</ThemedText>
            ) : null}
            {message ? (
              <ThemedText style={[styles.messageText, { color: palette.successText }]}>
                {message}
              </ThemedText>
            ) : null}

            <Pressable
              onPress={handleSave}
              disabled={isSaving || isLoading}
              style={[
                styles.saveButton,
                {
                  borderColor: palette.sectionBorder,
                  backgroundColor: palette.inputBg,
                },
                (isSaving || isLoading) && styles.saveButtonDisabled,
              ]}>
              <ThemedText type="defaultSemiBold">{isSaving ? 'Saving...' : 'Save Changes'}</ThemedText>
            </Pressable>
          </ThemedView>

          <ThemedView
            style={[
              styles.dangerSection,
              {
                backgroundColor: palette.dangerBg,
                borderColor: palette.dangerBorder,
              },
            ]}>
            <ThemedText type="defaultSemiBold">Account</ThemedText>
            <ThemedText style={[styles.helperText, { color: palette.helperText }]}>
              Manage session access or permanently remove your Trail Guard account and data.
            </ThemedText>

            {accountActionError ? (
              <ThemedText style={[styles.errorText, { color: palette.errorText }]}>
                {accountActionError}
              </ThemedText>
            ) : null}

            <Pressable
              onPress={handleSignOut}
              disabled={isSigningOut || isDeletingAccount}
              style={[
                styles.signOutButton,
                {
                  borderColor: palette.destructiveBorder,
                  backgroundColor: palette.sectionBg,
                },
                (isSigningOut || isDeletingAccount) && styles.saveButtonDisabled,
              ]}>
              <ThemedText type="defaultSemiBold">
                {isSigningOut ? 'Signing out...' : 'Sign out'}
              </ThemedText>
            </Pressable>

            <Pressable
              onPress={handleDeleteAccount}
              disabled={isDeletingAccount || isSigningOut}
              style={[
                styles.deleteAccountButton,
                {
                  borderColor: palette.destructiveBorder,
                  backgroundColor: palette.destructiveBg,
                },
                (isDeletingAccount || isSigningOut) && styles.saveButtonDisabled,
              ]}>
              <ThemedText
                type="defaultSemiBold"
                style={[styles.deleteAccountText, { color: palette.destructiveText }]}>
                {isDeletingAccount ? 'Deleting account...' : 'Delete Account & All Data'}
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
  form: {
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 14,
  },
  dangerSection: {
    gap: 10,
    marginTop: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 14,
  },
  helperText: {
    lineHeight: 20,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  errorText: {},
  messageText: {},
  saveButton: {
    marginTop: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  divider: {
    height: 1,
    backgroundColor: '#8f8f8f33',
    marginVertical: 12,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  settingTextContainer: {
    flex: 1,
    gap: 2,
  },
  settingDescription: {
    fontSize: 12,
    opacity: 0.6,
  },
  signOutButton: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  deleteAccountButton: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  deleteAccountText: {},
});
