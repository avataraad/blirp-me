import { NativeModules } from 'react-native';
import { CloudBackup } from '../index';

// Mock the native module
jest.mock('react-native', () => ({
  NativeModules: {
    CloudBackupModule: {
      readData: jest.fn(),
    },
  },
  Platform: {
    OS: 'ios',
    Version: '17.0',
  },
}));

describe('CloudBackup Read Operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('readData', () => {
    const mockCredentialID = 'dGVzdF9jcmVkZW50aWFsX2lk';
    const mockPrivateKey = '0123456789abcdef'.repeat(4);

    it('should read data with specific credential ID', async () => {
      (NativeModules.CloudBackupModule.readData as jest.Mock).mockResolvedValue({
        credentialID: mockCredentialID,
        privateKey: mockPrivateKey,
      });

      const result = await CloudBackup.readData(mockCredentialID);

      expect(NativeModules.CloudBackupModule.readData).toHaveBeenCalledWith(mockCredentialID);
      expect(result).toEqual({
        credentialID: mockCredentialID,
        privateKey: mockPrivateKey,
      });
    });

    it('should show credential picker when no ID provided', async () => {
      const pickerCredentialID = 'picker_selected_id';
      (NativeModules.CloudBackupModule.readData as jest.Mock).mockResolvedValue({
        credentialID: pickerCredentialID,
        privateKey: mockPrivateKey,
      });

      const result = await CloudBackup.readData();

      expect(NativeModules.CloudBackupModule.readData).toHaveBeenCalledWith(null);
      expect(result.credentialID).toBe(pickerCredentialID);
      expect(result.privateKey).toBe(mockPrivateKey);
    });

    it('should handle undefined credential ID correctly', async () => {
      (NativeModules.CloudBackupModule.readData as jest.Mock).mockResolvedValue({
        credentialID: mockCredentialID,
        privateKey: mockPrivateKey,
      });

      await CloudBackup.readData(undefined);

      // Should convert undefined to null for native module
      expect(NativeModules.CloudBackupModule.readData).toHaveBeenCalledWith(null);
    });

    it('should handle read errors', async () => {
      const error = new Error('No backup data found');
      (NativeModules.CloudBackupModule.readData as jest.Mock).mockRejectedValue(error);

      await expect(CloudBackup.readData(mockCredentialID))
        .rejects.toThrow('No backup data found');
    });

    it('should handle deletion marker', async () => {
      const error = new Error('Backup has been deleted');
      (NativeModules.CloudBackupModule.readData as jest.Mock).mockRejectedValue(error);

      await expect(CloudBackup.readData(mockCredentialID))
        .rejects.toThrow('Backup has been deleted');
    });
  });
});
