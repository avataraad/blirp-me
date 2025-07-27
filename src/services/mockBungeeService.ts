/**
 * Mock Bungee service for development
 * Returns simulated quote data when the real API is unavailable
 */

import { BungeeQuoteResponse, BungeeRoute } from './bungeeService';
import { VerifiedToken } from '../config/tokens';

export const getMockQuote = async (
  fromToken: VerifiedToken,
  toToken: VerifiedToken,
  amountWei: string,
  userAddress: string,
  slippage: number = 1
): Promise<BungeeQuoteResponse> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Calculate mock exchange rate (simplified)
  const fromAmount = parseFloat(amountWei);
  let toAmount = fromAmount;
  
  // Mock exchange rates
  if (fromToken.symbol === 'ETH' && toToken.symbol === 'USDC') {
    toAmount = fromAmount * 3800; // Mock ETH price of $3800
  } else if (fromToken.symbol === 'USDC' && toToken.symbol === 'ETH') {
    toAmount = fromAmount / 3800;
  } else if (fromToken.symbol === 'ETH' && toToken.symbol === 'cbBTC') {
    toAmount = fromAmount * 0.06; // ETH/BTC rate
  } else if (fromToken.symbol === 'cbBTC' && toToken.symbol === 'ETH') {
    toAmount = fromAmount / 0.06;
  }
  
  const route: BungeeRoute = {
    routeId: 'mock-route-' + Date.now(),
    fromAmount: amountWei,
    toAmount: Math.floor(toAmount).toString(),
    estimatedGas: '150000',
    estimatedGasFeesInUsd: 25.50,
    routePath: ['Uniswap V3'],
    exchangeRate: toAmount / fromAmount,
    priceImpact: -0.3,
    slippage: slippage,
    bridgeFee: 0,
    bridgeFeeInUsd: 0,
    outputAmountMin: Math.floor(toAmount * (1 - slippage / 100)).toString(),
    executionDuration: 30
  };
  
  return {
    routes: [route],
    fromToken: {
      address: fromToken.address,
      symbol: fromToken.symbol,
      decimals: fromToken.decimals,
      name: fromToken.name,
      logoURI: fromToken.logoURI
    },
    toToken: {
      address: toToken.address,
      symbol: toToken.symbol,
      decimals: toToken.decimals,
      name: toToken.name,
      logoURI: toToken.logoURI
    },
    fromAmount: amountWei,
    toAmount: route.toAmount,
    estimatedGas: route.estimatedGas,
    status: 'success'
  };
};

// Helper to parse amount
const parseFloat = (wei: string): number => {
  return parseInt(wei) / 1e18; // Assuming 18 decimals
};