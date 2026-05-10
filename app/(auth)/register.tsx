import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  AuthMessage,
  AuthScreen,
  AuthSubmitButton,
  AuthTextField,
} from '@/components/auth/auth-ui';
import { supabase } from '@/lib/supabase';

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async () => {
    if (isLoading) return;

    setError('');
    setMessage('');
    setIsLoading(true);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            name: name.trim(),
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        setIsLoading(false);
        return;
      }

      if (!data.session) {
        setMessage('Account created. Check your email to confirm registration, then login.');
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
      title="Create account"
      subtitle="Register with email and password."
      footerPrompt="Already have an account?"
      footerLinkLabel="Login"
      footerHref="/(auth)/login">
      <View style={styles.form}>
        <AuthTextField
          autoCapitalize="words"
          autoComplete="name"
          autoCorrect={false}
          placeholder="Name"
          textContentType="name"
          returnKeyType="next"
          value={name}
          onChangeText={setName}
        />
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
          autoComplete="new-password"
          autoCorrect={false}
          secureTextEntry
          placeholder="Password (min 6)"
          textContentType="newPassword"
          returnKeyType="done"
          value={password}
          onChangeText={setPassword}
          onSubmitEditing={() => {
            void handleRegister();
          }}
        />
        {error ? <AuthMessage tone="error">{error}</AuthMessage> : null}
        {message ? <AuthMessage tone="success">{message}</AuthMessage> : null}
        <AuthSubmitButton
          label={isLoading ? 'Creating...' : 'Register'}
          onPress={handleRegister}
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
