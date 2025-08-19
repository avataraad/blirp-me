# Porto Smart Wallet - Technical Implementation Reference

## Overview
Porto is a next-generation smart contract wallet system that uses account abstraction (ERC-7702) and WebAuthn passkeys to create secure, user-friendly blockchain accounts. It eliminates seed phrases while maintaining security through hardware-backed authentication.

## Architecture Components

### 1. Smart Contract Layer
Porto uses three main contracts deployed on Base (mainnet and Sepolia testnet):

#### Porto Account Contract
- **Purpose**: Smart contract account that holds user funds
- **Key Features**:
  - Supports 4 native key types: P256, WebAuthnP256, Secp256k1, External
  - 2D nonce management for replay attack prevention
  - ERC-7821 Executor interface for transaction execution
  - Multi-chain signature support
  - Granular permission system with admin/session key roles
- **Addresses**:
  - Base Mainnet: See address book
  - Base Sepolia: Available on testnet

#### Orchestrator Contract
- **Purpose**: Privileged contract facilitating trustless interactions
- **Function**: Routes intents between relay and account
- **Base Mainnet**: 0x883ac1afd6bf920755ccee253669515683634930
- **Base Sepolia**: 0x8a88d758c7cef9251e2473b4957272b43dbbb5f2

#### Simulator Contract
- **Purpose**: Gas estimation utility
- **Function**: Provides accurate gas estimates for intents in single RPC call

### 2. Key Management System

#### Key Types
1. **WebAuthnP256**: Hardware-backed passkeys (Touch ID, Face ID, Windows Hello)
2. **P256**: Standard P256 elliptic curve keys
3. **Secp256k1**: Ethereum standard keys
4. **External**: Keys managed by external systems

#### Key Roles
- **Admin Keys**: Full account control, can add/remove other keys
- **Session Keys**: Limited permissions with optional expiry
  - Can have spending limits (e.g., "10 USDC per hour")
  - Can be restricted to specific contract calls
  - Support time-based expiration

### 3. Account Creation Flow

#### New Account Creation
```typescript
// 1. Create a passkey
const passkey = await Key.createWebAuthnP256({ 
  label: 'My iPhone Passkey',
  role: 'admin' 
})

// 2. Create Porto account with passkey
const account = await ServerActions.createAccount(client, {
  authorizeKeys: [passkey],
  feeToken: 'USDC' // Optional: specify fee token
})
```

#### EOA to Porto Account Upgrade
```typescript
// Upgrade existing EOA to Porto account
const response = await Actions.upgradeAccount(config, {
  account: existingEOA,
  connector: porto(),
  grantPermissions: {
    expiry: Date.now() + 3600000, // 1 hour
    permissions: [/* specific permissions */]
  }
})
```

### 4. Transaction Signing Process

#### Single Transaction
```typescript
// Sign with passkey authentication
const signature = await Account.sign(account, {
  payload: transactionHash,
  key: passkey, // Will trigger biometric prompt
})
```

#### Batch Transactions (wallet_sendCalls)
```typescript
const bundleId = await provider.request({
  method: 'wallet_sendCalls',
  params: [{
    calls: [
      { to: '0x...', value: '0x...', data: '0x...' },
      { to: '0x...', data: '0x...' } // Multiple calls
    ],
    chainId: '0x2105', // Base Sepolia
    capabilities: {
      feeToken: 'USDC', // Pay gas in USDC
      merchantRpcUrl: '/api/sponsor' // Optional sponsoring
    }
  }]
})
```

## React Native Integration Strategy

### 1. Installation
```bash
npm install porto wagmi viem @tanstack/react-query
# React Native specific
npm install react-native-get-random-values
npm install --save-dev @types/react-native-get-random-values
```

### 2. Polyfills Setup
```typescript
// index.js or App.tsx (at the very top)
import 'react-native-get-random-values'
```

### 3. Storage Configuration
React Native requires custom storage since IndexedDB isn't available:
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Porto, Storage } from 'porto'

// Create custom storage adapter
const reactNativeStorage = {
  async get(key: string) {
    return await AsyncStorage.getItem(key)
  },
  async set(key: string, value: string) {
    await AsyncStorage.setItem(key, value)
  },
  async delete(key: string) {
    await AsyncStorage.removeItem(key)
  }
}

const porto = Porto.create({
  storage: reactNativeStorage,
  mode: 'embedded', // Use embedded mode for React Native
  chains: [Chains.baseSepolia]
})
```

### 4. WebAuthn/Passkey Handling
React Native doesn't have native WebAuthn support. Options:

#### Option A: WebView Bridge (Recommended)
```typescript
// Use react-native-webview to bridge WebAuthn calls
import { WebView } from 'react-native-webview'

// Create a hidden WebView for passkey operations
const PasskeyBridge = () => {
  return (
    <WebView
      source={{ uri: 'https://your-app.com/passkey-bridge' }}
      onMessage={(event) => {
        // Handle passkey creation/authentication
        const { type, data } = JSON.parse(event.nativeEvent.data)
        if (type === 'passkey-created') {
          // Store passkey data
        }
      }}
    />
  )
}
```

#### Option B: Biometric + Secure Storage
```typescript
// Use react-native-keychain for secure storage
import * as Keychain from 'react-native-keychain'

// Generate key pair and store securely
const createSecureKey = async () => {
  // Generate P256 key instead of WebAuthnP256
  const key = await Key.createP256({ label: 'Mobile Key' })
  
  // Store with biometric protection
  await Keychain.setInternetCredentials(
    'porto-wallet',
    'privateKey',
    key.privateKey,
    {
      accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET,
      authenticatePrompt: 'Authenticate to sign transaction'
    }
  )
  
  return key
}
```

### 5. Wagmi Configuration for React Native
```typescript
import { createConfig, http } from 'wagmi'
import { porto } from 'porto/wagmi'
import { baseSepolia } from 'wagmi/chains'

export const wagmiConfig = createConfig({
  chains: [baseSepolia],
  connectors: [
    porto({
      storage: reactNativeStorage,
      mode: 'embedded',
      feeToken: 'USDC'
    })
  ],
  transports: {
    [baseSepolia.id]: http('https://base-sepolia.g.alchemy.com/v2/YOUR_KEY')
  }
})
```

### 6. Account Recovery Flow
```typescript
// Recovery requires the same passkey/key that was used during creation
const recoverAccount = async (accountAddress: string) => {
  // 1. Retrieve stored key from secure storage
  const credentials = await Keychain.getInternetCredentials('porto-wallet')
  
  // 2. Reconstruct the key
  const key = Key.fromP256({
    privateKey: credentials.password
  })
  
  // 3. Create account instance
  const account = Account.from({
    address: accountAddress,
    keys: [key]
  })
  
  return account
}
```

## Permission System Implementation

### Session Key Creation
```typescript
const sessionKey = await Key.createWebAuthnP256({
  label: 'Limited Trading Key',
  role: 'session',
  permissions: [
    {
      type: 'call',
      contract: '0xUSDC_ADDRESS',
      function: 'transfer',
      limit: '100000000' // 100 USDC (6 decimals)
    }
  ],
  expiry: Date.now() + 86400000 // 24 hours
})
```

### Permission Granting During Connection
```typescript
const accounts = await provider.request({
  method: 'wallet_connect',
  params: [{
    capabilities: {
      grantPermissions: {
        expiry: Date.now() + 3600000,
        permissions: [
          {
            type: 'spend',
            token: 'USDC',
            limit: '50000000', // 50 USDC
            period: 'hourly'
          }
        ]
      }
    }
  }]
})
```

## Network Support

### Currently Supported
- **Base Mainnet**: Full support
- **Base Sepolia Testnet**: Full support (recommended for development)

### Adding Network Support
```typescript
import { defineChain } from 'viem'

const customChain = defineChain({
  id: 42161,
  name: 'Arbitrum',
  network: 'arbitrum',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://arb1.arbitrum.io/rpc'] }
  }
})

// Note: Porto contracts must be deployed on the target chain
const porto = Porto.create({
  chains: [customChain]
})
```

## Security Considerations

### 1. Key Storage
- **Never store private keys in plain text**
- Use platform-specific secure storage (Keychain on iOS, Keystore on Android)
- Implement biometric authentication for key access

### 2. Transaction Validation
- Always validate transaction parameters before signing
- Implement spending limits for session keys
- Use time-based expiry for temporary permissions

### 3. Network Security
- Always use HTTPS endpoints
- Implement certificate pinning for production apps
- Validate contract addresses against known deployments

### 4. Recovery Mechanism
- Store encrypted key backups in secure cloud storage
- Implement multi-factor authentication for recovery
- Consider social recovery options using multiple keys

## Gas and Fee Management

### Fee Token Options
- **ETH**: Native gas token (default)
- **USDC**: Stablecoin gas payments
- **EXP**: Porto's native token (being phased out)

### Sponsoring Transactions
```typescript
// Set up merchant RPC for sponsoring
const merchantRpc = MerchantRpc.requestHandler({
  address: MERCHANT_ADDRESS,
  key: MERCHANT_PRIVATE_KEY,
  sponsor: (request) => {
    // Custom logic to determine sponsorship
    return request.value < MAX_SPONSORED_AMOUNT
  }
})

// Client configuration
const porto = Porto.create({
  merchantRpcUrl: 'https://api.yourapp.com/sponsor'
})
```

## Error Handling

### Common Errors and Solutions
1. **"Passkey not supported"**: Device doesn't support WebAuthn
   - Solution: Fall back to P256 keys with biometric protection

2. **"Insufficient balance for gas"**: Fee token balance too low
   - Solution: Implement fee sponsoring or prompt user to add funds

3. **"Key not authorized"**: Using wrong key for signing
   - Solution: Ensure correct key is selected from account.keys array

4. **"Nonce already used"**: Replay attack prevention triggered
   - Solution: Fetch fresh nonce and retry transaction

## Testing Strategy

### 1. Unit Tests
```typescript
// Test key creation
describe('Porto Key Management', () => {
  test('creates P256 key', async () => {
    const key = await Key.createP256({ label: 'Test Key' })
    expect(key.type).toBe('P256')
    expect(key.publicKey).toBeDefined()
  })
})
```

### 2. Integration Tests
- Test on Base Sepolia testnet
- Use test USDC from faucets
- Verify transaction execution and gas payment

### 3. E2E Tests
- Test full account creation flow
- Verify passkey/biometric prompts
- Test recovery scenarios

## Migration Path from Existing Wallet

### Phase 1: Parallel Operation
- Keep existing wallet operational
- Create Porto account for new users
- Allow existing users to opt-in to upgrade

### Phase 2: Gradual Migration
```typescript
// Check if user has EOA
if (hasExistingWallet) {
  // Offer upgrade
  const shouldUpgrade = await promptUserForUpgrade()
  if (shouldUpgrade) {
    await Actions.upgradeAccount(config, {
      account: existingWallet,
      connector: porto()
    })
  }
}
```

### Phase 3: Full Migration
- Default all new accounts to Porto
- Maintain backward compatibility for non-upgraded accounts
- Provide clear benefits to encourage upgrades

## Performance Optimization

### 1. Caching Strategy
```typescript
// Cache account data
const accountCache = new Map()

const getAccount = async (address: string) => {
  if (accountCache.has(address)) {
    return accountCache.get(address)
  }
  
  const account = await fetchAccount(address)
  accountCache.set(address, account)
  return account
}
```

### 2. Batch Operations
- Use `wallet_sendCalls` for multiple transactions
- Combine permission grants with account connection
- Minimize RPC calls by batching requests

### 3. Optimistic Updates
- Update UI immediately on user action
- Confirm with blockchain in background
- Revert on failure with clear error messaging

## Monitoring and Analytics

### Key Metrics to Track
1. Account creation success rate
2. Transaction signing time
3. Gas costs by fee token
4. Permission grant usage
5. Recovery attempt success rate

### Error Tracking
```typescript
// Log Porto-specific errors
const trackPortoError = (error: Error, context: any) => {
  analytics.track('porto_error', {
    message: error.message,
    code: error.code,
    context,
    timestamp: Date.now()
  })
}
```

## Future Considerations

### Upcoming Features
1. Multi-chain account support (same address across chains)
2. Social recovery mechanisms
3. Advanced permission templates
4. Native mobile SDKs
5. Hardware wallet integration

### Preparation Steps
- Design abstraction layer for account management
- Implement flexible key storage system
- Plan for protocol upgrades
- Consider cross-chain messaging needs