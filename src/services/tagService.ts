import { MMKV } from 'react-native-mmkv';
import { isAddress } from 'viem';

// Initialize MMKV for tag storage
const tagStorage = new MMKV({
  id: 'blirp-tag-storage',
  encryptionKey: 'blirp-tag-encryption-key',
});

// Types
export interface TagMapping {
  tag: string;           // @username (without @)
  address: string;       // 0x...
  verified: boolean;     // verification status
  lastUpdated: number;   // timestamp
}

export interface TagValidationResult {
  isValid: boolean;
  normalizedTag?: string;
  error?: string;
}

class TagService {
  // Tag validation regex - alphanumeric, underscores, 3-20 chars
  private readonly TAG_REGEX = /^[a-zA-Z0-9_]{3,20}$/;
  private readonly TAG_PREFIX = 'tag_';

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
   * Register a new tag mapping
   */
  async registerTag(tag: string, address: string): Promise<boolean> {
    try {
      // Validate tag
      const validation = this.validateTag(tag);
      if (!validation.isValid || !validation.normalizedTag) {
        return false;
      }

      // Validate Ethereum address
      if (!isAddress(address)) {
        return false;
      }

      // Check if tag already exists
      const existing = await this.resolveTag(validation.normalizedTag);
      if (existing) {
        return false;
      }

      // Store tag mapping
      const mapping: TagMapping = {
        tag: validation.normalizedTag,
        address: address.toLowerCase(),
        verified: false,
        lastUpdated: Date.now(),
      };

      tagStorage.set(
        `${this.TAG_PREFIX}${validation.normalizedTag}`,
        JSON.stringify(mapping)
      );

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Resolve a tag to an Ethereum address
   */
  async resolveTag(tag: string): Promise<string | null> {
    try {
      // Validate tag
      const validation = this.validateTag(tag);
      if (!validation.isValid || !validation.normalizedTag) {
        return null;
      }

      // Look up tag in storage
      const mappingData = tagStorage.getString(
        `${this.TAG_PREFIX}${validation.normalizedTag}`
      );

      if (!mappingData) {
        return null;
      }

      const mapping: TagMapping = JSON.parse(mappingData);
      return mapping.address;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get tag mapping details
   */
  async getTagMapping(tag: string): Promise<TagMapping | null> {
    try {
      const validation = this.validateTag(tag);
      if (!validation.isValid || !validation.normalizedTag) {
        return null;
      }

      const mappingData = tagStorage.getString(
        `${this.TAG_PREFIX}${validation.normalizedTag}`
      );

      if (!mappingData) {
        return null;
      }

      return JSON.parse(mappingData);
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if a tag is available
   */
  async isTagAvailable(tag: string): Promise<boolean> {
    const validation = this.validateTag(tag);
    if (!validation.isValid) {
      return false;
    }

    const existing = await this.resolveTag(tag);
    return !existing;
  }

  /**
   * Get all registered tags (for autocomplete)
   */
  getAllTags(): string[] {
    try {
      const keys = tagStorage.getAllKeys();
      return keys
        .filter(key => key.startsWith(this.TAG_PREFIX))
        .map(key => {
          const data = tagStorage.getString(key);
          if (data) {
            const mapping: TagMapping = JSON.parse(data);
            return `@${mapping.tag}`;
          }
          return null;
        })
        .filter(Boolean) as string[];
    } catch (error) {
      return [];
    }
  }

  /**
   * Delete a tag mapping (for testing/admin)
   */
  async deleteTag(tag: string): Promise<boolean> {
    try {
      const validation = this.validateTag(tag);
      if (!validation.isValid || !validation.normalizedTag) {
        return false;
      }

      tagStorage.delete(`${this.TAG_PREFIX}${validation.normalizedTag}`);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Clear all tags (for testing)
   */
  clearAllTags(): void {
    const keys = tagStorage.getAllKeys();
    keys
      .filter(key => key.startsWith(this.TAG_PREFIX))
      .forEach(key => tagStorage.delete(key));
  }

  /**
   * Seed with demo tags (for development)
   */
  async seedDemoTags(): Promise<void> {
    const demoTags = [
      { tag: 'alice', address: '0x742d35Cc6634C0532925a3b844Bc9e7595f89590' },
      { tag: 'bob', address: '0x5aAeb6053f3E94C9b9A09f33669435E7Ef1BeAed' },
      { tag: 'charlie', address: '0xfB6916095ca1df60bB79Ce92cE3Ea74c37c5d359' },
      { tag: 'demo', address: '0x742d35Cc6634C0532925a3b8D37AAb63e6f3Cd55' },
    ];

    for (const { tag, address } of demoTags) {
      await this.registerTag(tag, address);
    }
  }
}

export default new TagService();