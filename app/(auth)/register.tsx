import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { supabase } from '@/lib/supabase';

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async () => {
    setError('');
    setMessage('');
    setIsLoading(true);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });

    if (signUpError) {
      setError(signUpError.message);
      setIsLoading(false);
      return;
    }

    if (!data.session) {
      setMessage('Account created. Check your email to confirm registration, then login.');
    }

    setIsLoading(false);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ThemedView style={styles.container}>
        <ThemedText type="title">Create account</ThemedText>
        <ThemedText style={styles.subtitle}>Register with email and password.</ThemedText>

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
            placeholder="Password (min 6)"
            placeholderTextColor="#9a9a9a"
            style={styles.input}
            value={password}
            onChangeText={setPassword}
          />
          {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}
          {message ? <ThemedText style={styles.messageText}>{message}</ThemedText> : null}
          <Pressable style={[styles.button, isLoading && styles.buttonDisabled]} onPress={handleRegister} disabled={isLoading}>
            <ThemedText type="defaultSemiBold">{isLoading ? 'Creating...' : 'Register'}</ThemedText>
          </Pressable>
        </ThemedView>

        <ThemedView style={styles.footer}>
          <ThemedText>Already have an account?</ThemedText>
          <Link href="/(auth)/login" asChild>
            <Pressable>
              <ThemedText type="link">Login</ThemedText>
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
  messageText: {
    color: '#0e7a3c',
  },
  footer: {
    marginTop: 8,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
});
