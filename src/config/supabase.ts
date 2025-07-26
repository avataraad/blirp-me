import { createClient } from '@supabase/supabase-js';
import Config from 'react-native-config';

// Supabase configuration
const supabaseUrl = Config.SUPABASE_URL;
const supabaseKey = Config.SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    // Configure auth settings for React Native
    storage: undefined, // We'll use our own storage for auth tokens
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  realtime: {
    // Enable real-time features for live updates
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Test connection function
export const testSupabaseConnection = async (): Promise<boolean> => {
  try {
    console.log('Testing Supabase connection...');
    
    // Simple health check - try to get the current timestamp
    const { data, error } = await supabase
      .from('_supabase_health_check')
      .select('*')
      .limit(1);
    
    if (error) {
      // If health check table doesn't exist, try a simple query
      const { error: timestampError } = await supabase
        .rpc('now'); // PostgreSQL function to get current timestamp
      
      if (timestampError) {
        console.error('Supabase connection failed:', timestampError);
        return false;
      }
    }
    
    console.log('✅ Supabase connection successful!');
    return true;
  } catch (error) {
    console.error('Supabase connection test failed:', error);
    return false;
  }
};

export default supabase;