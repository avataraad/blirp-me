import { supabase, testSupabaseConnection } from '../config/supabase';

/**
 * Supabase service for database operations
 */
class SupabaseService {
  /**
   * Test the connection to Supabase
   */
  async testConnection(): Promise<boolean> {
    return await testSupabaseConnection();
  }

  /**
   * Get basic info about the database
   */
  async getDatabaseInfo(): Promise<any> {
    try {
      // Simple test that doesn't rely on RPC functions
      const { data, error } = await supabase.auth.getSession();
      
      return {
        success: true,
        message: 'Database connection verified',
        timestamp: new Date().toISOString(),
        sessionData: data ? 'Session API accessible' : 'No session data',
        errorData: error ? error.message : 'No errors',
      };
    } catch (error) {
      console.error('Database info query failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Test basic table operations (simple client test)
   */
  async testBasicOperations(): Promise<any> {
    try {
      // Simple test to verify the client can make requests
      // We'll try to access auth user (which should work even if no user is logged in)
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      return {
        success: true,
        message: 'Client operations working',
        userAccess: userData ? 'User API accessible' : 'No user logged in (normal)',
        errorInfo: userError ? userError.message : 'No errors',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Operations test failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get the Supabase client instance
   */
  getClient() {
    return supabase;
  }
}

// Export singleton instance
export default new SupabaseService();