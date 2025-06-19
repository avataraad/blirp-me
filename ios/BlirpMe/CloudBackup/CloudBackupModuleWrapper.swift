//
//  CloudBackupModuleWrapper.swift
//  BlirpMe
//
//  Wrapper to handle iOS version compatibility
//

import Foundation

@objc(CloudBackupModule)
class CloudBackupModuleWrapper: NSObject {
    
    private var actualModule: Any?
    
    override init() {
        super.init()
        
        if #available(iOS 17.0, *) {
            actualModule = CloudBackupModule()
        }
    }
    
    @objc
    static func requiresMainQueueSetup() -> Bool {
        return false
    }
    
    @objc
    func constantsToExport() -> [String: Any] {
        if #available(iOS 17.0, *), let module = actualModule as? CloudBackupModule {
            return module.constantsToExport()
        }
        
        // Return error constants for older iOS versions
        return [
            "USER_CANCELED": "user_canceled",
            "NO_CREDENTIALS_FOUND": "no_credentials_found",
            "FAILED": "failed",
            "BLOB_MUTATION_FAILED": "blob_mutation_failed",
            "UNEXPECTED_CREDENTIAL_TYPE": "unexpected_credential_type",
            "SYNCHRONIZATION_FAILED": "synchronization_failed",
            "DATA_CONVERSION_FAILED": "data_conversion_failed",
            "CREATE_CHALLENGE_FAILED": "create_challenge_failed"
        ]
    }
    
    @objc
    func register(_ tag: String,
                  resolver: @escaping RCTPromiseResolveBlock,
                  rejecter: @escaping RCTPromiseRejectBlock) {
        
        if #available(iOS 17.0, *), let module = actualModule as? CloudBackupModule {
            module.register(tag, resolver: resolver, rejecter: rejecter)
        } else {
            rejecter("UNSUPPORTED_IOS_VERSION", "CloudBackup requires iOS 17.0 or later", nil)
        }
    }
    
    @objc
    func writeData(_ credentialID: String,
                   privateKey: String,
                   resolver: @escaping RCTPromiseResolveBlock,
                   rejecter: @escaping RCTPromiseRejectBlock) {
        
        if #available(iOS 17.0, *), let module = actualModule as? CloudBackupModule {
            module.writeData(credentialID, privateKey: privateKey, resolver: resolver, rejecter: rejecter)
        } else {
            rejecter("UNSUPPORTED_IOS_VERSION", "CloudBackup requires iOS 17.0 or later", nil)
        }
    }
    
    @objc
    func readData(_ credentialID: String?,
                  resolver: @escaping RCTPromiseResolveBlock,
                  rejecter: @escaping RCTPromiseRejectBlock) {
        
        if #available(iOS 17.0, *), let module = actualModule as? CloudBackupModule {
            module.readData(credentialID, resolver: resolver, rejecter: rejecter)
        } else {
            rejecter("UNSUPPORTED_IOS_VERSION", "CloudBackup requires iOS 17.0 or later", nil)
        }
    }
    
    @objc
    func getKnownCredentials(_ resolver: @escaping RCTPromiseResolveBlock,
                            rejecter: @escaping RCTPromiseRejectBlock) {
        
        if #available(iOS 17.0, *), let module = actualModule as? CloudBackupModule {
            module.getKnownCredentials(resolver, rejecter: rejecter)
        } else {
            resolver([])
        }
    }
    
    @objc
    func setKnownCredentials(_ credentials: [String],
                            resolver: @escaping RCTPromiseResolveBlock,
                            rejecter: @escaping RCTPromiseRejectBlock) {
        
        if #available(iOS 17.0, *), let module = actualModule as? CloudBackupModule {
            module.setKnownCredentials(credentials, resolver: resolver, rejecter: rejecter)
        } else {
            resolver(nil)
        }
    }
    
    @objc
    func addKnownCredential(_ credential: String,
                           resolver: @escaping RCTPromiseResolveBlock,
                           rejecter: @escaping RCTPromiseRejectBlock) {
        
        if #available(iOS 17.0, *), let module = actualModule as? CloudBackupModule {
            module.addKnownCredential(credential, resolver: resolver, rejecter: rejecter)
        } else {
            resolver(nil)
        }
    }
}