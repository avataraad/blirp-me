# Privy Reference Documentation

## Overview
Privy is an authentication and wallet infrastructure platform that provides embedded wallets with multiple authentication methods including passkeys, email, SMS, and OAuth.

## Key Architecture Decisions

### Recommended Approach for BlirpMe
1. **Wallet Type**: Smart Wallets (Account Abstraction)
   - Better UX with gas sponsorship capabilities
   - No seed phrases needed
   - Transaction batching support
   
2. **Authentication**: Passkey primary with email/SMS for additional data collection
3. **Integration**: React Native SDK for client, REST API for any backend operations

## Core Concepts

### Authentication Methods
- **Passkeys**: Biometric authentication, requires iOS 17.5+, custom build (not Expo Go)
- **Email/SMS**: OTP-based, 10-minute validity
- **OAuth**: Social logins (Google, Apple, etc.)
- **Wallet Connect**: External wallet connections

### Wallet Types in Privy

**Embedded EOA Wallets**
- Traditional Ethereum accounts
- Direct private key control
- Simple, lower gas costs for deployment

**Smart Wallets (ERC-4337)**
- Smart contract accounts with account abstraction
- Providers: Kernel, Safe, LightAccount, Biconomy, Coinbase
- Features: Gas sponsorship, transaction batching, delegated permissions
- Deploy on first transaction (lazy deployment)

### Security Architecture
- Private keys sharded using Shamir's Secret Sharing
- AWS Nitro Enclaves (Trusted Execution Environment)
- Keys never exist in complete form
- SOC2 Type I and II certified

## Critical Security Notes

### App Secret
- **NEVER expose in client-side code**
- **Backend/server use only**
- Cannot be recovered if lost
- Used for REST API authentication

### App ID vs Client ID
- **App ID**: Public, identifies your app
- **Client ID**: Public, specific for React Native
- **App Secret**: Private, server-side only

## React Native Specific Considerations

### Dependencies Required
```bash
# Core Privy
@privy-io/expo
@privy-io/expo-native-extensions

# Required by Privy
expo-apple-authentication
expo-application
expo-crypto
expo-linking
expo-secure-store
expo-web-browser
react-native-passkeys
react-native-webview

# Polyfills
fast-text-encoding
react-native-get-random-values
@ethersproject/shims

# For Smart Wallets
permissionless
viem@2.x
```

### Passkey Requirements
- iOS 17.5+ deployment target
- Custom development build (Expo dev client)
- Apple App Site Association file
- Associated domains configuration

## SDK vs REST API

### React Native SDK
- Client-side integration
- Built-in UI components
- Automatic wallet creation
- React hooks for all operations
- Real-time authentication state

### REST API
- Server-side operations only
- Requires App Secret
- Use cases: User management, pregenerating wallets, server-side wallet access
- Base URL: `https://api.privy.io`

## Smart Wallet Configuration

### Dashboard Setup
1. Navigate to Smart Wallets tab
2. Select provider (Kernel, Safe, etc.)
3. Configure networks (including Base)
4. Optional: Custom bundler/paymaster URLs

### Gas Sponsorship
- Configure paymaster for sponsoring user transactions
- Can set spending limits per user
- Supports conditional sponsorship rules

## Base Chain Support
- Full EVM compatibility
- Configure in dashboard under supported networks
- Smart wallet deployment happens on first transaction
- Gas costs depend on smart wallet type and network congestion

*Note: The $5-10 deployment cost I mentioned was an estimate based on general smart wallet deployment costs on L2s, not from Privy docs specifically. Actual costs on Base would be much lower - likely under $1 given Base's low gas fees.*

## Wallet Operations

### Core Functions (via SDK)
- `sendTransaction`: Send native tokens or contract interactions
- `signMessage`: Sign messages for authentication
- `signTypedData`: EIP-712 structured data signing
- `switchChain`: Change active network

### Web3 Library Integration
- Compatible with viem, wagmi, ethers, web3.js
- Provides EIP-1193 provider
- Can wrap with any web3 library

## User Management

### User Object Structure
```typescript
{
  id: "privy:user_id",
  createdAt: Date,
  linkedAccounts: [
    {
      type: "passkey",
      credentialId: "...",
      authenticatorName: "iPhone"
    },
    {
      type: "email",
      address: "user@example.com"
    }
  ],
  wallet: {
    address: "0x...",
    chainType: "ethereum",
    walletClient: "privy"
  }
}
```

### Linking Multiple Auth Methods
- Users can have multiple authentication methods
- Link email/SMS to passkey account for recovery
- All methods tied to single user ID

## Funding Options
- Credit/debit cards via MoonPay, Stripe
- Bank transfers (ACH, Wire, SEPA)
- External wallet transfers
- Exchange transfers (Coinbase)

## Development Workflow

### Environment Setup
1. Create app in Privy Dashboard
2. Get App ID and Client ID
3. Configure login methods
4. Set up smart wallet options

### Testing Considerations
- Use separate apps for dev/staging/prod
- Test passkeys on physical devices only
- Base Sepolia available for testing

## Limitations & Considerations

### React Native Specific
- No web support in React Native SDK
- Requires custom build for passkeys
- iOS 17.5+ for passkey support

### Smart Wallets
- First transaction includes deployment cost
- Slightly higher gas than EOA for operations
- Some dApps may not support smart wallets yet

## Pricing
- Free: 1,000 Monthly Active Users
- Growth: $99/month for 2,500 MAUs
- Scale: Custom pricing
- Additional costs: Gas sponsorship (if enabled)

## Key Takeaways for BlirpMe

1. **Passkeys + Smart Wallets** = Best UX
   - No seed phrases
   - Biometric authentication
   - Gas sponsorship possible

2. **Security First**
   - App Secret stays backend only
   - Sharded key architecture
   - SOC2 certified

3. **Base Ready**
   - Full Base chain support
   - Low deployment costs on L2
   - Configure directly in dashboard

4. **Flexible Authentication**
   - Start with passkeys
   - Add email/SMS for user data
   - Multiple auth methods per user

## Resources
- [Documentation](https://docs.privy.io)
- [React Native Guide](https://docs.privy.io/basics/react-native/quickstart)
- [Smart Wallets Guide](https://docs.privy.io/wallets/using-wallets/evm-smart-wallets/overview)
- [Security Overview](https://docs.privy.io/security/overview)