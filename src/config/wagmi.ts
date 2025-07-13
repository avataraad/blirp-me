import { createConfig, http } from '@wagmi/core';
import { mainnet } from '@wagmi/core/chains';
import Config from 'react-native-config';

// Use a default RPC URL if config isn't available
const RPC_URL = Config.ALCHEMY_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/LrV7mTe1YjPEJJJKJvHeY2kChV0DlgyZ';

console.log('Creating wagmi config with RPC:', RPC_URL);

// Ethereum mainnet configuration for React Native
export const config = createConfig({
  chains: [mainnet],
  transports: {
    [mainnet.id]: http(RPC_URL),
  },
});

console.log('Wagmi config created successfully');

// Test function to verify wagmi configuration
export const testWagmiConnection = async (): Promise<boolean> => {
  try {
    const { getBlockNumber } = await import('wagmi/actions');
    const blockNumber = await getBlockNumber(config);
    console.log('Wagmi connected to Ethereum mainnet. Current block:', blockNumber);
    return true;
  } catch (error) {
    console.error('Failed to connect with wagmi:', error);
    return false;
  }
};

export default config;