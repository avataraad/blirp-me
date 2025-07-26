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
      // Try to get PostgreSQL version and basic info
      const { data, error } = await supabase
        .rpc('version'); // PostgreSQL function to get version
      
      if (error) {
        console.error('Failed to get database info:', error);
        return null;
      }
      
      return {
        success: true,
        version: data,
        timestamp: new Date().toISOString(),
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
   * Test basic table operations (we'll create a simple test table)
   */
  async testBasicOperations(): Promise<any> {
    try {
      // For now, just test if we can make queries
      // Later we'll test with actual tables
      
      const { data, error } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .limit(5);
      
      if (error) {
        console.error('Basic operations test failed:', error);
        return {
          success: false,
          error: error.message,
        };
      }
      
      return {
        success: true,
        message: 'Basic operations working',
        tables: data,
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