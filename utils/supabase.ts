import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';
import 'react-native-url-polyfill/auto';

const supabaseUrl = "https://micubqshktwpktlnrabx.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1pY3VicXNoa3R3cGt0bG5yYWJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4NzM0MDgsImV4cCI6MjA2NDQ0OTQwOH0.ADYc2l_tBLR6CfgNAftOBw5nGbq3nueVLyg0pxx39pI";

// Create a platform-aware storage solution
const createPlatformStorage = () => {
  // Check if we're in a browser environment with localStorage available
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
    // Web environment with localStorage available
    return {
      getItem: (key: string) => {
        try {
          return Promise.resolve(window.localStorage.getItem(key));
        } catch {
          return Promise.resolve(null);
        }
      },
      setItem: (key: string, value: string) => {
        try {
          window.localStorage.setItem(key, value);
        } catch {
          // Silently fail if localStorage is not available
        }
        return Promise.resolve();
      },
      removeItem: (key: string) => {
        try {
          window.localStorage.removeItem(key);
        } catch {
          // Silently fail if localStorage is not available
        }
        return Promise.resolve();
      },
    };
  } else if (Platform.OS === 'web') {
    // Web environment but no localStorage (SSR/build time) - use no-op storage
    return {
      getItem: () => Promise.resolve(null),
      setItem: () => Promise.resolve(),
      removeItem: () => Promise.resolve(),
    };
  } else {
    // Native environment - use AsyncStorage
    return AsyncStorage;
  }
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: createPlatformStorage(),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web', // Only detect URLs on web
  },
});

// Handle app state changes for mobile only
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh()
    } else {
      supabase.auth.stopAutoRefresh()
    }
  })
}
