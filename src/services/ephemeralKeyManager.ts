import 'react-native-get-random-values';
import { privateKeyToAccount } from 'viem/accounts';
import { toHex } from 'viem';

// Use crypto.getRandomValues which is polyfilled by react-native-get-random-values
const randomBytes = (size: number): Uint8Array => {
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  return bytes;
};

export class EphemeralKeyManager {
  /**
   * Generate ephemeral private key for account creation
   * This key is used once and immediately discarded
   */
  static generateEphemeralKey(): {
    privateKey: string;
    address: string;
  } {
    // Generate 32 random bytes for private key
    const privateKeyBytes = randomBytes(32);
    const privateKey = ('0x' + Array.from(privateKeyBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')) as `0x${string}`;
    
    // Derive address from private key
    const account = privateKeyToAccount(privateKey as `0x${string}`);
    
    return {
      privateKey,
      address: account.address
    };
  }

  /**
   * Sign digests with ephemeral key
   * Used during account upgrade process
   */
  static async signWithEphemeralKey(
    privateKey: string,
    digests: { auth: string; exec: string }
  ): Promise<{ auth: string; exec: string }> {
    const account = privateKeyToAccount(privateKey as `0x${string}`);
    
    // Porto requires signing the raw digest directly (no Ethereum message prefix)
    // The digests are already hashed, so we use the sign method which signs raw hashes
    const authSignature = await account.sign({
      hash: digests.auth as `0x${string}`
    });
    
    const execSignature = await account.sign({
      hash: digests.exec as `0x${string}`
    });
    
    console.log('Raw digest signatures generated');
    console.log('EOA address that signed:', account.address);
    
    return {
      auth: authSignature,
      exec: execSignature
    };
  }
}