/**
 * WebAuthn CBOR Parser for React Native
 * Uses borc library which works perfectly in React Native
 */

const borc = require('borc');
import { Buffer } from 'buffer';

/**
 * Extract P-256 public key coordinates from WebAuthn attestationObject
 * Returns hex string in format: 0x + x-coordinate + y-coordinate
 */
export function extractPublicKeyFromAttestationObject(attestationObjectBase64: string): string {
  try {
    console.log('CBOR-X Parser: Extracting public key from attestationObject...');
    
    // Decode base64 to buffer
    const attestationObjectBytes = Buffer.from(attestationObjectBase64, 'base64');
    
    // CBOR decode using borc (proven to work in React Native)
    const attestationObject = borc.decodeFirst(attestationObjectBytes);
    
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
    
    console.log('Credential ID length:', credentialIdLength);
    
    // Skip credentialId
    offset += credentialIdLength;
    
    // Now we're at the credentialPublicKey (COSE key)
    // Extract the remaining bytes and decode as CBOR
    const publicKeyBytes = authData.slice(offset);
    const coseKey = borc.decodeFirst(publicKeyBytes);
    
    console.log('COSE Key decoded, type:', typeof coseKey);
    console.log('COSE Key structure:', coseKey);
    
    // COSE key map:
    // 1 = kty (key type, 2 = EC2)
    // 3 = alg (algorithm, -7 = ES256)
    // -1 = crv (curve, 1 = P-256)
    // -2 = x coordinate
    // -3 = y coordinate
    
    // Check if it's a Map or plain object
    let x, y;
    
    // borc returns a Map object, but Map might not be available in all environments
    // Try multiple approaches to extract the coordinates
    if (typeof coseKey.get === 'function') {
      // It's a Map-like object
      console.log('COSE Key is a Map-like object');
      x = coseKey.get(-2);
      y = coseKey.get(-3);
      
      // Debug: log all keys in the Map
      console.log('COSE Key Map entries:');
      if (typeof coseKey.forEach === 'function') {
        coseKey.forEach((value: any, key: any) => {
          console.log(`  Key ${key}:`, value);
        });
      }
    } else if (typeof coseKey === 'object' && coseKey !== null) {
      // Plain object - try both negative number keys and string keys
      console.log('COSE Key is a plain object');
      x = coseKey[-2] || coseKey['-2'];
      y = coseKey[-3] || coseKey['-3'];
      
      // Debug: log all keys in the object
      console.log('COSE Key object keys:', Object.keys(coseKey));
      console.log('COSE Key contents:', JSON.stringify(coseKey, null, 2));
    }
    
    if (!x || !y) {
      console.error('Missing coordinates in COSE key:', { x, y, coseKey });
      throw new Error('Missing x or y coordinate in COSE key');
    }
    
    // Convert to hex - handle both Buffer and Uint8Array
    const xBuffer = Buffer.isBuffer(x) ? x : Buffer.from(x);
    const yBuffer = Buffer.isBuffer(y) ? y : Buffer.from(y);
    
    const xHex = xBuffer.toString('hex');
    const yHex = yBuffer.toString('hex');
    
    // Ensure 32 bytes (64 hex chars) each - pad with zeros if needed
    const xPadded = xHex.padStart(64, '0');
    const yPadded = yHex.padStart(64, '0');
    
    if (xPadded.length !== 64 || yPadded.length !== 64) {
      console.warn('Unexpected coordinate length after padding:', { 
        xLen: xPadded.length, 
        yLen: yPadded.length 
      });
    }
    
    // Combine as 0x + x + y
    const publicKeyHex = '0x' + xPadded + yPadded;
    
    console.log('Successfully extracted public key:', {
      x: '0x' + xPadded,
      y: '0x' + yPadded,
      combined: publicKeyHex.substring(0, 20) + '...'
    });
    
    return publicKeyHex;
    
  } catch (error) {
    console.error('Failed to extract public key from attestationObject:', error);
    
    // More detailed error logging
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    
    throw error;
  }
}

/**
 * Extract credential ID from attestationObject
 * Returns base64url encoded credential ID
 */
export function extractCredentialIdFromAttestationObject(attestationObjectBase64: string): string {
  try {
    console.log('CBOR-X Parser: Extracting credential ID...');
    
    const attestationObjectBytes = Buffer.from(attestationObjectBase64, 'base64');
    const attestationObject = borc.decodeFirst(attestationObjectBytes);
    
    const authData = attestationObject.authData;
    if (!authData) {
      throw new Error('No authData in attestationObject');
    }
    
    // Parse authData to get to credential ID
    let offset = 37; // Skip RP ID hash (32) + flags (1) + counter (4)
    
    // Skip AAGUID (16 bytes)
    offset += 16;
    
    // Read credentialIdLength (2 bytes, big-endian)
    const credentialIdLength = (authData[offset] << 8) | authData[offset + 1];
    offset += 2;
    
    // Extract credentialId
    const credentialId = authData.slice(offset, offset + credentialIdLength);
    
    // Convert to base64url (URL-safe base64)
    const credentialIdBase64 = Buffer.from(credentialId).toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
    
    console.log('Extracted credential ID:', credentialIdBase64.substring(0, 20) + '...');
    
    return credentialIdBase64;
    
  } catch (error) {
    console.error('Failed to extract credential ID:', error);
    throw error;
  }
}

/**
 * Parse WebAuthn client data JSON
 * Returns parsed client data object
 */
export function parseClientDataJSON(clientDataJSON: string): any {
  try {
    // clientDataJSON is usually base64 encoded
    const decoded = Buffer.from(clientDataJSON, 'base64').toString('utf8');
    return JSON.parse(decoded);
  } catch (error) {
    // If it's not base64, try parsing directly
    try {
      return JSON.parse(clientDataJSON);
    } catch {
      console.error('Failed to parse client data JSON:', error);
      throw error;
    }
  }
}