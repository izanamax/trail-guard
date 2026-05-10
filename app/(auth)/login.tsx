import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  AuthMessage,
  AuthScreen,
  AuthSubmitButton,
  AuthTextField,
} from '@/components/auth/auth-ui';
import { supabase } from '@/lib/supabase';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (isLoading) return;

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
    <AuthScreen
      title="Welcome back"
      subtitle="Login to continue with Trail Guard."
      footerPrompt="Don't have an account?"
      footerLinkLabel="Create one"
      footerHref="/(auth)/register">
      <View style={styles.form}>
        <AuthTextField
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          keyboardType="email-address"
          placeholder="Email"
          textContentType="emailAddress"
          returnKeyType="next"
          value={email}
          onChangeText={setEmail}
        />
        <AuthTextField
          autoCapitalize="none"
          autoComplete="password"
          autoCorrect={false}
          secureTextEntry
          placeholder="Password"
          textContentType="password"
          returnKeyType="done"
          value={password}
          onChangeText={setPassword}
          onSubmitEditing={() => {
            void handleLogin();
          }}
        />
        {error ? <AuthMessage tone="error">{error}</AuthMessage> : null}
        <AuthSubmitButton
          label={isLoading ? 'Logging in...' : 'Login'}
          onPress={handleLogin}
          disabled={isLoading}
        />
      </View>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: 12,
  },
});
