// Test if the CommonJS conversion works
console.log('Testing CommonJS module...');

try {
  // This simulates what will happen after TypeScript compilation
  const code = `
const borc = require('borc');
const { Buffer } = require('buffer');

function extractPublicKeyFromAttestationObject(attestationObjectBase64) {
  console.log('Function called with base64 length:', attestationObjectBase64.length);
  
  const attestationObjectBytes = Buffer.from(attestationObjectBase64, 'base64');
  const attestationObject = borc.decodeFirst(attestationObjectBytes);
  
  console.log('Decoded attestationObject keys:', Object.keys(attestationObject));
  
  // ... rest of extraction logic
  return '0xTEST_PUBLIC_KEY';
}

module.exports = {
  extractPublicKeyFromAttestationObject
};
  `;
  
  // Evaluate the module code
  const Module = require('module');
  const m = new Module();
  m._compile(code, 'webauthnCborParser.js');
  
  console.log('Module exports:', Object.keys(m.exports));
  console.log('Function type:', typeof m.exports.extractPublicKeyFromAttestationObject);
  
  // Test calling the function
  const result = m.exports.extractPublicKeyFromAttestationObject('test_base64_string');
  console.log('Function result:', result);
  
  console.log('\n✅ CommonJS module structure is correct!');
} catch (error) {
  console.error('❌ Error:', error.message);
}