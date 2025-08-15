/**
 * Pure JavaScript CBOR Decoder for React Native
 * No external dependencies, works in any JavaScript environment
 */

import { Buffer } from 'buffer';

/**
 * Simple CBOR decoder that handles the specific structure of WebAuthn attestationObject
 */
export class CBORDecoder {
  private data: Uint8Array;
  private offset: number;

  constructor(data: Uint8Array | Buffer) {
    this.data = new Uint8Array(data);
    this.offset = 0;
  }

  decode(): any {
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
      case 6: // Tagged
        return this.decodeTagged(additionalInfo);
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
      return value;
    }
    
    if (additionalInfo === 27) {
      // 64-bit integer - JavaScript can't handle full precision
      // For our use case (credential lengths, etc.) 32-bit should be enough
      this.offset += 8;
      return 0; // Simplified for our use case
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
    return new TextDecoder().decode(bytes);
  }

  private decodeArray(additionalInfo: number): any[] {
    const length = this.decodeInteger(additionalInfo);
    const array = [];
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

  private decodeTagged(additionalInfo: number): any {
    const tag = this.decodeInteger(additionalInfo);
    const value = this.decode();
    // For our use case, we can ignore tags and return the value
    return value;
  }

  private decodeSimple(additionalInfo: number): any {
    if (additionalInfo === 20) return false;
    if (additionalInfo === 21) return true;
    if (additionalInfo === 22) return null;
    if (additionalInfo === 23) return undefined;
    
    // Floats - simplified for our use case
    if (additionalInfo === 25 || additionalInfo === 26 || additionalInfo === 27) {
      this.offset += additionalInfo === 25 ? 2 : additionalInfo === 26 ? 4 : 8;
      return 0;
    }
    
    throw new Error(`Unknown simple value: ${additionalInfo}`);
  }
}

/**
 * Decode CBOR data
 */
export function decodeCBOR(data: Uint8Array | Buffer): any {
  const decoder = new CBORDecoder(data);
  return decoder.decode();
}