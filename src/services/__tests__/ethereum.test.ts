import { ethers } from 'ethers';
import {
  getProvider,
  testConnection,
  getNetworkInfo,
  resetProvider,
} from '../ethereum';

// Mock ethers
jest.mock('ethers', () => {
  const mockProvider = {
    getBlockNumber: jest.fn(),
    getNetwork: jest.fn(),
    on: jest.fn(),
    removeAllListeners: jest.fn(),
  };

  return {
    ethers: {
      providers: {
        JsonRpcProvider: jest.fn(() => mockProvider),
      },
    },
  };
});

describe('Ethereum Service', () => {
  let mockProvider: any;

  beforeEach(() => {
    // Reset the module to ensure clean state
    jest.resetModules();
    jest.clearAllMocks();
    
    // Get the mock provider instance
    mockProvider = new (ethers.providers.JsonRpcProvider as any)();
  });

  afterEach(() => {
    resetProvider();
  });

  describe('getProvider', () => {
    it('should create and return a provider instance', () => {
      const provider = getProvider();
      
      expect(provider).toBeDefined();
      expect(ethers.providers.JsonRpcProvider).toHaveBeenCalledWith(
        'https://eth-mainnet.g.alchemy.com/v2/mB1Ta26zgZstYhvjY5Dgd',
        {
          chainId: 1,
          name: 'mainnet',
        }
      );
    });

    it('should return the same provider instance on subsequent calls (singleton)', () => {
      const provider1 = getProvider();
      const provider2 = getProvider();
      
      expect(provider1).toBe(provider2);
      expect(ethers.providers.JsonRpcProvider).toHaveBeenCalledTimes(1);
    });

    it('should add error event listener to provider', () => {
      getProvider();
      
      expect(mockProvider.on).toHaveBeenCalledWith('error', expect.any(Function));
    });

    it('should handle provider initialization errors', () => {
      // Mock provider to throw error
      (ethers.providers.JsonRpcProvider as any).mockImplementationOnce(() => {
        throw new Error('Connection failed');
      });

      expect(() => getProvider()).toThrow('Failed to connect to Ethereum network');
    });
  });

  describe('testConnection', () => {
    it('should return true when connection is successful', async () => {
      mockProvider.getBlockNumber.mockResolvedValue(12345678);
      
      const result = await testConnection();
      
      expect(result).toBe(true);
      expect(mockProvider.getBlockNumber).toHaveBeenCalled();
    });

    it('should return false when connection fails', async () => {
      mockProvider.getBlockNumber.mockRejectedValue(new Error('Network error'));
      
      const result = await testConnection();
      
      expect(result).toBe(false);
      expect(mockProvider.getBlockNumber).toHaveBeenCalled();
    });
  });

  describe('getNetworkInfo', () => {
    it('should return network information when successful', async () => {
      const mockNetwork = { chainId: 1, name: 'mainnet' };
      mockProvider.getNetwork.mockResolvedValue(mockNetwork);
      
      const result = await getNetworkInfo();
      
      expect(result).toEqual(mockNetwork);
      expect(mockProvider.getNetwork).toHaveBeenCalled();
    });

    it('should return null when getting network info fails', async () => {
      mockProvider.getNetwork.mockRejectedValue(new Error('Network error'));
      
      const result = await getNetworkInfo();
      
      expect(result).toBeNull();
      expect(mockProvider.getNetwork).toHaveBeenCalled();
    });
  });

  describe('resetProvider', () => {
    it('should remove listeners and reset provider to null', () => {
      const provider = getProvider();
      resetProvider();
      
      expect(mockProvider.removeAllListeners).toHaveBeenCalled();
      
      // After reset, a new provider should be created
      const newProvider = getProvider();
      expect(ethers.providers.JsonRpcProvider).toHaveBeenCalledTimes(2);
    });

    it('should handle reset when no provider exists', () => {
      expect(() => resetProvider()).not.toThrow();
    });
  });

  describe('error handling', () => {
    it('should log errors from provider events', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      getProvider();
      
      // Get the error handler that was passed to provider.on
      const errorHandler = mockProvider.on.mock.calls[0][1];
      const testError = new Error('Test provider error');
      
      // Trigger the error handler
      errorHandler(testError);
      
      expect(consoleSpy).toHaveBeenCalledWith('Ethereum provider error:', testError);
      
      consoleSpy.mockRestore();
    });
  });
});