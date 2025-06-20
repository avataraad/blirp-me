//
//  PasskeyRegistrationDelegate.swift
//  BlirpMe
//
//  Delegate for passkey registration
//

import Foundation
import AuthenticationServices

@available(iOS 17.0, *)
class PasskeyRegistrationDelegate: PasskeyAuthorizationDelegate {
    
    override func authorizationController(controller: ASAuthorizationController, 
                                        didCompleteWithAuthorization authorization: ASAuthorization) {
        guard let credential = authorization.credential as? ASAuthorizationPlatformPublicKeyCredentialRegistration else {
            rejecter(CloudBackupError.unexpectedCredentialType.rawValue, 
                    CloudBackupError.unexpectedCredentialType.localizedDescription, 
                    nil)
            return
        }
        
        let credentialID = credential.credentialID.base64EncodedString()
        resolver(["credentialID": credentialID])
    }
}