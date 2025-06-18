import { Platform } from 'react-native';

export interface CloudBackupCredential {
  credentialID: string;
  tag?: string;
  createdAt?: string;
}

export interface CloudBackupResult {
  credentialID: string;
}

export interface CloudBackupReadResult extends CloudBackupResult {
  privateKey: string;
}

export enum CloudBackupError {
  USER_CANCELED = 'user_canceled',
  NO_CREDENTIALS_FOUND = 'no_credentials_found',
  FAILED = 'failed',
  BLOB_MUTATION_FAILED = 'blob_mutation_failed',
  UNEXPECTED_CREDENTIAL_TYPE = 'unexpected_credential_type',
  SYNCHRONIZATION_FAILED = 'synchronization_failed',
  DATA_CONVERSION_FAILED = 'data_conversion_failed',
  CREATE_CHALLENGE_FAILED = 'create_challenge_failed',
  PLATFORM_NOT_SUPPORTED = 'platform_not_supported',
  MODULE_NOT_AVAILABLE = 'module_not_available',
}

export interface CloudBackupModule {
  /**
   * Register a new passkey for cloud backup
   * @param tag - User-friendly identifier for the backup
   * @returns Promise with the credential ID
   * @throws {CloudBackupError} Various error codes
   * @example
   * const result = await CloudBackup.register('My Wallet Backup');
   * console.log(result.credentialID); // Base64 encoded credential ID
   */
  register(tag: string): Promise<CloudBackupResult>;

  /**
   * Write private key data to cloud backup
   * @param credentialID - Base64 encoded credential ID
   * @param privateKey - Hex encoded private key (64 characters)
   * @returns Promise with the credential ID
   * @throws {CloudBackupError} Various error codes
   * @example
   * await CloudBackup.writeData(credentialID, privateKeyHex);
   */
  writeData(credentialID: string, privateKey: string): Promise<CloudBackupResult>;

  /**
   * Read private key data from cloud backup
   * @param credentialID - Optional credential ID. If not provided, shows picker
   * @returns Promise with credential ID and private key
   * @throws {CloudBackupError} Various error codes
   * @example
   * const result = await CloudBackup.readData();
   * console.log(result.privateKey); // Hex encoded private key
   */
  readData(credentialID?: string): Promise<CloudBackupReadResult>;

  /**
   * Get list of known backup credentials
   * @returns Array of JSON strings containing credential metadata
   * @example
   * const credentials = await CloudBackup.getKnownCredentials();
   * const parsed = credentials.map(c => JSON.parse(c));
   */
  getKnownCredentials(): Promise<string[]>;

  /**
   * Set the complete list of known credentials
   * @param credentials - Array of JSON strings
   * @example
   * await CloudBackup.setKnownCredentials([JSON.stringify(metadata)]);
   */
  setKnownCredentials(credentials: string[]): Promise<void>;

  /**
   * Add a new credential to the known list
   * @param credential - JSON string with credential metadata
   * @example
   * await CloudBackup.addKnownCredential(JSON.stringify({
   *   credentialID,
   *   tag: 'My Backup',
   *   createdAt: new Date().toISOString()
   * }));
   */
  addKnownCredential(credential: string): Promise<void>;
}

// Type guards
export function isCloudBackupError(error: any): error is CloudBackupError {
  return Object.values(CloudBackupError).includes(error?.code);
}

export function isCloudBackupAvailable(): boolean {
  return Platform.OS === 'ios' && parseInt(Platform.Version as string, 10) >= 17;
}

// Branded type for credential IDs
export type CredentialID = string & { __brand: 'CredentialID' };

export function toCredentialID(id: string): CredentialID {
  return id as CredentialID;
}

// Helper type for JSON metadata
export interface CredentialMetadata {
  credentialID: string;
  tag: string;
  createdAt: string;
}