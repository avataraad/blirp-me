import { NativeModules, Platform } from 'react-native';
import type { CloudBackupModule } from './types';

const NativeCloudBackup = NativeModules.CloudBackupModule;

class CloudBackupImpl implements CloudBackupModule {
  private isSupported(): void {
    if (Platform.OS !== 'ios') {
      throw new Error('CloudBackup is only available on iOS');
    }

    const iosVersion = parseInt(Platform.Version as string, 10);
    if (iosVersion < 17) {
      throw new Error('CloudBackup requires iOS 17.0 or later');
    }

    if (!NativeCloudBackup) {
      throw new Error('CloudBackup native module not found');
    }
  }

  async register(tag: string): Promise<{ credentialID: string }> {
    this.isSupported();

    if (!tag || tag.trim().length === 0) {
      throw new Error('Tag cannot be empty');
    }

    return NativeCloudBackup.register(tag);
  }

  async writeData(credentialID: string, privateKey: string): Promise<{ credentialID: string }> {
    this.isSupported();

    if (!credentialID || !privateKey) {
      throw new Error('Credential ID and private key are required');
    }

    // Validate private key format (64 hex characters)
    if (!/^[0-9a-fA-F]{64}$/.test(privateKey)) {
      throw new Error('Private key must be 64 hexadecimal characters');
    }

    return NativeCloudBackup.writeData(credentialID, privateKey);
  }

  async readData(credentialID?: string): Promise<{ credentialID: string; privateKey: string }> {
    this.isSupported();

    if (credentialID === undefined) {
      return NativeCloudBackup.readData(null);
    }

    return NativeCloudBackup.readData(credentialID);
  }

  async getKnownCredentials(): Promise<string[]> {
    this.isSupported();
    return NativeCloudBackup.getKnownCredentials();
  }

  async setKnownCredentials(credentials: string[]): Promise<void> {
    this.isSupported();

    if (!Array.isArray(credentials)) {
      throw new Error('Credentials must be an array');
    }

    return NativeCloudBackup.setKnownCredentials(credentials);
  }

  async addKnownCredential(credential: string): Promise<void> {
    this.isSupported();

    // Validate JSON format
    try {
      JSON.parse(credential);
    } catch {
      throw new Error('Credential must be valid JSON');
    }

    return NativeCloudBackup.addKnownCredential(credential);
  }
}

// Export singleton instance
export const CloudBackup = new CloudBackupImpl();

// Also export as default
export default CloudBackup;

// Re-export types
export * from './types';
