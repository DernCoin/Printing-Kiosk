import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SetupState {
  isSetupComplete: boolean;
  serverUrl: string;
  isLoaded: boolean;

  loadSetup: () => Promise<void>;
  completeSetup: (serverUrl: string) => Promise<void>;
  setServerUrl: (url: string) => Promise<void>;
  resetSetup: () => Promise<void>;
}

const KEYS = {
  SETUP_COMPLETE: '@printkiosk:setupComplete',
  SERVER_URL: '@printkiosk:serverUrl',
};

export const useSetupStore = create<SetupState>((set) => ({
  isSetupComplete: false,
  serverUrl: 'http://localhost:3000',
  isLoaded: false,

  loadSetup: async () => {
    // When served by the kiosk server (port 3000), auto-complete setup
    if (typeof window !== 'undefined' && window.location.port === '3000') {
      set({
        isSetupComplete: true,
        serverUrl: window.location.origin,
        isLoaded: true,
      });
      return;
    }

    try {
      const [complete, url] = await Promise.all([
        AsyncStorage.getItem(KEYS.SETUP_COMPLETE),
        AsyncStorage.getItem(KEYS.SERVER_URL),
      ]);
      set({
        isSetupComplete: complete === 'true',
        serverUrl: url || 'http://localhost:3000',
        isLoaded: true,
      });
    } catch {
      set({ isLoaded: true });
    }
  },

  completeSetup: async (serverUrl: string) => {
    await Promise.all([
      AsyncStorage.setItem(KEYS.SETUP_COMPLETE, 'true'),
      AsyncStorage.setItem(KEYS.SERVER_URL, serverUrl),
    ]);
    set({ isSetupComplete: true, serverUrl });
  },

  setServerUrl: async (url: string) => {
    await AsyncStorage.setItem(KEYS.SERVER_URL, url);
    set({ serverUrl: url });
  },

  resetSetup: async () => {
    await Promise.all([
      AsyncStorage.removeItem(KEYS.SETUP_COMPLETE),
      AsyncStorage.removeItem(KEYS.SERVER_URL),
    ]);
    set({ isSetupComplete: false, serverUrl: 'http://localhost:3000' });
  },
}));
