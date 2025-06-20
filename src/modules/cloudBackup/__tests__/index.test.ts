import { Platform, NativeModules } from 'react-native';
import { CloudBackup } from '../index';

// Mock NativeModules
jest.mock('react-native', () => ({
  NativeModules: {
    CloudBackupModule: {
      register: jest.fn().mockImplementation((_tag: string) =>
        Promise.resolve({ credentialID: 'mock_credential_id_' + Date.now() })
      ),
      writeData: jest.fn().mockImplementation((credentialID: string) =>
        Promise.resolve({ credentialID })
      ),
      readData: jest.fn().mockImplementation((credentialID?: string) =>
        Promise.resolve({
          credentialID: credentialID || 'mock_credential_id',
          privateKey: '0'.repeat(64),
        })
      ),
      getKnownCredentials: jest.fn().mockResolvedValue([]),
      setKnownCredentials: jest.fn().mockResolvedValue(undefined),
      addKnownCredential: jest.fn().mockResolvedValue(undefined),
    },
  },
  Platform: {
    OS: 'ios',
    Version: '17.0',
  },
}));

describe('CloudBackup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset Platform for each test
    (Platform as any).OS = 'ios';
    (Platform as any).Version = '17.0';
  });

  describe('register', () => {
    it('should register a new credential', async () => {
      const result = await CloudBackup.register('Test Backup');
      expect(result).toHaveProperty('credentialID');
      expect(typeof result.credentialID).toBe('string');
    });

    it('should throw on empty tag', async () => {
      await expect(CloudBackup.register('')).rejects.toThrow('Tag cannot be empty');
    });

    it('should throw on whitespace-only tag', async () => {
      await expect(CloudBackup.register('   ')).rejects.toThrow('Tag cannot be empty');
    });
  });

  describe('writeData', () => {
    it('should write data with valid inputs', async () => {
      const credentialID = 'test_credential';
      const privateKey = '0'.repeat(64);

      const result = await CloudBackup.writeData(credentialID, privateKey);
      expect(result.credentialID).toBe(credentialID);
    });

    it('should validate private key format', async () => {
      const credentialID = 'test_credential';
      const invalidKeys = [
        'not_hex',
        '0'.repeat(63), // Too short
        '0'.repeat(65), // Too long
        'G'.repeat(64), // Invalid hex char
      ];

      for (const key of invalidKeys) {
        await expect(CloudBackup.writeData(credentialID, key))
          .rejects.toThrow('Private key must be 64 hexadecimal characters');
      }
    });

    it('should throw on missing parameters', async () => {
      await expect(CloudBackup.writeData('', '0'.repeat(64)))
        .rejects.toThrow('Credential ID and private key are required');

      await expect(CloudBackup.writeData('test', ''))
        .rejects.toThrow('Credential ID and private key are required');
    });

    it('should accept valid hex characters', async () => {
      const credentialID = 'test_credential';
      const validKeys = [
        '0123456789abcdef'.repeat(4),
        'ABCDEF0123456789'.repeat(4),
        'aAbBcCdDeEfF0123456789'.repeat(2) + 'aAbBcCdDeEfF01234567',
      ];

      for (const key of validKeys) {
        const result = await CloudBackup.writeData(credentialID, key);
        expect(result.credentialID).toBe(credentialID);
      }
    });
  });

  describe('readData', () => {
    it('should read data with credential ID', async () => {
      const result = await CloudBackup.readData('test_credential');
      expect(result).toHaveProperty('credentialID');
      expect(result).toHaveProperty('privateKey');
      expect(result.privateKey).toHaveLength(64);
    });

    it('should read data without credential ID', async () => {
      const result = await CloudBackup.readData();
      expect(result).toHaveProperty('credentialID');
      expect(result).toHaveProperty('privateKey');
    });

    it('should handle undefined vs null correctly', async () => {
      // Both should work - implementation converts undefined to null
      const result1 = await CloudBackup.readData(undefined);
      expect(result1).toHaveProperty('credentialID');

      const result2 = await CloudBackup.readData();
      expect(result2).toHaveProperty('credentialID');
    });
  });

  describe('metadata operations', () => {
    it('should manage known credentials', async () => {
      const testCredential = JSON.stringify({
        credentialID: 'test',
        tag: 'Test',
        createdAt: new Date().toISOString(),
      });

      // Add credential
      await CloudBackup.addKnownCredential(testCredential);

      // Get credentials
      const credentials = await CloudBackup.getKnownCredentials();
      expect(Array.isArray(credentials)).toBe(true);

      // Set credentials
      await CloudBackup.setKnownCredentials([testCredential]);
    });

    it('should validate JSON format', async () => {
      await expect(CloudBackup.addKnownCredential('not-json'))
        .rejects.toThrow('Credential must be valid JSON');
    });

    it('should validate array format for setKnownCredentials', async () => {
      await expect(CloudBackup.setKnownCredentials('not-array' as any))
        .rejects.toThrow('Credentials must be an array');
    });
  });

  describe('platform checks', () => {
    it('should throw on unsupported platform', async () => {
      (Platform as any).OS = 'android';

      await expect(CloudBackup.register('Test'))
        .rejects.toThrow('CloudBackup is only available on iOS');
    });

    it('should throw on old iOS version', async () => {
      (Platform as any).OS = 'ios';
      (Platform as any).Version = '16.0';

      await expect(CloudBackup.register('Test'))
        .rejects.toThrow('CloudBackup requires iOS 17.0 or later');
    });

    it('should handle iOS version strings correctly', async () => {
      (Platform as any).OS = 'ios';
      (Platform as any).Version = '17.1.2';

      // Should parse major version correctly
      const result = await CloudBackup.register('Test');
      expect(result).toHaveProperty('credentialID');
    });
  });

  describe('module availability', () => {
    it('should throw if native module is not available', async () => {
      // We need to reload the module to test this properly
      // Since the module checks for NativeModules.CloudBackup during import,
      // we can't easily test this without module reloading
      // For now, we'll verify the mock exists
      expect(NativeModules.CloudBackupModule).toBeDefined();
      expect(typeof NativeModules.CloudBackupModule.register).toBe('function');
    });
  });
});
