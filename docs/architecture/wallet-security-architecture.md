# BlirpMe Wallet Security Architecture

## Overview

BlirpMe implements a hybrid security model that combines WebAuthn passkeys for account recovery with device secure enclave for transaction signing. This architecture provides both the convenience of cloud backup and the speed of local biometric authentication.

## Key Components

### 1. Passkeys (WebAuthn)
- **Purpose**: Account creation, backup, and recovery
- **Storage**: Private keys stored in passkey's largeBlob
- **Authentication**: Platform biometrics or device PIN
- **Backup**: Automatically synced via iCloud Keychain (iOS) or Google Password Manager (Android)

### 2. Secure Enclave (Keychain)
- **Purpose**: Fast transaction signing
- **Storage**: Private keys protected by device biometrics
- **Authentication**: Face ID, Touch ID, or device PIN
- **Scope**: Device-specific, not synced

## Architecture Flow

### Wallet Creation Flow
```
1. User initiates wallet creation
2. Generate new private key + mnemonic
3. Create passkey with user identifier (@tag)
4. Store private key in passkey largeBlob
5. Store private key in device secure enclave
6. Clear sensitive data from memory
```

### Wallet Recovery Flow (Sign In)
```
1. User initiates sign in with @tag
2. Authenticate with passkey
3. Retrieve private key from passkey largeBlob
4. Check if private key exists in secure enclave
5. If not, store private key in secure enclave
6. Restore wallet context
```

### Transaction Signing Flow
```
1. User initiates transaction
2. Simulate transaction for preview
3. User confirms transaction details
4. Prompt for biometric authentication
5. Retrieve private key from secure enclave
6. Sign transaction locally
7. Broadcast to network
```

## Implementation Details

### Private Key Storage

#### In Passkey LargeBlob
```javascript
// Storing during wallet creation
const largeBlob = {
  privateKey: encryptedPrivateKey,
  metadata: {
    address: walletAddress,
    createdAt: timestamp,
    version: 1
  }
};
```

#### In Secure Enclave (Keychain)
```javascript
await Keychain.setInternetCredentials(
  'blirpme_wallet',
  walletAddress, // username
  privateKey,    // password
  {
    accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET,
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    authenticatePrompt: 'Store wallet securely'
  }
);
```

### Private Key Retrieval

#### For Transaction Signing
```javascript
const credentials = await Keychain.getInternetCredentials(
  'blirpme_wallet',
  {
    authenticationPrompt: {
      title: 'Confirm Transaction',
      subtitle: 'Authenticate to sign transaction',
      description: `Sending ${amount} ETH to ${recipient}`,
      cancel: 'Cancel'
    }
  }
);
const privateKey = credentials.password;
```

## Security Considerations

### Defense in Depth
1. **Passkey Authentication**: First layer of security for account access
2. **Biometric Authentication**: Second layer for transaction signing
3. **Secure Enclave Storage**: Hardware-level key protection
4. **No Seed Phrase Exposure**: Users never see or handle raw private keys

### Key Rotation and Recovery
- Private keys can be rotated by creating new passkey
- Old passkeys can be revoked
- Recovery possible from any device with passkey access

### Attack Vectors and Mitigations

| Attack Vector | Mitigation |
|--------------|------------|
| Device theft | Biometric authentication required |
| Passkey compromise | Secure enclave provides second factor |
| Phishing | Passkeys are domain-bound |
| Key extraction | Hardware secure enclave protection |
| Backup compromise | Keys encrypted in largeBlob |

## State Management

### WalletContext Responsibilities
1. Track current wallet address
2. Manage authentication state
3. Coordinate between passkey and secure enclave
4. Handle key synchronization

### Key Synchronization Logic
```typescript
async function syncPrivateKeyToSecureEnclave(privateKey: string, address: string) {
  try {
    // Check if key already exists
    const existing = await Keychain.getInternetCredentials('blirpme_wallet');
    
    if (!existing || existing.username !== address) {
      // Store new key with biometric protection
      await Keychain.setInternetCredentials(
        'blirpme_wallet',
        address,
        privateKey,
        {
          accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET,
          accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY
        }
      );
    }
  } catch (error) {
    console.error('Failed to sync key to secure enclave:', error);
    // App continues to work with passkey-only mode
  }
}
```

## Transaction Security

### Pre-signing Checks
1. Validate recipient address
2. Check sufficient balance
3. Estimate gas costs
4. Display human-readable preview
5. Show security warnings if needed

### Signing Process
1. Build transaction object
2. Request biometric authentication
3. Retrieve private key from secure enclave
4. Sign transaction offline
5. Clear private key from memory
6. Broadcast signed transaction

### Post-signing
1. Monitor transaction status
2. Update UI with confirmation
3. Log transaction for history

## Best Practices

### For Developers
1. Never log or expose private keys
2. Clear sensitive data immediately after use
3. Always require biometric authentication for signing
4. Implement proper error handling for auth failures
5. Provide clear user feedback during auth flows

### For Users
1. Enable strongest available biometrics
2. Keep devices updated
3. Use unique @tags for each wallet
4. Report suspicious activity immediately

## Comparison with Industry Standards

| Feature | BlirpMe | MetaMask | Coinbase Wallet |
|---------|---------|----------|-----------------|
| Cloud Backup | ✅ Passkeys | ❌ Manual | ✅ Encrypted |
| Biometric Signing | ✅ | ✅ | ✅ |
| No Seed Phrase | ✅ | ❌ | ❌ |
| Hardware Security | ✅ | ✅ | ✅ |
| Cross-device Sync | ✅ | ❌ | ✅ |

## Future Enhancements

### Planned Features
1. Multi-signature support via multiple passkeys
2. Transaction limits with different auth levels
3. Social recovery using trusted contacts
4. Hardware wallet integration as additional signer

### Potential Improvements
1. Implement key sharding across devices
2. Add time-based authentication requirements
3. Support for delegated signing
4. Integration with iOS/Android native payment APIs

## References

- [WebAuthn Specification](https://www.w3.org/TR/webauthn-2/)
- [Apple Secure Enclave Documentation](https://support.apple.com/guide/security/secure-enclave-sec59b0b31ff/web)
- [React Native Keychain Security](https://github.com/oblador/react-native-keychain#security)
- [Passkey Implementation Guide](https://developer.apple.com/documentation/authenticationservices/public-private_key_authentication/supporting_passkeys)