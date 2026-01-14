import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

type PreferencesState = {
  // Country is always 'US' and cannot be changed
  country: 'US';
  notificationsEnabled: boolean;
  darkMode: 'system' | 'light' | 'dark';
  firstName: string;
  hasSeenWelcome: boolean;
  hasSeenNotificationPrompt: boolean;
  // setCountry removed - country is always 'US'
  setNotificationsEnabled: (value: boolean) => void;
  setDarkMode: (mode: 'system' | 'light' | 'dark') => void;
  setFirstName: (name: string) => void;
  setHasSeenWelcome: (value: boolean) => void;
  setHasSeenNotificationPrompt: (value: boolean) => void;
};

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      country: 'US' as const, // Always 'US', cannot be changed
      notificationsEnabled: true,
      darkMode: 'system',
      firstName: '',
      hasSeenWelcome: false,
      hasSeenNotificationPrompt: false,
      // setCountry removed - country is always 'US'
      setNotificationsEnabled: (notificationsEnabled) => set({ notificationsEnabled }),
      setDarkMode: (darkMode) => set({ darkMode }),
      setFirstName: (firstName) => set({ firstName }),
      setHasSeenWelcome: (hasSeenWelcome) => set({ hasSeenWelcome }),
      setHasSeenNotificationPrompt: (hasSeenNotificationPrompt) => set({ hasSeenNotificationPrompt })
    }),
    {
      name: 'preferences',
      storage: createJSONStorage(() => AsyncStorage)
    }
  )
);
