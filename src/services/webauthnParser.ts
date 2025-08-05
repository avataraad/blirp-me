import * as cbor from 'borc';

/**
 * Extract P-256 public key coordinates from WebAuthn attestationObject
 * Returns hex string in format: 0x + x-coordinate + y-coordinate
 */
export function extractPublicKeyFromAttestationObject(attestationObjectBase64: string): string {
  try {
    console.log('Parsing attestationObject...');
    
    // Decode base64 to buffer
    const attestationObjectBytes = Buffer.from(attestationObjectBase64, 'base64');
    
    // CBOR decode - borc works directly with Buffer
    const attestationObject = cbor.decode(attestationObjectBytes);
    console.log('Decoded attestationObject:', {
      fmt: attestationObject.fmt,
      hasAuthData: !!attestationObject.authData,
      hasAttStmt: !!attestationObject.attStmt
    });
    
    // Extract authData
    const authData = attestationObject.authData;
    if (!authData) {
      throw new Error('No authData in attestationObject');
    }
    
    // Parse authData structure
    // authData format:
    // - 32 bytes: RP ID hash
    // - 1 byte: flags
    // - 4 bytes: counter
    // - variable: attestedCredentialData (if present)
    // - variable: extensions (if present)
    
    let offset = 0;
    
    // Skip RP ID hash (32 bytes)
    offset += 32;
    
    // Read flags (1 byte)
    const flags = authData[offset];
    offset += 1;
    
    // Skip counter (4 bytes)
    offset += 4;
    
    // Check if attestedCredentialData is present (flag bit 6)
    if (!(flags & 0x40)) {
      throw new Error('No attestedCredentialData in authData');
    }
    
    // Parse attestedCredentialData
    // - 16 bytes: AAGUID
    // - 2 bytes: credentialIdLength
    // - variable: credentialId
    // - variable: credentialPublicKey (COSE key)
    
    // Skip AAGUID (16 bytes)
    offset += 16;
    
    // Read credentialIdLength (2 bytes, big-endian)
    const credentialIdLength = (authData[offset] << 8) | authData[offset + 1];
    offset += 2;
    
    // Skip credentialId
    offset += credentialIdLength;
    
    // Now we're at the credentialPublicKey (COSE key)
    // Extract the remaining bytes and decode as CBOR
    const publicKeyBytes = authData.slice(offset);
    const coseKey = cbor.decode(publicKeyBytes);
    
    console.log('COSE Key type:', typeof coseKey);
    console.log('COSE Key:', coseKey);
    
    // borc returns a Map object for CBOR maps
    // COSE key map:
    // 1 = kty (key type, 2 = EC2)
    // 3 = alg (algorithm, -7 = ES256)
    // -1 = crv (curve, 1 = P-256)
    // -2 = x coordinate
    // -3 = y coordinate
    
    // Check if it's a Map or plain object
    let x, y;
    if (coseKey instanceof Map) {
      x = coseKey.get(-2);
      y = coseKey.get(-3);
    } else {
      x = coseKey[-2];
      y = coseKey[-3];
    }
    
    if (!x || !y) {
      throw new Error('Missing x or y coordinate in COSE key');
    }
    
    // Convert to hex
    const xHex = Buffer.from(x).toString('hex');
    const yHex = Buffer.from(y).toString('hex');
    
    // Ensure 32 bytes (64 hex chars) each
    if (xHex.length !== 64 || yHex.length !== 64) {
      console.warn('Unexpected coordinate length:', { xLen: xHex.length, yLen: yHex.length });
    }
    
    // Combine as 0x + x + y
    const publicKeyHex = '0x' + xHex + yHex;
    
    console.log('Extracted public key:', {
      x: '0x' + xHex,
      y: '0x' + yHex,
      combined: publicKeyHex
    });
    
    return publicKeyHex;
    
  } catch (error) {
    console.error('Failed to extract public key from attestationObject:', error);
    throw error;
  }
}

/**
 * Extract credential ID from attestationObject
 */
export function extractCredentialIdFromAttestationObject(attestationObjectBase64: string): string {
  try {
    const attestationObjectBytes = Buffer.from(attestationObjectBase64, 'base64');
    const attestationObject = cbor.decode(attestationObjectBytes);
    
    const authData = attestationObject.authData;
    if (!authData) {
      throw new Error('No authData in attestationObject');
    }
    
    let offset = 37; // Skip RP ID hash (32) + flags (1) + counter (4)
    
    // Skip AAGUID (16 bytes)
    offset += 16;
    
    // Read credentialIdLength (2 bytes, big-endian)
    const credentialIdLength = (authData[offset] << 8) | authData[offset + 1];
    offset += 2;
    
    // Extract credentialId
    const credentialId = authData.slice(offset, offset + credentialIdLength);
    
    // Convert to base64url (URL-safe base64)
    return Buffer.from(credentialId).toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
    
  } catch (error) {
    console.error('Failed to extract credential ID:', error);
    throw error;
  }
}