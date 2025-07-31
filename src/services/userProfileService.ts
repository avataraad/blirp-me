import { supabase } from '../config/supabase';
import {
  UserProfile,
  CreateUserProfileData,
  UpdateUserProfileData,
  PrivacySettings
} from '../types/userProfile';

/**
 * User Profile Service
 * Handles all database operations for user profiles
 */
class UserProfileService {
  private readonly TABLE_NAME = 'user_profiles';

  /**
   * Create a new user profile
   * @param profileData - Data for creating the user profile
   * @returns Promise<UserProfile | null>
   */
  async createProfile(profileData: CreateUserProfileData): Promise<UserProfile | null> {
    try {
      // Default privacy settings
      const defaultPrivacySettings: PrivacySettings = {
        show_phone_to_friends: false,
        allow_payment_requests: true,
        show_profile_in_search: true,
        ...profileData.privacy_settings
      };

      const profileToCreate = {
        tag: profileData.tag.toLowerCase().replace('@', ''), // Ensure no @ prefix and lowercase
        phone_number: profileData.phone_number,
        ethereum_address: profileData.ethereum_address.toLowerCase(),
        display_name: profileData.display_name || profileData.tag,
        is_verified: false,
        privacy_settings: defaultPrivacySettings,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from(this.TABLE_NAME)
        .insert([profileToCreate])
        .select()
        .single();

      if (error) {
        console.error('Error creating user profile:', error);
        
        // Check for specific constraint violations
        if (error.code === '23505') { // Unique violation error code
          if (error.message.includes('ethereum_address')) {
            throw new Error('ETHEREUM_ADDRESS_ALREADY_REGISTERED');
          } else if (error.message.includes('tag')) {
            throw new Error('TAG_ALREADY_TAKEN');
          }
        }
        
        throw error;
      }

      return data as UserProfile;
    } catch (error) {
      console.error('Failed to create user profile:', error);
      
      // Re-throw specific errors for handling in the UI
      if (error instanceof Error && 
          (error.message === 'ETHEREUM_ADDRESS_ALREADY_REGISTERED' ||
           error.message === 'TAG_ALREADY_TAKEN')) {
        throw error;
      }
      
      return null;
    }
  }

  /**
   * Get user profile by tag
   * @param tag - User tag (without @)
   * @returns Promise<UserProfile | null>
   */
  async getProfileByTag(tag: string): Promise<UserProfile | null> {
    try {
      const cleanTag = tag.toLowerCase().replace('@', '');
      
      const { data, error } = await supabase
        .from(this.TABLE_NAME)
        .select('*')
        .eq('tag', cleanTag)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          return null;
        }
        console.error('Error fetching user profile by tag:', error);
        throw error;
      }

      return data as UserProfile;
    } catch (error) {
      console.error('Failed to get user profile by tag:', error);
      return null;
    }
  }

  /**
   * Get user profile by Ethereum address
   * @param address - Ethereum address
   * @returns Promise<UserProfile | null>
   */
  async getProfileByAddress(address: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await supabase
        .from(this.TABLE_NAME)
        .select('*')
        .eq('ethereum_address', address.toLowerCase())
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          return null;
        }
        console.error('Error fetching user profile by address:', error);
        throw error;
      }

      return data as UserProfile;
    } catch (error) {
      console.error('Failed to get user profile by address:', error);
      return null;
    }
  }

  /**
   * Get user profile by phone number
   * @param phoneNumber - Phone number
   * @returns Promise<UserProfile | null>
   */
  async getProfileByPhone(phoneNumber: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await supabase
        .from(this.TABLE_NAME)
        .select('*')
        .eq('phone_number', phoneNumber)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          return null;
        }
        console.error('Error fetching user profile by phone:', error);
        throw error;
      }

      return data as UserProfile;
    } catch (error) {
      console.error('Failed to get user profile by phone:', error);
      return null;
    }
  }

  /**
   * Update user profile
   * @param tag - User tag to update
   * @param updates - Data to update
   * @returns Promise<UserProfile | null>
   */
  async updateProfile(tag: string, updates: UpdateUserProfileData): Promise<UserProfile | null> {
    try {
      const cleanTag = tag.toLowerCase().replace('@', '');
      
      const updateData = {
        ...updates,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from(this.TABLE_NAME)
        .update(updateData)
        .eq('tag', cleanTag)
        .select()
        .single();

      if (error) {
        console.error('Error updating user profile:', error);
        throw error;
      }

      return data as UserProfile;
    } catch (error) {
      console.error('Failed to update user profile:', error);
      return null;
    }
  }

  /**
   * Check if a tag is available
   * @param tag - Tag to check (without @)
   * @returns Promise<boolean>
   */
  async isTagAvailable(tag: string): Promise<boolean> {
    try {
      const cleanTag = tag.toLowerCase().replace('@', '');
      
      const { data, error } = await supabase
        .from(this.TABLE_NAME)
        .select('tag')
        .eq('tag', cleanTag)
        .single();

      if (error && error.code === 'PGRST116') {
        // No rows found, tag is available
        return true;
      }

      if (error && error.code === '42P01') {
        // Table doesn't exist, tag is available
        console.warn('user_profiles table does not exist yet. Please create it in Supabase.');
        return true;
      }

      if (error) {
        console.error('Error checking tag availability:', error);
        // For unknown errors, assume tag is available to not block user flow
        return true;
      }

      // If we got data back, tag is taken
      return false;
    } catch (error) {
      console.error('Failed to check tag availability:', error);
      // Default to true to allow user flow to continue
      return true;
    }
  }

  /**
   * Check if a phone number is already registered
   * @param phoneNumber - Phone number to check
   * @returns Promise<boolean>
   */
  async isPhoneNumberRegistered(phoneNumber: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from(this.TABLE_NAME)
        .select('phone_number')
        .eq('phone_number', phoneNumber)
        .single();

      if (error && error.code === 'PGRST116') {
        // No rows found, phone number is available
        return false;
      }

      if (error && error.code === '42P01') {
        // Table doesn't exist, phone number is available
        console.warn('user_profiles table does not exist yet. Please create it in Supabase.');
        return false;
      }

      if (error) {
        console.error('Error checking phone number registration:', error);
        // For unknown errors, assume phone number is available to not block user flow
        return false;
      }

      // If we got data back, phone number is registered
      return true;
    } catch (error) {
      console.error('Failed to check phone number registration:', error);
      // Default to false to allow user flow to continue
      return false;
    }
  }

  /**
   * Search for user profiles by display name or tag
   * @param query - Search query
   * @param limit - Maximum number of results (default: 10)
   * @returns Promise<UserProfile[]>
   */
  async searchProfiles(query: string, limit: number = 10): Promise<UserProfile[]> {
    try {
      const { data, error } = await supabase
        .from(this.TABLE_NAME)
        .select('*')
        .or(`tag.ilike.%${query}%,display_name.ilike.%${query}%`)
        .eq('privacy_settings->show_profile_in_search', true)
        .limit(limit);

      if (error) {
        console.error('Error searching user profiles:', error);
        throw error;
      }

      return data as UserProfile[];
    } catch (error) {
      console.error('Failed to search user profiles:', error);
      return [];
    }
  }

  /**
   * Delete user profile
   * @param tag - User tag to delete
   * @returns Promise<boolean>
   */
  async deleteProfile(tag: string): Promise<boolean> {
    try {
      const cleanTag = tag.toLowerCase().replace('@', '');
      
      const { error } = await supabase
        .from(this.TABLE_NAME)
        .delete()
        .eq('tag', cleanTag);

      if (error) {
        console.error('Error deleting user profile:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Failed to delete user profile:', error);
      return false;
    }
  }

  /**
   * Test the user profiles table connection
   * @returns Promise<boolean>
   */
  async testConnection(): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from(this.TABLE_NAME)
        .select('count(*)', { count: 'exact', head: true });

      if (error && error.code === '42P01') {
        console.error('❌ User profiles table does not exist. Please create it in Supabase.');
        return false;
      }

      if (error) {
        console.error('User profiles table connection test failed:', error);
        return false;
      }

      console.log('✅ User profiles table connection successful');
      return true;
    } catch (error) {
      console.error('User profiles table connection test error:', error);
      return false;
    }
  }
}

// Export singleton instance
export default new UserProfileService();