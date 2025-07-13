import React, { createContext, useContext, useState, ReactNode } from 'react';
import { privateKeyToAccount } from 'viem/accounts';
import { signTransaction as viemSignTransaction } from 'viem/actions';
import type { TransactionRequest } from 'viem';
import walletService from '../services/walletService';
import { CloudBackup, isCloudBackupAvailable } from '../modules/cloudBackup';
import { createBackup } from '../modules/cloudBackup/helpers';

interface WalletContextType {
  currentPrivateKey: string | null;
  walletAddress: string | null;
  walletTag: string | null;
  balance: string;
  balanceInUSD: number;
  isLoading: boolean;
  createWallet: (tag: string) => Promise<boolean>;
  unlockWallet: (tag: string) => Promise<boolean>;
  restoreFromCloudBackup: (tag: string, privateKey?: string) => Promise<boolean>;
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
  const [currentPrivateKey, setCurrentPrivateKey] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletTag, setWalletTag] = useState<string | null>(null);
  const [balance, setBalance] = useState<string>('0.0000');
  const [balanceInUSD, setBalanceInUSD] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Create new wallet
  const createWallet = async (tag: string): Promise<boolean> => {
    try {
      setIsLoading(true);

      // Check if tag is available
      const isAvailable = await walletService.isTagAvailable(tag);
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

      // Store wallet data in state
      setCurrentPrivateKey(privateKey);
      setWalletAddress(address);
      setWalletTag(tag);

      return true;
    } catch (error) {
      console.error('Error creating wallet:', error);
      return false;
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

      setCurrentPrivateKey(privateKey);
      setWalletAddress(address);
      setWalletTag(tag);

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
    if (!currentPrivateKey) {
      throw new Error('No wallet available');
    }

    try {
      const account = privateKeyToAccount(currentPrivateKey as `0x${string}`);
      const signedTx = await viemSignTransaction({
        account,
        ...transaction,
      });
      return signedTx;
    } catch (error) {
      console.error('Error signing transaction:', error);
      throw error;
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

      // Set wallet state
      setCurrentPrivateKey(privateKeyWithPrefix);
      setWalletAddress(account.address);
      setWalletTag(tag);

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
    setCurrentPrivateKey(null);
    setWalletAddress(null);
    setWalletTag(null);
    setBalance('0.0000');
    setBalanceInUSD(0);
  };

  return (
    <WalletContext.Provider
      value={{
        currentPrivateKey,
        walletAddress,
        walletTag,
        balance,
        balanceInUSD,
        isLoading,
        createWallet,
        unlockWallet,
        restoreFromCloudBackup,
        refreshBalance,
        signTransaction,
        logout,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};
