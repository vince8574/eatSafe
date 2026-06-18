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
      // Accessibility (voice guidance) is OFF by default — the standard hands-free
      // sighted scan is the default experience. Blind / low-vision users enable it
      // in Settings. (Existing installs that had the old default `true` are flipped
      // to false by the v1 migration below, so nobody is stuck in voice mode.)
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
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      // v0 → v1 : le mode malvoyant n'est plus activé par défaut. Les installs
      // existantes avaient le défaut `true` persisté → on les bascule à `false`
      // UNE fois (sinon un utilisateur voyant reste coincé dans la boucle de
      // re-scan du mode voix). Un malvoyant le réactive dans Réglages.
      migrate: (persisted, version) => {
        const state = (persisted ?? {}) as Partial<PreferencesState>;
        if (version < 1) {
          state.accessibilityMode = false;
        }
        return state as PreferencesState;
      }
    }
  )
);
