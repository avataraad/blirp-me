import { NativeModules } from 'react-native';
import { CloudBackup } from '../index';
import { createBackup, backupExists } from '../helpers';

// Mock the native module
jest.mock('react-native', () => ({
  NativeModules: {
    CloudBackupModule: {
      register: jest.fn(),
      writeData: jest.fn(),
      readData: jest.fn(),
      addKnownCredential: jest.fn(),
    },
  },
  Platform: {
    OS: 'ios',
    Version: '17.0',
  },
}));

describe('CloudBackup Integration Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Full backup flow', () => {
    const testTag = 'Test Wallet Backup';
    const testPrivateKey = 'abcdef0123456789'.repeat(4);
    const mockCredentialID = 'test_credential_' + Date.now();

    it('should complete register -> write -> read flow', async () => {
      // Mock successful registration
      (NativeModules.CloudBackupModule.register as jest.Mock).mockResolvedValue({
        credentialID: mockCredentialID,
      });

      // Mock successful write
      (NativeModules.CloudBackupModule.writeData as jest.Mock).mockResolvedValue({
        credentialID: mockCredentialID,
      });

      // Mock successful read
      (NativeModules.CloudBackupModule.readData as jest.Mock).mockResolvedValue({
        credentialID: mockCredentialID,
        privateKey: testPrivateKey,
      });

      // Step 1: Register
      const registerResult = await CloudBackup.register(testTag);
      expect(registerResult.credentialID).toBe(mockCredentialID);

      // Step 2: Write
      const writeResult = await CloudBackup.writeData(mockCredentialID, testPrivateKey);
      expect(writeResult.credentialID).toBe(mockCredentialID);

      // Step 3: Read
      const readResult = await CloudBackup.readData(mockCredentialID);
      expect(readResult.credentialID).toBe(mockCredentialID);
      expect(readResult.privateKey).toBe(testPrivateKey);
    });

    it('should create backup using helper function', async () => {
      // Mock all operations
      (NativeModules.CloudBackupModule.register as jest.Mock).mockResolvedValue({
        credentialID: mockCredentialID,
      });
      (NativeModules.CloudBackupModule.writeData as jest.Mock).mockResolvedValue({
        credentialID: mockCredentialID,
      });
      (NativeModules.CloudBackupModule.addKnownCredential as jest.Mock).mockResolvedValue(undefined);

      // Use helper to create backup
      const credentialID = await createBackup(testTag, testPrivateKey);

      expect(credentialID).toBe(mockCredentialID);
      expect(NativeModules.CloudBackupModule.register).toHaveBeenCalledWith(testTag);
      expect(NativeModules.CloudBackupModule.writeData).toHaveBeenCalledWith(mockCredentialID, testPrivateKey);
      expect(NativeModules.CloudBackupModule.addKnownCredential).toHaveBeenCalled();
    });

    it('should check if backup exists', async () => {
      // Mock successful read
      (NativeModules.CloudBackupModule.readData as jest.Mock).mockResolvedValue({
        credentialID: mockCredentialID,
        privateKey: testPrivateKey,
      });

      const exists = await backupExists(mockCredentialID);
      expect(exists).toBe(true);

      // Mock failed read
      (NativeModules.CloudBackupModule.readData as jest.Mock).mockRejectedValue(
        new Error('No backup found')
      );

      const notExists = await backupExists('non_existent_id');
      expect(notExists).toBe(false);
    });
  });
});
