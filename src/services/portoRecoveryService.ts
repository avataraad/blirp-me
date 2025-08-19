import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-get-random-values';
import { PortoRpcClient } from './portoRpcClient';
import { PasskeyManager } from './passkeyManager';

// Use crypto.getRandomValues which is polyfilled by react-native-get-random-values
const randomBytes = (size: number): Uint8Array => {
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  return bytes;
};

interface RecoveredWallet {
  address: string;
  passkeyId: string;
  tag: string;
  chainId: number;
}

export class PortoRecoveryService {
  private rpcClient: PortoRpcClient;
  
  constructor() {
    this.rpcClient = new PortoRpcClient();
  }
  
  /**
   * Recover wallet using passkey
   */
  async recoverWallet(tag: string): Promise<RecoveredWallet | null> {
    try {
      // Step 1: Retrieve stored account data
      const storedData = await AsyncStorage.getItem(`porto_account_${tag}`);
      if (!storedData) {
        console.log('No Porto wallet found for tag:', tag);
        return null;
      }
      
      const accountData = JSON.parse(storedData);
      
      // Step 2: Verify account exists on-chain
      const accountInfo = await this.rpcClient.request('wallet_getAccounts', [{
        id: accountData.passkeyId,
        chainId: accountData.chainId
      }]);
      
      if (!accountInfo || accountInfo.length === 0) {
        throw new Error('Account not found on-chain');
      }
      
      // Step 3: Trigger passkey authentication to verify ownership
      // This proves the user still has access to the passkey
      const challengeBytes = randomBytes(32);
      const challenge = btoa(String.fromCharCode(...Array.from(challengeBytes)));
      await PasskeyManager.signWithPasskey(accountData.passkeyId, challenge);
      
      console.log('Wallet recovered successfully:', accountData.address);
      
      // Step 4: Update active account
      await AsyncStorage.setItem('porto_active_account', tag);
      
      return {
        address: accountData.address,
        passkeyId: accountData.passkeyId,
        tag: accountData.tag,
        chainId: accountData.chainId
      };
      
    } catch (error) {
      console.error('Wallet recovery failed:', error);
      return null;
    }
  }

  /**
   * Recover wallet using passkey (without tag)
   * This searches through all stored accounts
   */
  async recoverAnyWallet(): Promise<RecoveredWallet | null> {
    try {
      // Get all stored accounts
      const keys = await AsyncStorage.getAllKeys();
      const accountKeys = keys.filter(k => k.startsWith('porto_account_'));
      
      if (accountKeys.length === 0) {
        console.log('No Porto wallets found on device');
        return null;
      }
      
      // Try to recover each account
      for (const key of accountKeys) {
        const data = await AsyncStorage.getItem(key);
        if (!data) continue;
        
        const accountData = JSON.parse(data);
        
        try {
          // Try to authenticate with this account's passkey
          const challengeBytes = randomBytes(32);
          const challenge = btoa(String.fromCharCode(...Array.from(challengeBytes)));
          await PasskeyManager.signWithPasskey(accountData.passkeyId, challenge);
          
          // If successful, this is the user's wallet
          console.log('Wallet recovered:', accountData.address);
          
          // Update active account
          await AsyncStorage.setItem('porto_active_account', accountData.tag);
          
          return {
            address: accountData.address,
            passkeyId: accountData.passkeyId,
            tag: accountData.tag,
            chainId: accountData.chainId
          };
        } catch {
          // This passkey doesn't work, try the next one
          continue;
        }
      }
      
      console.log('No recoverable wallets found');
      return null;
      
    } catch (error) {
      console.error('Wallet recovery failed:', error);
      return null;
    }
  }

  /**
   * Check if any Porto wallets exist on device
   */
  async hasStoredWallets(): Promise<boolean> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      return keys.some(k => k.startsWith('porto_account_'));
    } catch {
      return false;
    }
  }

  /**
   * Delete wallet data (for testing/development)
   */
  async deleteWallet(tag: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(`porto_account_${tag}`);
      
      // If this was the active account, clear it
      const activeTag = await AsyncStorage.getItem('porto_active_account');
      if (activeTag === tag) {
        await AsyncStorage.removeItem('porto_active_account');
      }
    } catch (error) {
      console.error('Failed to delete wallet:', error);
    }
  }

  /**
   * Clear all Porto wallet data (for testing/development)
   */
  async clearAllWallets(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const accountKeys = keys.filter(k => 
        k.startsWith('porto_account_') || k === 'porto_active_account'
      );
      
      await AsyncStorage.multiRemove(accountKeys);
      console.log('All Porto wallets cleared');
    } catch (error) {
      console.error('Failed to clear wallets:', error);
    }
  }
}