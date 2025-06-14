import { ethers } from 'ethers';
import * as Keychain from 'react-native-keychain';
import { MMKV } from 'react-native-mmkv';

// Initialize MMKV for secure storage
const storage = new MMKV({
  id: 'blirp-wallet-storage',
  encryptionKey: 'blirp-encryption-key' // In production, generate this dynamically
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
  // Generate a new wallet with mnemonic phrase
  async generateWallet(): Promise<{
    mnemonic: string;
    address: string;
    privateKey: string;
  }> {
    try {
      // Generate random wallet
      const wallet = ethers.Wallet.createRandom();
      
      return {
        mnemonic: wallet.mnemonic!.phrase,
        address: wallet.address,
        privateKey: wallet.privateKey,
      };
    } catch (error) {
      console.error('Error generating wallet:', error);
      throw new Error('Failed to generate wallet');
    }
  }

  // Derive wallet from mnemonic
  async restoreWalletFromMnemonic(mnemonic: string): Promise<ethers.Wallet> {
    try {
      return ethers.Wallet.fromMnemonic(mnemonic);
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

// Encrypt data (simplified - in production use proper encryption)
async encryptData(data: string, key: string): Promise<EncryptedSeed> {
    // For now, we'll use a simple base64 encoding
    // React Native doesn't have Buffer, use btoa instead
    const ciphertext = btoa(data);
    const iv = btoa(Math.random().toString());
    
    return { ciphertext, iv };
  }

  // Decrypt data
  async decryptData(encryptedData: EncryptedSeed, key: string): Promise<string> {
    // For now, simple base64 decoding
    // Use atob instead of Buffer
    return atob(encryptedData.ciphertext);
  }

  // Get balance from blockchain
  async getBalance(address: string): Promise<{
    balance: string;
    balanceInUSD: number;
  }> {
    try {
      // For now, return mock data
      // In production, connect to Ethereum node
      return {
        balance: '0.0000',
        balanceInUSD: 0.00,
      };
    } catch (error) {
      console.error('Error getting balance:', error);
      throw error;
    }
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