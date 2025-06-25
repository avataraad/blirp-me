import { 
  simulateTransaction, 
  getCurrentGasPrices, 
  convertGasToUSD, 
  formatAssetChange,
  signTransaction,
  broadcastTransaction,
  waitForTransaction,
  executeTransaction,
  TransactionParams,
  AssetChange,
  SimulationResult 
} from '../transactionService';

// Mock axios for testing
jest.mock('axios');
import axios from 'axios';
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock react-native-config
jest.mock('react-native-config', () => ({
  ALCHEMY_API_KEY: 'test-api-key',
  ALCHEMY_RPC_URL: 'https://eth-mainnet.g.alchemy.com/v2/test-key'
}));

// Mock react-native-keychain
jest.mock('react-native-keychain', () => ({
  getInternetCredentials: jest.fn(),
}));
import * as Keychain from 'react-native-keychain';
const mockedKeychain = Keychain as jest.Mocked<typeof Keychain>;

describe('TransactionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getCurrentGasPrices', () => {
    it('should fetch current gas prices successfully', async () => {
      const mockResponse = {
        data: {
          result: {
            baseFeePerGas: ['0x4a817c800'], // 20 gwei
            reward: [['0x77359400']] // 2 gwei
          }
        }
      };

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      const result = await getCurrentGasPrices();

      expect(result).toHaveProperty('maxFeePerGas');
      expect(result).toHaveProperty('maxPriorityFeePerGas');
      expect(result).toHaveProperty('gasPrice');
      expect(typeof result.maxFeePerGas).toBe('string');
    });

    it('should return fallback gas prices on error', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('Network error'));

      const result = await getCurrentGasPrices();

      expect(result.maxFeePerGas).toBe('20000000000');
      expect(result.maxPriorityFeePerGas).toBe('2000000000');
      expect(result.gasPrice).toBe('20000000000');
    });
  });

  describe('simulateTransaction', () => {
    const mockTransactionParams: TransactionParams = {
      from: '0x1234567890123456789012345678901234567890',
      to: '0x0987654321098765432109876543210987654321',
      value: '1000000000000000000' // 1 ETH
    };

    it('should simulate ETH transfer successfully', async () => {
      const mockGasPricesResponse = {
        data: {
          result: {
            baseFeePerGas: ['0x4a817c800'],
            reward: [['0x77359400']]
          }
        }
      };

      const mockSimulationResponse = {
        data: {
          result: {
            changes: [
              {
                address: '0x1234567890123456789012345678901234567890',
                assetType: 'NATIVE',
                amount: '-1000000000000000000',
                decimals: 18,
                symbol: 'ETH'
              },
              {
                address: '0x0987654321098765432109876543210987654321',
                assetType: 'NATIVE',
                amount: '1000000000000000000',
                decimals: 18,
                symbol: 'ETH'
              }
            ]
          }
        }
      };

      const mockGasEstimateResponse = {
        data: {
          result: '0x5208' // 21000 gas
        }
      };

      mockedAxios.post
        .mockResolvedValueOnce(mockGasPricesResponse)
        .mockResolvedValueOnce(mockSimulationResponse)
        .mockResolvedValueOnce(mockGasEstimateResponse);

      const result = await simulateTransaction(mockTransactionParams);

      expect(result.success).toBe(true);
      expect(result.assetChanges).toHaveLength(2);
      expect(result.gasUsed).toBe('21000');
      expect(result.warnings).toBeDefined();
    });

    it('should handle simulation errors', async () => {
      const mockGasPricesResponse = {
        data: {
          result: {
            baseFeePerGas: ['0x4a817c800'],
            reward: [['0x77359400']]
          }
        }
      };

      const mockSimulationResponse = {
        data: {
          error: {
            message: 'Insufficient balance'
          }
        }
      };

      mockedAxios.post
        .mockResolvedValueOnce(mockGasPricesResponse)
        .mockResolvedValueOnce(mockSimulationResponse);

      const result = await simulateTransaction(mockTransactionParams);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Insufficient balance');
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].type).toBe('insufficient-balance');
    });

    it('should simulate ERC-20 token transfer', async () => {
      const tokenTransferParams: TransactionParams = {
        from: '0x1234567890123456789012345678901234567890',
        to: '0x0987654321098765432109876543210987654321',
        value: '0',
        tokenAddress: '0xA0b86a33E6441c0FDb12ac3F7f763a9F1A3C5A',
        tokenAmount: '1000000' // 1 USDC (6 decimals)
      };

      const mockGasPricesResponse = {
        data: {
          result: {
            baseFeePerGas: ['0x4a817c800'],
            reward: [['0x77359400']]
          }
        }
      };

      const mockSimulationResponse = {
        data: {
          result: {
            changes: [
              {
                address: '0x1234567890123456789012345678901234567890',
                assetType: 'ERC20',
                contractAddress: '0xA0b86a33E6441c0FDb12ac3F7f763a9F1A3C5A',
                amount: '-1000000',
                decimals: 6,
                symbol: 'USDC'
              }
            ]
          }
        }
      };

      const mockGasEstimateResponse = {
        data: {
          result: '0xc350' // 50000 gas
        }
      };

      mockedAxios.post
        .mockResolvedValueOnce(mockGasPricesResponse)
        .mockResolvedValueOnce(mockSimulationResponse)
        .mockResolvedValueOnce(mockGasEstimateResponse);

      const result = await simulateTransaction(tokenTransferParams);

      expect(result.success).toBe(true);
      expect(result.gasUsed).toBe('50000');
    });
  });

  describe('convertGasToUSD', () => {
    it('should convert gas amount to USD', async () => {
      const gasWei = '42000000000000000'; // 0.042 ETH
      const ethPrice = 2000;

      const result = await convertGasToUSD(gasWei, ethPrice);

      expect(result).toBe('84.00'); // 0.042 * 2000
    });

    it('should handle invalid gas amounts', async () => {
      const result = await convertGasToUSD('invalid');
      expect(result).toBe('0.00');
    });
  });

  describe('formatAssetChange', () => {
    it('should format positive asset change', () => {
      const change: AssetChange = {
        address: '0x1234567890123456789012345678901234567890',
        tokenAddress: null,
        amount: '1000000000000000000', // 1 ETH
        decimals: 18,
        symbol: 'ETH'
      };

      const result = formatAssetChange(change);

      expect(result.formattedAmount).toBe('1.000000');
      expect(result.isPositive).toBe(true);
      expect(result.symbol).toBe('ETH');
    });

    it('should format negative asset change', () => {
      const change: AssetChange = {
        address: '0x1234567890123456789012345678901234567890',
        tokenAddress: null,
        amount: '-1000000000000000000', // -1 ETH
        decimals: 18,
        symbol: 'ETH'
      };

      const result = formatAssetChange(change);

      expect(result.formattedAmount).toBe('1.000000');
      expect(result.isPositive).toBe(false);
      expect(result.symbol).toBe('ETH');
    });

    it('should handle token changes', () => {
      const change: AssetChange = {
        address: '0x1234567890123456789012345678901234567890',
        tokenAddress: '0xA0b86a33E6441c0FDb12ac3F7f763a9F1A3C5A',
        amount: '1000000', // 1 USDC
        decimals: 6,
        symbol: 'USDC'
      };

      const result = formatAssetChange(change);

      expect(result.formattedAmount).toBe('1.000000');
      expect(result.isPositive).toBe(true);
      expect(result.symbol).toBe('USDC');
    });
  });

  describe('signTransaction', () => {
    const mockSimulationResult: SimulationResult = {
      assetChanges: [],
      gasUsed: '21000',
      gasLimit: '25200',
      maxFeePerGas: '20000000000',
      maxPriorityFeePerGas: '2000000000',
      success: true,
      warnings: []
    };

    const mockTransactionParams: TransactionParams = {
      from: '0x1234567890123456789012345678901234567890',
      to: '0x0987654321098765432109876543210987654321',
      value: '1000000000000000000'
    };

    it('should sign a transaction successfully', async () => {
      // Mock keychain to return a private key
      mockedKeychain.getInternetCredentials.mockResolvedValueOnce({
        username: 'wallet',
        password: '0x1234567890123456789012345678901234567890123456789012345678901234',
        service: 'blirpme_wallet'
      });

      // Mock nonce response
      const mockNonceResponse = {
        data: {
          result: '0x1' // nonce 1
        }
      };
      mockedAxios.post.mockResolvedValueOnce(mockNonceResponse);

      const result = await signTransaction(mockTransactionParams, mockSimulationResult);

      expect(result).toHaveProperty('hash');
      expect(result).toHaveProperty('rawTransaction');
      expect(result.from).toBe(mockTransactionParams.from);
      expect(result.to).toBe(mockTransactionParams.to);
      expect(result.nonce).toBe(1);
    });

    it('should handle missing private key', async () => {
      mockedKeychain.getInternetCredentials.mockResolvedValueOnce(false);

      await expect(
        signTransaction(mockTransactionParams, mockSimulationResult)
      ).rejects.toThrow('No wallet found in secure storage');
    });
  });

  describe('broadcastTransaction', () => {
    it('should broadcast transaction successfully', async () => {
      const mockSignedTransaction = {
        hash: '0xabcdef1234567890',
        rawTransaction: '0x02f87001018459682f008459682f0e82520894987654321098765432109876543210987654321880de0b6b3a764000080c0',
        from: '0x1234567890123456789012345678901234567890',
        to: '0x0987654321098765432109876543210987654321',
        value: '1000000000000000000',
        gasLimit: '25200',
        maxFeePerGas: '20000000000',
        maxPriorityFeePerGas: '2000000000',
        nonce: 1
      };

      const mockBroadcastResponse = {
        data: {
          result: '0xabcdef1234567890'
        }
      };

      mockedAxios.post.mockResolvedValueOnce(mockBroadcastResponse);

      const result = await broadcastTransaction(mockSignedTransaction);

      expect(result).toBe('0xabcdef1234567890');
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://eth-mainnet.g.alchemy.com/v2/test-key',
        {
          id: 1,
          jsonrpc: '2.0',
          method: 'eth_sendRawTransaction',
          params: [mockSignedTransaction.rawTransaction]
        }
      );
    });

    it('should handle broadcast errors', async () => {
      const mockSignedTransaction = {
        hash: '0xabcdef1234567890',
        rawTransaction: '0x02f87001018459682f008459682f0e82520894987654321098765432109876543210987654321880de0b6b3a764000080c0',
        from: '0x1234567890123456789012345678901234567890',
        to: '0x0987654321098765432109876543210987654321',
        value: '1000000000000000000',
        gasLimit: '25200',
        maxFeePerGas: '20000000000',
        maxPriorityFeePerGas: '2000000000',
        nonce: 1
      };

      const mockErrorResponse = {
        data: {
          error: {
            message: 'Insufficient funds'
          }
        }
      };

      mockedAxios.post.mockResolvedValueOnce(mockErrorResponse);

      await expect(
        broadcastTransaction(mockSignedTransaction)
      ).rejects.toThrow('Insufficient funds');
    });
  });

  describe('executeTransaction', () => {
    const mockTransactionParams: TransactionParams = {
      from: '0x1234567890123456789012345678901234567890',
      to: '0x0987654321098765432109876543210987654321',
      value: '1000000000000000000'
    };

    it('should execute complete transaction flow', async () => {
      // Mock simulation
      const mockGasPricesResponse = {
        data: {
          result: {
            baseFeePerGas: ['0x4a817c800'],
            reward: [['0x77359400']]
          }
        }
      };

      const mockSimulationResponse = {
        data: {
          result: {
            changes: []
          }
        }
      };

      const mockGasEstimateResponse = {
        data: {
          result: '0x5208'
        }
      };

      // Mock keychain for biometric auth and private key
      mockedKeychain.getInternetCredentials
        .mockResolvedValueOnce({
          username: 'wallet',
          password: '0x1234567890123456789012345678901234567890123456789012345678901234',
          service: 'blirpme_wallet'
        })
        .mockResolvedValueOnce({
          username: 'wallet',
          password: '0x1234567890123456789012345678901234567890123456789012345678901234',
          service: 'blirpme_wallet'
        });

      // Mock nonce
      const mockNonceResponse = {
        data: {
          result: '0x1'
        }
      };

      // Mock broadcast
      const mockBroadcastResponse = {
        data: {
          result: '0xabcdef1234567890'
        }
      };

      mockedAxios.post
        .mockResolvedValueOnce(mockGasPricesResponse)
        .mockResolvedValueOnce(mockSimulationResponse)
        .mockResolvedValueOnce(mockGasEstimateResponse)
        .mockResolvedValueOnce(mockNonceResponse)
        .mockResolvedValueOnce(mockBroadcastResponse);

      const result = await executeTransaction(mockTransactionParams);

      expect(result.transactionHash).toBe('0xabcdef1234567890');
    });

    it('should handle biometric authentication failure', async () => {
      // Mock simulation success
      const mockGasPricesResponse = {
        data: {
          result: {
            baseFeePerGas: ['0x4a817c800'],
            reward: [['0x77359400']]
          }
        }
      };

      const mockSimulationResponse = {
        data: {
          result: {
            changes: []
          }
        }
      };

      const mockGasEstimateResponse = {
        data: {
          result: '0x5208'
        }
      };

      // Mock biometric auth failure
      mockedKeychain.getInternetCredentials.mockResolvedValueOnce(false);

      mockedAxios.post
        .mockResolvedValueOnce(mockGasPricesResponse)
        .mockResolvedValueOnce(mockSimulationResponse)
        .mockResolvedValueOnce(mockGasEstimateResponse);

      await expect(
        executeTransaction(mockTransactionParams)
      ).rejects.toThrow('Biometric authentication failed');
    });
  });
});