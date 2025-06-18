//
//  PasskeyReadDataDelegate.swift
//  BlirpMe
//
//  Delegate for passkey read operations
//

import Foundation
import AuthenticationServices

@available(iOS 17.0, *)
class PasskeyReadDataDelegate: PasskeyAuthorizationDelegate {
    
    override func authorizationController(controller: ASAuthorizationController, 
                                        didCompleteWithAuthorization authorization: ASAuthorization) {
        guard let credential = authorization.credential as? ASAuthorizationPlatformPublicKeyCredentialAssertion else {
            rejecter(CloudBackupError.unexpectedCredentialType.rawValue, 
                    CloudBackupError.unexpectedCredentialType.localizedDescription, 
                    nil)
            return
        }
        
        // Extract blob data
        guard let largeBlobResult = credential.largeBlob?.result,
              case .read(let blobData) = largeBlobResult else {
            rejecter(CloudBackupError.noCredentialsFound.rawValue,
                    "No backup data found",
                    nil)
            return
        }
        
        do {
            let privateKey = try DataConverter.dataToString(blobData)
            
            // Check for deletion marker
            if privateKey == "DELETED" {
                rejecter(CloudBackupError.noCredentialsFound.rawValue,
                        "Backup has been deleted",
                        nil)
                return
            }
            
            let credentialID = credential.credentialID.base64EncodedString()
            resolver([
                "credentialID": credentialID,
                "privateKey": privateKey
            ])
            
        } catch {
            rejecter(CloudBackupError.dataConversionFailed.rawValue,
                    error.localizedDescription,
                    error)
        }
    }
}