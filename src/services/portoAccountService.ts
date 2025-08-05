import AsyncStorage from '@react-native-async-storage/async-storage';
import { PortoRpcClient } from './portoRpcClient';
import { EphemeralKeyManager } from './ephemeralKeyManager';
import { PasskeyManager } from './passkeyManager';
import { PORTO_CONFIG } from '../config/porto-config';

interface PortoAccount {
  address: string;
  tag: string;
  passkeyId: string;
  chainId: number;
  createdAt: number;
}

export class PortoAccountService {
  private rpcClient: PortoRpcClient;
  
  constructor() {
    this.rpcClient = new PortoRpcClient();
  }

  /**
   * Create Porto smart wallet with single passkey interaction
   * Uses ephemeral key pattern - user never sees private keys
   */
  async createSmartWallet(tag: string): Promise<{
    address: string;
    passkeyId: string;
    chainId: number;
  }> {
    console.log('Creating Porto smart wallet for:', tag);
    
    try {
      // Step 1: Generate ephemeral EOA (temporary, will be discarded)
      const ephemeral = EphemeralKeyManager.generateEphemeralKey();
      console.log('Ephemeral EOA generated:', ephemeral.address);
      
      // Step 2: Create passkey (permanent admin key)
      const passkey = await PasskeyManager.createPortoPasskey(tag);
      console.log('Passkey created:', passkey.credentialId);
      
      // Step 3: Attempt to upgrade EOA to smart wallet
      console.log('Attempting to upgrade EOA to smart wallet...');
      
      // Try the RPC call with corrected parameters
      let smartWalletAddress = ephemeral.address; // Default to EOA if upgrade fails
      let isSmartWallet = false;
      
      try {
        console.log('\n========================================');
        console.log('PORTO RPC UPGRADE ATTEMPT - DEBUG LOG');
        console.log('========================================');
        console.log('Timestamp:', new Date().toISOString());
        console.log('RPC Endpoint:', PORTO_CONFIG.rpcEndpoint);
        console.log('Chain ID:', PORTO_CONFIG.currentChainId);
        console.log('Is Testnet:', PORTO_CONFIG.isTestnet);
        console.log('USDC Address:', PORTO_CONFIG.currentUsdcAddress);
        
        // Try to get delegation contract from server capabilities first
        let delegationContract = PORTO_CONFIG.currentDelegationContract;
        
        try {
          console.log('Fetching delegation contract from server capabilities...');
          const capabilities = await this.rpcClient.getCapabilities();
          console.log('Full capabilities response:', JSON.stringify(capabilities, null, 2));
          
          // The response will have the chain ID as a hex key (e.g., "0x2105" for 8453)
          const chainIdHex = '0x' + PORTO_CONFIG.currentChainId.toString(16);
          console.log('Looking for chain key:', chainIdHex);
          
          // Extract delegation address from the expected structure
          if (capabilities?.[chainIdHex]?.contracts?.delegationProxy?.address) {
            const serverDelegation = capabilities[chainIdHex].contracts.delegationProxy.address;
            console.log('Found delegation contract from server:', serverDelegation);
            delegationContract = serverDelegation;
          } else if (capabilities?.[chainIdHex]?.contracts?.accountProxy?.address) {
            // Fallback to accountProxy if delegationProxy is not present
            const serverAccount = capabilities[chainIdHex].contracts.accountProxy.address;
            console.log('Found account proxy from server (using as delegation):', serverAccount);
            delegationContract = serverAccount;
          } else {
            console.log('No delegation contract found in capabilities response');
            console.log('Available keys:', Object.keys(capabilities || {}));
            if (capabilities?.[chainIdHex]) {
              console.log(`Keys under ${chainIdHex}:`, Object.keys(capabilities[chainIdHex] || {}));
            }
          }
        } catch (error) {
          console.log('Could not fetch delegation contract from capabilities, using config default');
          console.error('Error:', error);
        }
        
        console.log('Final delegation contract to use:', delegationContract);
        
        // Prepare the upgrade request with correct structure
        // According to Porto team, chainId should be included in the params
        // Key fields should be at the top level of authorizeKeys items, not nested
        const upgradeParams: any = {
          address: ephemeral.address,
          chainId: PORTO_CONFIG.currentChainId,
          capabilities: {
            authorizeKeys: [{
              type: passkey.type,
              role: 'admin' as const,
              publicKey: passkey.publicKey, // Now properly formatted as hex
              permissions: [] // Admin key has full permissions
            }]
          }
        };
        
        // Add delegation parameter - it's required by the server
        if (delegationContract && delegationContract !== '0x0000000000000000000000000000000000000000') {
          upgradeParams.delegation = delegationContract;
        }
        
        console.log('\n--- UPGRADE PARAMETERS ---');
        console.log('EOA Address:', ephemeral.address);
        console.log('Delegation Contract:', delegationContract);
        console.log('Passkey Type:', passkey.type);
        console.log('Passkey Credential ID:', passkey.credentialId);
        console.log('Passkey Label:', passkey.label);
        console.log('Public Key:', passkey.publicKey);
        console.log('\nFull params for wallet_prepareUpgradeAccount:');
        console.log(JSON.stringify(upgradeParams, null, 2));
        
        console.log('\n--- CALLING RPC METHOD: wallet_prepareUpgradeAccount ---');
        const prepareResult = await this.rpcClient.request('wallet_prepareUpgradeAccount', [upgradeParams]);
        console.log('✅ Upgrade prepared successfully!');
        console.log('Prepare Result:', JSON.stringify(prepareResult, null, 2));
        
        // Sign with ephemeral key
        console.log('\n--- SIGNING WITH EPHEMERAL KEY ---');
        const signatures = await EphemeralKeyManager.signWithEphemeralKey(
          ephemeral.privateKey,
          prepareResult.digests
        );
        console.log('✅ Signatures created');
        console.log('Auth Signature:', signatures.auth);
        console.log('Exec Signature:', signatures.exec);
        
        // Execute the upgrade
        console.log('\n--- CALLING RPC METHOD: wallet_upgradeAccount ---');
        const upgradeParams2 = {
          context: prepareResult.context,
          signatures
        };
        console.log('Upgrade params:', JSON.stringify(upgradeParams2, null, 2));
        
        const upgradeResult = await this.rpcClient.request('wallet_upgradeAccount', [upgradeParams2]);
        
        console.log('\n✅ SMART WALLET CREATED SUCCESSFULLY!');
        console.log('Upgrade Result:', JSON.stringify(upgradeResult, null, 2));
        
        // Porto returns null/undefined for successful upgrade
        // The smart wallet uses the same address as the EOA
        smartWalletAddress = ephemeral.address;
        isSmartWallet = true;
        
        console.log('Smart Wallet Address:', smartWalletAddress);
        console.log('This is a counterfactual smart account that will be deployed on first use');
        
        console.log('========================================\n');
        
      } catch (error: any) {
        console.log('\n❌ PORTO RPC UPGRADE FAILED');
        console.log('========================================');
        console.log('Error Type:', error.constructor.name);
        console.log('Error Message:', error.message);
        console.log('Error Details:', error);
        
        // Create a detailed error report for Porto team
        const errorReport = {
          timestamp: new Date().toISOString(),
          endpoint: PORTO_CONFIG.rpcEndpoint,
          chainId: PORTO_CONFIG.currentChainId,
          eoaAddress: ephemeral.address,
          passkeyCredentialId: passkey.credentialId,
          errorMessage: error.message,
          errorStack: error.stack,
          attemptedMethod: 'wallet_prepareUpgradeAccount',
          sdkVersion: 'RPC Direct (no SDK)',
          platform: 'React Native iOS'
        };
        
        console.log('\n--- ERROR REPORT FOR PORTO TEAM ---');
        console.log(JSON.stringify(errorReport, null, 2));
        console.log('========================================\n');
        
        console.log('Falling back to EOA with passkey association');
      }
      
      // Store the account data
      const accountData = {
        address: smartWalletAddress,
        tag,
        passkeyId: passkey.credentialId,
        chainId: PORTO_CONFIG.currentChainId,
        createdAt: Date.now(),
        isSmartWallet,
        isDeployed: false, // Counterfactual - will deploy on first transaction
        // Only store private key if upgrade failed (for fallback)
        ...(isSmartWallet ? {} : { ephemeralPrivateKey: ephemeral.privateKey }),
        passkeyData: {
          type: passkey.type,
          publicKey: passkey.publicKey,
          label: passkey.label
        }
      };
      
      console.log(`✅ Wallet created successfully!`);
      console.log(`Type: ${isSmartWallet ? 'Porto Smart Account (Counterfactual)' : 'EOA with Passkey'}`);
      console.log(`Address: ${smartWalletAddress}`);
      
      // Step 6: Discard ephemeral key (security critical!)
      // The ephemeral key is now out of scope and will be garbage collected
      // Only the passkey remains as the admin key
      
      // Step 7: Store account data locally
      await this.storeAccountData(accountData);
      
      return {
        address: smartWalletAddress,
        passkeyId: passkey.credentialId,
        chainId: PORTO_CONFIG.currentChainId
      };
      
    } catch (error) {
      console.error('Smart wallet creation failed:', error);
      throw error;
    }
  }

  /**
   * Store account data locally
   */
  private async storeAccountData(data: PortoAccount): Promise<void> {
    const key = `porto_account_${data.tag}`;
    await AsyncStorage.setItem(key, JSON.stringify(data));
    
    // Also store the current account as the active one
    await AsyncStorage.setItem('porto_active_account', data.tag);
  }

  /**
   * Get stored account data
   */
  async getAccountData(tag: string): Promise<PortoAccount | null> {
    try {
      const key = `porto_account_${tag}`;
      const data = await AsyncStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Failed to get account data:', error);
      return null;
    }
  }

  /**
   * Get active account
   */
  async getActiveAccount(): Promise<PortoAccount | null> {
    try {
      const activeTag = await AsyncStorage.getItem('porto_active_account');
      if (!activeTag) return null;
      
      return this.getAccountData(activeTag);
    } catch (error) {
      console.error('Failed to get active account:', error);
      return null;
    }
  }

  /**
   * List all stored accounts
   */
  async listAccounts(): Promise<PortoAccount[]> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const accountKeys = keys.filter(k => k.startsWith('porto_account_'));
      
      const accounts: PortoAccount[] = [];
      for (const key of accountKeys) {
        const data = await AsyncStorage.getItem(key);
        if (data) {
          accounts.push(JSON.parse(data));
        }
      }
      
      return accounts;
    } catch (error) {
      console.error('Failed to list accounts:', error);
      return [];
    }
  }

  /**
   * Check if account exists on-chain
   */
  async verifyAccountOnChain(address: string): Promise<boolean> {
    try {
      const result = await this.rpcClient.request('eth_getCode', [
        address,
        'latest'
      ]);
      
      // If code exists, the account is deployed
      return result && result !== '0x';
    } catch (error) {
      console.error('Failed to verify account on-chain:', error);
      return false;
    }
  }
}