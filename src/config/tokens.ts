/**
 * Verified token list for BlirpMe Trade feature
 * All tokens are on Ethereum mainnet (chainId: 1)
 */

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

// Helper functions
export const getTokenBySymbol = (symbol: string): VerifiedToken | undefined => {
  return ETHEREUM_MAINNET_TOKENS.find(
    token => token.symbol.toLowerCase() === symbol.toLowerCase()
  );
};

export const getTokenByAddress = (address: string): VerifiedToken | undefined => {
  return ETHEREUM_MAINNET_TOKENS.find(
    token => token.address.toLowerCase() === address.toLowerCase()
  );
};

export const getNativeToken = (): VerifiedToken => {
  return ETHEREUM_MAINNET_TOKENS.find(token => token.isNative) || ETHEREUM_MAINNET_TOKENS[0];
};

export const getERC20Tokens = (): VerifiedToken[] => {
  return ETHEREUM_MAINNET_TOKENS.filter(token => !token.isNative);
};