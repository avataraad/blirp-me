/**
 * Tests for WebAuthn CBOR Parser
 * Verifies that the parser correctly extracts public keys from attestationObject
 */

import { extractPublicKeyFromAttestationObject } from '../webauthnCborParser';
import { encode } from 'cbor-x';
import { Buffer } from 'buffer';

describe('WebAuthn CBOR Parser', () => {
  it('should extract public key from valid attestationObject', () => {
    // Create a mock attestationObject with known public key coordinates
    const mockX = Buffer.from('1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef', 'hex');
    const mockY = Buffer.from('fedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321', 'hex');
    
    // Create COSE key structure (Map with negative integer keys)
    const coseKey = new Map();
    coseKey.set(1, 2); // kty: EC2
    coseKey.set(3, -7); // alg: ES256
    coseKey.set(-1, 1); // crv: P-256
    coseKey.set(-2, mockX); // x coordinate
    coseKey.set(-3, mockY); // y coordinate
    
    // Encode COSE key to CBOR
    const coseKeyBytes = encode(coseKey);
    
    // Create authData with attestedCredentialData
    const rpIdHash = Buffer.alloc(32, 0x01); // 32 bytes RP ID hash
    const flags = Buffer.from([0x45]); // Flags with AT (0x40) and UP (0x01) set
    const counter = Buffer.from([0x00, 0x00, 0x00, 0x01]); // 4 bytes counter
    const aaguid = Buffer.alloc(16, 0x02); // 16 bytes AAGUID
    const credentialIdLength = Buffer.from([0x00, 0x20]); // 2 bytes length (32 bytes)
    const credentialId = Buffer.alloc(32, 0x03); // 32 bytes credential ID
    
    // Combine all parts
    const authData = Buffer.concat([
      rpIdHash,
      flags,
      counter,
      aaguid,
      credentialIdLength,
      credentialId,
      coseKeyBytes
    ]);
    
    // Create attestationObject
    const attestationObject = {
      fmt: 'none',
      authData: authData,
      attStmt: {}
    };
    
    // Encode to CBOR and base64
    const attestationObjectBytes = encode(attestationObject);
    const attestationObjectBase64 = attestationObjectBytes.toString('base64');
    
    // Test extraction
    const extractedKey = extractPublicKeyFromAttestationObject(attestationObjectBase64);
    
    // Verify the extracted key matches our mock coordinates
    const expectedKey = '0x' + mockX.toString('hex') + mockY.toString('hex');
    expect(extractedKey).toBe(expectedKey);
  });
  
  it('should handle missing attestedCredentialData gracefully', () => {
    // Create authData without attestedCredentialData (flag not set)
    const rpIdHash = Buffer.alloc(32, 0x01);
    const flags = Buffer.from([0x01]); // Only UP flag, no AT flag
    const counter = Buffer.from([0x00, 0x00, 0x00, 0x01]);
    
    const authData = Buffer.concat([rpIdHash, flags, counter]);
    
    const attestationObject = {
      fmt: 'none',
      authData: authData,
      attStmt: {}
    };
    
    const attestationObjectBytes = encode(attestationObject);
    const attestationObjectBase64 = attestationObjectBytes.toString('base64');
    
    // Should throw an error
    expect(() => {
      extractPublicKeyFromAttestationObject(attestationObjectBase64);
    }).toThrow('No attestedCredentialData in authData');
  });
});