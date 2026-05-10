import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

type PreferencesState = {
  // Country is always 'US' and cannot be changed
  country: 'US';
  notificationsEnabled: boolean;
  darkMode: 'system' | 'light' | 'dark';
  firstName: string;
  companyName: string;
  wantsNumelineReferral: boolean;
  hasSeenWelcome: boolean;
  hasSeenNotificationPrompt: boolean;
  accessibilityMode: boolean;
  // setCountry removed - country is always 'US'
  setNotificationsEnabled: (value: boolean) => void;
  setDarkMode: (mode: 'system' | 'light' | 'dark') => void;
  setFirstName: (name: string) => void;
  setCompanyName: (name: string) => void;
  setWantsNumelineReferral: (value: boolean) => void;
  setHasSeenWelcome: (value: boolean) => void;
  setHasSeenNotificationPrompt: (value: boolean) => void;
  setAccessibilityMode: (value: boolean) => void;
};

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      country: 'US' as const, // Always 'US', cannot be changed
      notificationsEnabled: true,
      darkMode: 'system',
      firstName: '',
      companyName: '',
      wantsNumelineReferral: false,
      hasSeenWelcome: false,
      hasSeenNotificationPrompt: false,
      accessibilityMode: false,
      // setCountry removed - country is always 'US'
      setNotificationsEnabled: (notificationsEnabled) => set({ notificationsEnabled }),
      setDarkMode: (darkMode) => set({ darkMode }),
      setFirstName: (firstName) => set({ firstName }),
      setCompanyName: (companyName) => set({ companyName }),
      setWantsNumelineReferral: (wantsNumelineReferral) => set({ wantsNumelineReferral }),
      setHasSeenWelcome: (hasSeenWelcome) => set({ hasSeenWelcome }),
      setHasSeenNotificationPrompt: (hasSeenNotificationPrompt) => set({ hasSeenNotificationPrompt }),
      setAccessibilityMode: (accessibilityMode) => set({ accessibilityMode })
    }),
    {
      name: 'preferences',
      storage: createJSONStorage(() => AsyncStorage)
    }
  )
);
