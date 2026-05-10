import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';

export default function SecurityScreen() {
  const insets = useSafeAreaInsets();
  const backgroundColor = useThemeColor({}, 'background');

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor }]} edges={['bottom']}>
      <ThemedView style={styles.container}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
          contentInsetAdjustmentBehavior="never"
          showsVerticalScrollIndicator={false}>
          <ThemedText type="title">Safety & Limits</ThemedText>

          <ThemedView lightColor="#ffe2e0" darkColor="#4b1f1f" style={styles.warningCard}>
            <ThemedText type="defaultSemiBold" lightColor="#7a271a" darkColor="#ffd7d2">
              Inspect before every use
            </ThemedText>
            <ThemedText style={styles.cardText} lightColor="#7a271a" darkColor="#ffd7d2">
              Trail Guard supports decisions. It does not replace physical inspection or manufacturer
              instructions.
            </ThemedText>
          </ThemedView>

          <ThemedView style={styles.section}>
            <ThemedText type="defaultSemiBold">How to read statuses</ThemedText>
            <ThemedText style={styles.cardText}>Safe: under 80% of expected lifecycle used.</ThemedText>
            <ThemedText style={styles.cardText}>Warning: 80%-94% used, plan replacement soon.</ThemedText>
            <ThemedText style={styles.cardText}>Retire Soon: 95%-99% used, replace immediately.</ThemedText>
            <ThemedText style={styles.cardText}>Expired: 100%+ used, remove from active use.</ThemedText>
            <ThemedText style={styles.cardText}>
              Manually Retired: marked by you due to damage or safety concerns.
            </ThemedText>
          </ThemedView>

          <ThemedView style={styles.section}>
            <ThemedText type="defaultSemiBold">Algorithm limits</ThemedText>
            <ThemedText style={styles.cardText}>
              Rules are category-based estimates and do not include fall history, storage conditions,
              high-intensity use, or manufacturer-specific exceptions.
            </ThemedText>
            <ThemedText style={styles.cardText}>
              This app is not a certification tool and should not be treated as professional
              inspection.
            </ThemedText>
          </ThemedView>

          <ThemedView style={styles.section}>
            <ThemedText type="defaultSemiBold">Privacy defaults</ThemedText>
            <ThemedText style={styles.cardText}>
              Gear records are private by default. You can permanently remove account data from
              Settings.
            </ThemedText>
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
    gap: 12,
  },
  warningCard: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#cc5555',
    padding: 12,
    gap: 6,
  },
  section: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#8f8f8f66',
    padding: 12,
    gap: 6,
  },
  cardText: {
    lineHeight: 20,
    opacity: 0.88,
  },
});
