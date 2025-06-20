// Manual verification script for Issue #15
// This verifies that ReceiveScreen properly integrates with WalletContext

import { readFileSync } from 'fs';
import { join } from 'path';

const verifyReceiveScreenIntegration = () => {
  console.log('🔍 Verifying Issue #15: Import and integrate WalletContext in ReceiveScreen\n');
  
  const filePath = join(__dirname, '../ReceiveScreen.tsx');
  const fileContent = readFileSync(filePath, 'utf8');
  
  const tests = [
    {
      name: '✓ Import useWallet hook',
      check: () => fileContent.includes("import { useWallet } from '../contexts/WalletContext';"),
    },
    {
      name: '✓ Call useWallet() inside component',
      check: () => fileContent.includes('const { walletAddress, walletTag } = useWallet();'),
    },
    {
      name: '✓ Replace hardcoded walletAddress',
      check: () => !fileContent.includes("const walletAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f6D842';"),
    },
    {
      name: '✓ Replace hardcoded walletTag',
      check: () => !fileContent.includes("const walletTag = '@johndoe';"),
    },
    {
      name: '✓ Use wallet?.address pattern',
      check: () => fileContent.includes('const address = walletAddress || \'\';'),
    },
    {
      name: '✓ Format tag with @ prefix',
      check: () => fileContent.includes('const tag = walletTag ? `@${walletTag}` : \'\';'),
    },
    {
      name: '✓ Update displayValue logic',
      check: () => fileContent.includes('const displayValue = displayMode === \'tag\' ? tag : address;'),
    },
    {
      name: '✓ QR code uses real address',
      check: () => fileContent.includes('value={displayMode === \'tag\' ? tag : address}'),
    },
  ];
  
  let allPassed = true;
  
  tests.forEach(test => {
    const passed = test.check();
    console.log(`${passed ? '✅' : '❌'} ${test.name}`);
    if (!passed) allPassed = false;
  });
  
  console.log('\n📊 Summary:');
  console.log(`Total tests: ${tests.length}`);
  console.log(`Passed: ${tests.filter(t => t.check()).length}`);
  console.log(`Failed: ${tests.filter(t => !t.check()).length}`);
  
  if (allPassed) {
    console.log('\n✨ All acceptance criteria met for Issue #15!');
  } else {
    console.log('\n❌ Some acceptance criteria not met. Please review the implementation.');
  }
  
  // Additional verification
  console.log('\n📝 Code snippet verification:');
  const walletImportMatch = fileContent.match(/const { walletAddress, walletTag } = useWallet\(\);/);
  if (walletImportMatch) {
    console.log('✅ WalletContext is properly destructured and used');
  }
  
  return allPassed;
};

// Run verification
verifyReceiveScreenIntegration();