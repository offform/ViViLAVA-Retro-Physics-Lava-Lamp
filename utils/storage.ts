
import { LampConfig } from '../types';

// Declare chrome to prevent TypeScript errors when types are missing
declare const chrome: any;

const STORAGE_KEY = 'lava_lamp_config_v1';

const DEFAULT_CONFIG: LampConfig = {
  theme: 'light',
  color: 'red',
  size: 0.5, 
  speed: 1,
  splashOpacity: 0.9, // Default 90%
  isLocked: false,
  isOn: true,
  isMinimized: false,
  isSplashOn: true // Default On
};

export const saveConfig = (config: LampConfig): void => {
  // Check if running in a Chrome Extension environment
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.set({ [STORAGE_KEY]: config });
  } else {
    // Fallback to localStorage for web environment
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch (e) {
      console.error('Failed to save to localStorage', e);
    }
  }
};

export const loadConfig = async (): Promise<LampConfig> => {
  return new Promise((resolve) => {
    // Check Chrome Storage
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get([STORAGE_KEY], (result) => {
        if (result[STORAGE_KEY]) {
          resolve({ ...DEFAULT_CONFIG, ...result[STORAGE_KEY] });
        } else {
          resolve(DEFAULT_CONFIG);
        }
      });
    } else {
      // Fallback to localStorage
      try {
        const item = localStorage.getItem(STORAGE_KEY);
        if (item) {
          resolve({ ...DEFAULT_CONFIG, ...JSON.parse(item) });
        } else {
          resolve(DEFAULT_CONFIG);
        }
      } catch (e) {
        resolve(DEFAULT_CONFIG);
      }
    }
  });
};
