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
        // TODO: Implement in Issue #5
        rejecter(CloudBackupError.failed.rawValue, 
                "Write data delegate not yet implemented", 
                nil)
    }
}