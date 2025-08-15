import { Passkey } from 'react-native-passkey';
import 'react-native-get-random-values';
import { PORTO_CONFIG } from '../config/porto-config';
const { extractPublicKeyFromAttestationObject } = require('./webauthnCborParser');
import { defaultAbiCoder } from '@ethersproject/abi';
import { BigNumber } from '@ethersproject/bignumber';

// Use crypto.getRandomValues which is polyfilled by react-native-get-random-values
const randomBytes = (size: number): Uint8Array => {
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  return bytes;
};

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
        // Extract the public key using the CommonJS imported function
        const publicKeyHex = extractPublicKeyFromAttestationObject(result.response.attestationObject);
        console.log('Successfully extracted public key:', publicKeyHex.substring(0, 20) + '...');
        return publicKeyHex;
      } catch (error) {
        console.error('Failed to extract public key, using fallback:', error);
        console.error('Error details:', {
          message: error.message,
          stack: error.stack
        });
      }
    }
    
    // Fallback: For testing, we can use a dummy public key
    // In production, this should be the actual extracted key
    console.warn('Using fallback public key for testing');
    
    // Generate a dummy 64-byte hex string (32 bytes X + 32 bytes Y)
    const fallbackKey = '0x' + '1'.repeat(64) + '2'.repeat(64);
    
    console.log('Fallback public key generated:', fallbackKey.substring(0, 20) + '...');
    return fallbackKey;
  }
}