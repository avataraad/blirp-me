import { NativeModules } from 'react-native';
import { CloudBackup } from '../index';

// Mock the native module
jest.mock('react-native', () => ({
  NativeModules: {
    CloudBackup: {
      register: jest.fn(),
    },
  },
  Platform: {
    OS: 'ios',
    Version: '17.0',
  },
}));

describe('CloudBackup Registration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should call native register method with tag', async () => {
      const mockCredentialID = 'mock_credential_' + Date.now();
      (NativeModules.CloudBackup.register as jest.Mock).mockResolvedValue({
        credentialID: mockCredentialID,
      });

      const result = await CloudBackup.register('Test Wallet Backup');

      expect(NativeModules.CloudBackup.register).toHaveBeenCalledWith('Test Wallet Backup');
      expect(result).toEqual({ credentialID: mockCredentialID });
    });

    it('should handle registration errors', async () => {
      const error = new Error('User canceled');
      (NativeModules.CloudBackup.register as jest.Mock).mockRejectedValue(error);

      await expect(CloudBackup.register('Test')).rejects.toThrow('User canceled');
    });

    it('should validate tag before calling native', async () => {
      await expect(CloudBackup.register('')).rejects.toThrow('Tag cannot be empty');
      expect(NativeModules.CloudBackup.register).not.toHaveBeenCalled();
    });
  });
});