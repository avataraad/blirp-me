/**
 * Trade execution service
 * Handles the execution of trades via Bungee Inbox contract
 */

import { 
  signTransaction,
  broadcastTransaction,
  waitForTransaction,
  SimulationResult,
  SignedTransaction,
  TransactionReceipt,
  signTypedData
} from './transactionService';
import { 
  buildBungeeTransaction,
  BungeeRoute,
  BungeeTransactionResponse,
  checkBungeeTransactionStatus
} from './bungeeService';
import { VerifiedToken } from '../config/tokens';
import { parseEther, encodeFunctionData } from 'viem';
import * as Keychain from 'react-native-keychain';

export interface TradeExecutionParams {
  routeId: string;
  route: BungeeRoute;
  fromToken: VerifiedToken;
  toToken: VerifiedToken;
  amountWei: string;
  userAddress: string;
  slippage: number;
  quoteResponse: BungeeQuoteResponse; // Add the full quote response
}

export interface TradeExecutionResult {
  transactionHash: string;
  receipt?: TransactionReceipt;
  status: 'pending' | 'success' | 'failed';
  error?: string;
}

export interface ApprovalParams {
  tokenAddress: string;
  spenderAddress: string;
  amount: string;
  userAddress: string;
}

// ERC20 approval ABI
const APPROVAL_ABI = [{
  name: 'approve',
  type: 'function',
  inputs: [
    { name: 'spender', type: 'address' },
    { name: 'amount', type: 'uint256' }
  ],
  outputs: [{ name: '', type: 'bool' }],
  stateMutability: 'nonpayable'
}];

/**
 * Execute a token approval transaction
 * @param params Approval parameters
 * @returns Transaction hash
 */
export const executeTokenApproval = async (
  params: ApprovalParams
): Promise<string> => {
  try {
    const { tokenAddress, spenderAddress, amount, userAddress } = params;
    
    // Build approval transaction
    const approvalData = encodeFunctionData({
      abi: APPROVAL_ABI,
      functionName: 'approve',
      args: [spenderAddress as `0x${string}`, BigInt(amount)]
    });
    
    // Create transaction params
    const txParams = {
      from: userAddress,
      to: tokenAddress,
      value: '0',
      data: approvalData
    };
    
    // Simulate for gas estimation
    const simulation: SimulationResult = {
      assetChanges: [],
      gasUsed: '50000',
      gasLimit: '60000',
      maxFeePerGas: '20000000000',
      maxPriorityFeePerGas: '1500000000',
      success: true,
      warnings: []
    };
    
    // Sign the transaction
    const signedTx = await signTransaction(txParams, simulation);
    
    // Broadcast the transaction
    const txHash = await broadcastTransaction(signedTx);
    
    // Wait for confirmation
    await waitForTransaction(txHash, 1);
    
    return txHash;
  } catch (error) {
    console.error('Token approval failed:', error);
    throw new Error(`Approval failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Check if a token has sufficient approval
 * @param tokenAddress Token contract address
 * @param ownerAddress Token owner
 * @param spenderAddress Spender (Bungee Inbox)
 * @param amount Required amount
 * @returns Whether approval is sufficient
 */
export const checkTokenAllowance = async (
  tokenAddress: string,
  ownerAddress: string,
  spenderAddress: string,
  amount: string
): Promise<boolean> => {
  // For now, always return false to require approval
  // In production, this would check the actual allowance on-chain
  return false;
};

/**
 * Execute a trade via Bungee
 * @param params Trade execution parameters
 * @returns Execution result
 */
export const executeTrade = async (
  params: TradeExecutionParams,
  setExecutionStatus?: (status: string) => void
): Promise<TradeExecutionResult> => {
  try {
    const { routeId, route, fromToken, toToken, userAddress, slippage, quoteResponse } = params;
    
    // MOCK MODE: Return success without executing real transaction
    if (false) { // TODO: Remove when ready for real trades
      console.log('🧪 MOCK MODE: Simulating successful trade execution');
      const mockTxHash = '0x' + Math.random().toString(16).substring(2) + Date.now().toString(16);
      
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      return {
        transactionHash: mockTxHash,
        status: 'pending'
      };
    }
    
    // Step 1: Build the transaction via Bungee
    console.log('🔄 Building Bungee transaction...');
    let bungeeTransaction = await buildBungeeTransaction(
      routeId,
      userAddress,
      slippage,
      quoteResponse
    );
    
    // Check if signature is required
    if ((bungeeTransaction as any).requiresSignature) {
      console.log('📝 Signature required for transaction');
      setExecutionStatus?.('Awaiting signature...');
      
      const signData = (bungeeTransaction as any).signData;
      if (!signData || !signData.domain || !signData.types || !signData.values) {
        throw new Error('Invalid signature data from Bungee API');
      }
      
      // Sign the typed data
      const userSignature = await signTypedData(
        signData.domain,
        signData.types,
        signData.values,
        userAddress
      );
      
      console.log('✅ User signature obtained');
      setExecutionStatus?.('Building transaction...');
      
      // Rebuild transaction with signature
      bungeeTransaction = await buildBungeeTransaction(
        routeId,
        userAddress,
        slippage,
        quoteResponse,
        userSignature
      );
    }
    
    // Step 2: Check if approval is needed (for selling ERC20 tokens)
    if (!fromToken.isNative) {
      console.log('🔐 Checking token approval...');
      const hasApproval = await checkTokenAllowance(
        fromToken.address,
        userAddress,
        bungeeTransaction.to,
        params.amountWei
      );
      
      if (!hasApproval) {
        console.log('📝 Token approval required, executing...');
        await executeTokenApproval({
          tokenAddress: fromToken.address,
          spenderAddress: bungeeTransaction.to,
          amount: params.amountWei,
          userAddress
        });
      }
    }
    
    // Step 3: Prepare transaction parameters
    const txParams = {
      from: userAddress,
      to: bungeeTransaction.to,
      value: bungeeTransaction.value || '0',
      data: bungeeTransaction.data
    };
    
    // Step 4: Create simulation result from Bungee data
    const simulation: SimulationResult = {
      assetChanges: [
        {
          address: userAddress,
          tokenAddress: fromToken.isNative ? null : fromToken.address,
          amount: `-${params.amountWei}`,
          decimals: fromToken.decimals,
          symbol: fromToken.symbol,
          name: fromToken.name
        },
        {
          address: userAddress,
          tokenAddress: toToken.isNative ? null : toToken.address,
          amount: route.outputAmountMin,
          decimals: toToken.decimals,
          symbol: toToken.symbol,
          name: toToken.name
        }
      ],
      gasUsed: bungeeTransaction.gasLimit,
      gasLimit: bungeeTransaction.gasLimit,
      maxFeePerGas: '20000000000', // Default, should be fetched
      maxPriorityFeePerGas: '1500000000',
      success: true,
      warnings: []
    };
    
    // Step 5: Sign the transaction
    console.log('✍️ Signing transaction...');
    const signedTx = await signTransaction(txParams, simulation);
    
    // Step 6: Broadcast the transaction
    console.log('📡 Broadcasting transaction...');
    const txHash = await broadcastTransaction(signedTx);
    
    console.log('✅ Transaction broadcasted:', txHash);
    
    return {
      transactionHash: txHash,
      status: 'pending'
    };
    
  } catch (error) {
    console.error('Trade execution failed:', error);
    return {
      transactionHash: '',
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Monitor trade execution status
 * @param transactionHash Transaction hash to monitor
 * @param onStatusUpdate Callback for status updates
 * @returns Final execution result
 */
export const monitorTradeExecution = async (
  transactionHash: string,
  onStatusUpdate?: (status: string) => void
): Promise<TradeExecutionResult> => {
  try {
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes with 5-second intervals
    
    while (attempts < maxAttempts) {
      // Check Bungee status
      const bungeeStatus = await checkBungeeTransactionStatus(transactionHash);
      
      if (onStatusUpdate) {
        onStatusUpdate(bungeeStatus.status);
      }
      
      if (bungeeStatus.status === 'COMPLETED') {
        // Get transaction receipt
        const receipt = await waitForTransaction(transactionHash, 1);
        
        return {
          transactionHash,
          receipt,
          status: 'success'
        };
      }
      
      if (bungeeStatus.status === 'FAILED') {
        return {
          transactionHash,
          status: 'failed',
          error: bungeeStatus.error || 'Trade failed'
        };
      }
      
      // Wait 5 seconds before next check
      await new Promise(resolve => setTimeout(resolve, 5000));
      attempts++;
    }
    
    // Timeout
    return {
      transactionHash,
      status: 'failed',
      error: 'Trade execution timeout'
    };
    
  } catch (error) {
    console.error('Trade monitoring failed:', error);
    return {
      transactionHash,
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Cancel a pending trade (if possible)
 * @param transactionHash Transaction to cancel
 * @param userAddress User's address
 * @returns Whether cancellation was successful
 */
export const cancelTrade = async (
  transactionHash: string,
  userAddress: string
): Promise<boolean> => {
  // This would implement transaction cancellation via replacement
  // For now, return false as it's not implemented
  console.warn('Trade cancellation not yet implemented');
  return false;
};

