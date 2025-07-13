import { createConfig, http } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import Config from 'react-native-config';

// Ethereum mainnet configuration
export const config = createConfig({
  chains: [mainnet],
  transports: {
    [mainnet.id]: http(Config.ALCHEMY_RPC_URL),
  },
});

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