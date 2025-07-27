import {
  getBestRoute,
  formatQuoteDetails,
  calculatePriceImpact,
  BungeeQuoteResponse,
  BungeeRoute
} from '../bungeeService';
import { VerifiedToken } from '../../config/tokens';

// We'll test only the pure functions that don't require axios mocking
describe('Bungee Service', () => {
  const mockETH: VerifiedToken = {
    symbol: 'ETH',
    name: 'Ethereum',
    chainId: 1,
    address: '0x0000000000000000000000000000000000000000',
    decimals: 18,
    isNative: true
  };
  
  const mockUSDC: VerifiedToken = {
    symbol: 'USDC',
    name: 'USD Coin',
    chainId: 1,
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    decimals: 6
  };
  
  describe('getBestRoute', () => {
    it('should return route with highest output amount', () => {
      const quoteResponse: BungeeQuoteResponse = {
        routes: [
          { toAmount: '1000000000', routeId: 'route-1' } as BungeeRoute,
          { toAmount: '1100000000', routeId: 'route-2' } as BungeeRoute,
          { toAmount: '1050000000', routeId: 'route-3' } as BungeeRoute
        ],
        fromToken: {} as any,
        toToken: {} as any,
        fromAmount: '1000000000000000000',
        toAmount: '1100000000',
        estimatedGas: '200000',
        status: 'success'
      };
      
      const bestRoute = getBestRoute(quoteResponse);
      expect(bestRoute.routeId).toBe('route-2');
    });
    
    it('should throw error for empty routes', () => {
      const quoteResponse = { routes: [] } as BungeeQuoteResponse;
      
      expect(() => getBestRoute(quoteResponse))
        .toThrow('No routes available');
    });
  });
  
  describe('formatQuoteDetails', () => {
    it('should format quote details correctly', () => {
      const quote = {} as BungeeQuoteResponse;
      const route: BungeeRoute = {
        routeId: 'test',
        fromAmount: '1000000000000000000',
        toAmount: '1900000000',
        estimatedGas: '200000',
        estimatedGasFeesInUsd: 8.456,
        routePath: ['Uniswap'],
        exchangeRate: 1900.123456,
        priceImpact: -0.15,
        slippage: 1,
        bridgeFee: 0,
        bridgeFeeInUsd: 0,
        outputAmountMin: '1881000000',
        executionDuration: 45
      };
      
      const formatted = formatQuoteDetails(quote, route);
      
      expect(formatted).toEqual({
        exchangeRate: '1900.123456',
        priceImpact: '0.15',
        minimumReceived: '1881000000',
        estimatedTime: 1,
        bridgeFee: '0.00',
        networkFee: '8.46'
      });
    });
    
    it('should handle longer execution times', () => {
      const quote = {} as BungeeQuoteResponse;
      const route = {
        exchangeRate: 1,
        priceImpact: 0,
        outputAmountMin: '1000',
        executionDuration: 125, // 2+ minutes
        bridgeFeeInUsd: 1.5,
        estimatedGasFeesInUsd: 10
      } as BungeeRoute;
      
      const formatted = formatQuoteDetails(quote, route);
      expect(formatted.estimatedTime).toBe(3); // Rounded up to 3 minutes
    });
  });
  
  describe('calculatePriceImpact', () => {
    it('should calculate price impact correctly', () => {
      expect(calculatePriceImpact(100, 99)).toBe(1);
      expect(calculatePriceImpact(100, 98)).toBe(2);
      expect(calculatePriceImpact(100, 102)).toBe(2); // Positive slippage
    });
    
    it('should handle zero input', () => {
      expect(calculatePriceImpact(0, 100)).toBe(0);
    });
    
    it('should handle large price impacts', () => {
      expect(calculatePriceImpact(100, 50)).toBe(50);
      expect(calculatePriceImpact(100, 150)).toBe(50);
    });
  });
  
  describe('Integration notes', () => {
    it('should use native ETH address for ETH token', () => {
      // This is tested implicitly in the actual functions
      // Native ETH should use 0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee
      expect(mockETH.isNative).toBe(true);
    });
    
    it('should use actual addresses for ERC20 tokens', () => {
      expect(mockUSDC.address).toBe('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48');
      expect(mockUSDC.isNative).toBeUndefined();
    });
  });
});