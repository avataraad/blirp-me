/**
 * Gas estimation service for trade transactions
 * Extends the existing transaction service for Bungee trades
 */

import { getCurrentGasPrices } from './transactionService';
import { VerifiedToken } from '../config/tokens';

export interface TradeGasEstimate {
  approvalGas?: string;      // Gas for token approval (if needed)
  tradeGas: string;          // Gas for the actual trade
  totalGasETH: string;       // Total gas cost in ETH
  totalGasUSD: string;       // Total gas cost in USD
  maxFeePerGas: string;      // Current gas price
  requiresApproval: boolean; // Whether token approval is needed
}

// Standard gas limits for different operations
const GAS_LIMITS = {
  ETH_TRANSFER: 21000,
  TOKEN_APPROVAL: 50000,
  SIMPLE_SWAP: 150000,
  COMPLEX_SWAP: 300000,
  BUNGEE_INBOX_TRADE: 200000, // Estimated for Bungee Inbox contract
};

/**
 * Estimate gas for a trade transaction
 * @param tradeType - 'buy' or 'sell'
 * @param token - The token being traded
 * @param ethPrice - Current ETH price in USD
 * @param hasExistingApproval - Whether the token already has approval
 * @returns Trade gas estimate
 */
export const estimateTradeGas = async (
  tradeType: 'buy' | 'sell',
  token: VerifiedToken,
  ethPrice: number,
  hasExistingApproval: boolean = false
): Promise<TradeGasEstimate> => {
  try {
    // Get current gas prices
    const gasPrices = await getCurrentGasPrices();
    
    let approvalGas: string | undefined;
    let tradeGas: string;
    let requiresApproval = false;
    
    if (tradeType === 'buy') {
      // Buying tokens with ETH - no approval needed
      tradeGas = GAS_LIMITS.BUNGEE_INBOX_TRADE.toString();
    } else {
      // Selling tokens for ETH
      if (token.isNative) {
        // Selling ETH doesn't make sense in this context
        tradeGas = GAS_LIMITS.ETH_TRANSFER.toString();
      } else {
        // ERC20 token - may need approval
        if (!hasExistingApproval) {
          requiresApproval = true;
          approvalGas = GAS_LIMITS.TOKEN_APPROVAL.toString();
        }
        tradeGas = GAS_LIMITS.BUNGEE_INBOX_TRADE.toString();
      }
    }
    
    // Calculate total gas
    const totalGasUnits = BigInt(tradeGas) + BigInt(approvalGas || '0');
    const totalGasWei = totalGasUnits * BigInt(gasPrices.maxFeePerGas);
    
    // Convert to ETH
    const totalGasETH = (Number(totalGasWei) / 1e18).toFixed(6);
    
    // Convert to USD
    const totalGasUSD = (parseFloat(totalGasETH) * ethPrice).toFixed(2);
    
    return {
      approvalGas,
      tradeGas,
      totalGasETH,
      totalGasUSD,
      maxFeePerGas: gasPrices.maxFeePerGas,
      requiresApproval,
    };
  } catch (error) {
    console.error('Failed to estimate trade gas:', error);
    
    // Return conservative estimates on error
    const fallbackGasUnits = BigInt(GAS_LIMITS.BUNGEE_INBOX_TRADE);
    const fallbackGasWei = fallbackGasUnits * BigInt('5000000000'); // 5 gwei fallback
    const fallbackGasETH = (Number(fallbackGasWei) / 1e18).toFixed(6);
    const fallbackGasUSD = (parseFloat(fallbackGasETH) * ethPrice).toFixed(2);
    
    return {
      tradeGas: GAS_LIMITS.BUNGEE_INBOX_TRADE.toString(),
      totalGasETH: fallbackGasETH,
      totalGasUSD: fallbackGasUSD,
      maxFeePerGas: '5000000000',
      requiresApproval: false,
    };
  }
};

/**
 * Check if a token has existing approval for a spender
 * @param tokenAddress - ERC20 token contract address
 * @param ownerAddress - Token owner address
 * @param spenderAddress - Spender address (Bungee Inbox contract)
 * @returns Whether the token has sufficient approval
 */
export const checkTokenApproval = async (
  tokenAddress: string,
  ownerAddress: string,
  spenderAddress: string,
  amount: string
): Promise<boolean> => {
  // This would normally check the allowance on-chain
  // For now, we'll assume no existing approvals
  // In production, this would use ethers.js to call the allowance method
  return false;
};

/**
 * Estimate gas for different route complexities
 * Bungee may use different routes with varying gas costs
 * @param routeComplexity - Number of hops/pools in the route
 * @returns Estimated gas units
 */
export const estimateRouteGas = (routeComplexity: number): number => {
  if (routeComplexity <= 1) {
    return GAS_LIMITS.SIMPLE_SWAP;
  } else if (routeComplexity <= 3) {
    return GAS_LIMITS.BUNGEE_INBOX_TRADE;
  } else {
    return GAS_LIMITS.COMPLEX_SWAP;
  }
};

/**
 * Add a safety buffer to gas estimates
 * @param gasEstimate - Original gas estimate
 * @param bufferPercentage - Buffer percentage (default 20%)
 * @returns Buffered gas estimate
 */
export const addGasBuffer = (gasEstimate: string, bufferPercentage: number = 20): string => {
  const gas = BigInt(gasEstimate);
  const buffer = (gas * BigInt(bufferPercentage)) / BigInt(100);
  return (gas + buffer).toString();
};