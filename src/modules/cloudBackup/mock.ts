import type { CloudBackupModule } from './types';

export const CloudBackupMock: CloudBackupModule = {
  async register(tag: string) {
    console.log('[CloudBackup Mock] register:', tag);
    return { credentialID: 'mock_credential_id_' + Date.now() };
  },

  async writeData(credentialID: string, privateKey: string) {
    console.log('[CloudBackup Mock] writeData:', { credentialID, privateKey: '***' });
    return { credentialID };
  },

  async readData(credentialID?: string) {
    console.log('[CloudBackup Mock] readData:', credentialID);
    return {
      credentialID: credentialID || 'mock_credential_id',
      privateKey: '0'.repeat(64),
    };
  },

  async getKnownCredentials() {
    console.log('[CloudBackup Mock] getKnownCredentials');
    return [];
  },

  async setKnownCredentials(credentials: string[]) {
    console.log('[CloudBackup Mock] setKnownCredentials:', credentials);
  },

  async addKnownCredential(credential: string) {
    console.log('[CloudBackup Mock] addKnownCredential:', credential);
  },
};