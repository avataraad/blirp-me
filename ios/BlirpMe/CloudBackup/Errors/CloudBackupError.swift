//
//  CloudBackupError.swift
//  BlirpMe
//
//  Error types for CloudBackup module
//

import Foundation

@objc(CloudBackupError)
public enum CloudBackupError: String, Error {
    case userCanceled = "user_canceled"
    case noCredentialsFound = "no_credentials_found"
    case failed = "failed"
    case blobMutationFailed = "blob_mutation_failed"
    case unexpectedCredentialType = "unexpected_credential_type"
    case synchronizationFailed = "synchronization_failed"
    case dataConversionFailed = "data_conversion_failed"
    case createChallengeFailed = "create_challenge_failed"
    
    var localizedDescription: String {
        switch self {
        case .userCanceled:
            return "User canceled the authentication"
        case .noCredentialsFound:
            return "No passkeys found for this app"
        case .failed:
            return "Authentication failed"
        case .blobMutationFailed:
            return "Failed to save data to passkey"
        case .unexpectedCredentialType:
            return "Unexpected credential type returned"
        case .synchronizationFailed:
            return "Failed to sync with iCloud"
        case .dataConversionFailed:
            return "Failed to convert data"
        case .createChallengeFailed:
            return "Failed to generate security challenge"
        }
    }
}