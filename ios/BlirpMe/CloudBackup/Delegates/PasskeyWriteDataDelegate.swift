//
//  PasskeyWriteDataDelegate.swift
//  BlirpMe
//
//  Delegate for passkey write operations
//

import Foundation
import AuthenticationServices

@available(iOS 17.0, *)
class PasskeyWriteDataDelegate: PasskeyAuthorizationDelegate {
    
    override func authorizationController(controller: ASAuthorizationController, 
                                        didCompleteWithAuthorization authorization: ASAuthorization) {
        guard let credential = authorization.credential as? ASAuthorizationPlatformPublicKeyCredentialAssertion else {
            rejecter(CloudBackupError.unexpectedCredentialType.rawValue, 
                    CloudBackupError.unexpectedCredentialType.localizedDescription, 
                    nil)
            return
        }
        
        // Check if write was successful
        guard let largeBlobResult = credential.largeBlob?.result,
              largeBlobResult == .success else {
            rejecter(CloudBackupError.blobMutationFailed.rawValue,
                    CloudBackupError.blobMutationFailed.localizedDescription,
                    nil)
            return
        }
        
        let credentialID = credential.credentialID.base64EncodedString()
        resolver(["credentialID": credentialID])
    }
}