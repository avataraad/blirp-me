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
        // TODO: Implement in Issue #4
        rejecter(CloudBackupError.failed.rawValue, 
                "Registration delegate not yet implemented", 
                nil)
    }
}