import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Polyfill seguro de WebSocket para entornos sin WebSocket nativo (Node < 22, Jest, CI)
const CustomWebSocket = typeof WebSocket !== 'undefined'
  ? WebSocket
  : (typeof globalThis !== 'undefined' && globalThis.WebSocket
      ? globalThis.WebSocket
      : class MockWebSocket {
          constructor() {}
          addEventListener() {}
          removeEventListener() {}
          send() {}
          close() {}
        });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://qwezxcafrurxmvevnlne.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3ZXp4Y2FmcnVyeG12ZXZubG5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM1NjQ3NzQsImV4cCI6MjEwOTE0MDc3NH0.euYcD6RExs10TGQoF-IvhUp-V8ceVNrua2-QiysAMtI';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  realtime: {
    transport: CustomWebSocket,
  },
});

export default supabase;
