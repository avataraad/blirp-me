//
//  CloudBackupModule.swift
//  BlirpMe
//
//  Native module for iOS cloud backup with Passkey integration
//

import Foundation
import AuthenticationServices

@objc(CloudBackupModule)
@available(iOS 17.0, *)
class CloudBackupModule: NSObject {
    
    // Store delegates to prevent deallocation
    private var registrationDelegate: PasskeyRegistrationDelegate?
    private var writeDataDelegate: PasskeyWriteDataDelegate?
    private var readDataDelegate: PasskeyReadDataDelegate?
    
    // Relying party identifier
    private let relyingPartyIdentifier = "blirp.me"
    
    // iCloud Key-Value Store
    private let kvStore = NSUbiquitousKeyValueStore.default
    
    // Key for storing known credentials
    private let knownCredentialsKey = "knownCredentials"
    
    // MARK: - Initialization
    
    override init() {
        super.init()
        
        // Observe iCloud sync notifications
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(kvStoreDidChange(_:)),
            name: NSUbiquitousKeyValueStore.didChangeExternallyNotification,
            object: kvStore
        )
    }
    
    deinit {
        NotificationCenter.default.removeObserver(self)
    }
    
    // MARK: - React Native Module Setup
    
    @objc
    static func requiresMainQueueSetup() -> Bool {
        return false
    }
    
    @objc
    func constantsToExport() -> [String: Any] {
        return [
            "USER_CANCELED": CloudBackupError.userCanceled.rawValue,
            "NO_CREDENTIALS_FOUND": CloudBackupError.noCredentialsFound.rawValue,
            "FAILED": CloudBackupError.failed.rawValue,
            "BLOB_MUTATION_FAILED": CloudBackupError.blobMutationFailed.rawValue,
            "UNEXPECTED_CREDENTIAL_TYPE": CloudBackupError.unexpectedCredentialType.rawValue,
            "SYNCHRONIZATION_FAILED": CloudBackupError.synchronizationFailed.rawValue,
            "DATA_CONVERSION_FAILED": CloudBackupError.dataConversionFailed.rawValue,
            "CREATE_CHALLENGE_FAILED": CloudBackupError.createChallengeFailed.rawValue
        ]
    }
    
    // MARK: - Registration
    
    @objc
    func register(_ tag: String,
                  resolver: @escaping RCTPromiseResolveBlock,
                  rejecter: @escaping RCTPromiseRejectBlock) {
        
        guard let tagData = tag.data(using: .utf8) else {
            rejecter(CloudBackupError.dataConversionFailed.rawValue,
                    "Failed to convert tag to data",
                    nil)
            return
        }
        
        do {
            let challenge = try ChallengeGenerator.generateChallenge()
            
            let delegate = PasskeyRegistrationDelegate(
                relyingPartyIdentifier: relyingPartyIdentifier,
                resolver: resolver,
                rejecter: rejecter
            )
            self.registrationDelegate = delegate
            
            let registrationRequest = delegate.provider.createCredentialRegistrationRequest(
                challenge: challenge,
                name: tag,
                userID: tagData
            )
            
            // Enable large blob support
            registrationRequest.largeBlob = ASAuthorizationPublicKeyCredentialLargeBlobRegistrationInput.supportRequired
            
            let controller = ASAuthorizationController(authorizationRequests: [registrationRequest])
            controller.delegate = delegate
            controller.presentationContextProvider = delegate
            controller.performRequests(options: .preferImmediatelyAvailableCredentials)
            
        } catch {
            rejecter(CloudBackupError.createChallengeFailed.rawValue,
                    CloudBackupError.createChallengeFailed.localizedDescription,
                    error)
        }
    }
    
    // MARK: - Write Data
    
    @objc
    func writeData(_ credentialID: String,
                   privateKey: String,
                   resolver: @escaping RCTPromiseResolveBlock,
                   rejecter: @escaping RCTPromiseRejectBlock) {
        
        do {
            // Validate private key format
            try DataConverter.validatePrivateKey(privateKey)
            
            // Convert inputs
            let credentialIDData = try DataConverter.base64ToData(credentialID)
            let privateKeyData = try DataConverter.stringToData(privateKey)
            let challenge = try ChallengeGenerator.generateChallenge()
            
            let delegate = PasskeyWriteDataDelegate(
                relyingPartyIdentifier: relyingPartyIdentifier,
                resolver: resolver,
                rejecter: rejecter
            )
            self.writeDataDelegate = delegate
            
            let assertionRequest = delegate.provider.createCredentialAssertionRequest(
                challenge: challenge
            )
            
            // Set up large blob write
            assertionRequest.largeBlob = ASAuthorizationPublicKeyCredentialLargeBlobAssertionInput.write(privateKeyData)
            
            // Specify the credential to use
            let descriptor = ASAuthorizationPlatformPublicKeyCredentialDescriptor(
                credentialID: credentialIDData
            )
            assertionRequest.allowedCredentials = [descriptor]
            
            let controller = ASAuthorizationController(authorizationRequests: [assertionRequest])
            controller.delegate = delegate
            controller.presentationContextProvider = delegate
            controller.performRequests(options: .preferImmediatelyAvailableCredentials)
            
        } catch {
            rejecter(CloudBackupError.dataConversionFailed.rawValue,
                    error.localizedDescription,
                    error)
        }
    }
    
    // MARK: - Read Data (to be implemented in Issue #6)
    
    @objc
    func readData(_ credentialID: String?,
                  resolver: @escaping RCTPromiseResolveBlock,
                  rejecter: @escaping RCTPromiseRejectBlock) {
        // TODO: Implement in Issue #6
        rejecter("NOT_IMPLEMENTED", "Read data not yet implemented", nil)
    }
    
    // MARK: - Metadata Storage (to be implemented in Issue #7)
    
    @objc
    func getKnownCredentials(_ resolver: @escaping RCTPromiseResolveBlock,
                            rejecter: @escaping RCTPromiseRejectBlock) {
        kvStore.synchronize()
        
        if let credentials = kvStore.array(forKey: knownCredentialsKey) as? [String] {
            resolver(credentials)
        } else {
            resolver([])
        }
    }
    
    @objc
    func setKnownCredentials(_ credentials: [String],
                            resolver: @escaping RCTPromiseResolveBlock,
                            rejecter: @escaping RCTPromiseRejectBlock) {
        kvStore.set(credentials, forKey: knownCredentialsKey)
        
        if kvStore.synchronize() {
            resolver(nil)
        } else {
            rejecter(CloudBackupError.synchronizationFailed.rawValue,
                    CloudBackupError.synchronizationFailed.localizedDescription,
                    nil)
        }
    }
    
    @objc
    func addKnownCredential(_ credential: String,
                           resolver: @escaping RCTPromiseResolveBlock,
                           rejecter: @escaping RCTPromiseRejectBlock) {
        kvStore.synchronize()
        
        var credentials = kvStore.array(forKey: knownCredentialsKey) as? [String] ?? []
        credentials.append(credential)
        kvStore.set(credentials, forKey: knownCredentialsKey)
        
        if kvStore.synchronize() {
            resolver(nil)
        } else {
            rejecter(CloudBackupError.synchronizationFailed.rawValue,
                    CloudBackupError.synchronizationFailed.localizedDescription,
                    nil)
        }
    }
    
    // MARK: - Private Methods
    
    @objc
    private func kvStoreDidChange(_ notification: Notification) {
        // Handle external changes
        guard let userInfo = notification.userInfo,
              let changeReason = userInfo[NSUbiquitousKeyValueStoreChangeReasonKey] as? Int else {
            return
        }
        
        // Re-sync if needed
        if changeReason == NSUbiquitousKeyValueStoreServerChange ||
           changeReason == NSUbiquitousKeyValueStoreInitialSyncChange {
            kvStore.synchronize()
        }
    }
}