import { Platform } from 'react-native';
import { 
  isCloudBackupError, 
  isCloudBackupAvailable, 
  toCredentialID,
  CloudBackupError 
} from '../types';

describe('CloudBackup Type Guards', () => {
  describe('isCloudBackupError', () => {
    it('should identify valid CloudBackupError codes', () => {
      const validErrors = [
        { code: CloudBackupError.USER_CANCELED },
        { code: CloudBackupError.NO_CREDENTIALS_FOUND },
        { code: CloudBackupError.FAILED },
        { code: CloudBackupError.BLOB_MUTATION_FAILED },
      ];
      
      validErrors.forEach(error => {
        expect(isCloudBackupError(error)).toBe(true);
      });
    });

    it('should reject invalid error codes', () => {
      const invalidErrors = [
        { code: 'invalid_code' },
        { code: 123 },
        { message: 'error' }, // no code
        null,
        undefined,
        'string error',
      ];
      
      invalidErrors.forEach(error => {
        expect(isCloudBackupError(error)).toBe(false);
      });
    });
  });

  describe('isCloudBackupAvailable', () => {
    const originalPlatform = Platform;

    beforeEach(() => {
      // Reset Platform mock
      Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });
      Object.defineProperty(Platform, 'Version', { value: '17.0', writable: true });
    });

    afterAll(() => {
      // Restore original Platform
      Object.defineProperty(Platform, 'OS', { value: originalPlatform.OS, writable: true });
      Object.defineProperty(Platform, 'Version', { value: originalPlatform.Version, writable: true });
    });

    it('should return true for iOS 17+', () => {
      (Platform as any).OS = 'ios';
      (Platform as any).Version = '17.0';
      expect(isCloudBackupAvailable()).toBe(true);
      
      (Platform as any).Version = '18.0';
      expect(isCloudBackupAvailable()).toBe(true);
      
      (Platform as any).Version = '17.1.2';
      expect(isCloudBackupAvailable()).toBe(true);
    });

    it('should return false for iOS < 17', () => {
      (Platform as any).OS = 'ios';
      (Platform as any).Version = '16.0';
      expect(isCloudBackupAvailable()).toBe(false);
      
      (Platform as any).Version = '15.5';
      expect(isCloudBackupAvailable()).toBe(false);
    });

    it('should return false for non-iOS platforms', () => {
      (Platform as any).OS = 'android';
      (Platform as any).Version = '13';
      expect(isCloudBackupAvailable()).toBe(false);
      
      (Platform as any).OS = 'web';
      expect(isCloudBackupAvailable()).toBe(false);
    });
  });

  describe('toCredentialID', () => {
    it('should create branded CredentialID type', () => {
      const id = 'test_credential_id';
      const branded = toCredentialID(id);
      
      // Runtime value should be the same
      expect(branded).toBe(id);
      expect(typeof branded).toBe('string');
    });
  });
});