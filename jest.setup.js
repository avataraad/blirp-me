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

// Mock react-native-config
jest.mock('react-native-config', () => ({
  MORALIS_API_KEY: 'test-moralis-key',
  ALCHEMY_API_KEY: 'test-alchemy-key',
  ALCHEMY_RPC_URL: 'https://eth-mainnet.g.alchemy.com/v2/test',
  SUPABASE_URL: 'https://test.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'test-key'
}));

// Mock @wagmi/core
jest.mock('@wagmi/core', () => ({
  getBalance: jest.fn(),
  estimateFeesPerGas: jest.fn(),
  getTransactionCount: jest.fn(),
  waitForTransactionReceipt: jest.fn(),
  getPublicClient: jest.fn()
}));

// Mock @wagmi/core/chains
jest.mock('@wagmi/core/chains', () => ({
  mainnet: {
    id: 1,
    name: 'Ethereum',
    network: 'mainnet'
  }
}));

// Mock viem
jest.mock('viem', () => ({
  formatEther: jest.fn((val) => '1.0'),
  parseEther: jest.fn((val) => BigInt(1000000000000000000)),
  parseGwei: jest.fn((val) => BigInt(1000000000)),
  createWalletClient: jest.fn(),
  http: jest.fn(),
  encodeFunctionData: jest.fn(),
  parseTransaction: jest.fn(),
  isAddress: jest.fn(() => true),
  getAddress: jest.fn((addr) => addr)
}));

// Mock viem/accounts
jest.mock('viem/accounts', () => ({
  privateKeyToAccount: jest.fn()
}));

// Mock wagmi config  
jest.mock('./src/config/wagmi', () => ({
  config: {}
}));

// Mock axios
jest.mock('axios');

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
