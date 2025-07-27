import { ETHEREUM_MAINNET_TOKENS, getTokenBySymbol, getTokenByAddress, getNativeToken, getERC20Tokens } from '../tokens';

describe('Token Configuration', () => {
  it('should have all required tokens', () => {
    expect(ETHEREUM_MAINNET_TOKENS).toHaveLength(5);
    
    const symbols = ETHEREUM_MAINNET_TOKENS.map(t => t.symbol);
    expect(symbols).toContain('ETH');
    expect(symbols).toContain('USDC');
    expect(symbols).toContain('cbBTC');
    expect(symbols).toContain('wXRP');
    expect(symbols).toContain('stETH');
  });

  it('should have correct contract addresses', () => {
    expect(getTokenBySymbol('USDC')?.address).toBe('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48');
    expect(getTokenBySymbol('cbBTC')?.address).toBe('0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf');
    expect(getTokenBySymbol('wXRP')?.address).toBe('0x39fBBABf11738317a448031930706cd3e612e1B9');
    expect(getTokenBySymbol('stETH')?.address).toBe('0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84');
  });

  it('should have correct decimals', () => {
    expect(getTokenBySymbol('ETH')?.decimals).toBe(18);
    expect(getTokenBySymbol('USDC')?.decimals).toBe(6);
    expect(getTokenBySymbol('cbBTC')?.decimals).toBe(8);
    expect(getTokenBySymbol('wXRP')?.decimals).toBe(18);
    expect(getTokenBySymbol('stETH')?.decimals).toBe(18);
  });

  it('should identify native token correctly', () => {
    const nativeToken = getNativeToken();
    expect(nativeToken.symbol).toBe('ETH');
    expect(nativeToken.isNative).toBe(true);
  });

  it('should return ERC20 tokens only', () => {
    const erc20Tokens = getERC20Tokens();
    expect(erc20Tokens).toHaveLength(4);
    expect(erc20Tokens.every(t => !t.isNative)).toBe(true);
  });

  it('should find token by address (case insensitive)', () => {
    const token = getTokenByAddress('0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48');
    expect(token?.symbol).toBe('USDC');
  });
});