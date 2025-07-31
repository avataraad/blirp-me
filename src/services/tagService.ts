import { isAddress } from 'viem';
import userProfileService from './userProfileService';

// Types
export interface TagMapping {
  tag: string;           // username (without @)
  address: string;       // 0x...
  displayName?: string;  // User's display name
  verified: boolean;     // verification status
}

export interface TagValidationResult {
  isValid: boolean;
  normalizedTag?: string;
  error?: string;
}

class TagService {
  // Tag validation regex - alphanumeric, underscores, 3-20 chars
  private readonly TAG_REGEX = /^[a-zA-Z0-9_]{3,20}$/;

  /**
   * Validate and normalize a tag
   */
  validateTag(tag: string): TagValidationResult {
    // Remove @ if present
    const cleanTag = tag.startsWith('@') ? tag.slice(1) : tag;
    
    if (!cleanTag) {
      return { isValid: false, error: 'Tag cannot be empty' };
    }

    if (cleanTag.length < 3) {
      return { isValid: false, error: 'Tag must be at least 3 characters' };
    }

    if (cleanTag.length > 20) {
      return { isValid: false, error: 'Tag must be 20 characters or less' };
    }

    if (!this.TAG_REGEX.test(cleanTag)) {
      return { 
        isValid: false, 
        error: 'Tag can only contain letters, numbers, and underscores' 
      };
    }

    return { 
      isValid: true, 
      normalizedTag: cleanTag.toLowerCase() 
    };
  }

  /**
   * Register a new tag mapping (deprecated - use userProfileService.createProfile instead)
   */
  async registerTag(tag: string, address: string): Promise<boolean> {
    console.warn('tagService.registerTag is deprecated. Use userProfileService.createProfile instead.');
    return false;
  }

  /**
   * Resolve a tag to an Ethereum address using database
   */
  async resolveTag(tag: string): Promise<string | null> {
    try {
      // Validate tag
      const validation = this.validateTag(tag);
      if (!validation.isValid || !validation.normalizedTag) {
        return null;
      }

      // Look up tag in database
      const profile = await userProfileService.getProfileByTag(validation.normalizedTag);
      
      if (!profile) {
        return null;
      }

      return profile.ethereum_address;
    } catch (error) {
      console.error('Failed to resolve tag:', error);
      throw new Error('Unable to lookup username. Please check your connection and try again.');
    }
  }

  /**
   * Get tag mapping details from database
   */
  async getTagMapping(tag: string): Promise<TagMapping | null> {
    try {
      const validation = this.validateTag(tag);
      if (!validation.isValid || !validation.normalizedTag) {
        return null;
      }

      const profile = await userProfileService.getProfileByTag(validation.normalizedTag);
      
      if (!profile) {
        return null;
      }

      return {
        tag: profile.tag,
        address: profile.ethereum_address,
        displayName: profile.display_name || profile.tag,
        verified: profile.is_verified || false
      };
    } catch (error) {
      console.error('Failed to get tag mapping:', error);
      return null;
    }
  }

  /**
   * Check if a tag is available using database
   */
  async isTagAvailable(tag: string): Promise<boolean> {
    const validation = this.validateTag(tag);
    if (!validation.isValid) {
      return false;
    }

    try {
      return await userProfileService.isTagAvailable(tag);
    } catch (error) {
      console.error('Failed to check tag availability:', error);
      // Return false on error to prevent duplicate registrations
      return false;
    }
  }

  /**
   * Search for tags (for future autocomplete)
   */
  async searchTags(query: string, limit: number = 10): Promise<string[]> {
    try {
      const profiles = await userProfileService.searchProfiles(query, limit);
      return profiles.map(profile => `@${profile.tag}`);
    } catch (error) {
      console.error('Failed to search tags:', error);
      return [];
    }
  }

  /**
   * Placeholder for demo tags (no longer needed with database)
   */
  async seedDemoTags(): Promise<void> {
    // No longer needed - tags are stored in database
    console.log('Demo tags are now managed through the database');
  }
}

export default new TagService();