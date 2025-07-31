import { createConfig, http } from '@wagmi/core';
import { mainnet, base } from '@wagmi/core/chains';
import Config from 'react-native-config';
import { CHAIN_IDS, getAlchemyUrl } from './chains';

// Get Alchemy API key
const ALCHEMY_API_KEY = Config.ALCHEMY_API_KEY || 'LrV7mTe1YjPEJJJKJvHeY2kChV0DlgyZ';

// Build RPC URLs for each supported chain
const ETHEREUM_RPC_URL = getAlchemyUrl(CHAIN_IDS.ETHEREUM, ALCHEMY_API_KEY);
const BASE_RPC_URL = getAlchemyUrl(CHAIN_IDS.BASE, ALCHEMY_API_KEY);

console.log('Creating multi-chain wagmi config');
console.log('Ethereum RPC:', ETHEREUM_RPC_URL);
console.log('Base RPC:', BASE_RPC_URL);

// Multi-chain configuration for React Native
export const config = createConfig({
  chains: [mainnet, base],
  transports: {
    [mainnet.id]: http(ETHEREUM_RPC_URL),
    [base.id]: http(BASE_RPC_URL),
  },
});

console.log('Multi-chain wagmi config created successfully');

// Test function to verify wagmi configuration
export const testWagmiConnection = async (chainId?: number): Promise<boolean> => {
  try {
    const { getBlockNumber } = await import('wagmi/actions');
    const blockNumber = await getBlockNumber(config, { chainId });
    const chainName = chainId === CHAIN_IDS.BASE ? 'Base' : 'Ethereum mainnet';
    console.log(`Wagmi connected to ${chainName}. Current block:`, blockNumber);
    return true;
  } catch (error) {
    console.error('Failed to connect with wagmi:', error);
    return false;
  }
};

export default config;