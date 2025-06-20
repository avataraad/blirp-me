import { createBackup, getParsedCredentials, backupExists, deleteBackup } from '../helpers';
import { CloudBackup } from '../index';

jest.mock('../index');

describe('CloudBackup Helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createBackup', () => {
    it('should create and store backup', async () => {
      const mockCredentialID = 'test_id';
      (CloudBackup.register as jest.Mock).mockResolvedValue({ credentialID: mockCredentialID });
      (CloudBackup.writeData as jest.Mock).mockResolvedValue({ credentialID: mockCredentialID });
      (CloudBackup.addKnownCredential as jest.Mock).mockResolvedValue(undefined);

      const result = await createBackup('Test Backup', '0'.repeat(64));

      expect(result).toBe(mockCredentialID);
      expect(CloudBackup.register).toHaveBeenCalledWith('Test Backup');
      expect(CloudBackup.writeData).toHaveBeenCalledWith(mockCredentialID, '0'.repeat(64));
      expect(CloudBackup.addKnownCredential).toHaveBeenCalled();

      // Verify metadata format
      const metadataCall = (CloudBackup.addKnownCredential as jest.Mock).mock.calls[0][0];
      const metadata = JSON.parse(metadataCall);
      expect(metadata).toHaveProperty('credentialID', mockCredentialID);
      expect(metadata).toHaveProperty('tag', 'Test Backup');
      expect(metadata).toHaveProperty('createdAt');
    });

    it('should handle errors during creation', async () => {
      (CloudBackup.register as jest.Mock).mockRejectedValue(new Error('Registration failed'));

      await expect(createBackup('Test', '0'.repeat(64)))
        .rejects.toThrow('Registration failed');
    });
  });

  describe('getParsedCredentials', () => {
    it('should parse credential JSON', async () => {
      const testData = [
        JSON.stringify({ credentialID: 'id1', tag: 'Tag1', createdAt: '2024-01-01' }),
        JSON.stringify({ credentialID: 'id2', tag: 'Tag2', createdAt: '2024-01-02' }),
      ];

      (CloudBackup.getKnownCredentials as jest.Mock).mockResolvedValue(testData);

      const result = await getParsedCredentials();

      expect(result).toHaveLength(2);
      expect(result[0].credentialID).toBe('id1');
      expect(result[0].tag).toBe('Tag1');
      expect(result[1].credentialID).toBe('id2');
      expect(result[1].tag).toBe('Tag2');
    });

    it('should handle empty credentials list', async () => {
      (CloudBackup.getKnownCredentials as jest.Mock).mockResolvedValue([]);

      const result = await getParsedCredentials();

      expect(result).toEqual([]);
    });
  });

  describe('backupExists', () => {
    it('should return true if backup exists', async () => {
      (CloudBackup.readData as jest.Mock).mockResolvedValue({
        credentialID: 'test',
        privateKey: '0'.repeat(64),
      });

      const exists = await backupExists('test');

      expect(exists).toBe(true);
      expect(CloudBackup.readData).toHaveBeenCalledWith('test');
    });

    it('should return false if backup does not exist', async () => {
      (CloudBackup.readData as jest.Mock).mockRejectedValue(new Error('Not found'));

      const exists = await backupExists('test');

      expect(exists).toBe(false);
    });

    it('should return false for any error', async () => {
      (CloudBackup.readData as jest.Mock).mockRejectedValue(new Error('Network error'));

      const exists = await backupExists('test');

      expect(exists).toBe(false);
    });
  });

  describe('deleteBackup', () => {
    it('should mark backup as deleted and update metadata', async () => {
      const existingCredentials = [
        JSON.stringify({ credentialID: 'id1', tag: 'Tag1', createdAt: '2024-01-01' }),
        JSON.stringify({ credentialID: 'id2', tag: 'Tag2', createdAt: '2024-01-02' }),
      ];

      (CloudBackup.writeData as jest.Mock).mockResolvedValue({ credentialID: 'id1' });
      (CloudBackup.getKnownCredentials as jest.Mock).mockResolvedValue(existingCredentials);
      (CloudBackup.setKnownCredentials as jest.Mock).mockResolvedValue(undefined);

      await deleteBackup('id1');

      // Should write deletion marker
      expect(CloudBackup.writeData).toHaveBeenCalledWith('id1', 'DELETED');

      // Should update metadata to remove deleted credential
      expect(CloudBackup.setKnownCredentials).toHaveBeenCalled();
      const updatedCredentials = (CloudBackup.setKnownCredentials as jest.Mock).mock.calls[0][0];
      expect(updatedCredentials).toHaveLength(1);
      expect(JSON.parse(updatedCredentials[0]).credentialID).toBe('id2');
    });

    it('should handle deletion of non-existent credential', async () => {
      (CloudBackup.writeData as jest.Mock).mockResolvedValue({ credentialID: 'non-existent' });
      (CloudBackup.getKnownCredentials as jest.Mock).mockResolvedValue([]);
      (CloudBackup.setKnownCredentials as jest.Mock).mockResolvedValue(undefined);

      await deleteBackup('non-existent');

      // Should still attempt to write deletion marker
      expect(CloudBackup.writeData).toHaveBeenCalledWith('non-existent', 'DELETED');
      expect(CloudBackup.setKnownCredentials).toHaveBeenCalledWith([]);
    });
  });
});
