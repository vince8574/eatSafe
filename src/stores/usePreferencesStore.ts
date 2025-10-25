import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

type PreferencesState = {
  country: 'FR' | 'US' | 'CH';
  notificationsEnabled: boolean;
  darkMode: 'system' | 'light' | 'dark';
  setCountry: (country: 'FR' | 'US' | 'CH') => void;
  setNotificationsEnabled: (value: boolean) => void;
  setDarkMode: (mode: 'system' | 'light' | 'dark') => void;
};

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      country: 'FR',
      notificationsEnabled: true,
      darkMode: 'system',
      setCountry: (country) => set({ country }),
      setNotificationsEnabled: (notificationsEnabled) => set({ notificationsEnabled }),
      setDarkMode: (darkMode) => set({ darkMode })
    }),
    {
      name: 'preferences',
      storage: createJSONStorage(() => AsyncStorage)
    }
  )
);
