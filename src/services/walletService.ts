import 'react-native-get-random-values';
import { mnemonicToAccount } from 'viem/accounts';
import { privateKeyToAccount } from 'viem/accounts';
import * as Keychain from 'react-native-keychain';
import { MMKV } from 'react-native-mmkv';
import { Buffer } from 'buffer';

// Initialize MMKV for secure storage
const storage = new MMKV({
  id: 'blirp-wallet-storage',
  encryptionKey: 'blirp-encryption-key', // In production, generate this dynamically
});

// Types
export interface WalletData {
  address: string;
  tag: string;
  createdAt: number;
}

export interface EncryptedSeed {
  ciphertext: string;
  iv: string;
}

class WalletService {
  // Generate a new wallet with private key
  async generateWallet(): Promise<{
    mnemonic: string;
    address: string;
    privateKey: string;
  }> {
    try {
      // Generate cryptographically secure random private key
      const randomBytes = new Uint8Array(32);
      crypto.getRandomValues(randomBytes);
      
      const privateKey = `0x${Buffer.from(randomBytes).toString('hex')}` as `0x${string}`;
      
      // Create account from private key
      const account = privateKeyToAccount(privateKey);

      return {
        mnemonic: '', // We'll skip mnemonic for now to avoid wordlist issues
        address: account.address,
        privateKey,
      };
    } catch (error) {
      console.error('Error generating wallet:', error);
      throw new Error('Failed to generate wallet');
    }
  }

  // Derive wallet from mnemonic
  async restoreWalletFromMnemonic(mnemonic: string): Promise<{
    address: string;
    privateKey: string;
  }> {
    try {
      const account = mnemonicToAccount(mnemonic);
      return {
        address: account.address,
        privateKey: account.getHdKey().privateKey!,
      };
    } catch (error) {
      console.error('Error restoring wallet:', error);
      throw new Error('Invalid mnemonic phrase');
    }
  }

  // Store encrypted seed in device keychain
  async storeEncryptedSeed(tag: string, encryptedSeed: string): Promise<boolean> {
    try {
      // Store in keychain (most secure)
      await Keychain.setInternetCredentials(
        'blirp.wallet',
        tag,
        encryptedSeed,
        {
          accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
          authenticatePrompt: 'Authenticate to access your wallet',
          authenticationPromptType: Keychain.AUTHENTICATION_TYPE.BIOMETRICS,
        }
      );

      // Also store wallet metadata in MMKV
      const walletData: WalletData = {
        address: '', // Will be set later
        tag,
        createdAt: Date.now(),
      };
      storage.set(`wallet_${tag}`, JSON.stringify(walletData));

      return true;
    } catch (error) {
      console.error('Error storing encrypted seed:', error);
      return false;
    }
  }

  // Retrieve encrypted seed from keychain
  async getEncryptedSeed(tag: string): Promise<string | null> {
    try {
      const credentials = await Keychain.getInternetCredentials('blirp.wallet');
      if (credentials && credentials.username === tag) {
        return credentials.password;
      }
      return null;
    } catch (error) {
      console.error('Error retrieving encrypted seed:', error);
      return null;
    }
  }

  // Check if wallet exists
  async walletExists(tag: string): Promise<boolean> {
    const walletData = storage.getString(`wallet_${tag}`);
    return !!walletData;
  }

  // Get all wallet tags
  async getAllWalletTags(): Promise<string[]> {
    const keys = storage.getAllKeys();
    return keys
      .filter(key => key.startsWith('wallet_'))
      .map(key => key.replace('wallet_', ''));
  }

  // Store wallet info (for both EOA and Porto wallets)
  async storeWalletInfo(address: string, tag: string, type?: string): Promise<boolean> {
    try {
      const walletInfo = {
        address,
        tag,
        type: type || 'EOA',
        createdAt: Date.now()
      };
      storage.set(`wallet_info:${address}`, JSON.stringify(walletInfo));
      storage.set(`wallet_tag:${tag}`, address);
      storage.set(`wallet_${tag}`, JSON.stringify(walletInfo));
      return true;
    } catch (error) {
      console.error('Error storing wallet info:', error);
      return false;
    }
  }

  // Store passkey ID for Porto wallet
  async storePasskeyId(address: string, passkeyId: string): Promise<boolean> {
    try {
      storage.set(`passkey:${address}`, passkeyId);
      return true;
    } catch (error) {
      console.error('Error storing passkey ID:', error);
      return false;
    }
  }

  // Get passkey ID for Porto wallet
  async getPasskeyId(address: string): Promise<string | null> {
    try {
      return storage.getString(`passkey:${address}`) || null;
    } catch (error) {
      console.error('Error getting passkey ID:', error);
      return null;
    }
  }

  // Get wallet type
  async getWalletType(address: string): Promise<'EOA' | 'Porto' | null> {
    try {
      const infoStr = storage.getString(`wallet_info:${address}`);
      if (!infoStr) return null;
      const info = JSON.parse(infoStr);
      return info.type || 'EOA';
    } catch (error) {
      console.error('Error getting wallet type:', error);
      return null;
    }
  }

  // Encrypt data (simplified - in production use proper encryption)
  async encryptData(data: string, _key: string): Promise<EncryptedSeed> {
    // For now, we'll use a simple base64 encoding
    const ciphertext = Buffer.from(data).toString('base64');
    const iv = Buffer.from(Math.random().toString()).toString('base64');

    return { ciphertext, iv };
  }

  // Decrypt data
  async decryptData(encryptedData: EncryptedSeed, _key: string): Promise<string> {
    // For now, simple base64 decoding
    return Buffer.from(encryptedData.ciphertext, 'base64').toString();
  }

  // Get balance from blockchain
  async getBalance(_address: string): Promise<{
    balance: string;
    balanceInUSD: number;
  }> {
    // For now, return mock data
    // In production, connect to Ethereum node
    return {
      balance: '0.0000',
      balanceInUSD: 0.00,
    };
  }

  // Check if tag is available
  async isTagAvailable(tag: string): Promise<boolean> {
    // For now, check local storage
    // In production, check against your backend
    const exists = await this.walletExists(tag);
    return !exists;
  }
}

export default new WalletService();
