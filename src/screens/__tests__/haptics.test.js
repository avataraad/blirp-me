// Manual verification for Issue #20: Add haptic feedback for copy action

const verifyHapticImplementation = () => {
  const fs = require('fs');
  const path = require('path');
  
  console.log('🔍 Verifying Issue #20: Add haptic feedback for copy action\n');
  
  // Check ReceiveScreen
  const receiveScreenPath = path.join(__dirname, '../ReceiveScreen.tsx');
  const receiveContent = fs.readFileSync(receiveScreenPath, 'utf8');
  
  // Check haptics utility
  const hapticsPath = path.join(__dirname, '../../utils/haptics.ts');
  const hapticsExists = fs.existsSync(hapticsPath);
  
  const tests = [
    {
      name: 'Haptics utility file created',
      test: () => hapticsExists,
    },
    {
      name: 'Import Vibration from react-native',
      test: () => receiveContent.includes('Vibration,'),
    },
    {
      name: 'Import HapticFeedback utility',
      test: () => receiveContent.includes("import { HapticFeedback } from '../utils/haptics';"),
    },
    {
      name: 'Success haptic on copy',
      test: () => receiveContent.includes('await Clipboard.setString(displayValue);\n      HapticFeedback.impact();'),
    },
    {
      name: 'Error haptic on copy failure',
      test: () => receiveContent.includes('} catch (error) {\n      HapticFeedback.notificationError();'),
    },
    {
      name: 'Error haptic on empty value',
      test: () => receiveContent.includes('if (!displayValue) {\n      HapticFeedback.notificationError();'),
    },
    {
      name: 'Haptic feedback for share success',
      test: () => receiveContent.includes('});\n      HapticFeedback.impact();'),
    },
    {
      name: 'Platform-specific haptic handling',
      test: () => {
        if (!hapticsExists) return false;
        const hapticsContent = fs.readFileSync(hapticsPath, 'utf8');
        return hapticsContent.includes('Platform.OS === \'ios\'');
      },
    },
  ];
  
  let passed = 0;
  tests.forEach(test => {
    const result = test.test();
    console.log(`${result ? '✅' : '❌'} ${test.name}`);
    if (result) passed++;
  });
  
  console.log(`\n✨ ${passed}/${tests.length} tests passed`);
  
  if (passed === tests.length) {
    console.log('\n✅ Issue #20 implementation complete!');
  }
};

verifyHapticImplementation();