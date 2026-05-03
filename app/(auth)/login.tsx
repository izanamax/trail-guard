import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { supabase } from '@/lib/supabase';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    setError('');
    setIsLoading(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        setError(signInError.message);
      }
    } catch {
      setError(
        'Network request failed. Check internet on device, Supabase URL, and restart Expo after .env changes.'
      );
    }

    setIsLoading(false);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ThemedView style={styles.container}>
        <ThemedText type="title">Welcome back</ThemedText>
        <ThemedText style={styles.subtitle}>Login to continue with Trail Guard.</ThemedText>

        <ThemedView style={styles.form}>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            placeholder="Email"
            placeholderTextColor="#9a9a9a"
            style={styles.input}
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            secureTextEntry
            placeholder="Password"
            placeholderTextColor="#9a9a9a"
            style={styles.input}
            value={password}
            onChangeText={setPassword}
          />
          {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}
          <Pressable style={[styles.button, isLoading && styles.buttonDisabled]} onPress={handleLogin} disabled={isLoading}>
            <ThemedText type="defaultSemiBold">{isLoading ? 'Logging in...' : 'Login'}</ThemedText>
          </Pressable>
        </ThemedView>

        <ThemedView style={styles.footer}>
          <ThemedText>Don&apos;t have an account?</ThemedText>
          <Link href="/(auth)/register" asChild>
            <Pressable>
              <ThemedText type="link">Create one</ThemedText>
            </Pressable>
          </Link>
        </ThemedView>
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
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 12,
  },
  subtitle: {
    opacity: 0.7,
  },
  form: {
    marginTop: 16,
    gap: 12,
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
  button: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#8f8f8f66',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 6,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  errorText: {
    color: '#d64545',
  },
  footer: {
    marginTop: 8,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
});
