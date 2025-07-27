/**
 * Bungee API integration service
 * Uses the public endpoint for quote fetching and trade execution
 */

import axios, { AxiosInstance } from 'axios';
import { VerifiedToken } from '../config/tokens';
import { createError, ErrorType } from './errorHandling';
import { getMockQuote } from './mockBungeeService';

// Bungee public API endpoint
const BUNGEE_API_URL = 'https://public-backend.bungee.exchange';

// Create axios instance with base configuration
export const bungeeApi: AxiosInstance = axios.create({
  baseURL: BUNGEE_API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Ethereum mainnet chain ID
const ETHEREUM_CHAIN_ID = 1;

export interface BungeeQuoteRequest {
  userAddress: string;      // Sender wallet address
  originChainId: number;    // Source chain ID
  destinationChainId: number; // Destination chain ID
  inputToken: string;       // Address of the input token (0xeeee...eeee for native ETH)
  inputAmount: string;      // Input amount in wei
  receiverAddress: string;  // Receiver wallet address
  outputToken: string;      // Output token address
}

export interface BungeeQuoteResponse {
  routes: BungeeRoute[];
  fromToken: TokenInfo;
  toToken: TokenInfo;
  fromAmount: string;
  toAmount: string;
  estimatedGas: string;
  status: string;
}

export interface BungeeRoute {
  routeId: string;
  fromAmount: string;
  toAmount: string;
  estimatedGas: string;
  estimatedGasFeesInUsd: number;
  routePath: string[];
  exchangeRate: number;
  priceImpact: number;
  slippage: number;
  bridgeFee: number;
  bridgeFeeInUsd: number;
  outputAmountMin: string;
  executionDuration: number;
}

export interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  chainId: number;
  logoURI?: string;
  price?: number;
}

export interface BungeeTransactionRequest {
  routeId: string;
  userAddress: string;
  slippage?: number;
}

export interface BungeeTransactionResponse {
  to: string;              // Contract address to send transaction to
  data: string;            // Transaction data
  value: string;           // ETH value to send (for ETH trades)
  gasLimit: string;        // Recommended gas limit
  gasPrice?: string;       // Gas price (if provided)
  chainId: number;
}

export interface BungeeStatusRequest {
  transactionHash: string;
  originChainId: number;
  destinationChainId: number;
}

export interface BungeeStatusResponse {
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  transactionHash: string;
  sourceTransactionHash?: string;
  destinationTransactionHash?: string;
  fromAmount: string;
  toAmount: string;
  error?: string;
}

// Native ETH address representation in Bungee
const NATIVE_ETH_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';

/**
 * Convert token address for Bungee API (handle native ETH)
 */
const getBungeeTokenAddress = (token: VerifiedToken): string => {
  return token.isNative ? NATIVE_ETH_ADDRESS : token.address;
};

/**
 * Fetch quote from Bungee API
 * @param fromToken - Source token
 * @param toToken - Destination token
 * @param amountWei - Amount in smallest unit
 * @param userAddress - User's wallet address
 * @param slippage - Slippage tolerance (default 1%)
 * @returns Quote response with routes
 */
export const getBungeeQuote = async (
  fromToken: VerifiedToken,
  toToken: VerifiedToken,
  amountWei: string,
  userAddress: string,
  slippage: number = 1
): Promise<BungeeQuoteResponse> => {
  // TODO: Remove this when Bungee API is properly configured
  // For now, use mock service due to parameter validation errors
  if (false) {
    console.log('Using mock service while Bungee API parameters are being debugged');
    return getMockQuote(fromToken, toToken, amountWei, userAddress, slippage);
  }
  
  try {
    // Validate inputs
    if (!userAddress || !amountWei || amountWei === '0') {
      throw createError(
        ErrorType.INVALID_AMOUNT,
        'Invalid trade amount or wallet address',
        'Missing required parameters',
        undefined,
        false
      );
    }

    const params = {
      userAddress: userAddress,
      originChainId: ETHEREUM_CHAIN_ID,
      destinationChainId: ETHEREUM_CHAIN_ID,
      inputToken: getBungeeTokenAddress(fromToken),
      inputAmount: amountWei,
      receiverAddress: userAddress, // Same as userAddress for same-chain swaps
      outputToken: getBungeeTokenAddress(toToken),
    };

    console.log('Bungee API request params:', JSON.stringify(params, null, 2));
    console.log('From token:', fromToken.symbol, 'Address:', getBungeeTokenAddress(fromToken));
    console.log('To token:', toToken.symbol, 'Address:', getBungeeTokenAddress(toToken));
    console.log('Amount Wei:', amountWei);
    console.log('Request URL:', `${BUNGEE_API_URL}/api/v1/bungee/quote`);

    const response = await bungeeApi.get('/api/v1/bungee/quote', { params });
    
    console.log('Bungee API response:', JSON.stringify(response.data, null, 2));
    
    // Check if we got a successful response
    if (!response.data || !response.data.success || !response.data.result) {
      console.error('Invalid response from Bungee API:', response.data);
      throw createError(
        ErrorType.QUOTE_FAILED,
        'Failed to get quote from Bungee API',
        'Invalid response structure',
        undefined,
        true
      );
    }

    // Transform the response to match our expected structure
    const result = response.data.result;
    const transformedResponse: BungeeQuoteResponse = {
      routes: [{
        routeId: result.quoteId || 'bungee-route',
        fromAmount: result.input.amount,
        toAmount: result.output.amount,
        estimatedGas: '200000', // Default estimate
        estimatedGasFeesInUsd: parseFloat(result.gasFee || '10'),
        routePath: ['Bungee Protocol'],
        exchangeRate: parseFloat(result.output.priceInUsd) / parseFloat(result.input.priceInUsd),
        priceImpact: -0.3, // Default impact
        slippage: parseFloat(result.slippage || '1.5'),
        bridgeFee: 0,
        bridgeFeeInUsd: 0,
        outputAmountMin: result.minAmountOut || result.output.amount,
        executionDuration: parseInt(result.estimatedTime || '10')
      }],
      fromToken: {
        address: result.input.token.address,
        symbol: result.input.token.symbol,
        decimals: result.input.token.decimals,
        name: result.input.token.name,
        logoURI: result.input.token.logoURI || result.input.token.icon
      },
      toToken: {
        address: result.output.token.address,
        symbol: result.output.token.symbol,
        decimals: result.output.token.decimals,
        name: result.output.token.name,
        logoURI: result.output.token.logoURI || result.output.token.icon
      },
      fromAmount: result.input.amount,
      toAmount: result.output.amount,
      estimatedGas: '200000',
      status: 'success'
    };

    return transformedResponse;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 400) {
        console.error('Bungee 400 error details:', error.response.data);
        console.error('Request that failed:', {
          url: error.config?.url,
          params: error.config?.params,
          method: error.config?.method
        });
        const apiMessage = error.response.data?.message || error.response.data?.error || 'Invalid quote request';
        throw createError(
          ErrorType.INVALID_AMOUNT,
          `Invalid trade parameters: ${apiMessage}`,
          apiMessage,
          error
        );
      }
      if (error.response?.status === 404) {
        throw createError(
          ErrorType.SERVICE_UNAVAILABLE,
          'Trading service endpoint not found. Service may be temporarily unavailable.',
          'Bungee API endpoint returned 404',
          error,
          true
        );
      }
      if (error.response?.status === 429) {
        throw createError(
          ErrorType.SERVICE_UNAVAILABLE,
          'Too many requests. Please try again in a moment.',
          'Rate limit exceeded',
          error,
          true
        );
      }
      if (error.response?.status === 500 || error.response?.status === 503) {
        throw createError(
          ErrorType.SERVICE_UNAVAILABLE,
          'Trading service temporarily unavailable. Please try again later.',
          'Bungee service error',
          error,
          true
        );
      }
      if (!error.response) {
        throw createError(
          ErrorType.NETWORK_ERROR,
          'Unable to connect to trading service. Check your internet connection.',
          'Network request failed',
          error,
          true
        );
      }
    }
    
    console.error('Bungee quote error:', error);
    throw createError(
      ErrorType.QUOTE_FAILED,
      'Failed to fetch quote. Please try again.',
      'Unknown quote error',
      error instanceof Error ? error : undefined,
      true
    );
  }
};

/**
 * Get the best route from quote response
 * @param quoteResponse - Quote response from Bungee
 * @returns Best route based on output amount
 */
export const getBestRoute = (quoteResponse: BungeeQuoteResponse): BungeeRoute => {
  if (!quoteResponse.routes || quoteResponse.routes.length === 0) {
    throw new Error('No routes available');
  }

  // Sort by output amount (descending) and return the best
  const sortedRoutes = [...quoteResponse.routes].sort((a, b) => {
    return BigInt(b.toAmount) > BigInt(a.toAmount) ? 1 : -1;
  });

  return sortedRoutes[0];
};

/**
 * Build transaction for the selected route
 * @param routeId - Route ID from quote
 * @param userAddress - User's wallet address
 * @param slippage - Slippage tolerance
 * @returns Transaction data for execution
 */
export const buildBungeeTransaction = async (
  routeId: string,
  userAddress: string,
  slippage: number = 1
): Promise<BungeeTransactionResponse> => {
  // TODO: Remove mock when API is configured
  if (false) {
    return {
      to: '0x3a23F943181408EAC424116Af7b7790c94Cb97a5', // Mock Bungee router
      data: '0x' + '0'.repeat(64), // Mock transaction data
      value: '0',
      gasLimit: '200000',
      chainId: 1
    };
  }
  try {
    const params: BungeeTransactionRequest = {
      routeId,
      userAddress,
      slippage,
    };

    const response = await bungeeApi.post('/api/v1/bungee/submit', params);
    
    if (!response.data || !response.data.to || !response.data.data) {
      throw new Error('Invalid transaction response');
    }

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 400) {
        throw new Error(error.response.data?.message || 'Invalid transaction request');
      }
      if (error.response?.status === 404) {
        throw new Error('Route not found or expired');
      }
    }
    
    console.error('Bungee transaction build error:', error);
    throw new Error('Failed to build transaction');
  }
};

/**
 * Check transaction status
 * @param transactionHash - Transaction hash to check
 * @returns Status response
 */
export const checkBungeeTransactionStatus = async (
  transactionHash: string
): Promise<BungeeStatusResponse> => {
  // TODO: Remove mock when API is configured
  if (false) {
    return {
      status: 'COMPLETED',
      transactionHash,
      fromAmount: '1000000000000000000',
      toAmount: '3800000000',
      error: undefined
    };
  }
  
  try {
    const params: BungeeStatusRequest = {
      transactionHash,
      originChainId: ETHEREUM_CHAIN_ID,
      destinationChainId: ETHEREUM_CHAIN_ID,
    };

    const response = await bungeeApi.get('/api/v1/bungee/req-status', { params });
    return response.data;
  } catch (error) {
    console.error('Bungee status check error:', error);
    
    // Return pending status on error to allow retries
    return {
      status: 'PENDING',
      transactionHash,
      fromAmount: '0',
      toAmount: '0',
    };
  }
};

/**
 * Format quote for display
 * @param quote - Quote response
 * @param route - Selected route
 * @returns Formatted quote details
 */
export const formatQuoteDetails = (
  quote: BungeeQuoteResponse,
  route: BungeeRoute
) => {
  const exchangeRate = route.exchangeRate || 1;
  const priceImpact = Math.abs(route.priceImpact || 0);
  const minimumReceived = route.outputAmountMin;
  
  return {
    exchangeRate: exchangeRate.toFixed(6),
    priceImpact: priceImpact.toFixed(2),
    minimumReceived,
    estimatedTime: Math.ceil(route.executionDuration / 60), // Convert to minutes
    bridgeFee: route.bridgeFeeInUsd.toFixed(2),
    networkFee: route.estimatedGasFeesInUsd.toFixed(2),
  };
};

/**
 * Calculate price impact percentage
 * @param inputValue - USD value of input
 * @param outputValue - USD value of output
 * @returns Price impact percentage
 */
export const calculatePriceImpact = (
  inputValue: number,
  outputValue: number
): number => {
  if (inputValue === 0) return 0;
  
  const impact = ((inputValue - outputValue) / inputValue) * 100;
  return Math.abs(impact);
};