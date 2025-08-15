#!/usr/bin/env node

// Test script to verify CBOR extraction works
const borc = require('borc');
const { Buffer } = require('buffer');

// Real attestationObject from your logs
const attestationObjectBase64 = "o2NmbXRkbm9uZWdhdHRTdG10oGhhdXRoRGF0YViYWyY3lZPVobwbijRODms8D2uwREQY_S-ZWT5b9MekkSFdAAAAAPv8MAcVTk7MjAtuAgVX170AFH_qjZN3CqGY8Jw-tPFqvFAiFtmspQECAyYgASFYIFuvqZGIBiz5sFzmA6TI6fripv2lWeHMNbnDDGv9K_naIlggJG-gypF-yNHY1PC74NeKYh5Hn2ulQK3BNVn1XiwkJ0g";

function extractPublicKeyFromAttestationObject(attestationObjectBase64) {
  try {
    console.log('Starting extraction...');
    
    // Decode base64 to buffer
    const attestationObjectBytes = Buffer.from(attestationObjectBase64, 'base64');
    console.log('Decoded base64, buffer length:', attestationObjectBytes.length);
    
    // CBOR decode
    const attestationObject = borc.decodeFirst(attestationObjectBytes);
    console.log('Decoded CBOR, keys:', Object.keys(attestationObject));
    
    // Extract authData
    const authData = attestationObject.authData;
    if (!authData) {
      throw new Error('No authData in attestationObject');
    }
    console.log('AuthData length:', authData.length);
    
    // Parse authData structure
    let offset = 0;
    
    // Skip RP ID hash (32 bytes)
    offset += 32;
    
    // Read flags (1 byte)
    const flags = authData[offset];
    offset += 1;
    console.log('Flags:', flags.toString(16), 'Has attested credential data:', !!(flags & 0x40));
    
    // Skip counter (4 bytes)
    offset += 4;
    
    // Check if attestedCredentialData is present (flag bit 6)
    if (!(flags & 0x40)) {
      throw new Error('No attestedCredentialData in authData');
    }
    
    // Skip AAGUID (16 bytes)
    offset += 16;
    
    // Read credentialIdLength (2 bytes, big-endian)
    const credentialIdLength = (authData[offset] << 8) | authData[offset + 1];
    offset += 2;
    console.log('Credential ID length:', credentialIdLength);
    
    // Skip credentialId
    offset += credentialIdLength;
    
    // Now we're at the credentialPublicKey (COSE key)
    const publicKeyBytes = authData.slice(offset);
    console.log('Public key bytes length:', publicKeyBytes.length);
    
    const coseKey = borc.decodeFirst(publicKeyBytes);
    console.log('COSE Key type:', typeof coseKey);
    
    // Check if it's a Map or plain object
    let x, y;
    if (coseKey instanceof Map) {
      console.log('COSE Key is a Map');
      x = coseKey.get(-2);
      y = coseKey.get(-3);
      
      // Debug: log all keys in the Map
      console.log('COSE Key Map entries:');
      coseKey.forEach((value, key) => {
        console.log(`  Key ${key}:`, value);
      });
    } else if (typeof coseKey === 'object' && coseKey !== null) {
      console.log('COSE Key is an object');
      x = coseKey[-2];
      y = coseKey[-3];
      
      // Debug: log all keys in the object
      console.log('COSE Key object keys:', Object.keys(coseKey));
      console.log('COSE Key contents:', coseKey);
    }
    
    if (!x || !y) {
      console.error('Missing coordinates in COSE key:', { x, y });
      throw new Error('Missing x or y coordinate in COSE key');
    }
    
    // Convert to hex
    const xHex = Buffer.from(x).toString('hex');
    const yHex = Buffer.from(y).toString('hex');
    
    console.log('X coordinate (hex):', xHex);
    console.log('Y coordinate (hex):', yHex);
    
    // Ensure 32 bytes (64 hex chars) each
    const xPadded = xHex.padStart(64, '0');
    const yPadded = yHex.padStart(64, '0');
    
    // Combine as 0x + x + y
    const publicKeyHex = '0x' + xPadded + yPadded;
    
    console.log('\n✅ Successfully extracted public key:');
    console.log('Full key:', publicKeyHex);
    
    return publicKeyHex;
    
  } catch (error) {
    console.error('❌ Failed to extract public key:', error.message);
    throw error;
  }
}

// Run the test
console.log('Testing CBOR extraction with real attestationObject...\n');
try {
  const publicKey = extractPublicKeyFromAttestationObject(attestationObjectBase64);
  console.log('\n=== TEST PASSED ===');
  console.log('Public key extracted successfully');
} catch (error) {
  console.log('\n=== TEST FAILED ===');
  console.log('Error:', error.message);
}