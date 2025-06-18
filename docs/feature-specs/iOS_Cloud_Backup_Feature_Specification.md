# iOS Cloud Backup Feature Specification
## Secure Wallet Backup using Apple Passkeys

### Version 1.0
### Date: June 18, 2025

---

## Executive Summary

This document outlines the implementation of a secure cloud backup system for iOS wallet applications using Apple's Passkey technology (WebAuthn). The system leverages the ASAuthorizationPublicKeyCredentialLargeBlobExtension to securely store and retrieve wallet private keys, providing users with a seamless backup and recovery experience across their Apple devices.

## Feature Overview

### Objective
Enable wallet users to securely backup their private keys to iCloud using Apple's Passkey infrastructure, ensuring:
- Biometric-protected access to backup data
- Cross-device synchronization via iCloud
- Zero-knowledge architecture (Apple cannot access private keys)
- Seamless recovery on new devices

### Key Benefits
1. **Security**: Private keys are protected by device biometrics and Apple's secure enclave
2. **Convenience**: Automatic sync across user's Apple devices
3. **Recovery**: Easy wallet restoration on new devices
4. **Privacy**: Zero-knowledge design ensures only users can access their keys

## Technical Architecture

### System Requirements
- **iOS Version**: 17.0+ (required for passkey large blob support)
- **Device**: Physical iOS device with biometric authentication
- **iCloud**: Active iCloud account with Keychain sync enabled
- **React Native**: Bridge module for JavaScript integration

### Core Components

#### 1. Native Module (CloudBackupModule)
- **Language**: Swift with Objective-C bridge
- **Class**: `CloudBackupModule` inheriting from `NSObject`
- **Availability**: iOS 17.0+
- **Key Dependencies**:
  - AuthenticationServices framework
  - Security framework
  - CloudKit framework (for NSUbiquitousKeyValueStore)

#### 2. Authentication Flow
- **Registration**: Creates new passkey with large blob support
- **Write Operations**: Stores encrypted private key in passkey blob
- **Read Operations**: Retrieves private key from passkey blob
- **Credential Management**: Tracks known credentials in iCloud KV store

#### 3. Data Storage Architecture
```
┌─────────────────────────────────────┐
│         React Native App            │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│      CloudBackup Native Module      │
├─────────────────────────────────────┤
│  • register()                       │
│  • writeData()                      │
│  • readData()                       │
│  • getKnownCredentials()           │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│   ASAuthorization Framework          │
├─────────────────────────────────────┤
│  • Passkey Creation                 │
│  • Large Blob Extension             │
│  • Biometric Authentication         │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│         iCloud Services             │
├─────────────────────────────────────┤
│  • Passkey Sync (Keychain)         │
│  • Metadata Sync (KV Store)        │
└─────────────────────────────────────┘
```

## API Specification

### JavaScript Interface

```typescript
interface CloudBackup {
  // Register new passkey for backup
  register(tag: string): Promise<{credentialID: string}>;
  
  // Write private key to passkey blob
  writeData(credentialID: string, privateKey: string): Promise<{credentialID: string}>;
  
  // Read private key from passkey blob
  readData(credentialID?: string): Promise<{credentialID: string, privateKey: string}>;
  
  // Manage known credentials
  getKnownCredentials(): Promise<string[]>;
  setKnownCredentials(credentials: string[]): Promise<void>;
  addKnownCredential(credential: string): Promise<void>;
}
```

### Native Methods

#### Registration
```swift
@objc func register(
  _ tag: String,
  resolver: @escaping RCTPromiseResolveBlock,
  rejecter: @escaping RCTPromiseRejectBlock
)
```
- Creates new passkey with specified tag
- Returns base64-encoded credential ID
- Enables large blob support requirement

#### Data Operations
```swift
@objc func writeData(
  _ credentialID: String,
  privateKey: String,
  resolver: @escaping RCTPromiseResolveBlock,
  rejecter: @escaping RCTPromiseRejectBlock
)

@objc func readData(
  _ credentialID: String?,
  resolver: @escaping RCTPromiseResolveBlock,
  rejecter: @escaping RCTPromiseRejectBlock
)
```

## Security Model

### Threat Model
1. **Device Compromise**: Mitigated by biometric authentication
2. **Network Interception**: Protected by end-to-end encryption
3. **iCloud Account Breach**: Keys protected by device-specific encryption
4. **Malicious Apps**: Sandboxing and entitlement requirements

### Security Controls
1. **Biometric Authentication**: Required for all operations
2. **Cryptographic Challenges**: Fresh 32-byte challenges per operation
3. **Private Key Validation**: Format verification before storage
4. **Deletion Markers**: Soft deletion to prevent accidental loss
5. **No Logging**: Private keys never logged or exposed

### Data Flow Security
```
User → Biometric Auth → Passkey → Large Blob → iCloud Sync
                ↑                      ↓
           Device Secure         End-to-End
             Enclave             Encrypted
```

## Implementation Breakdown

### Core Infrastructure Issues

#### Issue 1: Project Configuration
- Update iOS deployment target to 17.0
- Add required capabilities (Associated Domains, iCloud, Sign in with Apple)
- Configure Info.plist with NSFaceIDUsageDescription
- Update entitlements with webcredentials domain
- Configure Swift compiler settings

#### Issue 2: Native Module Setup
- Create CloudBackupModule Swift class with @objc annotations
- Create Objective-C bridge file with RCT_EXTERN methods
- Set up error constants enum
- Configure module registration with React Native

### Authentication & Passkey Issues

#### Issue 3: Passkey Registration
- Implement register() method
- Create PasskeyRegistrationDelegate
- Handle ASAuthorizationController setup
- Generate cryptographic challenges
- Return base64-encoded credential IDs

#### Issue 4: Passkey Write Operations
- Implement writeData() method
- Create PasskeyWriteDataDelegate
- Handle large blob write operations
- Validate private key format
- Implement write verification

#### Issue 5: Passkey Read Operations
- Implement readData() method
- Create PasskeyReadDataDelegate
- Handle credential picker UI
- Extract and decode blob data
- Convert data to UTF-8 strings

### Data Management Issues

#### Issue 6: Credential Metadata Storage
- Implement NSUbiquitousKeyValueStore integration
- Create getKnownCredentials() method
- Create setKnownCredentials() method
- Create addKnownCredential() method
- Handle synchronization calls

#### Issue 7: Error Handling & Recovery
- Implement comprehensive error detection
- Create error propagation to JavaScript
- Handle user cancellation scenarios
- Implement retry mechanisms
- Add data validation checks

### JavaScript Integration Issues

#### Issue 8: TypeScript Definitions
- Create CloudBackup interface
- Define method signatures
- Create error type definitions
- Add JSDoc documentation

#### Issue 9: React Native Bridge
- Create JavaScript module wrapper
- Implement promise-based API
- Add platform availability checks
- Create usage examples

### Testing & Quality Issues

#### Issue 10: Unit Tests
- Test challenge generation
- Test data encoding/decoding
- Test error scenarios
- Test delegate lifecycle
- Test metadata operations

#### Issue 11: Integration Tests
- Test full registration flow
- Test write/read cycle
- Test credential management
- Test error recovery
- Test cross-device scenarios

## Error Handling

### Error Codes
```typescript
enum CloudBackupError {
  USER_CANCELED = "user_canceled",
  NO_CREDENTIALS_FOUND = "no_credentials_found",
  FAILED = "failed",
  BLOB_MUTATION_FAILED = "blob_mutation_failed",
  UNEXPECTED_CREDENTIAL_TYPE = "unexpected_credential_type",
  SYNCHRONIZATION_FAILED = "synchronization_failed",
  DATA_CONVERSION_FAILED = "data_conversion_failed",
  CREATE_CHALLENGE_FAILED = "create_challenge_failed"
}
```

### Recovery Strategies
1. **User Cancellation**: Provide retry option
2. **No Credentials**: Guide to registration flow
3. **Sync Failures**: Offline queue with retry
4. **Data Corruption**: Validation and recovery options

## Testing Strategy

### Unit Tests
- Challenge generation
- Data encoding/decoding
- Error handling paths
- Metadata operations

### Integration Tests
- Full registration flow
- Write/read cycles
- Cross-device synchronization
- Error recovery scenarios

### Manual Testing Checklist
- [ ] Fresh device setup
- [ ] Multiple passkey management
- [ ] Network interruption handling
- [ ] iCloud sync delays
- [ ] Biometric failure scenarios

## Performance Considerations

### Optimization Points
1. **Lazy Loading**: Load passkey framework on-demand
2. **Caching**: Cache credential metadata locally
3. **Batch Operations**: Group metadata updates
4. **Background Sync**: Handle iCloud sync asynchronously

### Performance Targets
- Registration: < 3 seconds
- Write Operation: < 2 seconds
- Read Operation: < 1 second
- Metadata Sync: < 500ms

## Privacy & Compliance

### Data Handling
- **Private Keys**: Never leave device unencrypted
- **Metadata**: Contains only non-sensitive identifiers
- **Analytics**: No private key data in telemetry
- **Logs**: Sanitized for production builds

### Compliance Requirements
- **GDPR**: User control over backup data
- **CCPA**: Data deletion capabilities
- **App Store**: Privacy nutrition labels update
- **Security Audits**: Regular penetration testing

## Appendices

### A. Project Structure
```
ios/
├── CloudBackup/
│   ├── CloudBackupModule.swift
│   ├── CloudBackupModule.m (Bridge)
│   ├── Delegates/
│   │   ├── PasskeyAuthorizationDelegate.swift
│   │   ├── PasskeyRegistrationDelegate.swift
│   │   ├── PasskeyWriteDataDelegate.swift
│   │   └── PasskeyReadDataDelegate.swift
│   ├── Errors/
│   │   └── CloudBackupError.swift
│   └── Utils/
│       ├── ChallengeGenerator.swift
│       └── DataConverter.swift
├── Info.plist (Updated)
└── Entitlements.plist (Updated)

src/
├── modules/
│   └── cloudBackup/
│       ├── index.ts
│       ├── types.ts
│       └── __tests__/
```

### B. Dependencies
```json
{
  "react-native": ">=0.70.0",
  "iOS Deployment Target": "17.0",
  "Swift Version": "5.0+",
  "Frameworks": [
    "AuthenticationServices",
    "Security",
    "CloudKit"
  ]
}
```

### C. Configuration Checklist
- [ ] Enable Associated Domains capability
- [ ] Add webcredentials:domain.com to entitlements
- [ ] Enable iCloud capability with Key-Value storage
- [ ] Add NSFaceIDUsageDescription to Info.plist
- [ ] Configure Swift compiler settings
- [ ] Set up Apple Developer account credentials

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-06-18 | Team | Initial specification |