import { estimateTradeGas, estimateRouteGas, addGasBuffer } from '../tradeGasEstimation';
import { getCurrentGasPrices } from '../transactionService';
import { VerifiedToken } from '../../config/tokens';

jest.mock('../transactionService');

describe('Trade Gas Estimation', () => {
  const mockETHToken: VerifiedToken = {
    symbol: 'ETH',
    name: 'Ethereum',
    chainId: 1,
    address: '0x0000000000000000000000000000000000000000',
    decimals: 18,
    isNative: true
  };
  
  const mockUSDCToken: VerifiedToken = {
    symbol: 'USDC',
    name: 'USD Coin',
    chainId: 1,
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    decimals: 6
  };
  
  beforeEach(() => {
    jest.clearAllMocks();
    (getCurrentGasPrices as jest.Mock).mockResolvedValue({
      maxFeePerGas: '20000000000', // 20 gwei
      maxPriorityFeePerGas: '1500000000',
      gasPrice: '20000000000'
    });
  });
  
  describe('estimateTradeGas', () => {
    it('should estimate gas for buying tokens with ETH', async () => {
      const result = await estimateTradeGas('buy', mockUSDCToken, 2000, false);
      
      expect(result.requiresApproval).toBe(false);
      expect(result.approvalGas).toBeUndefined();
      expect(result.tradeGas).toBe('200000'); // BUNGEE_INBOX_TRADE
      expect(parseFloat(result.totalGasETH)).toBeCloseTo(0.004, 3);
      expect(parseFloat(result.totalGasUSD)).toBeCloseTo(8.0, 1);
    });
    
    it('should estimate gas for selling ERC20 tokens without approval', async () => {
      const result = await estimateTradeGas('sell', mockUSDCToken, 2000, true);
      
      expect(result.requiresApproval).toBe(false);
      expect(result.approvalGas).toBeUndefined();
      expect(result.tradeGas).toBe('200000');
    });
    
    it('should estimate gas for selling ERC20 tokens with approval needed', async () => {
      const result = await estimateTradeGas('sell', mockUSDCToken, 2000, false);
      
      expect(result.requiresApproval).toBe(true);
      expect(result.approvalGas).toBe('50000'); // TOKEN_APPROVAL
      expect(result.tradeGas).toBe('200000'); // BUNGEE_INBOX_TRADE
      // Total gas should be approval + trade
      expect(parseFloat(result.totalGasETH)).toBeCloseTo(0.005, 3);
      expect(parseFloat(result.totalGasUSD)).toBeCloseTo(10.0, 1);
    });
    
    it('should handle gas estimation errors gracefully', async () => {
      (getCurrentGasPrices as jest.Mock).mockRejectedValue(new Error('Network error'));
      
      const result = await estimateTradeGas('buy', mockUSDCToken, 2000, false);
      
      // Should return fallback values
      expect(result.tradeGas).toBe('300000'); // COMPLEX_SWAP fallback
      expect(result.requiresApproval).toBe(false);
      expect(parseFloat(result.totalGasETH)).toBeGreaterThan(0);
    });
  });
  
  describe('estimateRouteGas', () => {
    it('should return simple swap gas for single hop', () => {
      expect(estimateRouteGas(1)).toBe(150000);
    });
    
    it('should return medium gas for 2-3 hops', () => {
      expect(estimateRouteGas(2)).toBe(200000);
      expect(estimateRouteGas(3)).toBe(200000);
    });
    
    it('should return complex swap gas for 4+ hops', () => {
      expect(estimateRouteGas(4)).toBe(300000);
      expect(estimateRouteGas(5)).toBe(300000);
    });
  });
  
  describe('addGasBuffer', () => {
    it('should add 20% buffer by default', () => {
      const result = addGasBuffer('100000');
      expect(result).toBe('120000');
    });
    
    it('should add custom buffer percentage', () => {
      const result = addGasBuffer('100000', 30);
      expect(result).toBe('130000');
    });
    
    it('should handle large gas values', () => {
      const result = addGasBuffer('1000000', 15);
      expect(result).toBe('1150000');
    });
  });
});