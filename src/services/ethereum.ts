import { ethers } from 'ethers';

// Ethereum mainnet configuration
const ETHEREUM_MAINNET_CHAIN_ID = 1;
const ETHEREUM_RPC_URL = 'https://eth-mainnet.g.alchemy.com/v2/mB1Ta26zgZstYhvjY5Dgd';

// Provider instance (singleton)
let provider: ethers.providers.JsonRpcProvider | null = null;

/**
 * Initialize and return the Ethereum provider
 * Uses a singleton pattern to avoid multiple connections
 */
export const getProvider = (): ethers.providers.JsonRpcProvider => {
  if (!provider) {
    try {
      // Initialize provider with mainnet connection
      provider = new ethers.providers.JsonRpcProvider(
        ETHEREUM_RPC_URL,
        {
          chainId: ETHEREUM_MAINNET_CHAIN_ID,
          name: 'mainnet',
        }
      );

      // Add error handling for provider events
      provider.on('error', (error) => {
        console.error('Ethereum provider error:', error);
      });

      console.log('Ethereum provider initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Ethereum provider:', error);
      throw new Error('Failed to connect to Ethereum network');
    }
  }

  return provider;
};

/**
 * Test the provider connection
 * Returns true if connection is successful
 */
export const testConnection = async (): Promise<boolean> => {
  try {
    const provider = getProvider();
    const blockNumber = await provider.getBlockNumber();
    console.log('Connected to Ethereum mainnet. Current block:', blockNumber);
    return true;
  } catch (error) {
    console.error('Failed to connect to Ethereum:', error);
    return false;
  }
};

/**
 * Get network information
 */
export const getNetworkInfo = async (): Promise<ethers.providers.Network | null> => {
  try {
    const provider = getProvider();
    const network = await provider.getNetwork();
    return network;
  } catch (error) {
    console.error('Failed to get network info:', error);
    return null;
  }
};

/**
 * Reset provider (useful for testing or reconnection)
 */
export const resetProvider = (): void => {
  if (provider) {
    provider.removeAllListeners();
    provider = null;
  }
};