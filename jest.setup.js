/* eslint-env jest */
import 'react-native-gesture-handler/jestSetup';

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

// Mock react-native-vector-icons
jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');

// Mock react-native-qrcode-svg
jest.mock('react-native-qrcode-svg', () => 'QRCode');

// Mock CloudBackup native module
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  RN.NativeModules = {
    ...RN.NativeModules,
    CloudBackupModule: {
      register: jest.fn(),
      writeData: jest.fn(),
      readData: jest.fn(),
      getKnownCredentials: jest.fn(),
      setKnownCredentials: jest.fn(),
      addKnownCredential: jest.fn(),
    },
  };
  return RN;
});

// Silence the warning: Animated: `useNativeDriver` is not supported
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');
