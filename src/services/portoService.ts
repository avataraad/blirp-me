/**
 * Porto Smart Wallet Service - RPC Implementation
 * Direct RPC communication to bypass SDK browser dependencies
 * Uses ephemeral key pattern for secure wallet creation
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { PortoRpcClient } from './portoRpcClient';
import { PortoAccountService } from './portoAccountService';
import { PortoTransactionService } from './portoTransactionService';
import { PortoRecoveryService } from './portoRecoveryService';
import { PasskeyManager } from './passkeyManager';

interface PortoWallet {
  address: string;
  tag: string;
  type: 'porto';
  passkeyId?: string;
  chainId?: number;
}

export class PortoWalletService {
  private rpcClient: PortoRpcClient;
  private accountService: PortoAccountService;
  private transactionService: PortoTransactionService;
  private recoveryService: PortoRecoveryService;
  private currentAccount: any = null;

  constructor() {
    this.rpcClient = new PortoRpcClient();
    this.accountService = new PortoAccountService();
    this.transactionService = new PortoTransactionService();
    this.recoveryService = new PortoRecoveryService();
  }

  /**
   * Initialize the service
   */
  async initialize(): Promise<void> {
    try {
      // Check if passkeys are available
      const available = await PasskeyManager.isAvailable();
      if (!available) {
        console.warn('Passkeys not available on this device');
      }
      
      // Load active account if exists
      const activeAccount = await this.accountService.getActiveAccount();
      if (activeAccount) {
        this.currentAccount = activeAccount;
        console.log('Porto service initialized with account:', activeAccount.address);
      }
    } catch (error) {
      console.error('Porto service initialization failed:', error);
    }
  }

  /**
   * Create new Porto smart wallet
   */
  async createPortoWallet(tag: string): Promise<PortoWallet> {
    try {
      // Check if passkeys are available
      const available = await PasskeyManager.isAvailable();
      if (!available) {
        throw new Error('Passkeys not available on this device. iOS 17.0+ required.');
      }
      
      // Create the smart wallet
      const wallet = await this.accountService.createSmartWallet(tag);
      
      this.currentAccount = {
        address: wallet.address,
        passkeyId: wallet.passkeyId,
        tag,
        chainId: wallet.chainId
      };
      
      return {
        address: wallet.address,
        tag,
        type: 'porto',
        passkeyId: wallet.passkeyId,
        chainId: wallet.chainId
      };
    } catch (error) {
      console.error('Failed to create Porto wallet:', error);
      throw error;
    }
  }

  /**
   * Recover existing Porto wallet
   */
  async recoverWallet(tag?: string): Promise<PortoWallet | null> {
    try {
      let wallet;
      
      if (tag) {
        // Recover specific wallet by tag
        wallet = await this.recoveryService.recoverWallet(tag);
      } else {
        // Try to recover any wallet
        wallet = await this.recoveryService.recoverAnyWallet();
      }
      
      if (wallet) {
        this.currentAccount = wallet;
        return {
          address: wallet.address,
          tag: wallet.tag,
          type: 'porto',
          passkeyId: wallet.passkeyId,
          chainId: wallet.chainId
        };
      }
      
      return null;
    } catch (error) {
      console.error('Wallet recovery failed:', error);
      return null;
    }
  }

  /**
   * Send transaction
   */
  async sendTransaction(
    to: string,
    value: string,
    data?: string
  ): Promise<string> {
    if (!this.currentAccount) {
      throw new Error('No wallet connected');
    }
    
    const bundleId = await this.transactionService.sendTransaction(
      this.currentAccount.address,
      this.currentAccount.passkeyId,
      [{ to, value, data }]
    );
    
    return bundleId;
  }

  /**
   * Send multiple transactions (batch)
   */
  async sendBatchTransaction(
    calls: Array<{ to: string; value?: string; data?: string }>
  ): Promise<string> {
    if (!this.currentAccount) {
      throw new Error('No wallet connected');
    }
    
    const bundleId = await this.transactionService.sendTransaction(
      this.currentAccount.address,
      this.currentAccount.passkeyId,
      calls
    );
    
    return bundleId;
  }

  /**
   * Estimate gas for transaction
   */
  async estimateGas(
    to: string,
    value: string,
    data?: string
  ): Promise<{ gasAmount: string; feeAmount: string; feeToken: string }> {
    if (!this.currentAccount) {
      throw new Error('No wallet connected');
    }
    
    return await this.transactionService.estimateGas(
      this.currentAccount.address,
      [{ to, value, data }]
    );
  }

  /**
   * Get transaction status
   */
  async getTransactionStatus(bundleId: string): Promise<{
    status: 'pending' | 'success' | 'failed';
    transactionHash?: string;
    error?: string;
  }> {
    return await this.transactionService.getTransactionStatus(bundleId);
  }

  /**
   * Wait for transaction confirmation
   */
  async waitForTransaction(bundleId: string): Promise<{
    status: 'pending' | 'success' | 'failed';
    transactionHash?: string;
    error?: string;
  }> {
    return await this.transactionService.waitForTransaction(bundleId);
  }

  /**
   * Get current wallet
   */
  getCurrentWallet(): PortoWallet | null {
    if (!this.currentAccount) return null;
    
    return {
      address: this.currentAccount.address,
      tag: this.currentAccount.tag,
      type: 'porto',
      passkeyId: this.currentAccount.passkeyId,
      chainId: this.currentAccount.chainId
    };
  }

  /**
   * Sign out (clear current account)
   */
  async signOut(): Promise<void> {
    this.currentAccount = null;
    await AsyncStorage.removeItem('porto_active_account');
  }

  /**
   * Check if Porto wallets exist on device
   */
  async hasStoredWallets(): Promise<boolean> {
    return await this.recoveryService.hasStoredWallets();
  }

  /**
   * List all accounts
   */
  async listAccounts(): Promise<PortoWallet[]> {
    const accounts = await this.accountService.listAccounts();
    return accounts.map(acc => ({
      address: acc.address,
      tag: acc.tag,
      type: 'porto' as const,
      passkeyId: acc.passkeyId,
      chainId: acc.chainId
    }));
  }

  /**
   * Switch to a different account
   */
  async switchAccount(tag: string): Promise<boolean> {
    const account = await this.accountService.getAccountData(tag);
    if (account) {
      this.currentAccount = account;
      await AsyncStorage.setItem('porto_active_account', tag);
      return true;
    }
    return false;
  }

  /**
   * Check if passkeys are available
   */
  async isAvailable(): Promise<boolean> {
    return await PasskeyManager.isAvailable();
  }

  /**
   * Get wallet balance (placeholder - integrate with existing balance service)
   */
  async getBalance(address: string): Promise<{
    eth: string;
    usdc: string;
  }> {
    // This would use viem or your existing balance service
    // For now, return mock data
    return {
      eth: '0',
      usdc: '0'
    };
  }
}

// Export singleton instance
const portoService = new PortoWalletService();
export default portoService;