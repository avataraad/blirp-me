//
//  PasskeyAuthorizationDelegate.swift
//  BlirpMe
//
//  Base delegate for passkey authorization
//

import Foundation
import AuthenticationServices

@available(iOS 17.0, *)
class PasskeyAuthorizationDelegate: NSObject, ASAuthorizationControllerDelegate, ASAuthorizationControllerPresentationContextProviding {
    
    let resolver: RCTPromiseResolveBlock
    let rejecter: RCTPromiseRejectBlock
    let provider: ASAuthorizationPlatformPublicKeyCredentialProvider
    
    init(relyingPartyIdentifier: String, 
         resolver: @escaping RCTPromiseResolveBlock, 
         rejecter: @escaping RCTPromiseRejectBlock) {
        self.resolver = resolver
        self.rejecter = rejecter
        self.provider = ASAuthorizationPlatformPublicKeyCredentialProvider(
            relyingPartyIdentifier: relyingPartyIdentifier
        )
        super.init()
    }
    
    // MARK: - ASAuthorizationControllerPresentationContextProviding
    
    func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        return ASPresentationAnchor()
    }
    
    // MARK: - ASAuthorizationControllerDelegate
    
    func authorizationController(controller: ASAuthorizationController, 
                                didCompleteWithError error: Error) {
        if let authError = error as? ASAuthorizationError {
            switch authError.code {
            case .canceled:
                if authError.userInfo.isEmpty {
                    rejecter(CloudBackupError.userCanceled.rawValue, 
                            CloudBackupError.userCanceled.localizedDescription, 
                            error)
                } else {
                    rejecter(CloudBackupError.noCredentialsFound.rawValue, 
                            CloudBackupError.noCredentialsFound.localizedDescription, 
                            error)
                }
            default:
                rejecter(CloudBackupError.failed.rawValue, 
                        CloudBackupError.failed.localizedDescription, 
                        error)
            }
        } else {
            rejecter(CloudBackupError.failed.rawValue, 
                    CloudBackupError.failed.localizedDescription, 
                    error)
        }
    }
    
    func authorizationController(controller: ASAuthorizationController, 
                                didCompleteWithAuthorization authorization: ASAuthorization) {
        // Override in subclasses
    }
}