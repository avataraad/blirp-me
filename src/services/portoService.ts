/**
 * Porto Smart Wallet Service
 * Uses Porto SDK with RPC server mode for React Native
 * Integrates with existing passkey system for authentication
 */

import { Porto, Mode, Key } from 'porto';
import { base } from 'viem/chains';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Passkey } from 'react-native-passkey';
import { Account as PortoAccount } from 'porto/viem';

// USDC token address on Base mainnet
const USDC_BASE_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

// Custom storage adapter for React Native using AsyncStorage
const portoStorage = {
  async get(key: string): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(`porto_${key}`);
    } catch (error) {
      console.error('Porto storage get error:', error);
      return null;
    }
  },
  
  async set(key: string, value: string): Promise<void> {
    try {
      await AsyncStorage.setItem(`porto_${key}`, value);
    } catch (error) {
      console.error('Porto storage set error:', error);
    }
  },
  
  async delete(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(`porto_${key}`);
    } catch (error) {
      console.error('Porto storage delete error:', error);
    }
  }
};

// Custom WebAuthn creation function using React Native Passkey
const createWebAuthnCredential = async (options: any) => {
  try {
    // Use React Native Passkey library to create credential
    const result = await Passkey.create({
      rpId: 'blirp.me',
      rpName: 'BlirpMe',
      userName: options.user?.name || 'BlirpMe User',
      userDisplayName: options.user?.displayName || 'BlirpMe User',
      userId: options.user?.id || crypto.randomUUID(),
      challenge: options.challenge,
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        residentKey: 'required',
        userVerification: 'required'
      },
      attestation: 'none',
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' }, // ES256
      ],
    });
    
    return {
      id: result.id,
      rawId: result.rawId,
      response: {
        clientDataJSON: result.response.clientDataJSON,
        attestationObject: result.response.attestationObject,
      },
      type: 'public-key'
    };
  } catch (error) {
    console.error('Passkey creation error:', error);
    throw error;
  }
};

// Custom WebAuthn sign function using React Native Passkey
const signWithWebAuthn = async (options: any) => {
  try {
    const result = await Passkey.get({
      rpId: 'blirp.me',
      challenge: options.challenge,
      userVerification: 'required',
      allowCredentials: options.allowCredentials
    });
    
    return {
      id: result.id,
      rawId: result.rawId,
      response: {
        clientDataJSON: result.response.clientDataJSON,
        authenticatorData: result.response.authenticatorData,
        signature: result.response.signature,
        userHandle: result.response.userHandle,
      },
      type: 'public-key'
    };
  } catch (error) {
    console.error('Passkey signing error:', error);
    throw error;
  }
};

class PortoWalletService {
  private porto: any = null;
  private currentAccount: any = null;
  
  /**
   * Initialize Porto with RPC server mode for React Native
   */
  async initialize() {
    if (this.porto) return;
    
    try {
      console.log('Initializing Porto SDK with RPC server mode...');
      
      // Create Porto instance with RPC server mode
      // This is the recommended approach for React Native
      this.porto = Porto.create({
        mode: Mode.rpcServer({
          keystoreHost: 'blirp.me', // Your app's domain
        }),
        storage: portoStorage,
        chains: [base],
        feeToken: USDC_BASE_ADDRESS, // Use USDC for gas payments
      });
      
      console.log('Porto SDK initialized successfully');
    } catch (error) {
      console.error('Porto initialization error:', error);
      throw error;
    }
  }
  
  /**
   * Create a new Porto smart wallet with passkey
   */
  async createPortoWallet(tag: string): Promise<{
    address: string;
    tag: string;
    type: 'porto';
  }> {
    await this.initialize();
    
    try {
      console.log('Creating Porto wallet for tag:', tag);
      
      // Step 1: Create a passkey with our custom WebAuthn function
      const userId = new TextEncoder().encode(tag);
      const passkey = await Key.createWebAuthnP256({
        label: `${tag}'s Porto Wallet`,
        userId,
        createFn: createWebAuthnCredential, // Use our React Native implementation
      });
      
      console.log('Passkey created successfully');
      
      // Step 2: Connect and create account in one step using wallet_connect
      const result = await this.porto.provider.request({
        method: 'wallet_connect',
        params: [{
          capabilities: {
            createAccount: true,
            email: false, // We don't need email for now
            grantAdmins: [passkey], // Use the passkey as admin
          }
        }]
      });
      
      console.log('Porto account created:', result);
      
      // Store account data
      const accountData = {
        address: result.accounts[0].address,
        tag,
        type: 'porto' as const,
        chainId: base.id,
        createdAt: Date.now(),
        passkeyId: passkey.id,
      };
      
      await AsyncStorage.setItem(
        `porto_wallet_${tag}`,
        JSON.stringify(accountData)
      );
      
      this.currentAccount = accountData;
      
      return {
        address: accountData.address,
        tag: accountData.tag,
        type: 'porto',
      };
    } catch (error) {
      console.error('Porto wallet creation error:', error);
      throw error;
    }
  }
  
  /**
   * Recover Porto wallet using passkey
   */
  async recoverPortoWallet(tag: string): Promise<{
    address: string;
    tag: string;
    type: 'porto';
  } | null> {
    await this.initialize();
    
    try {
      console.log('Recovering Porto wallet for tag:', tag);
      
      // Get stored wallet data
      const storedData = await AsyncStorage.getItem(`porto_wallet_${tag}`);
      if (!storedData) {
        console.log('No Porto wallet found for tag:', tag);
        return null;
      }
      
      const accountData = JSON.parse(storedData);
      
      // Connect with existing account
      const result = await this.porto.provider.request({
        method: 'wallet_connect',
        params: [{
          capabilities: {
            selectAccount: {
              address: accountData.address,
              key: {
                credentialId: accountData.passkeyId,
              }
            }
          }
        }]
      });
      
      console.log('Porto wallet recovered:', result);
      
      this.currentAccount = accountData;
      
      return {
        address: accountData.address,
        tag: accountData.tag,
        type: 'porto',
      };
    } catch (error) {
      console.error('Porto wallet recovery error:', error);
      return null;
    }
  }
  
  /**
   * Send transaction with Porto wallet
   */
  async sendTransaction(calls: any[]): Promise<string> {
    if (!this.currentAccount) {
      throw new Error('No Porto wallet connected');
    }
    
    try {
      console.log('Sending Porto transaction:', calls);
      
      // Prepare the transaction
      const prepared = await this.porto.provider.request({
        method: 'wallet_prepareCalls',
        params: [{
          calls,
          chainId: `0x${base.id.toString(16)}`,
          from: this.currentAccount.address,
          capabilities: {
            feeToken: USDC_BASE_ADDRESS, // Pay gas in USDC
          }
        }]
      });
      
      console.log('Transaction prepared:', prepared);
      
      // Sign with passkey (will trigger biometric prompt)
      const signature = await signWithWebAuthn({
        challenge: prepared.digest,
        allowCredentials: [{
          id: this.currentAccount.passkeyId,
          type: 'public-key'
        }]
      });
      
      // Execute the transaction
      const result = await this.porto.provider.request({
        method: 'wallet_sendPreparedCalls',
        params: [{
          ...prepared,
          signature
        }]
      });
      
      console.log('Transaction sent:', result);
      
      return result.id;
    } catch (error) {
      console.error('Porto transaction error:', error);
      throw error;
    }
  }
  
  /**
   * Get Porto wallet balance
   */
  async getBalance(address: string): Promise<{
    eth: string;
    usdc: string;
  }> {
    // This would use viem to get balances
    // For now, return mock data
    return {
      eth: '0',
      usdc: '0'
    };
  }
  
  /**
   * Grant session permissions for smoother UX
   */
  async grantSessionPermissions(permissions: any, expiry: number) {
    if (!this.currentAccount) {
      throw new Error('No Porto wallet connected');
    }
    
    try {
      const result = await this.porto.provider.request({
        method: 'wallet_grantPermissions',
        params: [{
          address: this.currentAccount.address,
          permissions,
          expiry,
        }]
      });
      
      console.log('Permissions granted:', result);
      return result;
    } catch (error) {
      console.error('Permission grant error:', error);
      throw error;
    }
  }
}

export default new PortoWalletService();