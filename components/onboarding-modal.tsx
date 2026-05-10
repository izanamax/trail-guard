import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import React, { useState } from 'react';
import { Dimensions, Modal, Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface OnboardingStep {
  title: string;
  description: string;
  icon: string;
  color: string;
}

const STEPS: OnboardingStep[] = [
  {
    title: 'Welcome to Trail Guard',
    description: 'Your companion for tracking technical gear safety and mountain adventures.',
    icon: 'mountain',
    color: '#cc5555',
  },
  {
    title: 'Track Gear Life',
    description: 'Add your ropes, harnesses, and hardware. We\'ll help you track their age and usage limits based on manufacturer guidelines.',
    icon: 'shield-alt',
    color: '#1c7c41',
  },
  {
    title: 'Map Your Trips',
    description: 'Tap the map to draw your routes. Assign gear to specific waypoints to track exactly which equipment was used on every pitch.',
    icon: 'map',
    color: '#2e90fa',
  },
  {
    title: 'Stay Safe',
    description: 'Receive visual warnings when gear is nearing retirement or needs inspection. Never guess the age of your safety equipment again.',
    icon: 'exclamation-circle',
    color: '#f79009',
  },
];

interface Props {
  isVisible: boolean;
  onComplete: () => void;
}

export function OnboardingModal({ isVisible, onComplete }: Props) {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
      setCurrentStep(0);
    }
  };

  const handleSkip = () => {
    onComplete();
    setCurrentStep(0);
  };

  const step = STEPS[currentStep];

  return (
    <Modal
      visible={isVisible}
      animationType="fade"
      transparent={true}
    >
      <View style={styles.overlay}>
        <ThemedView style={styles.container}>
          <View style={styles.content}>
            <View style={[styles.iconContainer, { backgroundColor: step.color + '15' }]}>
              <FontAwesome5 name={step.icon as any} size={64} color={step.color} />
            </View>
            
            <ThemedText type="title" style={styles.title}>
              {step.title}
            </ThemedText>
            
            <ThemedText style={styles.description}>
              {step.description}
            </ThemedText>

            <View style={styles.pager}>
              {STEPS.map((_, i) => (
                <View 
                  key={i} 
                  style={[
                    styles.dot, 
                    i === currentStep ? { backgroundColor: step.color, width: 24 } : styles.dotInactive
                  ]} 
                />
              ))}
            </View>
          </View>

          <View style={styles.footer}>
            <Pressable style={styles.skipButton} onPress={handleSkip}>
              <ThemedText style={styles.skipText}>Skip</ThemedText>
            </Pressable>
            
            <Pressable 
              style={[styles.nextButton, { backgroundColor: step.color }]} 
              onPress={handleNext}
            >
              <ThemedText style={styles.nextText}>
                {currentStep === STEPS.length - 1 ? 'Get Started' : 'Next'}
              </ThemedText>
            </Pressable>
          </View>
        </ThemedView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  content: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    textAlign: 'center',
    marginBottom: 16,
    fontSize: 24,
  },
  description: {
    textAlign: 'center',
    fontSize: 16,
    lineHeight: 24,
    opacity: 0.8,
    marginBottom: 32,
    paddingHorizontal: 10,
  },
  pager: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  dotInactive: {
    width: 8,
    backgroundColor: '#cbd5e1',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
  },
  skipButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  skipText: {
    fontSize: 16,
    opacity: 0.6,
  },
  nextButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    minWidth: 120,
    alignItems: 'center',
  },
  nextText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
