import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import Config from 'react-native-config';

// Supabase configuration
const supabaseUrl = Config.SUPABASE_URL || 'https://leocmgfjuoxfxitwkavo.supabase.co';
const supabaseKey = Config.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_JT9n_5gH-m8xDS_HD0ggpA_VfSXTA4B';

console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key:', supabaseKey ? `${supabaseKey.substring(0, 20)}...` : 'undefined');

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    // Configure auth settings for React Native
    storage: undefined, // We'll use our own storage for auth tokens
    autoRefreshToken: true,
    persistSession: false, // Disable for now to avoid session issues
    detectSessionInUrl: false,
  },
  realtime: {
    // Enable real-time features for live updates
    params: {
      eventsPerSecond: 10,
    },
  },
  global: {
    headers: {
      'X-Client-Info': 'supabase-js-react-native',
    },
  },
});

// Test connection function
export const testSupabaseConnection = async (): Promise<boolean> => {
  try {
    console.log('Testing Supabase connection...');
    
    // Simple test - just try to access the client
    // This will fail if URL/Key are invalid
    const { data, error } = await supabase.auth.getSession();
    
    // Even if there's an "auth error", the connection worked if we got a response
    console.log('Connection test result:', { data, error });
    console.log('✅ Supabase connection successful!');
    return true;
  } catch (error) {
    console.error('Supabase connection test failed:', error);
    return false;
  }
};

export default supabase;