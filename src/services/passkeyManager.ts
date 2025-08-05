import { Passkey } from 'react-native-passkey';
import 'react-native-get-random-values';
import { PORTO_CONFIG } from '../config/porto-config';
import { extractPublicKeyFromAttestationObject } from './webauthnParser';

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
          id: PORTO_CONFIG.rpId,
          name: PORTO_CONFIG.rpName,
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
      
      console.log('Creating passkey with params:', {
        rpId: createRequest.rp.id,
        userName: createRequest.user.name,
        challenge: challenge.substring(0, 10) + '...',
        userId: userId
      });
      
      const result = await Passkey.create(createRequest);
      
      console.log('Passkey created successfully, result:', JSON.stringify(result, null, 2));
      
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
      console.error('Passkey creation failed:', error);
      throw error;
    }
  }

  /**
   * Sign transaction with passkey
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
        // Extract the actual P-256 public key coordinates
        const publicKeyHex = extractPublicKeyFromAttestationObject(result.response.attestationObject);
        console.log('Successfully extracted public key:', publicKeyHex);
        return publicKeyHex;
      } catch (error) {
        console.error('Failed to extract public key, falling back:', error);
        // Fallback to credential ID if extraction fails
        return result.id || '';
      }
    }
    
    // Fallback: use the credential ID as a reference
    if (result.id) {
      console.log('Using credential ID as public key reference:', result.id);
      return result.id;
    }
    
    throw new Error('Could not extract public key from passkey response');
  }
}