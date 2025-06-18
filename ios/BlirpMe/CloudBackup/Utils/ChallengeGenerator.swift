//
//  ChallengeGenerator.swift
//  BlirpMe
//
//  Utility for generating cryptographic challenges
//

import Foundation
import Security

class ChallengeGenerator {
    static func generateChallenge() throws -> Data {
        var bytes = [UInt8](repeating: 0, count: 32)
        let status = SecRandomCopyBytes(kSecRandomDefault, bytes.count, &bytes)
        
        guard status == errSecSuccess else {
            throw CloudBackupError.createChallengeFailed
        }
        
        return Data(bytes)
    }
}