#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Milestone 1.1 Verification: Connect ReceiveScreen to WalletContext\n');

// Read the ReceiveScreen file
const receiveScreenPath = path.join(__dirname, '../ReceiveScreen.tsx');
const fileContent = fs.readFileSync(receiveScreenPath, 'utf8');

// Test suite for all acceptance criteria
const tests = {
  'Issue #15: Import and integrate WalletContext': [
    {
      name: 'Import useWallet hook',
      test: () => fileContent.includes("import { useWallet } from '../contexts/WalletContext';"),
    },
    {
      name: 'Call useWallet() inside component',
      test: () => fileContent.includes('const { walletAddress, walletTag } = useWallet();'),
    },
    {
      name: 'Remove hardcoded address',
      test: () => !fileContent.includes("'0x742d35Cc6634C0532925a3b844Bc9e7595f6D842'"),
    },
    {
      name: 'Remove hardcoded tag',
      test: () => !fileContent.includes("'@johndoe'"),
    },
    {
      name: 'Use real wallet data',
      test: () => fileContent.includes('const address = walletAddress || \'\';'),
    },
    {
      name: 'Format tag with @ prefix',
      test: () => fileContent.includes('const tag = walletTag?.trim() ? `@${walletTag.trim()}` : \'\';'),
    },
  ],
  'Issue #16: Handle wallet data initialization': [
    {
      name: 'Check for tag existence',
      test: () => fileContent.includes('const hasTag = Boolean(walletTag && walletTag.trim());'),
    },
    {
      name: 'Check for address existence',
      test: () => fileContent.includes('const hasAddress = Boolean(walletAddress);'),
    },
    {
      name: 'Conditional QR rendering',
      test: () => fileContent.includes('{hasAddress ? ('),
    },
    {
      name: 'QR placeholder for missing data',
      test: () => fileContent.includes('<Text style={styles.qrPlaceholderText}>Loading...</Text>'),
    },
    {
      name: 'Conditional tag toggle',
      test: () => fileContent.includes('{hasTag && hasAddress && ('),
    },
    {
      name: 'Validate before copy',
      test: () => fileContent.includes('if (!displayValue) {') && 
             fileContent.includes('\'No address to copy\''),
    },
    {
      name: 'Validate before share',
      test: () => fileContent.includes('if (!displayValue) {') && 
             fileContent.includes('\'No address to share\''),
    },
  ],
  'Issue #17: Fix tag display formatting': [
    {
      name: 'Contextual share messages',
      test: () => fileContent.includes('const shareMessage = displayMode === \'tag\' && hasTag'),
    },
    {
      name: 'Tag share message format',
      test: () => fileContent.includes('BlirpMe - Simple crypto payments'),
    },
    {
      name: 'Address share message format',
      test: () => fileContent.includes('Network: Ethereum Mainnet'),
    },
    {
      name: 'Placeholder text styling',
      test: () => fileContent.includes('!displayValue && styles.addressTextPlaceholder'),
    },
    {
      name: 'No tag set message',
      test: () => fileContent.includes('\'No tag set\''),
    },
    {
      name: 'Tag hint message',
      test: () => fileContent.includes('You haven\'t set a tag yet. Use your address to receive funds.'),
    },
  ],
};

// Run all tests
let totalTests = 0;
let passedTests = 0;

Object.entries(tests).forEach(([issueName, issueTests]) => {
  console.log(`\n📋 ${issueName}:`);
  
  issueTests.forEach(test => {
    totalTests++;
    const passed = test.test();
    if (passed) passedTests++;
    
    console.log(`  ${passed ? '✅' : '❌'} ${test.name}`);
  });
});

// Code quality checks
console.log('\n🔧 Code Quality Checks:');

const qualityChecks = [
  {
    name: 'No console.log statements',
    test: () => !fileContent.includes('console.log'),
  },
  {
    name: 'TypeScript types preserved',
    test: () => fileContent.includes('React.FC<Props>'),
  },
  {
    name: 'Proper styling structure',
    test: () => fileContent.includes('StyleSheet.create'),
  },
  {
    name: 'All new styles defined',
    test: () => fileContent.includes('qrPlaceholder:') && 
           fileContent.includes('qrPlaceholderText:') &&
           fileContent.includes('addressTextPlaceholder:') &&
           fileContent.includes('noTagHint:'),
  },
];

qualityChecks.forEach(check => {
  totalTests++;
  const passed = check.test();
  if (passed) passedTests++;
  
  console.log(`  ${passed ? '✅' : '❌'} ${check.name}`);
});

// Summary
console.log('\n📊 Summary:');
console.log(`Total tests: ${totalTests}`);
console.log(`Passed: ${passedTests}`);
console.log(`Failed: ${totalTests - passedTests}`);
console.log(`Success rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

if (passedTests === totalTests) {
  console.log('\n✨ All tests passed! Milestone 1.1 is complete.');
  process.exit(0);
} else {
  console.log('\n❌ Some tests failed. Please review the implementation.');
  process.exit(1);
}