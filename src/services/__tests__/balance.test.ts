import axios from 'axios';
import {
  getWalletBalances,
  getEthBalance,
  getTopTokens,
  getSignificantTokens,
  formatTokenBalance,
  TokenBalance,
} from '../balance';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock isAxiosError to return true for our mock errors
(axios.isAxiosError as any) = jest.fn((error: any) => error.isAxiosError === true);

describe('Balance Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getWalletBalances', () => {
    const validAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f6D842';
    
    const mockTokens: TokenBalance[] = [
      {
        token_address: null,
        name: 'Ethereum',
        symbol: 'ETH',
        logo: 'https://logo.url/eth.png',
        thumbnail: 'https://thumb.url/eth.png',
        decimals: 18,
        balance: '1234567890123456789',
        balance_formatted: '1.234567890123456789',
        possible_spam: false,
        verified_contract: true,
        usd_price: 2000,
        usd_price_24hr_percent_change: 5.5,
        usd_value: 2469.14,
        native_token: true,
      },
      {
        token_address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        name: 'USD Coin',
        symbol: 'USDC',
        logo: 'https://logo.url/usdc.png',
        thumbnail: 'https://thumb.url/usdc.png',
        decimals: 6,
        balance: '1000000000',
        balance_formatted: '1000.0',
        possible_spam: false,
        verified_contract: true,
        usd_price: 1,
        usd_price_24hr_percent_change: 0.01,
        usd_value: 1000,
        native_token: false,
      },
    ];

    it('should fetch wallet balances successfully', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          result: mockTokens,
          cursor: null,
        },
      });

      const result = await getWalletBalances(validAddress);

      expect(mockedAxios.get).toHaveBeenCalledWith(
        `https://deep-index.moralis.io/api/v2.2/wallets/${validAddress}/tokens`,
        {
          params: {
            chain: 'eth',
            exclude_spam: true,
            exclude_unverified_contracts: true,
          },
          headers: {
            'X-API-Key': expect.any(String),
            'Accept': 'application/json',
          },
        }
      );

      expect(result.tokens).toHaveLength(2);
      expect(result.total_usd_value).toBe(3469.14);
      expect(result.total_tokens_count).toBe(2);
      expect(result.total_positions_count).toBe(2);
      
      // Check portfolio percentage calculation
      expect(result.tokens[0].portfolio_percentage).toBeCloseTo(71.17, 1);
      expect(result.tokens[1].portfolio_percentage).toBeCloseTo(28.83, 1);
    });

    it('should handle pagination with cursor', async () => {
      // First page
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          result: [mockTokens[0]],
          cursor: 'next-page-cursor',
        },
      });

      // Second page
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          result: [mockTokens[1]],
          cursor: null,
        },
      });

      const result = await getWalletBalances(validAddress);

      expect(mockedAxios.get).toHaveBeenCalledTimes(2);
      
      // Check second call includes cursor
      expect(mockedAxios.get).toHaveBeenNthCalledWith(2,
        expect.any(String),
        expect.objectContaining({
          params: expect.objectContaining({
            cursor: 'next-page-cursor',
          }),
        })
      );

      expect(result.tokens).toHaveLength(2);
    });

    it('should handle invalid address error', async () => {
      mockedAxios.get.mockRejectedValueOnce({
        isAxiosError: true,
        response: {
          status: 400,
          data: { message: 'Invalid address' },
        },
      });

      await expect(getWalletBalances('invalid-address')).rejects.toThrow('Invalid wallet address');
    });

    it('should handle rate limit error', async () => {
      mockedAxios.get.mockRejectedValueOnce({
        isAxiosError: true,
        response: {
          status: 429,
          data: { message: 'Rate limit exceeded' },
        },
      });

      await expect(getWalletBalances(validAddress)).rejects.toThrow('Rate limit exceeded');
    });

    it('should exclude spam and unverified contracts', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          result: [],
          cursor: null,
        },
      });

      await getWalletBalances(validAddress);

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: expect.objectContaining({
            exclude_spam: true,
            exclude_unverified_contracts: true,
          }),
        })
      );
    });

    it('should sort tokens by USD value', async () => {
      const unsortedTokens = [
        { ...mockTokens[1], usd_value: 100 },
        { ...mockTokens[0], usd_value: 1000 },
      ];

      mockedAxios.get.mockResolvedValueOnce({
        data: {
          result: unsortedTokens,
          cursor: null,
        },
      });

      const result = await getWalletBalances(validAddress);

      expect(result.tokens[0].usd_value).toBe(1000);
      expect(result.tokens[1].usd_value).toBe(100);
    });
  });

  describe('getEthBalance', () => {
    it('should return ETH token from token list', () => {
      const tokens: TokenBalance[] = [
        {
          token_address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
          symbol: 'USDC',
          name: 'USD Coin',
          logo: null,
          thumbnail: null,
          decimals: 6,
          balance: '1000',
          balance_formatted: '0.001',
          possible_spam: false,
          usd_price: 1,
          usd_price_24hr_percent_change: 0,
          usd_value: 0.001,
        },
        {
          token_address: null,
          symbol: 'ETH',
          name: 'Ethereum',
          logo: null,
          thumbnail: null,
          decimals: 18,
          balance: '1000000000000000000',
          balance_formatted: '1.0',
          possible_spam: false,
          usd_price: 2000,
          usd_price_24hr_percent_change: 5,
          usd_value: 2000,
        },
      ];

      const ethBalance = getEthBalance(tokens);
      
      expect(ethBalance).toBeDefined();
      expect(ethBalance?.symbol).toBe('ETH');
      expect(ethBalance?.token_address).toBeNull();
    });

    it('should return null if ETH not found', () => {
      const tokens: TokenBalance[] = [
        {
          token_address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
          symbol: 'USDC',
          name: 'USD Coin',
          logo: null,
          thumbnail: null,
          decimals: 6,
          balance: '1000',
          balance_formatted: '0.001',
          possible_spam: false,
          usd_price: 1,
          usd_price_24hr_percent_change: 0,
          usd_value: 0.001,
        },
      ];

      const ethBalance = getEthBalance(tokens);
      expect(ethBalance).toBeNull();
    });
  });

  describe('getTopTokens', () => {
    const tokens: TokenBalance[] = [
      { symbol: 'ETH', usd_value: 1000 } as TokenBalance,
      { symbol: 'USDC', usd_value: 500 } as TokenBalance,
      { symbol: 'DAI', usd_value: 100 } as TokenBalance,
      { symbol: 'SHIB', usd_value: 0 } as TokenBalance,
    ];

    it('should return top tokens by USD value', () => {
      const topTokens = getTopTokens(tokens, 2);
      
      expect(topTokens).toHaveLength(2);
      expect(topTokens[0].symbol).toBe('ETH');
      expect(topTokens[1].symbol).toBe('USDC');
    });

    it('should filter out zero value tokens', () => {
      const topTokens = getTopTokens(tokens, 10);
      
      expect(topTokens).toHaveLength(3);
      expect(topTokens.every(t => (t.usd_value || 0) > 0)).toBe(true);
    });
  });

  describe('getSignificantTokens', () => {
    const tokens: TokenBalance[] = [
      { symbol: 'ETH', usd_value: 1000 } as TokenBalance,
      { symbol: 'USDC', usd_value: 5 } as TokenBalance,
      { symbol: 'DAI', usd_value: 0.5 } as TokenBalance,
    ];

    it('should filter tokens above minimum value', () => {
      const significantTokens = getSignificantTokens(tokens, 1);
      
      expect(significantTokens).toHaveLength(2);
      expect(significantTokens[0].symbol).toBe('ETH');
      expect(significantTokens[1].symbol).toBe('USDC');
    });

    it('should use default minimum value of $1', () => {
      const significantTokens = getSignificantTokens(tokens);
      
      expect(significantTokens).toHaveLength(2);
    });
  });

  describe('formatTokenBalance', () => {
    it('should format high value balances with 4 decimals', () => {
      const formatted = formatTokenBalance('123.456789', 1000);
      expect(formatted).toBe('123.4568');
    });

    it('should format very small balances with exponential notation', () => {
      const formatted = formatTokenBalance('0.00000123', 0.01);
      expect(formatted).toBe('1.23e-6');
    });

    it('should format normal balances with 6 decimals', () => {
      const formatted = formatTokenBalance('1.123456789', 50);
      expect(formatted).toBe('1.123457');
    });

    it('should return 0 for zero balance', () => {
      const formatted = formatTokenBalance('0', 0);
      expect(formatted).toBe('0');
    });
  });
});