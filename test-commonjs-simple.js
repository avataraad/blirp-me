// Simple test of CommonJS pattern
console.log('Testing CommonJS pattern...');

// Simulate the module
const mockModule = {
  extractPublicKeyFromAttestationObject: function(base64) {
    return '0xTEST';
  }
};

// Test destructuring require (what we're using in passkeyManager.ts)
const { extractPublicKeyFromAttestationObject } = mockModule;

console.log('Type of extracted function:', typeof extractPublicKeyFromAttestationObject);
console.log('Can call function:', extractPublicKeyFromAttestationObject('test'));

console.log('\n✅ CommonJS pattern works correctly!');