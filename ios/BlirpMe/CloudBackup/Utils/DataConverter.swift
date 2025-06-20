//
//  DataConverter.swift
//  BlirpMe
//
//  Utility for data conversion and validation
//

import Foundation

class DataConverter {
    static func base64ToData(_ base64String: String) throws -> Data {
        guard let data = Data(base64Encoded: base64String) else {
            throw CloudBackupError.dataConversionFailed
        }
        return data
    }
    
    static func stringToData(_ string: String) throws -> Data {
        guard let data = string.data(using: .utf8) else {
            throw CloudBackupError.dataConversionFailed
        }
        return data
    }
    
    static func dataToString(_ data: Data) throws -> String {
        guard let string = String(data: data, encoding: .utf8) else {
            throw CloudBackupError.dataConversionFailed
        }
        return string
    }
    
    static func validatePrivateKey(_ privateKey: String) throws {
        // Basic validation - 64 hex characters
        let hexRegex = "^[0-9a-fA-F]{64}$"
        let predicate = NSPredicate(format: "SELF MATCHES %@", hexRegex)
        
        guard predicate.evaluate(with: privateKey) else {
            throw CloudBackupError.dataConversionFailed
        }
    }
}