/**
 * Verified token list for BlirpMe Trade feature
 * Supports both Ethereum mainnet (chainId: 1) and Base (chainId: 8453)
 */

import { CHAIN_IDS, SupportedChainId } from './chains';

export interface VerifiedToken {
  symbol: string;
  name: string;
  chainId: number;
  address: string;
  decimals: number;
  logoURI?: string;
  coingeckoId?: string;
  isNative?: boolean;
}

// Ethereum mainnet verified tokens
export const ETHEREUM_MAINNET_TOKENS: VerifiedToken[] = [
  {
    symbol: 'ETH',
    name: 'Ethereum',
    chainId: 1,
    address: '0x0000000000000000000000000000000000000000',
    decimals: 18,
    logoURI: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png',
    coingeckoId: 'ethereum',
    isNative: true
  },
  {
    symbol: 'USDC',
    name: 'USD Coin',
    chainId: 1,
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    decimals: 6,
    logoURI: 'https://assets.coingecko.com/coins/images/6319/large/USD_Coin_icon.png',
    coingeckoId: 'usd-coin'
  },
  {
    symbol: 'cbBTC',
    name: 'Coinbase Wrapped Bitcoin',
    chainId: 1,
    address: '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf',
    decimals: 8,
    logoURI: 'https://assets.coingecko.com/coins/images/39042/large/cbbtc.jpg',
    coingeckoId: 'coinbase-wrapped-btc'
  },
  {
    symbol: 'wXRP',
    name: 'Wrapped XRP',
    chainId: 1,
    address: '0x39fBBABf11738317a448031930706cd3e612e1B9',
    decimals: 18,
    logoURI: 'https://assets.coingecko.com/coins/images/16841/large/wXRP.png',
    coingeckoId: 'wrapped-xrp'
  },
  {
    symbol: 'stETH',
    name: 'Lido Staked Ether',
    chainId: 1,
    address: '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84',
    decimals: 18,
    logoURI: 'https://assets.coingecko.com/coins/images/13442/large/steth_logo.png',
    coingeckoId: 'staked-ether'
  }
];

// Base network verified tokens
export const BASE_MAINNET_TOKENS: VerifiedToken[] = [
  {
    symbol: 'ETH',
    name: 'Ethereum',
    chainId: CHAIN_IDS.BASE,
    address: '0x0000000000000000000000000000000000000000',
    decimals: 18,
    logoURI: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png',
    coingeckoId: 'ethereum',
    isNative: true
  },
  {
    symbol: 'USDC',
    name: 'USD Coin',
    chainId: CHAIN_IDS.BASE,
    address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    decimals: 6,
    logoURI: 'https://assets.coingecko.com/coins/images/6319/large/USD_Coin_icon.png',
    coingeckoId: 'usd-coin'
  },
  {
    symbol: 'cbBTC',
    name: 'Coinbase Wrapped Bitcoin',
    chainId: CHAIN_IDS.BASE,
    address: '0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf',
    decimals: 8,
    logoURI: 'https://assets.coingecko.com/coins/images/39042/large/cbbtc.jpg',
    coingeckoId: 'coinbase-wrapped-btc'
  },
  {
    symbol: 'cbETH',
    name: 'Coinbase Staked ETH',
    chainId: CHAIN_IDS.BASE,
    address: '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22',
    decimals: 18,
    logoURI: 'https://assets.coingecko.com/coins/images/27008/large/cbeth.png',
    coingeckoId: 'coinbase-staked-eth'
  },
  {
    symbol: 'cbXRP',
    name: 'Coinbase Wrapped XRP',
    chainId: CHAIN_IDS.BASE,
    address: '0xcb585250f852C6c6bf90434AB21A00f02833a4af',
    decimals: 18,
    logoURI: 'https://assets.coingecko.com/coins/images/16841/large/wXRP.png',
    coingeckoId: 'wrapped-xrp'
  }
];

// All supported tokens across chains
export const ALL_TOKENS: VerifiedToken[] = [
  ...ETHEREUM_MAINNET_TOKENS,
  ...BASE_MAINNET_TOKENS
];

// Helper functions - now chain-aware
export const getTokenBySymbol = (symbol: string, chainId?: SupportedChainId): VerifiedToken | undefined => {
  const tokens = chainId 
    ? ALL_TOKENS.filter(token => token.chainId === chainId)
    : ALL_TOKENS;
  
  return tokens.find(
    token => token.symbol.toLowerCase() === symbol.toLowerCase()
  );
};

export const getTokenByAddress = (address: string, chainId?: SupportedChainId): VerifiedToken | undefined => {
  const tokens = chainId 
    ? ALL_TOKENS.filter(token => token.chainId === chainId)
    : ALL_TOKENS;
    
  return tokens.find(
    token => token.address.toLowerCase() === address.toLowerCase()
  );
};

export const getNativeToken = (chainId: SupportedChainId = CHAIN_IDS.ETHEREUM): VerifiedToken => {
  const tokens = ALL_TOKENS.filter(token => token.chainId === chainId);
  return tokens.find(token => token.isNative) || tokens[0];
};

export const getERC20Tokens = (chainId?: SupportedChainId): VerifiedToken[] => {
  const tokens = chainId 
    ? ALL_TOKENS.filter(token => token.chainId === chainId)
    : ALL_TOKENS;
    
  return tokens.filter(token => !token.isNative);
};

export const getTokensByChainId = (chainId: SupportedChainId): VerifiedToken[] => {
  return ALL_TOKENS.filter(token => token.chainId === chainId);
};