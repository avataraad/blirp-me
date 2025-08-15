import React, { createContext, useContext, useState, ReactNode } from 'react';
import { privateKeyToAccount } from 'viem/accounts';
import { signTransaction as viemSignTransaction } from 'viem/actions';
import type { TransactionRequest } from 'viem';
import * as Keychain from 'react-native-keychain';
import walletService from '../services/walletService';
import userProfileService from '../services/userProfileService';
import { CloudBackup, isCloudBackupAvailable } from '../modules/cloudBackup';
import { createBackup } from '../modules/cloudBackup/helpers';
import portoService from '../services/portoService';
import { PasskeyManager } from '../services/passkeyManager';

type WalletType = 'EOA' | 'Porto';

interface WalletData {
  address: string;
  tag: string;
  type: WalletType;
  passkeyId?: string;  // For Porto wallets
}

interface WalletContextType {
  walletAddress: string | null;
  walletTag: string | null;
  wallet: WalletData | null;
  walletType: WalletType | null;
  balance: string;
  balanceInUSD: number;
  usdcBalance?: string;  // For Porto wallets
  usdcBalanceInUSD?: number;  // For Porto wallets
  isLoading: boolean;
  createWallet: (tag: string) => Promise<{ success: boolean; wallet?: WalletData }>;
  createPortoWallet: (tag: string) => Promise<{ success: boolean; wallet?: WalletData }>;
  unlockWallet: (tag: string) => Promise<boolean>;
  restoreFromCloudBackup: (tag: string, privateKey?: string) => Promise<boolean>;
  restorePortoWallet: (address: string, tag: string) => Promise<boolean>;
  refreshBalance: () => Promise<void>;
  signTransaction: (transaction: TransactionRequest) => Promise<string>;
  logout: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};

interface WalletProviderProps {
  children: ReactNode;
}

export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletTag, setWalletTag] = useState<string | null>(null);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [walletType, setWalletType] = useState<WalletType | null>(null);
  const [balance, setBalance] = useState<string>('0.0000');
  const [balanceInUSD, setBalanceInUSD] = useState<number>(0);
  const [usdcBalance, setUsdcBalance] = useState<string>('0.00');
  const [usdcBalanceInUSD, setUsdcBalanceInUSD] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Create new wallet
  const createWallet = async (tag: string): Promise<{ success: boolean; wallet?: WalletData }> => {
    try {
      setIsLoading(true);

      // Check if tag is available in user profiles table
      const isAvailable = await userProfileService.isTagAvailable(tag);
      if (!isAvailable) {
        throw new Error('Tag already taken');
      }

      // Generate new wallet
      const { mnemonic, address, privateKey } = await walletService.generateWallet();

      // Encrypt and store the mnemonic
      // In production, this should use a key derived from biometrics
      const encryptionKey = `${tag}_key`; // Simplified for now
      const encryptedSeed = await walletService.encryptData(mnemonic, encryptionKey);

      // Store encrypted seed
      const stored = await walletService.storeEncryptedSeed(
        tag,
        JSON.stringify(encryptedSeed)
      );

      if (!stored) {
        throw new Error('Failed to store wallet');
      }

      // Store private key in secure enclave for fast transaction signing
      try {
        await Keychain.setInternetCredentials(
          'blirpme_wallet',
          address, // username is the wallet address
          privateKey, // password is the private key
          {
            accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET,
            accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
            authenticatePrompt: 'Store wallet securely'
          }
        );
        console.log('Private key stored in secure enclave');
      } catch (error) {
        console.error('Failed to store in secure enclave:', error);
        // Don't fail wallet creation if secure enclave storage fails
        // The app can still work with passkey-only mode
      }

      // Create cloud backup if available
      if (isCloudBackupAvailable()) {
        try {
          console.log('Creating cloud backup for wallet...');
          // Remove 0x prefix from private key for cloud backup
          const privateKeyForBackup = privateKey.replace(/^0x/i, '');
          await createBackup(`${tag} Wallet Backup`, privateKeyForBackup);
          console.log('Cloud backup created successfully');
        } catch (error) {
          console.error('Cloud backup failed:', error);
          // Don't fail wallet creation if backup fails
          // User can retry backup later
        }
      }

      // Create wallet data object for EOA
      const walletData: WalletData = { 
        address, 
        tag, 
        type: 'EOA' 
      };

      // Store wallet data in state (NOT the private key)
      setWalletAddress(address);
      setWalletTag(tag);
      setWallet(walletData);
      setWalletType('EOA');

      return { success: true, wallet: walletData };
    } catch (error) {
      console.error('Error creating wallet:', error);
      return { success: false };
    } finally {
      setIsLoading(false);
    }
  };

  // Create new Porto wallet
  const createPortoWallet = async (tag: string): Promise<{ success: boolean; wallet?: WalletData }> => {
    try {
      setIsLoading(true);

      // Check if tag is available
      const isAvailable = await userProfileService.isTagAvailable(tag);
      if (!isAvailable) {
        throw new Error('Username already taken');
      }

      // Create Porto wallet (which includes passkey creation)
      console.log('📱 Creating Porto wallet...');
      const portoWallet = await portoService.createPortoWallet(tag);
      
      // Store wallet info in MMKV
      const stored = await walletService.storeWalletInfo(
        portoWallet.address,
        tag,
        'Porto'  // Store type indicator
      );

      if (!stored) {
        throw new Error('Failed to store Porto wallet');
      }

      // Store passkey ID for later use
      if (portoWallet.passkeyId) {
        await walletService.storePasskeyId(portoWallet.address, portoWallet.passkeyId);
      }

      // Create wallet data object for Porto
      const walletData: WalletData = { 
        address: portoWallet.address, 
        tag, 
        type: 'Porto',
        passkeyId: portoWallet.passkeyId
      };

      // Store wallet data in state
      setWalletAddress(portoWallet.address);
      setWalletTag(tag);
      setWallet(walletData);
      setWalletType('Porto');

      return { success: true, wallet: walletData };
    } catch (error) {
      console.error('Error creating Porto wallet:', error);
      return { success: false };
    } finally {
      setIsLoading(false);
    }
  };

  // Unlock existing wallet
  const unlockWallet = async (tag: string): Promise<boolean> => {
    try {
      setIsLoading(true);

      // Get encrypted seed
      const encryptedSeedString = await walletService.getEncryptedSeed(tag);
      if (!encryptedSeedString) {
        throw new Error('Wallet not found');
      }

      // Decrypt seed
      const encryptedSeed = JSON.parse(encryptedSeedString);
      const encryptionKey = `${tag}_key`; // Simplified for now
      const seedOrPrivateKey = await walletService.decryptData(encryptedSeed, encryptionKey);

      // Restore wallet - check if it's a private key or mnemonic
      let address: string;
      let privateKey: string;
      if (seedOrPrivateKey.startsWith('0x') && seedOrPrivateKey.length === 66) {
        // It's a private key (from cloud restore)
        const account = privateKeyToAccount(seedOrPrivateKey as `0x${string}`);
        address = account.address;
        privateKey = seedOrPrivateKey;
      } else {
        // It's a mnemonic (from original creation)
        const walletData = await walletService.restoreWalletFromMnemonic(seedOrPrivateKey);
        address = walletData.address;
        privateKey = walletData.privateKey;
      }

      // Store wallet data in state (NOT the private key)
      setWalletAddress(address);
      setWalletTag(tag);
      setWallet({ address, tag });

      // Sync private key to secure enclave if not already there
      try {
        const existingCredentials = await Keychain.getInternetCredentials('blirpme_wallet');
        if (!existingCredentials || existingCredentials.username !== address) {
          await Keychain.setInternetCredentials(
            'blirpme_wallet',
            address,
            privateKey,
            {
              accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET,
              accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
              authenticatePrompt: 'Sync wallet to secure storage'
            }
          );
          console.log('Private key synced to secure enclave');
        }
      } catch (error) {
        console.error('Failed to sync to secure enclave:', error);
      }

      // Refresh balance
      await refreshBalance();

      return true;
    } catch (error) {
      console.error('Error unlocking wallet:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh balance
  const refreshBalance = async () => {
    if (!walletAddress) {return;}

    try {
      const balanceData = await walletService.getBalance(walletAddress);
      setBalance(balanceData.balance);
      setBalanceInUSD(balanceData.balanceInUSD);
    } catch (error) {
      console.error('Error refreshing balance:', error);
    }
  };

  // Sign transaction
  const signTransaction = async (
    transaction: TransactionRequest
  ): Promise<string> => {
    if (!walletAddress) {
      throw new Error('No wallet available');
    }

    try {
      // Always get private key from secure enclave with biometric auth
      const credentials = await Keychain.getInternetCredentials(
        'blirpme_wallet',
        {
          authenticationPrompt: {
            title: 'Sign Transaction',
            subtitle: 'Authenticate to sign',
            description: 'Your biometric is required to sign this transaction',
            cancel: 'Cancel'
          }
        }
      );
      
      if (!credentials || !credentials.password) {
        throw new Error('Failed to retrieve wallet from secure storage');
      }

      const privateKey = credentials.password;
      const account = privateKeyToAccount(privateKey as `0x${string}`);
      const signedTx = await viemSignTransaction({
        account,
        ...transaction,
      });
      
      // Clear the private key from memory immediately
      // Note: This doesn't guarantee immediate memory clearing in JS,
      // but it's the best we can do
      Object.assign(credentials, { password: null });
      
      return signedTx;
    } catch (error) {
      console.error('Error signing transaction:', error);
      if (error.message?.includes('UserCancel')) {
        throw new Error('Transaction cancelled by user');
      }
      throw error;
    }
  };

  // Restore Porto wallet
  const restorePortoWallet = async (address: string, tag: string): Promise<boolean> => {
    try {
      setIsLoading(true);

      // For Porto wallets, we don't have a private key
      // The wallet is a smart contract wallet controlled by passkeys
      setWalletAddress(address);
      setWalletTag(tag);
      setWallet({ address, tag });

      // Refresh balance
      await refreshBalance();

      return true;
    } catch (error) {
      console.error('Error restoring Porto wallet:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Restore wallet from cloud backup
  const restoreFromCloudBackup = async (tag: string, privateKey?: string): Promise<boolean> => {
    try {
      setIsLoading(true);

      let privateKeyToUse = privateKey;

      // If no private key provided, read from cloud
      if (!privateKeyToUse) {
        // Check if cloud backup is available
        if (!isCloudBackupAvailable()) {
          throw new Error('Cloud backup not available on this device');
        }

        // Read backup data from cloud
        const backupData = await CloudBackup.readData();
        if (!backupData.privateKey) {
          throw new Error('No backup data found');
        }
        privateKeyToUse = backupData.privateKey;
      }

      // Create account from backup (add 0x prefix back)
      const privateKeyWithPrefix = privateKeyToUse.startsWith('0x')
        ? privateKeyToUse
        : `0x${privateKeyToUse}`;
      const account = privateKeyToAccount(privateKeyWithPrefix as `0x${string}`);

      // For restored wallets, we'll store the private key as the "seed"
      // since we can't recover the original mnemonic
      const encryptionKey = `${tag}_key`;
      const encryptedPrivateKey = await walletService.encryptData(privateKeyWithPrefix, encryptionKey);

      // Store encrypted private key (acting as seed for restored wallets)
      const stored = await walletService.storeEncryptedSeed(
        tag,
        JSON.stringify(encryptedPrivateKey)
      );

      if (!stored) {
        throw new Error('Failed to store wallet locally');
      }

      // Set wallet state (NOT the private key)
      setWalletAddress(account.address);
      setWalletTag(tag);
      setWallet({ address: account.address, tag });

      // Store private key in secure enclave for fast transaction signing
      try {
        await Keychain.setInternetCredentials(
          'blirpme_wallet',
          account.address,
          privateKeyWithPrefix,
          {
            accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET,
            accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
            authenticatePrompt: 'Store recovered wallet securely'
          }
        );
        console.log('Recovered private key stored in secure enclave');
      } catch (error) {
        console.error('Failed to store recovered key in secure enclave:', error);
        // Don't fail recovery if secure enclave storage fails
      }

      // Refresh balance
      await refreshBalance();

      return true;
    } catch (error) {
      console.error('Error restoring from cloud backup:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Logout
  const logout = () => {
    setWalletAddress(null);
    setWalletTag(null);
    setWallet(null);
    setBalance('0.0000');
    setBalanceInUSD(0);
  };

  return (
    <WalletContext.Provider
      value={{
        walletAddress,
        walletTag,
        wallet,
        walletType,
        balance,
        balanceInUSD,
        usdcBalance,
        usdcBalanceInUSD,
        isLoading,
        createWallet,
        createPortoWallet,
        unlockWallet,
        restoreFromCloudBackup,
        restorePortoWallet,
        refreshBalance,
        signTransaction,
        logout,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};
