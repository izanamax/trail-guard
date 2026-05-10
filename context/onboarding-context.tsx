import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { OnboardingModal } from '@/components/onboarding-modal';

const ONBOARDING_KEY = 'trail_guard_onboarding_completed';

interface OnboardingContextType {
  showOnboarding: () => void;
  isCompleted: boolean;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [isVisible, setIsVisible] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function checkOnboarding() {
      const value = await AsyncStorage.getItem(ONBOARDING_KEY);
      if (value !== 'true') {
        setIsVisible(true);
      } else {
        setIsCompleted(true);
      }
      setIsReady(true);
    }
    checkOnboarding();
  }, []);

  const handleComplete = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    setIsVisible(false);
    setIsCompleted(true);
  };

  const showOnboarding = () => {
    setIsVisible(true);
  };

  return (
    <OnboardingContext.Provider value={{ showOnboarding, isCompleted }}>
      {children}
      {isReady && (
        <OnboardingModal 
          isVisible={isVisible} 
          onComplete={handleComplete} 
        />
      )}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
}
