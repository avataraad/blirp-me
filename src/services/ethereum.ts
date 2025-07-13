import { getBlockNumber, getChainId } from '@wagmi/core';
import { mainnet } from '@wagmi/core/chains';
import { config } from '../config/wagmi';

// Ethereum mainnet configuration
const ETHEREUM_MAINNET_CHAIN_ID = 1;

/**
 * Get the wagmi client (replaces singleton provider pattern)
 * Wagmi handles connection management automatically
 */
export const getClient = () => {
  try {
    console.log('Using wagmi client for Ethereum operations');
    return config;
  } catch (error) {
    console.error('Failed to get wagmi client:', error);
    throw new Error('Failed to connect to Ethereum network');
  }
};

/**
 * Test the provider connection
 * Returns true if connection is successful
 */
export const testConnection = async (): Promise<boolean> => {
  try {
    const blockNumber = await getBlockNumber(config);
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
export const getNetworkInfo = async (): Promise<{
  chainId: number;
  name: string;
} | null> => {
  try {
    const chainId = await getChainId(config);
    return {
      chainId,
      name: chainId === ETHEREUM_MAINNET_CHAIN_ID ? 'mainnet' : 'unknown'
    };
  } catch (error) {
    console.error('Failed to get network info:', error);
    return null;
  }
};

/**
 * Reset provider (no-op in wagmi - connection management is automatic)
 */
export const resetProvider = (): void => {
  console.log('Provider reset requested - wagmi handles connection management automatically');
};

/**
 * Legacy getProvider function for backward compatibility
 * Returns wagmi config instead of ethers provider
 */
export const getProvider = () => {
  console.warn('getProvider() is deprecated - use getClient() or wagmi actions directly');
  return getClient();
};