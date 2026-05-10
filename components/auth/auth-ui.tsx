import { Link, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { forwardRef, type PropsWithChildren, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type PressableProps,
  type TextInputProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';

const lightPalette = {
  screenBg: '#f4f1ea',
  cardBg: '#fffdfa',
  cardBorder: '#d8d2c5',
  cardShadow: '#1f2937',
  badgeBg: '#e7efe4',
  badgeBorder: '#bfd0bf',
  badgeText: '#355749',
  accent: '#355749',
  title: '#1b231f',
  subtitle: '#5e6a63',
  inputBg: '#f9f7f2',
  inputBorder: '#d5d0c4',
  inputText: '#17201c',
  placeholder: '#8b938f',
  buttonBg: '#355749',
  buttonBgPressed: '#2b473b',
  buttonBorder: '#355749',
  buttonText: '#f7faf8',
  separator: '#e7e1d5',
  footerText: '#66736c',
  link: '#355749',
  errorBg: '#fff1ef',
  errorBorder: '#f0c5bf',
  errorText: '#9e3d34',
  successBg: '#eef8f0',
  successBorder: '#c7dfcb',
  successText: '#2f6a43',
  statusBar: 'dark' as const,
};

const darkPalette = {
  screenBg: '#121816',
  cardBg: '#1b2420',
  cardBorder: '#2f3d37',
  cardShadow: '#000000',
  badgeBg: '#203129',
  badgeBorder: '#355046',
  badgeText: '#E8E8E8',
  accent: '#99bea6',
  title: '#E8E8E8',
  subtitle: '#9faca5',
  inputBg: '#202b26',
  inputBorder: '#34423b',
  inputText: '#E8E8E8',
  placeholder: '#84938b',
  buttonBg: '#99bea6',
  buttonBgPressed: '#87ac94',
  buttonBorder: '#99bea6',
  buttonText: '#122019',
  separator: '#2b3832',
  footerText: '#E8E8E8',
  link: '#E8E8E8',
  errorBg: '#35211e',
  errorBorder: '#5a3430',
  errorText: '#f1a59a',
  successBg: '#173026',
  successBorder: '#285341',
  successText: '#9bcfae',
  statusBar: 'light' as const,
};

type AuthPalette = typeof lightPalette;

type AuthScreenProps = PropsWithChildren<{
  title: string;
  subtitle: string;
  footerPrompt: string;
  footerLinkLabel: string;
  footerHref: Href;
}>;

type AuthMessageProps = {
  tone: 'error' | 'success';
  children: ReactNode;
};

type AuthSubmitButtonProps = Omit<PressableProps, 'style' | 'children'> & {
  label: string;
  disabled?: boolean;
};

export function useAuthPalette(): AuthPalette {
  return useColorScheme() === 'dark' ? darkPalette : lightPalette;
}

export function AuthScreen({
  title,
  subtitle,
  footerPrompt,
  footerLinkLabel,
  footerHref,
  children,
}: AuthScreenProps) {
  const palette = useAuthPalette();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.screenBg }]} edges={['top', 'bottom']}>
      <StatusBar style={palette.statusBar} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.shell}>
            <View style={styles.hero}>
              {/* <View
                style={[
                  styles.badge,
                  {
                    backgroundColor: palette.badgeBg,
                    borderColor: palette.badgeBorder,
                  },
                ]}>
                <View style={[styles.badgeDot, { backgroundColor: palette.accent }]} />
                <ThemedText style={[styles.badgeText, { color: palette.badgeText }]}>
                  Trail Guard
                </ThemedText>
              </View> */}
              <ThemedText type="title" style={[styles.title, { color: palette.title }]}>
                {title}
              </ThemedText>
              <ThemedText style={[styles.subtitle, { color: palette.subtitle }]}>
                {subtitle}
              </ThemedText>
            </View>

            <View
              style={[
                styles.card,
                {
                  backgroundColor: palette.cardBg,
                  borderColor: palette.cardBorder,
                  shadowColor: palette.cardShadow,
                },
              ]}>
              {children}

              <View style={[styles.footer, { borderTopColor: palette.separator }]}>
                <ThemedText style={[styles.footerText, { color: palette.footerText }]}>
                  {footerPrompt}
                </ThemedText>
                <Link href={footerHref} asChild>
                  <Pressable style={({ pressed }) => [styles.linkButton, pressed && styles.linkPressed]}>
                    <ThemedText type="defaultSemiBold" style={[styles.linkText, { color: palette.link }]}>
                      {footerLinkLabel}
                    </ThemedText>
                  </Pressable>
                </Link>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export const AuthTextField = forwardRef<TextInput, TextInputProps>(function AuthTextField(
  { style, ...props },
  ref
) {
  const palette = useAuthPalette();

  return (
    <TextInput
      ref={ref}
      placeholderTextColor={palette.placeholder}
      selectionColor={palette.accent}
      cursorColor={palette.accent}
      underlineColorAndroid="transparent"
      style={[
        styles.input,
        {
          backgroundColor: palette.inputBg,
          borderColor: palette.inputBorder,
          color: palette.inputText,
        },
        style,
      ]}
      {...props}
    />
  );
});

export function AuthMessage({ tone, children }: AuthMessageProps) {
  const palette = useAuthPalette();
  const colorSet =
    tone === 'error'
      ? {
          backgroundColor: palette.errorBg,
          borderColor: palette.errorBorder,
          textColor: palette.errorText,
        }
      : {
          backgroundColor: palette.successBg,
          borderColor: palette.successBorder,
          textColor: palette.successText,
        };

  return (
    <View
      style={[
        styles.message,
        {
          backgroundColor: colorSet.backgroundColor,
          borderColor: colorSet.borderColor,
        },
      ]}>
      <ThemedText style={[styles.messageText, { color: colorSet.textColor }]}>
        {children}
      </ThemedText>
    </View>
  );
}

export function AuthSubmitButton({
  label,
  disabled,
  onPress,
  ...props
}: AuthSubmitButtonProps) {
  const palette = useAuthPalette();

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.submitButton,
        {
          backgroundColor: pressed && !disabled ? palette.buttonBgPressed : palette.buttonBg,
          borderColor: palette.buttonBorder,
          shadowColor: palette.cardShadow,
        },
        disabled && styles.submitButtonDisabled,
        pressed && !disabled && styles.submitButtonPressed,
      ]}
      {...props}>
      <ThemedText type="defaultSemiBold" style={[styles.submitButtonText, { color: palette.buttonText }]}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  shell: {
    flex: 1,
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  hero: {
    gap: 12,
  },
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 13,
    lineHeight: 16,
    letterSpacing: 0.3,
  },
  title: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 16,
    gap: 14,
    shadowOffset: {
      width: 0,
      height: 14,
    },
    shadowOpacity: 0.12,
    shadowRadius: 28,
    elevation: 6,
  },
  input: {
    minHeight: 54,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  message: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  submitButton: {
    minHeight: 54,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 4,
  },
  submitButtonPressed: {
    transform: [{ translateY: 1 }],
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
  },
  footer: {
    marginTop: 4,
    paddingTop: 14,
    borderTopWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 6,
    rowGap: 6,
  },
  footerText: {
    textAlign: 'center',
  },
  linkButton: {
    borderRadius: 999,
    paddingHorizontal: 2,
    paddingVertical: 2,
  },
  linkPressed: {
    opacity: 0.7,
  },
  linkText: {
    lineHeight: 24,
  },
});
