/**
 * Multi-chain configuration for BlirpMe
 * Supports Ethereum mainnet and Base network
 */

export interface ChainConfig {
  chainId: number;
  name: string;
  shortName: string;
  moralisId: string;
  alchemyUrl: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  blockExplorer: {
    name: string;
    url: string;
  };
}

export const CHAIN_IDS = {
  ETHEREUM: 1,
  BASE: 8453,
} as const;

export type SupportedChainId = typeof CHAIN_IDS[keyof typeof CHAIN_IDS];

export const CHAIN_CONFIGS: Record<SupportedChainId, ChainConfig> = {
  [CHAIN_IDS.ETHEREUM]: {
    chainId: 1,
    name: 'Ethereum Mainnet',
    shortName: 'Ethereum',
    moralisId: 'eth',
    alchemyUrl: 'https://eth-mainnet.g.alchemy.com/v2/',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    blockExplorer: {
      name: 'Etherscan',
      url: 'https://etherscan.io',
    },
  },
  [CHAIN_IDS.BASE]: {
    chainId: 8453,
    name: 'Base',
    shortName: 'Base',
    moralisId: 'base',
    alchemyUrl: 'https://base-mainnet.g.alchemy.com/v2/',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    blockExplorer: {
      name: 'BaseScan',
      url: 'https://basescan.org',
    },
  },
};

// Helper functions
export const getChainConfig = (chainId: SupportedChainId): ChainConfig => {
  const config = CHAIN_CONFIGS[chainId];
  if (!config) {
    throw new Error(`Unsupported chain ID: ${chainId}`);
  }
  return config;
};

export const isValidChainId = (chainId: number): chainId is SupportedChainId => {
  return chainId === CHAIN_IDS.ETHEREUM || chainId === CHAIN_IDS.BASE;
};

export const getMoralisChainId = (chainId: SupportedChainId): string => {
  return CHAIN_CONFIGS[chainId].moralisId;
};

export const getAlchemyUrl = (chainId: SupportedChainId, apiKey: string): string => {
  return CHAIN_CONFIGS[chainId].alchemyUrl + apiKey;
};

// Default chain configuration
export const DEFAULT_CHAIN_ID = CHAIN_IDS.BASE;
export const DEFAULT_ENABLED_CHAINS = [CHAIN_IDS.BASE];