import { getVerifiedTokensWithBalances, sortTokensByBalanceAndMarketCap, formatTokenAmount } from '../tokenService';
import { getWalletBalances } from '../balance';

// Mock the balance service
jest.mock('../balance');

describe('Token Service', () => {
  const mockWalletAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f2BD9e';
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getVerifiedTokensWithBalances', () => {
    it('should map verified tokens with balance data', async () => {
      const mockBalanceResponse = {
        tokens: [
          {
            token_address: null,
            symbol: 'ETH',
            balance: '1000000000000000000',
            balance_formatted: '1.0',
            usd_value: 1900,
            usd_price: 1900,
            usd_price_24hr_percent_change: 2.5,
            native_token: true
          },
          {
            token_address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
            symbol: 'USDC',
            balance: '500000000',
            balance_formatted: '500.0',
            usd_value: 500,
            usd_price: 1,
            usd_price_24hr_percent_change: 0.1
          }
        ],
        total_usd_value: 2400
      };
      
      (getWalletBalances as jest.Mock).mockResolvedValue(mockBalanceResponse);
      
      const result = await getVerifiedTokensWithBalances(mockWalletAddress);
      
      expect(result).toHaveLength(5); // All verified tokens
      
      const ethToken = result.find(t => t.symbol === 'ETH');
      expect(ethToken?.balanceFormatted).toBe('1.0');
      expect(ethToken?.usdValue).toBe(1900);
      
      const usdcToken = result.find(t => t.symbol === 'USDC');
      expect(usdcToken?.balanceFormatted).toBe('500.0');
      expect(usdcToken?.usdValue).toBe(500);
      
      // Tokens not in wallet should have zero balance
      const wbtcToken = result.find(t => t.symbol === 'cbBTC');
      expect(wbtcToken?.balanceFormatted).toBe('0');
      expect(wbtcToken?.usdValue).toBe(0);
    });

    it('should handle errors gracefully', async () => {
      (getWalletBalances as jest.Mock).mockRejectedValue(new Error('API Error'));
      
      const result = await getVerifiedTokensWithBalances(mockWalletAddress);
      
      expect(result).toHaveLength(5);
      expect(result.every(t => t.balance === '0')).toBe(true);
    });
  });

  describe('sortTokensByBalanceAndMarketCap', () => {
    it('should sort tokens with balance first, then by market cap', () => {
      const tokens = [
        { symbol: 'stETH', usdValue: 0 },
        { symbol: 'USDC', usdValue: 100 },
        { symbol: 'ETH', usdValue: 2000 },
        { symbol: 'cbBTC', usdValue: 0 }
      ] as any;
      
      const sorted = sortTokensByBalanceAndMarketCap(tokens);
      
      expect(sorted[0].symbol).toBe('ETH'); // Highest value
      expect(sorted[1].symbol).toBe('USDC'); // Second highest value
      expect(sorted[2].symbol).toBe('stETH'); // No balance, but higher in market cap order
      expect(sorted[3].symbol).toBe('cbBTC'); // No balance, lower in market cap order
    });
  });

  describe('formatTokenAmount', () => {
    it('should format token amounts correctly', () => {
      expect(formatTokenAmount('1000000000000000000', 18)).toBe('1.000000');
      expect(formatTokenAmount('500000000', 6)).toBe('500.0000');
      expect(formatTokenAmount('100000000', 8)).toBe('1.000000');
      expect(formatTokenAmount('1', 18)).toBe('1.00e-18');
      expect(formatTokenAmount('0', 18)).toBe('0');
    });

    it('should handle very small amounts', () => {
      expect(formatTokenAmount('100', 18)).toBe('1.00e-16');
    });

    it('should handle large amounts with fewer decimals', () => {
      expect(formatTokenAmount('10000000000000000000000', 18)).toBe('10000.00');
    });
  });
});