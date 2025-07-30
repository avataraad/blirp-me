/**
 * Bungee API integration service
 * Uses the public endpoint for quote fetching and trade execution
 */

import axios, { AxiosInstance } from 'axios';
import { VerifiedToken } from '../config/tokens';
import { createError, ErrorType } from './errorHandling';

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
  originalResult?: any; // Store the full API response for submit
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
  // Additional fields for submit
  approvalData?: any;
  txData?: any;
  requestType?: string;
  userOp?: string;
  signTypedData?: any;
  quoteExpiry?: number;
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
  quoteResponse?: BungeeQuoteResponse; // Pass the full quote response
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
 * @param enableManual - Enable manual routes (default true)
 * @param disableAuto - Disable automatic routes (default false)
 * @returns Quote response with routes
 */
export const getBungeeQuote = async (
  fromToken: VerifiedToken,
  toToken: VerifiedToken,
  amountWei: string,
  userAddress: string,
  slippage: number = 1,
  enableManual: boolean = true,
  disableAuto: boolean = false
): Promise<BungeeQuoteResponse> => {
  
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
      enableManual: enableManual,
      disableAuto: disableAuto,
    };

    console.log('Bungee API request params:', JSON.stringify(params, null, 2));
    console.log('From token:', fromToken.symbol, 'Address:', getBungeeTokenAddress(fromToken));
    console.log('To token:', toToken.symbol, 'Address:', getBungeeTokenAddress(toToken));
    console.log('Amount Wei:', amountWei);
    console.log('Request URL:', `${BUNGEE_API_URL}/api/v1/bungee/quote`);

    // Use the original endpoint
    const response = await bungeeApi.get('/api/v1/bungee/quote', { params });
    
    console.log('Bungee API response status:', response.status);
    console.log('Bungee API response data:', JSON.stringify(response.data, null, 2));
    
    // Check if we got a response
    if (!response.data) {
      console.error('No data in Bungee API response');
      throw createError(
        ErrorType.QUOTE_FAILED,
        'Failed to get quote from Bungee API',
        'No data in response',
        undefined,
        true
      );
    }

    // Check for error in response
    if (response.data.error || response.data.message) {
      console.error('Bungee API returned error:', response.data.error || response.data.message);
      throw createError(
        ErrorType.QUOTE_FAILED,
        response.data.message || response.data.error || 'Failed to get quote',
        'API returned error',
        undefined,
        true
      );
    }

    // The API might return data directly or wrapped in result
    let result = response.data.result || response.data;
    
    // Check if we have the expected Bungee API response structure
    if (!result || !result.input || !result.input.token) {
      console.error('Invalid Bungee API result structure:', JSON.stringify(result, null, 2));
      console.error('Full response data:', JSON.stringify(response.data, null, 2));
      throw createError(
        ErrorType.QUOTE_FAILED,
        'Invalid quote response from Bungee API',
        'Missing input data in response',
        undefined,
        true
      );
    }
    
    // For same-chain swaps, we need to check autoRoute or manualRoutes
    if (!result.autoRoute && (!result.manualRoutes || result.manualRoutes.length === 0)) {
      console.error('No routes available in Bungee response:', result);
      throw createError(
        ErrorType.QUOTE_FAILED,
        'No routes available for this trade',
        'No liquidity found',
        undefined,
        false
      );
    }
    
    // Handle Bungee API response format
    // Prioritize autoRoute over manualRoutes
    const autoRoute = result.autoRoute;
    const manualRoutes = result.manualRoutes || [];
    
    if (!autoRoute && manualRoutes.length === 0) {
      throw createError(
        ErrorType.QUOTE_FAILED,
        'No routes available for this trade',
        'No routes in response',
        undefined,
        false
      );
    }
    
    // Use autoRoute if available, otherwise use first manual route
    const selectedRoute = autoRoute || manualRoutes[0];
    const routes = autoRoute ? [autoRoute] : manualRoutes;
    
    // Transform to our expected format
    const transformedResponse: BungeeQuoteResponse = {
      routes: routes.map((route: any) => ({
        routeId: route.quoteId || route.requestHash || `bungee-${Date.now()}`,
        fromAmount: result.input.amount,
        toAmount: route.output?.amount || '0',
        estimatedGas: route.gasFee?.gasLimit || '200000',
        estimatedGasFeesInUsd: route.gasFee?.feeInUsd || 0.01,
        routePath: route.routeDetails ? [route.routeDetails.name] : ['Bungee Protocol'],
        exchangeRate: (route.output?.valueInUsd && result.input.valueInUsd) 
          ? route.output.valueInUsd / result.input.valueInUsd 
          : 1,
        priceImpact: 0, // Not provided in response
        slippage: route.slippage || slippage,
        bridgeFee: route.routeDetails?.routeFee?.amount || '0',
        bridgeFeeInUsd: route.routeDetails?.routeFee?.feeInUsd || 0,
        outputAmountMin: route.output?.minAmountOut || '0',
        executionDuration: route.estimatedTime || 30,
        // Store additional data needed for submit
        approvalData: route.approvalData,
        txData: route.txData,
        requestType: route.requestType || 'SINGLE_OUTPUT_REQUEST',
        userOp: route.userOp,
        signTypedData: route.signTypedData,
        quoteExpiry: route.quoteExpiry
      })),
      fromToken: {
        address: result.input.token.address,
        symbol: result.input.token.symbol,
        decimals: result.input.token.decimals,
        name: result.input.token.name,
        logoURI: result.input.token.logoURI || result.input.token.icon,
        chainId: result.input.token.chainId
      },
      toToken: {
        // Get output token from the route, ensure native ETH address is used correctly
        address: selectedRoute.output?.token?.address || getBungeeTokenAddress(toToken),
        symbol: selectedRoute.output?.token?.symbol || toToken.symbol,
        decimals: selectedRoute.output?.token?.decimals || toToken.decimals,
        name: selectedRoute.output?.token?.name || toToken.name,
        logoURI: selectedRoute.output?.token?.logoURI || selectedRoute.output?.token?.icon || toToken.logoURI,
        chainId: selectedRoute.output?.token?.chainId || ETHEREUM_CHAIN_ID
      },
      fromAmount: result.input.amount,
      toAmount: selectedRoute.output?.amount || '0',
      estimatedGas: selectedRoute.gasFee?.gasLimit || '200000',
      status: 'success',
      // Store the full result for building the submit request
      originalResult: result
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

export interface ManualBuildResult {
  transactionData: BungeeTransactionResponse;
  approvalData?: {
    spenderAddress: string;
    amount: string;
    tokenAddress: string;
    userAddress: string;
  };
}

/**
 * Build manual transaction using the build-tx endpoint
 * @param routeId - Route ID from the manual route
 * @returns Transaction data and approval data if needed
 */
export const buildManualTransaction = async (
  routeId: string
): Promise<ManualBuildResult> => {
  try {
    console.log('Building manual transaction with routeId:', routeId);
    
    const response = await bungeeApi.get('/api/v1/bungee-manual/build-tx', {
      params: { routeId }
    });
    
    const serverReqId = response.headers['server-req-id'];
    
    console.log('Manual build-tx response:', {
      status: response.status,
      serverReqId,
      data: JSON.stringify(response.data, null, 2)
    });
    
    if (!response.data.success) {
      throw new Error(
        `Build TX error: ${response.data.statusCode}: ${response.data.message}. server-req-id: ${serverReqId}`
      );
    }
    
    const result = response.data.result;
    
    // The transaction data is nested in result.txData
    const txData = result.txData;
    
    console.log('Manual build-tx result:', {
      hasApprovalData: !!result.approvalData,
      userOp: result.userOp,
      hasTxData: !!txData,
      to: txData?.to,
      hasData: !!txData?.data,
      dataLength: txData?.data?.length,
      value: txData?.value,
      chainId: txData?.chainId
    });
    
    // Validate required fields
    if (!txData || !txData.to || !txData.data) {
      throw new Error('Invalid transaction data from build-tx endpoint: missing txData');
    }
    
    // Transform to our expected format
    const transactionData: BungeeTransactionResponse = {
      to: txData.to,
      data: txData.data,
      value: txData.value || '0x00',
      gasLimit: txData.gasLimit || '300000',
      chainId: txData.chainId || ETHEREUM_CHAIN_ID
    };
    
    return {
      transactionData,
      approvalData: result.approvalData
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const serverReqId = error.response?.headers['server-req-id'];
      console.error('Manual build-tx error:', {
        status: error.response?.status,
        serverReqId,
        data: error.response?.data
      });
      
      if (error.response?.data?.message) {
        throw new Error(
          `Build TX failed: ${error.response.data.message}. server-req-id: ${serverReqId}`
        );
      }
    }
    
    console.error('Manual transaction build error:', error);
    throw new Error('Failed to build manual transaction: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
};

/**
 * Build transaction for the selected route using Bungee submit endpoint
 * @param routeId - Route ID from quote
 * @param userAddress - User's wallet address
 * @param slippage - Slippage tolerance
 * @param quoteResponse - The full quote response containing route details
 * @param userSignature - User's signature for the transaction
 * @returns Transaction data for execution
 */
export const buildBungeeTransaction = async (
  routeId: string,
  userAddress: string,
  slippage: number = 1,
  quoteResponse?: BungeeQuoteResponse,
  userSignature?: string
): Promise<BungeeTransactionResponse> => {
  
  try {
    if (!quoteResponse || !quoteResponse.originalResult) {
      throw new Error('Quote response required for building transaction');
    }
    
    const originalResult = quoteResponse.originalResult;
    const selectedRoute = quoteResponse.routes.find(r => r.routeId === routeId) || quoteResponse.routes[0];
    
    // Debug: Check if addresses are being lowercased
    console.log('Debug - Token addresses from quote:', {
      fromQuoteResponse: quoteResponse.toToken.address,
      fromOriginalResult: originalResult.output?.token?.address,
      fromSelectedRoute: selectedRoute.output?.token?.address,
      expectedETH: NATIVE_ETH_ADDRESS
    });
    
    // For Permit2 flow (userOp is "sign"), we need the user's signature
    if (selectedRoute.userOp === 'sign' && !userSignature) {
      console.log('Permit2 flow detected, returning signature data');
      // Return the sign data so the caller can prompt for signature
      return {
        to: '', // No transaction yet
        data: '', // No transaction data yet
        value: '0',
        gasLimit: selectedRoute.estimatedGas,
        chainId: originalResult.originChainId,
        requiresSignature: true,
        signData: selectedRoute.signTypedData
      } as any;
    }
    
    const requestType = selectedRoute.requestType || 'SINGLE_OUTPUT_REQUEST';
    
    // Build the submit request based on the API documentation
    // Create basicReq object first
    const basicReq = {
      // Common fields for both request types
      deadline: (Math.floor(Date.now() / 1000) + 3600).toString(), // 1 hour from now, as string
      nonce: Date.now().toString(),
      sender: userAddress,
      receiver: originalResult.receiverAddress || userAddress,
      delegate: userAddress,
      bungeeGateway: selectedRoute.approvalData?.spenderAddress || selectedRoute.approvalData?.approvalAddress || '0x3a23F943181408EAC424116Af7b7790c94Cb97a5',
      // For SWAP_REQUEST, we need chainId. For SINGLE_OUTPUT_REQUEST, we need originChainId/destinationChainId
      ...(requestType === 'SWAP_REQUEST' ? {
        chainId: Number(originalResult.originChainId) || 1, // Just chainId for same-chain swaps
      } : {
        originChainId: Number(originalResult.originChainId) || 1,
        destinationChainId: Number(originalResult.destinationChainId) || 1,
        switchboardId: 1,
      }),
      // For input token, also check if it's ETH and use the proper address
      inputToken: (() => {
        const inputAddr = originalResult.input.token.address;
        if (inputAddr === '0x0000000000000000000000000000000000000000' || 
            inputAddr.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') {
          return NATIVE_ETH_ADDRESS;
        }
        return inputAddr;
      })(),
      inputAmount: originalResult.input.amount,
      // For output token, check if it's ETH and use the proper address
      outputToken: (() => {
        const outputAddr = selectedRoute.output?.token?.address || quoteResponse.toToken.address;
        // If the address is all zeros or matches a lowercase ETH pattern, use the proper ETH address
        if (outputAddr === '0x0000000000000000000000000000000000000000' || 
            outputAddr.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') {
          return NATIVE_ETH_ADDRESS;
        }
        return outputAddr;
      })(),
      minOutputAmount: selectedRoute.outputAmountMin || selectedRoute.output?.minAmountOut || '0',
      refuelAmount: '0'
    };

    // Build the complete request object based on requestType
    // For SWAP_REQUEST, we need swapRequest structure
    const request = requestType === 'SWAP_REQUEST' ? {
      basicReq,
      swapOutputToken: selectedRoute.swapOutputToken || '0x0000000000000000000000000000000000000000',
      minSwapOutput: selectedRoute.minSwapOutput || '0',
      metadata: '0x0000000000000000000000000000000000000000000000000000000000000000',
      affiliateFees: '0x',
      minDestGas: '0',
      destinationPayload: originalResult.destinationExec?.destinationPayload || '0x',
      exclusiveTransmitter: '0x0000000000000000000000000000000000000000'
    } : {
      // SingleOutputRequestDto
      basicReq,
      // For single output, these fields should be part of basicReq or not included
      metadata: '0x0000000000000000000000000000000000000000000000000000000000000000',
      affiliateFees: '0x',
      minDestGas: '0',
      destinationPayload: originalResult.destinationExec?.destinationPayload || '0x',
      exclusiveTransmitter: '0x0000000000000000000000000000000000000000'
    };
    
    const submitRequest = {
      request,
      userSignature: userSignature || '0x', // Empty if not required
      requestType,
      quoteId: selectedRoute.quoteId || selectedRoute.routeId || routeId
      // Removed chainId from body since we're passing it in URL
    };

    // For SWAP_REQUEST, chainId is in the body. For SINGLE_OUTPUT_REQUEST, it might be needed in URL
    const submitUrl = `/api/v1/bungee/submit`;
    
    // Comprehensive logging of the entire request
    console.log('================== BUNGEE QUOTE RESPONSE ==================');
    console.log('Original Quote Result:', JSON.stringify(originalResult, null, 2));
    console.log('Selected Route:', JSON.stringify(selectedRoute, null, 2));
    console.log('Quote Response Tokens:', {
      fromToken: quoteResponse.fromToken,
      toToken: quoteResponse.toToken,
      fromAmount: quoteResponse.fromAmount,
      toAmount: quoteResponse.toAmount
    });
    console.log('================== BUNGEE SUBMIT REQUEST ==================');
    console.log('URL:', `${BUNGEE_API_URL}${submitUrl}`);
    console.log('Method: POST');
    console.log('Query Params:', 'None');
    console.log('Request Body:', JSON.stringify(submitRequest, null, 2));
    console.log('Token Mapping:', {
      inputToken: submitRequest.request.basicReq.inputToken,
      outputToken: submitRequest.request.basicReq.outputToken,
      expectedOutputToken: quoteResponse.toToken.address
    });
    console.log('Request Type:', requestType);
    console.log('Quote ID:', selectedRoute.quoteId || selectedRoute.routeId || routeId);
    console.log('==========================================================');
    
    const response = await bungeeApi.post(submitUrl, submitRequest);
    
    console.log('Bungee submit response:', JSON.stringify(response.data, null, 2));
    
    if (!response.data) {
      throw new Error('Invalid submit response');
    }
    
    // The submit endpoint should return transaction data
    // If it returns a different format, we need to adapt
    if (response.data.txData) {
      return {
        to: response.data.txData.to,
        data: response.data.txData.data,
        value: response.data.txData.value || '0x00',
        gasLimit: selectedRoute.estimatedGas,
        chainId: response.data.txData.chainId || originalResult.originChainId
      };
    }
    
    // Fallback: use the txData from the route if available
    if (selectedRoute.txData) {
      return {
        to: selectedRoute.txData.to,
        data: selectedRoute.txData.data,
        value: selectedRoute.txData.value || '0x00',
        gasLimit: selectedRoute.estimatedGas,
        chainId: selectedRoute.txData.chainId || originalResult.originChainId
      };
    }

    throw new Error('No transaction data in response');
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Bungee submit error response:', error.response?.data);
      console.error('Full error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          data: error.config?.data ? JSON.parse(error.config.data) : null,
          params: error.config?.params
        }
      });
      
      if (error.response?.status === 400) {
        throw new Error(error.response.data?.message || 'Invalid submit request');
      }
      if (error.response?.status === 404) {
        throw new Error('Quote expired or not found');
      }
      if (error.response?.status === 500) {
        const errorMessage = error.response.data?.message || error.response.data?.error || 'Server error';
        throw new Error(`Bungee API error: ${errorMessage}`);
      }
    }
    
    console.error('Bungee transaction build error:', error);
    throw new Error('Failed to build transaction: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
};

/**
 * Check manual transaction status
 * @param txHash - Transaction hash to check
 * @returns Status response
 */
export const checkManualTransactionStatus = async (
  txHash: string
): Promise<any> => {
  try {
    const response = await bungeeApi.get('/api/v1/bungee/status', {
      params: { txHash }
    });
    
    const serverReqId = response.headers['server-req-id'];
    
    if (!response.data.success) {
      throw new Error(
        `Status error: ${response.data.statusCode}: ${response.data.message}. server-req-id: ${serverReqId}`
      );
    }
    
    return response.data.result;
  } catch (error) {
    console.error('Manual status check error:', error);
    throw error;
  }
};

/**
 * Poll for manual transaction completion
 * @param txHash - Transaction hash to monitor
 * @param interval - Polling interval in milliseconds (default 5000)
 * @param maxAttempts - Maximum polling attempts (default 60)
 * @returns Final status when complete
 */
export const pollForManualCompletion = async (
  txHash: string,
  interval: number = 5000,
  maxAttempts: number = 60
): Promise<any> => {
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    try {
      const status = await checkManualTransactionStatus(txHash);
      const code = status[0]?.bungeeStatusCode;
      
      console.log(`Manual tx status check attempt ${attempts + 1}:`, {
        txHash,
        code,
        status: JSON.stringify(status, null, 2)
      });
      
      if (code === 3) {
        return status; // Transaction complete
      }
      
      attempts++;
      await new Promise(resolve => setTimeout(resolve, interval));
    } catch (error) {
      console.error(`Error checking status on attempt ${attempts + 1}:`, error);
      attempts++;
      await new Promise(resolve => setTimeout(resolve, interval));
    }
  }
  
  throw new Error('Polling timed out. Transaction may not have completed.');
};

/**
 * Check transaction status
 * @param transactionHash - Transaction hash to check
 * @returns Status response
 */
export const checkBungeeTransactionStatus = async (
  transactionHash: string
): Promise<BungeeStatusResponse> => {
  
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