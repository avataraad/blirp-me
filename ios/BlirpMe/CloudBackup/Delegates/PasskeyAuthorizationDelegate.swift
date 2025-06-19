//
//  PasskeyAuthorizationDelegate.swift
//  BlirpMe
//
//  Base delegate for passkey authorization
//

import Foundation
import AuthenticationServices
import UIKit

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
        guard let window = UIApplication.shared.windows.first(where: { $0.isKeyWindow }) ?? 
                          UIApplication.shared.windows.first else {
            return ASPresentationAnchor()
        }
        return window
    }
    
    // MARK: - ASAuthorizationControllerDelegate
    
    func authorizationController(controller: ASAuthorizationController, 
                                didCompleteWithError error: Error) {
        print("ASAuthorizationController error: \(error)")
        print("Error domain: \((error as NSError).domain)")
        print("Error code: \((error as NSError).code)")
        print("Error userInfo: \((error as NSError).userInfo)")
        
        // Additional debugging for error 1004
        if (error as NSError).code == 1004 {
            print("Error 1004 detected - webcredentials association verification failed")
            print("Ensure apple-app-site-association is accessible at https://blirp.me/.well-known/apple-app-site-association")
            print("Current relying party identifier: \(self.provider.relyingPartyIdentifier)")
        }
        
        if let authError = error as? ASAuthorizationError {
            print("ASAuthorizationError code raw value: \(authError.code.rawValue)")
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
