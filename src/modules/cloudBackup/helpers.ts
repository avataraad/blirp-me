import { CloudBackup } from './index';
import type { CredentialMetadata } from './types';

/**
 * Register and immediately write private key
 */
export async function createBackup(tag: string, privateKey: string): Promise<string> {
  const { credentialID } = await CloudBackup.register(tag);
  await CloudBackup.writeData(credentialID, privateKey);
  
  const metadata: CredentialMetadata = {
    credentialID,
    tag,
    createdAt: new Date().toISOString(),
  };
  
  await CloudBackup.addKnownCredential(JSON.stringify(metadata));
  return credentialID;
}

/**
 * Get parsed credential metadata
 */
export async function getParsedCredentials(): Promise<CredentialMetadata[]> {
  const credentials = await CloudBackup.getKnownCredentials();
  return credentials.map(c => JSON.parse(c));
}

/**
 * Check if backup exists for a credential ID
 */
export async function backupExists(credentialID: string): Promise<boolean> {
  try {
    await CloudBackup.readData(credentialID);
    return true;
  } catch {
    return false;
  }
}

/**
 * Delete a backup by marking it as deleted
 */
export async function deleteBackup(credentialID: string): Promise<void> {
  // Write special deletion marker
  await CloudBackup.writeData(credentialID, 'DELETED');
  
  // Update metadata to mark as deleted
  const credentials = await getParsedCredentials();
  const updated = credentials.filter(c => c.credentialID !== credentialID);
  await CloudBackup.setKnownCredentials(updated.map(c => JSON.stringify(c)));
}