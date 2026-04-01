import { create } from 'zustand';

interface Printer {
  id: string;
  name: string;
  system_name: string | null;
  ipp_url: string | null;
  is_active: boolean;
  source: 'system' | 'manual';
  added_at: string;
}

interface SettingsState {
  settings: Record<string, string>;
  isLoaded: boolean;

  // Printer state
  printers: Printer[];
  printersLoaded: boolean;
  systemAvailable: boolean;

  setSettings: (settings: Record<string, string>) => void;
  updateSetting: (key: string, value: string) => void;
  setPrinters: (printers: Printer[], systemAvailable: boolean) => void;
  getActivePrinter: () => Printer | undefined;

  // Convenience getters
  getBwPrice: () => number;
  getColorPrice: () => number;
  getTimeoutMinutes: () => number;
  getStaffPin: () => string;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: {},
  isLoaded: false,
  printers: [],
  printersLoaded: false,
  systemAvailable: false,

  setSettings: (settings) => set({ settings, isLoaded: true }),

  updateSetting: (key, value) => {
    set((state) => ({
      settings: { ...state.settings, [key]: value },
    }));
  },

  setPrinters: (printers, systemAvailable) => set({ printers, printersLoaded: true, systemAvailable }),

  getActivePrinter: () => get().printers.find((p) => p.is_active),

  getBwPrice: () => parseInt(get().settings.pricing_bw_per_page || '10', 10),
  getColorPrice: () => parseInt(get().settings.pricing_color_per_page || '25', 10),
  getTimeoutMinutes: () => parseInt(get().settings.job_timeout_minutes || '30', 10),
  getStaffPin: () => get().settings.staff_pin || '',
}));
