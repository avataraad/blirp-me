import { NativeModules } from 'react-native';
import { CloudBackup } from '../index';

// Mock the native module
jest.mock('react-native', () => ({
  NativeModules: {
    CloudBackupModule: {
      writeData: jest.fn(),
    },
  },
  Platform: {
    OS: 'ios',
    Version: '17.0',
  },
}));

describe('CloudBackup Write Operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('writeData', () => {
    const validCredentialID = 'dGVzdF9jcmVkZW50aWFsX2lk'; // base64
    const validPrivateKey = '0123456789abcdef'.repeat(4); // 64 hex chars

    it('should call native writeData with valid inputs', async () => {
      (NativeModules.CloudBackupModule.writeData as jest.Mock).mockResolvedValue({
        credentialID: validCredentialID,
      });

      const result = await CloudBackup.writeData(validCredentialID, validPrivateKey);

      expect(NativeModules.CloudBackupModule.writeData).toHaveBeenCalledWith(
        validCredentialID,
        validPrivateKey
      );
      expect(result).toEqual({ credentialID: validCredentialID });
    });

    it('should validate private key format before native call', async () => {
      const invalidKeys = [
        'not_hex',
        '0'.repeat(63), // Too short
        '0'.repeat(65), // Too long
        'G'.repeat(64), // Invalid hex char
      ];

      for (const key of invalidKeys) {
        await expect(CloudBackup.writeData(validCredentialID, key))
          .rejects.toThrow('Private key must be 64 hexadecimal characters');
        expect(NativeModules.CloudBackupModule.writeData).not.toHaveBeenCalled();
      }
    });

    it('should validate required parameters', async () => {
      await expect(CloudBackup.writeData('', validPrivateKey))
        .rejects.toThrow('Credential ID and private key are required');

      await expect(CloudBackup.writeData(validCredentialID, ''))
        .rejects.toThrow('Credential ID and private key are required');
    });

    it('should handle write errors from native module', async () => {
      const error = new Error('Blob mutation failed');
      (NativeModules.CloudBackupModule.writeData as jest.Mock).mockRejectedValue(error);

      await expect(CloudBackup.writeData(validCredentialID, validPrivateKey))
        .rejects.toThrow('Blob mutation failed');
    });
  });
});
