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
        // TODO: Implement in Issue #6
        rejecter(CloudBackupError.failed.rawValue, 
                "Read data delegate not yet implemented", 
                nil)
    }
}