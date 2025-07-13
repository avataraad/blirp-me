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

export default config;