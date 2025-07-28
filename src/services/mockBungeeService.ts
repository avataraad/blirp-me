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
  
  // Calculate mock exchange rate based on decimals
  const fromAmountNum = BigInt(amountWei);
  let toAmountNum = fromAmountNum;
  
  // Mock exchange rates with proper decimal handling
  if (fromToken.symbol === 'ETH' && toToken.symbol === 'USDC') {
    // ETH (18 decimals) to USDC (6 decimals) at $3800/ETH
    // 1 ETH = 3800 USDC
    toAmountNum = (fromAmountNum * 3800n * BigInt(10 ** toToken.decimals)) / BigInt(10 ** fromToken.decimals);
  } else if (fromToken.symbol === 'USDC' && toToken.symbol === 'ETH') {
    // USDC (6 decimals) to ETH (18 decimals) at $3800/ETH
    toAmountNum = (fromAmountNum * BigInt(10 ** toToken.decimals)) / (3800n * BigInt(10 ** fromToken.decimals));
  } else if (fromToken.symbol === 'ETH' && toToken.symbol === 'cbBTC') {
    // ETH to BTC at 0.06 BTC/ETH rate (1 ETH = 0.06 BTC)
    // ETH has 18 decimals, BTC has 8 decimals
    // We need to multiply by 0.06 and adjust for decimal difference
    toAmountNum = (fromAmountNum * 6n * BigInt(10 ** toToken.decimals)) / (100n * BigInt(10 ** fromToken.decimals));
  } else if (fromToken.symbol === 'cbBTC' && toToken.symbol === 'ETH') {
    // BTC to ETH at 1/0.06 = 16.67 ETH/BTC rate
    toAmountNum = (fromAmountNum * 1667n * BigInt(10 ** toToken.decimals)) / (100n * BigInt(10 ** fromToken.decimals));
  } else if (fromToken.symbol === 'ETH' && toToken.symbol === 'wXRP') {
    // ETH to wXRP at ~5000 XRP/ETH
    toAmountNum = (fromAmountNum * 5000n * BigInt(10 ** toToken.decimals)) / BigInt(10 ** fromToken.decimals);
  } else if (fromToken.symbol === 'ETH' && toToken.symbol === 'stETH') {
    // ETH to stETH at ~0.998 rate
    toAmountNum = (fromAmountNum * 998n) / 1000n;
  }
  
  const toAmount = toAmountNum.toString();
  
  // Calculate exchange rate properly accounting for decimals
  let exchangeRate = 1;
  if (fromToken.symbol === 'ETH' && toToken.symbol === 'cbBTC') {
    exchangeRate = 0.06;
  } else if (fromToken.symbol === 'cbBTC' && toToken.symbol === 'ETH') {
    exchangeRate = 16.67;
  } else if (fromToken.symbol === 'ETH' && toToken.symbol === 'USDC') {
    exchangeRate = 3800;
  } else if (fromToken.symbol === 'USDC' && toToken.symbol === 'ETH') {
    exchangeRate = 1 / 3800;
  } else if (fromToken.symbol === 'ETH' && toToken.symbol === 'wXRP') {
    exchangeRate = 5000;
  } else if (fromToken.symbol === 'ETH' && toToken.symbol === 'stETH') {
    exchangeRate = 0.998;
  }
  
  // Calculate realistic gas cost based on current ETH price
  // Assuming ~3 gwei gas price and 150k gas units
  const gasUnits = 150000;
  const gasPriceGwei = 3; // Current realistic gas price
  const gasInEth = (gasUnits * gasPriceGwei) / 1e9;
  const gasInUsd = gasInEth * 3800; // Assuming $3800/ETH
  
  const route: BungeeRoute = {
    routeId: 'mock-route-' + Date.now(),
    fromAmount: amountWei,
    toAmount: toAmount,
    estimatedGas: gasUnits.toString(),
    estimatedGasFeesInUsd: parseFloat(gasInUsd.toFixed(2)),
    routePath: ['Uniswap V3'],
    exchangeRate: exchangeRate,
    priceImpact: -0.3,
    slippage: slippage,
    bridgeFee: 0,
    bridgeFeeInUsd: 0,
    outputAmountMin: ((toAmountNum * BigInt(100 - slippage)) / 100n).toString(),
    executionDuration: 30
  };
  
  return {
    routes: [route],
    fromToken: {
      address: fromToken.address,
      symbol: fromToken.symbol,
      decimals: fromToken.decimals,
      name: fromToken.name,
      logoURI: fromToken.logoURI,
      chainId: fromToken.chainId
    },
    toToken: {
      address: toToken.address,
      symbol: toToken.symbol,
      decimals: toToken.decimals,
      name: toToken.name,
      logoURI: toToken.logoURI,
      chainId: toToken.chainId
    },
    fromAmount: amountWei,
    toAmount: route.toAmount,
    estimatedGas: route.estimatedGas,
    status: 'success'
  };
};