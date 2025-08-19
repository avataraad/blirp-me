// Test pure JavaScript CBOR decoder
const { Buffer } = require('buffer');

// Pure JavaScript CBOR decoder
class SimpleCBORDecoder {
  constructor(data) {
    this.data = new Uint8Array(data);
    this.offset = 0;
  }

  decode() {
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
      case 6: // Tagged
        this.decodeInteger(additionalInfo); // Skip tag
        return this.decode(); // Decode tagged value
      case 7: // Floats and other
        return this.decodeSimple(additionalInfo);
      default:
        throw new Error(`Unknown CBOR major type: ${majorType}`);
    }
  }

  decodeInteger(additionalInfo) {
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
      this.offset += 8;
      return 0;
    }
    
    throw new Error(`Invalid integer encoding: ${additionalInfo}`);
  }

  decodeByteString(additionalInfo) {
    const length = this.decodeInteger(additionalInfo);
    const bytes = this.data.slice(this.offset, this.offset + length);
    this.offset += length;
    return bytes;
  }

  decodeTextString(additionalInfo) {
    const length = this.decodeInteger(additionalInfo);
    const bytes = this.data.slice(this.offset, this.offset + length);
    this.offset += length;
    // Decode UTF-8
    return new TextDecoder().decode(bytes);
  }

  decodeArray(additionalInfo) {
    const length = this.decodeInteger(additionalInfo);
    const array = [];
    for (let i = 0; i < length; i++) {
      array.push(this.decode());
    }
    return array;
  }

  decodeMap(additionalInfo) {
    const length = this.decodeInteger(additionalInfo);
    const map = new Map();
    for (let i = 0; i < length; i++) {
      const key = this.decode();
      const value = this.decode();
      map.set(key, value);
    }
    return map;
  }

  decodeSimple(additionalInfo) {
    if (additionalInfo === 20) return false;
    if (additionalInfo === 21) return true;
    if (additionalInfo === 22) return null;
    if (additionalInfo === 23) return undefined;
    
    throw new Error(`Unsupported simple value: ${additionalInfo}`);
  }
}

function decodeCBOR(data) {
  const decoder = new SimpleCBORDecoder(data);
  return decoder.decode();
}

// Test with real attestationObject from logs
const attestationObjectBase64 = "o2NmbXRkbm9uZWdhdHRTdG10oGhhdXRoRGF0YViYWyY3lZPVobwbijRODms8D2uwREQY_S-ZWT5b9MekkSFdAAAAAPv8MAcVTk7MjAtuAgVX170AFKwvtgmKQKQQ-niRE1qcVuycfzGXpQECAyYgASFYIARgoAdAyL2MT6kdbqPkgnYEfKQdl_VtJUOGWiKWpfbrIlggeuRiMGyNaSic-wUoxVQxe70ckmpv1zak1YXHFd9yj6o";

try {
  console.log('Testing pure JS CBOR decoder...\n');
  
  const attestationObjectBytes = Buffer.from(attestationObjectBase64, 'base64');
  console.log('Buffer length:', attestationObjectBytes.length);
  
  const attestationObject = decodeCBOR(attestationObjectBytes);
  console.log('Decoded attestationObject successfully!');
  console.log('Keys:', attestationObject instanceof Map ? [...attestationObject.keys()] : Object.keys(attestationObject));
  
  // Get authData
  const authData = attestationObject.get('authData');
  console.log('AuthData length:', authData.length);
  
  // Parse authData
  let offset = 37; // Skip RP ID hash (32) + flags (1) + counter (4)
  offset += 16; // Skip AAGUID
  
  // Read credentialIdLength
  const credentialIdLength = (authData[offset] << 8) | authData[offset + 1];
  offset += 2;
  console.log('Credential ID length:', credentialIdLength);
  
  // Skip credentialId
  offset += credentialIdLength;
  
  // Extract public key bytes
  const publicKeyBytes = authData.slice(offset);
  console.log('Public key bytes length:', publicKeyBytes.length);
  
  // Decode COSE key
  const coseKey = decodeCBOR(publicKeyBytes);
  console.log('COSE Key decoded!');
  
  // Get coordinates
  const x = coseKey.get(-2);
  const y = coseKey.get(-3);
  
  console.log('\n✅ Public key coordinates extracted:');
  console.log('X:', Buffer.from(x).toString('hex'));
  console.log('Y:', Buffer.from(y).toString('hex'));
  
  const publicKeyHex = '0x' + Buffer.from(x).toString('hex') + Buffer.from(y).toString('hex');
  console.log('\nFinal public key:', publicKeyHex);
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error(error.stack);
}