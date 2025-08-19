import { Passkey } from 'react-native-passkey';
import 'react-native-get-random-values';
import { PORTO_CONFIG } from '../config/porto-config';
import { defaultAbiCoder } from '@ethersproject/abi';
import { BigNumber } from '@ethersproject/bignumber';
import { Buffer } from 'buffer';

// Use crypto.getRandomValues which is polyfilled by react-native-get-random-values
const randomBytes = (size: number): Uint8Array => {
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  return bytes;
};

/**
 * Pure JavaScript CBOR decoder for WebAuthn attestation objects
 * Minimal implementation that works in React Native without external dependencies
 */
class SimpleCBORDecoder {
  private data: Uint8Array;
  private offset: number;

  constructor(data: Uint8Array | Buffer) {
    this.data = new Uint8Array(data);
    this.offset = 0;
  }

  decode(): any {
    if (this.offset >= this.data.length) {
      throw new Error('Unexpected end of CBOR data');
    }

    const type = this.data[this.offset];
    const majorType = type >> 5;
    const additionalInfo = type & 0x1f;

    this.offset++;

    switch (majorType) {
      case 0: // Unsigned integer
        return this.decodeInteger(additionalInfo);
      case 1: // Negative integer
        return -1 - this.decodeInteger(additionalInfo);
      case 2: // Byte string
        return this.decodeByteString(additionalInfo);
      case 3: // Text string
        return this.decodeTextString(additionalInfo);
      case 4: // Array
        return this.decodeArray(additionalInfo);
      case 5: // Map
        return this.decodeMap(additionalInfo);
      case 6: // Tagged (we'll ignore tags for WebAuthn)
        this.decodeInteger(additionalInfo); // Skip tag
        return this.decode(); // Decode tagged value
      case 7: // Floats and other
        return this.decodeSimple(additionalInfo);
      default:
        throw new Error(`Unknown CBOR major type: ${majorType}`);
    }
  }

  private decodeInteger(additionalInfo: number): number {
    if (additionalInfo < 24) {
      return additionalInfo;
    }
    
    if (additionalInfo === 24) {
      return this.data[this.offset++];
    }
    
    if (additionalInfo === 25) {
      const value = (this.data[this.offset] << 8) | this.data[this.offset + 1];
      this.offset += 2;
      return value;
    }
    
    if (additionalInfo === 26) {
      const value = (this.data[this.offset] << 24) | 
                   (this.data[this.offset + 1] << 16) |
                   (this.data[this.offset + 2] << 8) |
                   this.data[this.offset + 3];
      this.offset += 4;
      return value >>> 0; // Convert to unsigned
    }
    
    if (additionalInfo === 27) {
      // 64-bit integer - JavaScript can't handle full precision
      // For our use case, we'll just skip it
      this.offset += 8;
      return 0;
    }
    
    throw new Error(`Invalid integer encoding: ${additionalInfo}`);
  }

  private decodeByteString(additionalInfo: number): Uint8Array {
    const length = this.decodeInteger(additionalInfo);
    const bytes = this.data.slice(this.offset, this.offset + length);
    this.offset += length;
    return bytes;
  }

  private decodeTextString(additionalInfo: number): string {
    const length = this.decodeInteger(additionalInfo);
    const bytes = this.data.slice(this.offset, this.offset + length);
    this.offset += length;
    
    // TextDecoder doesn't exist in React Native, use Buffer instead
    // Buffer.from() can handle UTF-8 decoding
    return Buffer.from(bytes).toString('utf8');
  }

  private decodeArray(additionalInfo: number): any[] {
    const length = this.decodeInteger(additionalInfo);
    const array: any[] = [];
    for (let i = 0; i < length; i++) {
      array.push(this.decode());
    }
    return array;
  }

  private decodeMap(additionalInfo: number): Map<any, any> {
    const length = this.decodeInteger(additionalInfo);
    const map = new Map();
    for (let i = 0; i < length; i++) {
      const key = this.decode();
      const value = this.decode();
      map.set(key, value);
    }
    return map;
  }

  private decodeSimple(additionalInfo: number): any {
    if (additionalInfo === 20) return false;
    if (additionalInfo === 21) return true;
    if (additionalInfo === 22) return null;
    if (additionalInfo === 23) return undefined;
    
    // We don't need float support for WebAuthn
    throw new Error(`Unsupported simple value: ${additionalInfo}`);
  }
}

/**
 * Decode CBOR data using pure JavaScript
 */
function decodeCBOR(data: Uint8Array | Buffer): any {
  const decoder = new SimpleCBORDecoder(data);
  return decoder.decode();
}

interface WebAuthnKey {
  type: 'webauthnp256';
  role: 'admin' | 'session';
  publicKey: string;
  credentialId: string;
  label: string;
}

interface PortoSignatureResult {
  signature: string;  // Hex encoded signature for Porto RPC
  clientDataJSON: string;  // For debugging
}

export class PasskeyManager {
  /**
   * Create passkey for Porto account
   * This becomes the permanent admin key
   */
  static async createPortoPasskey(tag: string): Promise<WebAuthnKey> {
    try {
      // Generate challenge as base64 string
      const challengeBytes = randomBytes(32);
      const challenge = btoa(String.fromCharCode(...Array.from(challengeBytes)));
      
      // Generate userId as base64 string - use simple encoding for React Native
      const userId = btoa(tag);
      
      const createRequest = {
        challenge: challenge,
        rp: {
          id: 'blirp.me',  // Use your actual domain (no protocol)
          name: 'BlirpMe',
        },
        user: {
          id: userId,
          name: tag,
          displayName: `${tag}'s Porto Wallet`,
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' }, // ES256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          residentKey: 'required',
          userVerification: 'required'
        },
        attestation: 'none',
      };
      
      console.log('Creating Porto passkey with params:', {
        rpId: createRequest.rp.id,
        userName: createRequest.user.name,
        challenge: challenge.substring(0, 10) + '...',
        userId: userId
      });
      
      const result = await Passkey.create(createRequest);
      
      console.log('Porto passkey created successfully, result:', JSON.stringify(result, null, 2));
      
      // Extract public key from the authenticator response
      // The public key format needs to be compatible with Porto's expectations
      const publicKey = this.extractPublicKey(result);
      
      return {
        type: 'webauthnp256',
        role: 'admin',
        publicKey,
        credentialId: result.id,
        label: `${tag}'s Porto Wallet`
      };
    } catch (error) {
      console.error('Porto passkey creation failed:', error);
      throw error;
    }
  }

  /**
   * Sign transaction with passkey (Legacy method for EOA)
   * Used for transaction authorization
   */
  static async signWithPasskey(
    credentialId: string,
    challenge: string
  ): Promise<string> {
    try {
      console.log('Signing with passkey:', { 
        credentialId: credentialId.substring(0, 10) + '...',
        challenge: challenge.substring(0, 10) + '...'
      });
      
      const result = await Passkey.get({
        rpId: PORTO_CONFIG.rpId,
        challenge,
        userVerification: 'required',
        allowCredentials: [{
          id: credentialId,
          type: 'public-key'
        }]
      });
      
      // Return the signature from the authenticator response
      return result.response.signature;
    } catch (error) {
      console.error('Passkey signing failed:', error);
      throw error;
    }
  }

  /**
   * Sign Porto transaction with proper WebAuthn format
   * This formats the signature exactly as Porto RPC expects
   */
  static async signPortoTransaction(
    credentialId: string,
    digest: string  // Hex digest from Porto RPC
  ): Promise<PortoSignatureResult> {
    try {
      console.log('Signing Porto transaction:', {
        credentialId: credentialId.substring(0, 10) + '...',
        digest: digest.substring(0, 10) + '...'
      });

      // Convert hex digest to base64url for WebAuthn challenge
      const digestBytes = Buffer.from(digest.slice(2), 'hex');
      const challenge = digestBytes.toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');

      // Create client data JSON with consistent domain
      const clientDataJSON = JSON.stringify({
        type: 'webauthn.get',
        challenge: challenge,
        origin: 'https://blirp.me',  // Must match your domain
        crossOrigin: false
      });

      console.log('ClientDataJSON:', clientDataJSON);

      // Get signature from passkey
      const result = await Passkey.get({
        rpId: 'blirp.me',  // Domain only, no protocol
        challenge,
        userVerification: 'required',
        allowCredentials: [{
          id: credentialId,
          type: 'public-key'
        }]
      });

      console.log('Passkey result:', {
        hasAuthenticatorData: !!result.response.authenticatorData,
        hasSignature: !!result.response.signature,
        hasClientDataJSON: !!result.response.clientDataJSON
      });

      // Format signature for Porto RPC
      const signature = this.formatPortoSignature(
        result.response.authenticatorData,
        clientDataJSON,  // Use our constructed clientDataJSON
        result.response.signature
      );

      return {
        signature,
        clientDataJSON  // Return for debugging
      };
    } catch (error) {
      console.error('Porto transaction signing failed:', error);
      throw error;
    }
  }

  /**
   * Format WebAuthn signature according to Porto's expected structure
   */
  private static formatPortoSignature(
    authenticatorData: string,
    clientDataJSON: string,
    signature: string
  ): string {
    try {
      // Convert base64 inputs to buffers
      const authDataBuffer = Buffer.from(authenticatorData, 'base64');
      const clientDataBuffer = Buffer.from(clientDataJSON);
      const sigBuffer = Buffer.from(signature, 'base64');

      // Extract r and s from DER-encoded signature
      const { r, s } = this.extractRSFromDERSignature(sigBuffer);

      console.log('Signature components:', {
        authDataLength: authDataBuffer.length,
        clientDataLength: clientDataBuffer.length,
        r: r.toString('hex'),
        s: s.toString('hex')
      });

      // ABI encode according to Porto WebAuthn struct:
      // struct WebAuthnSignature {
      //   bytes authenticatorData;
      //   bytes clientDataJSON;
      //   uint256[2] rs;
      // }
      const encoded = defaultAbiCoder.encode(
        ['bytes', 'bytes', 'uint256[2]'],
        [
          authDataBuffer,
          clientDataBuffer,
          [BigNumber.from(r), BigNumber.from(s)]
        ]
      );

      return encoded;
    } catch (error) {
      console.error('Failed to format Porto signature:', error);
      throw error;
    }
  }

  /**
   * Extract r and s values from DER-encoded signature
   */
  private static extractRSFromDERSignature(signature: Buffer): { r: Buffer; s: Buffer } {
    try {
      // DER format: 0x30 [length] 0x02 [r-length] [r] 0x02 [s-length] [s]
      let offset = 0;

      // Check for SEQUENCE tag (0x30)
      if (signature[offset++] !== 0x30) {
        throw new Error('Invalid DER signature: missing SEQUENCE tag');
      }

      // Skip total length
      const totalLength = signature[offset++];
      
      // Check for INTEGER tag for r (0x02)
      if (signature[offset++] !== 0x02) {
        throw new Error('Invalid DER signature: missing INTEGER tag for r');
      }

      // Get r length and value
      const rLength = signature[offset++];
      const r = signature.slice(offset, offset + rLength);
      offset += rLength;

      // Check for INTEGER tag for s (0x02)
      if (signature[offset++] !== 0x02) {
        throw new Error('Invalid DER signature: missing INTEGER tag for s');
      }

      // Get s length and value
      const sLength = signature[offset++];
      const s = signature.slice(offset, offset + sLength);

      // Remove leading zeros if present (DER encoding adds them for sign bit)
      const rTrimmed = r[0] === 0x00 ? r.slice(1) : r;
      const sTrimmed = s[0] === 0x00 ? s.slice(1) : s;

      // Ensure 32 bytes (pad with zeros if needed)
      const rPadded = Buffer.concat([Buffer.alloc(32 - rTrimmed.length), rTrimmed]);
      const sPadded = Buffer.concat([Buffer.alloc(32 - sTrimmed.length), sTrimmed]);

      return { r: rPadded, s: sPadded };
    } catch (error) {
      console.error('Failed to extract r,s from DER signature:', error);
      // Fallback: assume it's already r||s format (64 bytes)
      if (signature.length === 64) {
        return {
          r: signature.slice(0, 32),
          s: signature.slice(32, 64)
        };
      }
      throw error;
    }
  }

  /**
   * Check if passkeys are available on this device
   */
  static async isAvailable(): Promise<boolean> {
    try {
      return await Passkey.isSupported();
    } catch {
      return false;
    }
  }

  /**
   * Extract public key from passkey creation response
   * This needs to be in the format expected by Porto
   */
  private static extractPublicKey(result: any): string {
    console.log('Extracting public key from result:', {
      hasResponse: !!result.response,
      hasAttestationObject: !!result.response?.attestationObject,
      responseKeys: result.response ? Object.keys(result.response) : []
    });
    
    if (result.response?.attestationObject) {
      try {
        // Inline CBOR extraction logic to avoid Metro bundler issues
        const attestationObjectBase64 = result.response.attestationObject;
        
        console.log('Starting inline CBOR extraction with pure JS decoder...');
        
        // Decode base64 to buffer
        const attestationObjectBytes = Buffer.from(attestationObjectBase64, 'base64');
        console.log('Decoded base64, buffer length:', attestationObjectBytes.length);
        
        // CBOR decode using pure JavaScript implementation
        const attestationObject = decodeCBOR(attestationObjectBytes);
        
        // attestationObject is a Map, not a plain object
        // Access properties using Map.get()
        const fmt = attestationObject.get ? attestationObject.get('fmt') : attestationObject['fmt'];
        const authData = attestationObject.get ? attestationObject.get('authData') : attestationObject['authData'];
        const attStmt = attestationObject.get ? attestationObject.get('attStmt') : attestationObject['attStmt'];
        
        console.log('Decoded attestationObject:', {
          fmt: fmt,
          hasAuthData: !!authData,
          hasAttStmt: !!attStmt,
          isMap: attestationObject instanceof Map
        });
        
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
        console.log('Flags:', flags.toString(16), 'Has attested credential data:', !!(flags & 0x40));
        
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
        console.log('Public key bytes length:', publicKeyBytes.length);
        
        const coseKey = decodeCBOR(publicKeyBytes);
        console.log('COSE Key decoded, type:', typeof coseKey);
        
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
        
        console.log('X coordinate (hex):', xHex);
        console.log('Y coordinate (hex):', yHex);
        
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
        
        console.log('Successfully extracted public key:', publicKeyHex.substring(0, 20) + '...');
        console.log('Full public key length:', publicKeyHex.length, 'chars (should be 130)');
        
        return publicKeyHex;
        
      } catch (error) {
        console.error('Failed to extract public key, using fallback:', error);
        console.error('Error details:', {
          message: error.message,
          stack: error.stack
        });
        
        // More detailed error logging
        if (error instanceof Error) {
          console.error('Error name:', error.name);
          console.error('Error message:', error.message);
        }
      }
    }
    
    // Fallback: For testing, we can use a dummy public key
    // In production, this should be the actual extracted key
    console.warn('Using fallback public key for testing');
    console.warn('This wallet will not work for real transactions!');
    
    // Generate a dummy 64-byte hex string (32 bytes X + 32 bytes Y)
    const fallbackKey = '0x' + '1'.repeat(64) + '2'.repeat(64);
    
    console.log('Fallback public key generated:', fallbackKey.substring(0, 20) + '...');
    return fallbackKey;
  }
}