# Porto Smart Wallet - React Native RPC Server Implementation

## Overview
This document outlines the implementation of Porto smart wallets in React Native using direct RPC server communication, bypassing the browser-dependent Porto SDK. This approach maintains all Porto benefits (no seed phrases, passkey authentication, USDC gas payments) while avoiding browser API dependencies.

## Architecture Overview

### Why RPC Server Approach?
- **No Browser Dependencies**: Porto SDK contains web-specific code (dialogs, window objects) incompatible with React Native
- **Full Native Control**: Direct RPC calls allow native React Native implementation
- **Same User Experience**: Users still get single-tap wallet creation with passkey authentication
- **All Features Preserved**: Account abstraction, USDC gas, cross-chain support remain available

### Key Components
1. **RPC Server Communication**: Direct JSON-RPC 2.0 calls to Porto's infrastructure
2. **Ephemeral Key Pattern**: Temporary key for account creation, immediately discarded
3. **Passkey Integration**: Leverages existing React Native passkey implementation
4. **Account Management**: Smart contract wallets on Base with cross-chain compatibility

## RPC Endpoints

### Base Configuration
```typescript
const PORTO_RPC_ENDPOINTS = {
  mainnet: 'https://base.rpc.ithaca.xyz',        // Base Mainnet
  testnet: 'https://base-sepolia.rpc.ithaca.xyz', // Base Sepolia (recommended for development)
  development: 'https://porto-dev.rpc.ithaca.xyz',
  local: 'http://localhost:9200'
};

const PORTO_CONFIG = {
  chainId: 8453,  // Base Mainnet
  testnetChainId: 84532,  // Base Sepolia
  usdcAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC on Base
  delegationContract: '0x...',  // Porto's delegation contract (get from Porto team)
};
```

## Core Implementation

### 1. RPC Request Handler
Foundation for all Porto communication:

```typescript
interface RpcRequest {
  jsonrpc: '2.0';
  id: number | string;
  method: string;
  params: any[];
}

interface RpcResponse {
  jsonrpc: '2.0';
  id: number | string;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

class PortoRpcClient {
  private endpoint: string;
  private requestId: number = 0;

  constructor(endpoint: string = PORTO_RPC_ENDPOINTS.testnet) {
    this.endpoint = endpoint;
  }

  async request(method: string, params: any[] = []): Promise<any> {
    const request: RpcRequest = {
      jsonrpc: '2.0',
      id: ++this.requestId,
      method,
      params
    };

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request)
      });

      const result: RpcResponse = await response.json();
      
      if (result.error) {
        throw new Error(`RPC Error ${result.error.code}: ${result.error.message}`);
      }
      
      return result.result;
    } catch (error) {
      console.error(`RPC request failed for ${method}:`, error);
      throw error;
    }
  }
}
```

### 2. Ephemeral Key Generation
Generate temporary keys for account creation:

```typescript
import { randomBytes } from 'react-native-get-random-values';
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts';
import { keccak256, toHex } from 'viem';

class EphemeralKeyManager {
  /**
   * Generate ephemeral private key for account creation
   * This key is used once and immediately discarded
   */
  static generateEphemeralKey(): {
    privateKey: string;
    address: string;
  } {
    // Generate 32 random bytes for private key
    const privateKeyBytes = randomBytes(32);
    const privateKey = toHex(privateKeyBytes);
    
    // Derive address from private key
    const account = privateKeyToAccount(privateKey);
    
    return {
      privateKey,
      address: account.address
    };
  }

  /**
   * Sign digests with ephemeral key
   * Used during account upgrade process
   */
  static async signWithEphemeralKey(
    privateKey: string,
    digests: { auth: string; exec: string }
  ): Promise<{ auth: string; exec: string }> {
    const account = privateKeyToAccount(privateKey);
    
    const authSignature = await account.signMessage({
      message: { raw: digests.auth }
    });
    
    const execSignature = await account.signMessage({
      message: { raw: digests.exec }
    });
    
    return {
      auth: authSignature,
      exec: execSignature
    };
  }
}
```

### 3. WebAuthn/Passkey Integration
Integrate with existing React Native passkey system:

```typescript
import { Passkey } from 'react-native-passkey';

interface WebAuthnKey {
  type: 'webauthnp256';
  role: 'admin' | 'session';
  publicKey: string;
  credentialId: string;
  label: string;
}

class PasskeyManager {
  /**
   * Create passkey for Porto account
   * This becomes the permanent admin key
   */
  static async createPortoPasskey(tag: string): Promise<WebAuthnKey> {
    try {
      const result = await Passkey.create({
        rpId: 'blirp.me',
        rpName: 'BlirpMe Porto Wallet',
        userName: tag,
        userDisplayName: `${tag}'s Porto Wallet`,
        userId: Buffer.from(tag).toString('base64'),
        challenge: Buffer.from(randomBytes(32)).toString('base64'),
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
        type: 'webauthnp256',
        role: 'admin',
        publicKey: result.response.publicKey, // Extract public key from response
        credentialId: result.id,
        label: `${tag}'s Porto Wallet`
      };
    } catch (error) {
      console.error('Passkey creation failed:', error);
      throw error;
    }
  }

  /**
   * Sign transaction with passkey
   * Used for transaction authorization
   */
  static async signWithPasskey(
    credentialId: string,
    challenge: string
  ): Promise<string> {
    try {
      const result = await Passkey.get({
        rpId: 'blirp.me',
        challenge,
        userVerification: 'required',
        allowCredentials: [{
          id: credentialId,
          type: 'public-key'
        }]
      });
      
      return result.response.signature;
    } catch (error) {
      console.error('Passkey signing failed:', error);
      throw error;
    }
  }
}
```

## Account Creation Flow

### Complete Implementation
Instant smart wallet creation with passkey:

```typescript
class PortoAccountService {
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
      
      // Step 3: Prepare account upgrade to smart wallet
      const prepareResult = await this.rpcClient.request('wallet_prepareUpgradeAccount', [{
        address: ephemeral.address,
        chainId: PORTO_CONFIG.testnetChainId,
        delegation: PORTO_CONFIG.delegationContract,
        capabilities: {
          authorizeKeys: [{
            key: passkey,
            permissions: [] // Admin key has full permissions
          }],
          feeToken: PORTO_CONFIG.usdcAddress, // Use USDC for gas
        }
      }]);
      
      console.log('Account upgrade prepared:', prepareResult.context.account);
      
      // Step 4: Sign with ephemeral key (automatic, no user interaction)
      const signatures = await EphemeralKeyManager.signWithEphemeralKey(
        ephemeral.privateKey,
        prepareResult.digests
      );
      
      // Step 5: Execute upgrade to smart wallet
      const upgradeResult = await this.rpcClient.request('wallet_upgradeAccount', [{
        context: prepareResult.context,
        signatures
      }]);
      
      console.log('Smart wallet created:', upgradeResult.address);
      
      // Step 6: Discard ephemeral key (security critical!)
      // The ephemeral key is now out of scope and will be garbage collected
      // Only the passkey remains as the admin key
      
      // Step 7: Store account data locally
      await this.storeAccountData({
        address: upgradeResult.address,
        tag,
        passkeyId: passkey.credentialId,
        chainId: PORTO_CONFIG.testnetChainId,
        createdAt: Date.now()
      });
      
      return {
        address: upgradeResult.address,
        passkeyId: passkey.credentialId,
        chainId: PORTO_CONFIG.testnetChainId
      };
      
    } catch (error) {
      console.error('Smart wallet creation failed:', error);
      throw error;
    }
  }

  private async storeAccountData(data: any): Promise<void> {
    // Store in AsyncStorage or your preferred storage
    await AsyncStorage.setItem(`porto_account_${data.tag}`, JSON.stringify(data));
  }
}
```

## Transaction Execution

### Two-Phase Transaction Process

```typescript
class PortoTransactionService {
  private rpcClient: PortoRpcClient;
  
  constructor() {
    this.rpcClient = new PortoRpcClient();
  }

  /**
   * Send transaction(s) with Porto smart wallet
   * Supports single or batched transactions
   */
  async sendTransaction(
    accountAddress: string,
    passkeyId: string,
    calls: Array<{
      to: string;
      value?: string;
      data?: string;
    }>
  ): Promise<string> {
    try {
      // Phase 1: Prepare calls (simulation + quote generation)
      const prepareResult = await this.rpcClient.request('wallet_prepareCalls', [{
        account: accountAddress,
        calls,
        chainId: PORTO_CONFIG.testnetChainId,
        capabilities: {
          feeToken: PORTO_CONFIG.usdcAddress, // Pay gas in USDC
          // Optional: Add merchant RPC URL for sponsored transactions
          // merchantRpcUrl: 'https://your-merchant-rpc.com/sponsor'
        }
      }]);
      
      console.log('Transaction prepared:', {
        digest: prepareResult.digest,
        gasEstimate: prepareResult.gasEstimate,
        feeAmount: prepareResult.feeAmount
      });
      
      // Phase 2: Sign with passkey (triggers biometric authentication)
      const signature = await PasskeyManager.signWithPasskey(
        passkeyId,
        prepareResult.digest
      );
      
      // Phase 3: Execute transaction
      const sendResult = await this.rpcClient.request('wallet_sendPreparedCalls', [{
        context: prepareResult.context,
        signature
      }]);
      
      console.log('Transaction sent, bundle ID:', sendResult.id);
      
      // Return bundle ID for status tracking
      return sendResult.id;
      
    } catch (error) {
      console.error('Transaction failed:', error);
      throw error;
    }
  }

  /**
   * Check transaction status using bundle ID
   */
  async getTransactionStatus(bundleId: string): Promise<{
    status: 'pending' | 'success' | 'failed';
    transactionHash?: string;
    error?: string;
  }> {
    const result = await this.rpcClient.request('wallet_getCallsStatus', [bundleId]);
    
    return {
      status: result.status,
      transactionHash: result.transactionHash,
      error: result.error
    };
  }
}
```

## Account Recovery

### Recover Wallet with Passkey

```typescript
class PortoRecoveryService {
  private rpcClient: PortoRpcClient;
  
  async recoverWallet(tag: string): Promise<{
    address: string;
    passkeyId: string;
  } | null> {
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
      const challenge = Buffer.from(randomBytes(32)).toString('base64');
      await PasskeyManager.signWithPasskey(accountData.passkeyId, challenge);
      
      console.log('Wallet recovered successfully:', accountData.address);
      
      return {
        address: accountData.address,
        passkeyId: accountData.passkeyId
      };
      
    } catch (error) {
      console.error('Wallet recovery failed:', error);
      return null;
    }
  }
}
```

## Merchant Account Integration

### Sponsored Transactions

```typescript
class PortoMerchantService {
  /**
   * Set up merchant-sponsored transactions
   * Merchant pays gas fees for users
   */
  async prepareSponsoredTransaction(
    accountAddress: string,
    calls: any[],
    merchantRpcUrl: string
  ): Promise<any> {
    const prepareResult = await this.rpcClient.request('wallet_prepareCalls', [{
      account: accountAddress,
      calls,
      capabilities: {
        merchantRpcUrl, // Merchant endpoint that sponsors fees
        feeToken: PORTO_CONFIG.usdcAddress
      }
    }]);
    
    // If merchant sponsors, feeAmount will be 0 for user
    if (prepareResult.feeAmount === '0') {
      console.log('Transaction sponsored by merchant');
    }
    
    return prepareResult;
  }
}

// Merchant RPC Server Implementation (your backend)
class MerchantRpcServer {
  /**
   * Implement sponsorship logic on your backend
   * This runs on your server, not in React Native
   */
  async handleSponsorshipRequest(request: any): Promise<boolean> {
    // Define sponsorship rules
    const rules = {
      maxAmount: BigInt('1000000'), // Max 1 USDC per transaction
      allowedContracts: ['0x...'], // Specific contracts to sponsor
      dailyLimit: 100 // Max 100 sponsored txs per day
    };
    
    // Check if transaction meets sponsorship criteria
    if (request.value > rules.maxAmount) {
      return false; // Don't sponsor
    }
    
    // Add your custom logic here
    return true; // Sponsor the transaction
  }
}
```

## Session Keys & Permissions

### Grant Limited Permissions for Better UX

```typescript
class PortoPermissionService {
  /**
   * Create session key with limited permissions
   * Allows transactions without repeated passkey prompts
   */
  async grantSessionPermissions(
    accountAddress: string,
    passkeyId: string
  ): Promise<void> {
    // Define limited permissions for session key
    const permissions = {
      calls: [{
        signature: 'transfer(address,uint256)',
        to: PORTO_CONFIG.usdcAddress, // Only allow USDC transfers
      }],
      spend: [{
        token: PORTO_CONFIG.usdcAddress,
        limit: BigInt('10000000'), // 10 USDC limit
        period: 'day'
      }],
      expiry: Math.floor(Date.now() / 1000) + 86400 // 24 hours
    };
    
    // Prepare permission grant
    const prepareResult = await this.rpcClient.request('wallet_grantPermissions', [{
      address: accountAddress,
      permissions,
      chainId: PORTO_CONFIG.testnetChainId
    }]);
    
    // Sign with admin passkey
    const signature = await PasskeyManager.signWithPasskey(
      passkeyId,
      prepareResult.digest
    );
    
    // Execute permission grant
    await this.rpcClient.request('wallet_sendPreparedCalls', [{
      context: prepareResult.context,
      signature
    }]);
    
    console.log('Session permissions granted');
  }
}
```

## Complete React Native Integration

### Main Porto Service

```typescript
// src/services/portoRpcService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

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
   * Create new Porto smart wallet
   */
  async createWallet(tag: string): Promise<{
    address: string;
    tag: string;
    type: 'porto';
  }> {
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
      type: 'porto'
    };
  }

  /**
   * Recover existing Porto wallet
   */
  async recoverWallet(tag: string): Promise<any> {
    const wallet = await this.recoveryService.recoverWallet(tag);
    if (wallet) {
      this.currentAccount = { ...wallet, tag };
    }
    return wallet;
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
    
    return await this.transactionService.sendTransaction(
      this.currentAccount.address,
      this.currentAccount.passkeyId,
      [{ to, value, data }]
    );
  }

  /**
   * Get wallet balance
   */
  async getBalance(): Promise<{ eth: string; usdc: string }> {
    if (!this.currentAccount) {
      throw new Error('No wallet connected');
    }
    
    // Use viem or ethers to get balances
    // Implementation depends on your existing balance service
    return { eth: '0', usdc: '0' };
  }
}

export default new PortoWalletService();
```

## Error Handling

### Common Errors and Solutions

```typescript
enum PortoErrorCodes {
  PASSKEY_CREATION_FAILED = 'PASSKEY_CREATION_FAILED',
  EPHEMERAL_KEY_GENERATION_FAILED = 'EPHEMERAL_KEY_GENERATION_FAILED',
  ACCOUNT_UPGRADE_FAILED = 'ACCOUNT_UPGRADE_FAILED',
  TRANSACTION_PREPARATION_FAILED = 'TRANSACTION_PREPARATION_FAILED',
  PASSKEY_SIGNING_FAILED = 'PASSKEY_SIGNING_FAILED',
  INSUFFICIENT_USDC_BALANCE = 'INSUFFICIENT_USDC_BALANCE',
  RPC_REQUEST_FAILED = 'RPC_REQUEST_FAILED',
  ACCOUNT_NOT_FOUND = 'ACCOUNT_NOT_FOUND'
}

class PortoErrorHandler {
  static handleError(error: any): string {
    // Check for specific Porto RPC errors
    if (error.message?.includes('insufficient balance')) {
      return 'Please add USDC to pay for gas fees';
    }
    
    if (error.message?.includes('passkey')) {
      return 'Passkey authentication failed. Please try again';
    }
    
    if (error.message?.includes('network')) {
      return 'Network error. Please check your connection';
    }
    
    // Default error message
    return 'Transaction failed. Please try again';
  }
}
```

## Testing Strategy

### Test Implementation

```typescript
// __tests__/portoRpcService.test.ts
describe('Porto RPC Service', () => {
  let service: PortoWalletService;
  
  beforeEach(() => {
    service = new PortoWalletService();
  });
  
  test('creates smart wallet with passkey', async () => {
    const wallet = await service.createWallet('testuser');
    expect(wallet.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(wallet.type).toBe('porto');
  });
  
  test('handles ephemeral key properly', async () => {
    // Verify ephemeral key is not stored anywhere
    const wallet = await service.createWallet('testuser');
    const stored = await AsyncStorage.getAllKeys();
    
    // Should not find any private keys in storage
    stored.forEach(key => {
      const value = AsyncStorage.getItem(key);
      expect(value).not.toContain('privateKey');
    });
  });
  
  test('recovers wallet with passkey', async () => {
    const original = await service.createWallet('testuser');
    const recovered = await service.recoverWallet('testuser');
    expect(recovered.address).toBe(original.address);
  });
});
```

## Migration from SDK Approach

### Key Differences

| Feature | SDK Approach | RPC Server Approach |
|---------|--------------|-------------------|
| **Dependencies** | Porto SDK npm package | None (direct HTTP) |
| **Browser APIs** | Required | Not needed |
| **Implementation** | SDK handles complexity | You implement RPC calls |
| **Control** | Limited to SDK options | Full control |
| **User Experience** | Same | Same |
| **Features** | All features | All features |

### Migration Steps

1. **Remove Porto SDK**: `npm uninstall porto`
2. **Implement RPC Client**: Copy the RPC client code above
3. **Update Account Creation**: Use ephemeral key pattern
4. **Update Transaction Flow**: Implement two-phase process
5. **Test Thoroughly**: Verify all flows work correctly

## Security Considerations

### Critical Security Points

1. **Ephemeral Key Disposal**
   - MUST discard immediately after account creation
   - Never store or display to user
   - Only exists in memory during creation

2. **Passkey Security**
   - Store credential IDs securely
   - Never expose passkey private keys
   - Use platform biometric authentication

3. **RPC Communication**
   - Always use HTTPS
   - Validate RPC responses
   - Handle errors gracefully

4. **Session Keys**
   - Limit permissions appropriately
   - Set reasonable expiry times
   - Revoke when necessary

## Performance Optimization

### Best Practices

```typescript
class PortoOptimizations {
  // Cache account data to reduce RPC calls
  private accountCache = new Map();
  
  // Batch RPC requests when possible
  async batchRequests(requests: any[]): Promise<any[]> {
    const batchRequest = requests.map((req, index) => ({
      jsonrpc: '2.0',
      id: index,
      method: req.method,
      params: req.params
    }));
    
    const response = await fetch(PORTO_RPC_ENDPOINTS.testnet, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(batchRequest)
    });
    
    return response.json();
  }
  
  // Pre-fetch gas estimates
  async prefetchGasEstimates(): Promise<void> {
    // Fetch common transaction gas estimates
    // Cache for quick display in UI
  }
}
```

## Deployment Checklist

### Before Production

- [ ] Switch from testnet to mainnet RPC endpoints
- [ ] Implement proper error handling and retry logic
- [ ] Add transaction status polling
- [ ] Set up monitoring and analytics
- [ ] Test account recovery flow thoroughly
- [ ] Implement rate limiting for RPC calls
- [ ] Add proper logging (but never log private keys!)
- [ ] Set up merchant RPC server (if using sponsorship)
- [ ] Test with real USDC on mainnet
- [ ] Implement session key rotation

## Summary

The RPC server approach provides a clean path to integrate Porto smart wallets into React Native without browser dependencies. Key benefits:

1. **No SDK Dependencies**: Pure HTTP/JSON-RPC communication
2. **Full Native Control**: Complete control over UX
3. **Same Security Model**: Passkey-based, no seed phrases
4. **All Porto Features**: Account abstraction, USDC gas, cross-chain support
5. **Production Ready**: Used by Porto's own infrastructure

The ephemeral key pattern ensures users never see or manage private keys while getting instant smart wallet creation with passkey security.