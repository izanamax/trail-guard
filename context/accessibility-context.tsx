import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const COLORBLIND_MODE_KEY = 'trail_guard_colorblind_mode';

interface AccessibilityContextType {
  isColorblindMode: boolean;
  setColorblindMode: (enabled: boolean) => Promise<void>;
  colors: {
    safe: string;
    warning: string;
    retireSoon: string;
    expired: string;
    manuallyRetired: string;
    safeBg: string;
    warningBg: string;
    retireSoonBg: string;
    expiredBg: string;
    manuallyRetiredBg: string;
  };
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [isColorblindMode, setIsColorblindMode] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      try {
        const value = await AsyncStorage.getItem(COLORBLIND_MODE_KEY);
        console.log('Loaded colorblind mode:', value);
        setIsColorblindMode(value === 'true');
      } catch (e) {
        console.error('Failed to load accessibility settings', e);
      }
    }
    loadSettings();
  }, []);

  const setColorblindMode = async (enabled: boolean) => {
    console.log('Setting colorblind mode to:', enabled);
    setIsColorblindMode(enabled);
    try {
      await AsyncStorage.setItem(COLORBLIND_MODE_KEY, enabled ? 'true' : 'false');
    } catch (e) {
      console.error('Failed to save accessibility settings', e);
    }
  };

  // Standard vs Colorblind friendly palette
  const colors = useMemo(() => {
    if (isColorblindMode) {
      return {
        // High Contrast Debug Palette
        safe: '#9c27b0',            // Bright Purple (was #0072B2)
        warning: '#ff9800',         // Orange
        retireSoon: '#f44336',      // Red-Orange
        expired: '#000000',         // Black
        manuallyRetired: '#475467',
        safeBg: '#f3e5f5',
        warningBg: '#fff3e0',
        retireSoonBg: '#ffebee',
        expiredBg: '#eeeeee',
        manuallyRetiredBg: '#f2f4f7',
      };
    }
    return {
      // Standard Palette
      safe: '#1c7c41',
      warning: '#8a5a00',
      retireSoon: '#a15a00',
      expired: '#b42318',
      manuallyRetired: '#475467',
      safeBg: '#e9f8ef',
      warningBg: '#fff4d9',
      retireSoonBg: '#ffe9d4',
      expiredBg: '#ffe2e0',
      manuallyRetiredBg: '#f2f4f7',
    };
  }, [isColorblindMode]);

  const contextValue = useMemo(() => ({
    isColorblindMode,
    setColorblindMode,
    colors
  }), [isColorblindMode, colors]);

  return (
    <AccessibilityContext.Provider value={contextValue}>
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (context === undefined) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
}
