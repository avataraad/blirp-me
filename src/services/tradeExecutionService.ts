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
  signTypedData,
  simulateTransaction,
  getCurrentGasPrices
} from './transactionService';
import { 
  buildBungeeTransaction,
  buildManualTransaction,
  BungeeRoute,
  BungeeTransactionResponse,
  BungeeQuoteResponse,
  checkBungeeTransactionStatus
} from './bungeeService';
import { 
  buildApprovalTransaction,
  needsApproval,
  ApprovalData
} from './tokenApprovalService';
import { VerifiedToken } from '../config/tokens';
import { parseEther, encodeFunctionData } from 'viem';
import { getPublicClient } from '@wagmi/core';
import { config } from '../config/wagmi';
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
  tradeType: 'manual' | 'auto'; // Add trade type
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
  chainId?: number;
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
    
    // Use the spender address as provided
    const actualSpender = spenderAddress;
    
    // Build approval transaction
    const approvalData = encodeFunctionData({
      abi: APPROVAL_ABI,
      functionName: 'approve',
      args: [actualSpender as `0x${string}`, BigInt(amount)]
    });
    
    // Create transaction params
    const txParams = {
      from: userAddress,
      to: tokenAddress,
      value: '0',
      data: approvalData,
      chainId: params.chainId
    };
    
    // Properly simulate the transaction to get accurate gas estimates
    console.log('Simulating approval transaction with params:', txParams);
    const simulation = await simulateTransaction(txParams);
    console.log('Simulation result:', simulation);
    
    if (!simulation.success) {
      throw new Error(`Approval simulation failed: ${simulation.error || 'Unknown error'}`);
    }
    
    // Sign the transaction
    const signedTx = await signTransaction(txParams, simulation);
    
    // Broadcast the transaction
    const txHash = await broadcastTransaction(signedTx, params.chainId);
    
    // Wait for confirmation
    await waitForTransaction(txHash, 1, params.chainId);
    
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
 * @param spenderAddress Spender (Permit2 or custom)
 * @param amount Required amount
 * @returns Whether approval is sufficient
 */
export const checkTokenAllowance = async (
  tokenAddress: string,
  ownerAddress: string,
  spenderAddress: string,
  amount: string,
  chainId?: number
): Promise<boolean> => {
  try {
    const publicClient = getPublicClient(config, { chainId: chainId || 1 });
    if (!publicClient) {
      throw new Error('Failed to get public client');
    }
    
    // ERC20 ABI for allowance function
    const erc20Abi = [{
      inputs: [
        { name: "owner", type: "address" },
        { name: "spender", type: "address" },
      ],
      name: "allowance",
      outputs: [{ name: "", type: "uint256" }],
      stateMutability: "view",
      type: "function",
    }];
    
    // Use Permit2 address if spender is "0"
    const actualSpender = spenderAddress === "0" 
      ? "0x000000000022D473030F116dDEE9F6B43aC78BA3" 
      : spenderAddress;
    
    const currentAllowance = await publicClient.readContract({
      address: tokenAddress as `0x${string}`,
      abi: erc20Abi,
      functionName: "allowance",
      args: [ownerAddress as `0x${string}`, actualSpender as `0x${string}`],
    }) as bigint;
    
    console.log('Current allowance:', currentAllowance.toString(), 'Required:', amount);
    
    return BigInt(currentAllowance) >= BigInt(amount);
  } catch (error) {
    console.error('Failed to check allowance:', error);
    return false;
  }
};

/**
 * Execute a manual trade
 * @param params Trade execution parameters
 * @param setExecutionStatus Status callback
 * @returns Execution result
 */
export const executeManualTrade = async (
  params: TradeExecutionParams,
  setExecutionStatus?: (status: string) => void
): Promise<TradeExecutionResult> => {
  try {
    const { routeId, route, fromToken, toToken, userAddress, amountWei } = params;
    
    console.log('🔄 Starting manual trade execution...');
    setExecutionStatus?.('Preparing manual trade...');
    
    // Step 1: Build the manual transaction first to get approval data
    console.log('🔨 Building manual transaction...');
    setExecutionStatus?.('Building transaction...');
    
    // Use routeId from the route object
    const manualRouteId = route.routeId || routeId;
    console.log('Manual route ID for build-tx:', manualRouteId);
    let buildResult = await buildManualTransaction(manualRouteId);
    
    // Step 2: Check if approval is needed from the build-tx response
    if (buildResult.approvalData) {
      console.log('🔍 Token approval required for manual trade...', JSON.stringify(buildResult.approvalData, null, 2));
      setExecutionStatus?.('Checking token approval...');
      
      // Debug: Log the approval check parameters
      console.log('Approval check parameters:', {
        tokenAddress: buildResult.approvalData.tokenAddress,
        userAddress: userAddress,
        spenderAddress: buildResult.approvalData.spenderAddress,
        amount: buildResult.approvalData.amount,
        amountWei: amountWei,
        chainId: params.fromToken.chainId
      });
      
      // Check current allowance before proceeding
      const initialAllowance = await checkTokenAllowance(
        buildResult.approvalData.tokenAddress as `0x${string}`,
        userAddress as `0x${string}`,
        buildResult.approvalData.spenderAddress as `0x${string}`,
        BigInt(buildResult.approvalData.amount),
        params.fromToken.chainId
      );
      
      console.log('Initial allowance check:', initialAllowance ? 'Has allowance' : 'No allowance');
      
      const approvalNeeded = await needsApproval(
        buildResult.approvalData.tokenAddress as `0x${string}`,
        userAddress as `0x${string}`,
        buildResult.approvalData.spenderAddress as `0x${string}`,
        BigInt(buildResult.approvalData.amount),
        params.fromToken.chainId
      );
      
      // Check ETH balance for gas
      const publicClient = getPublicClient(config, { chainId: params.fromToken.chainId || 1 });
      if (publicClient) {
        try {
          // Check ETH balance first
          const ethBalance = await publicClient.getBalance({
            address: userAddress as `0x${string}`
          });
          
          console.log('💰 ETH balance check:', {
            ethBalance: ethBalance.toString(),
            ethBalanceFormatted: (Number(ethBalance) / 1e18).toFixed(6) + ' ETH',
            estimatedGasNeeded: '~0.002 ETH'
          });
          
          // Then check token balance
          const balanceResult = await publicClient.readContract({
            address: buildResult.approvalData.tokenAddress as `0x${string}`,
            abi: [{
              inputs: [{ name: "account", type: "address" }],
              name: "balanceOf",
              outputs: [{ name: "", type: "uint256" }],
              stateMutability: "view",
              type: "function"
            }],
            functionName: "balanceOf",
            args: [userAddress as `0x${string}`]
          });
          
          console.log('💰 Token balance check:', {
            tokenAddress: buildResult.approvalData.tokenAddress,
            userBalance: balanceResult.toString(),
            requiredAmount: buildResult.approvalData.amount,
            hasEnoughBalance: BigInt(balanceResult) >= BigInt(buildResult.approvalData.amount)
          });
          
          if (BigInt(balanceResult) < BigInt(buildResult.approvalData.amount)) {
            throw new Error(`Insufficient token balance. Have: ${balanceResult}, Need: ${buildResult.approvalData.amount}`);
          }
        } catch (error) {
          console.error('Failed to check token balance:', error);
        }
      }
      
      if (approvalNeeded) {
        console.log('📝 Executing token approval...');
        setExecutionStatus?.('Approving token...');
        
        const approvalTx = await buildApprovalTransaction(params.fromToken.chainId || 1, {
          tokenAddress: buildResult.approvalData.tokenAddress as `0x${string}`,
          userAddress: userAddress as `0x${string}`,
          spenderAddress: buildResult.approvalData.spenderAddress as `0x${string}`,
          amount: BigInt(buildResult.approvalData.amount),
          chainId: params.fromToken.chainId
        });
        
        if (approvalTx) {
          // Sign and send approval transaction
          const approvalParams = {
            from: userAddress,
            to: approvalTx.to,
            value: '0',
            data: approvalTx.data,
            chainId: params.fromToken.chainId
          };
          
          const simulation = await simulateTransaction(approvalParams);
          if (!simulation.success) {
            throw new Error(`Approval simulation failed: ${simulation.error}`);
          }
          
          const signedApproval = await signTransaction(approvalParams, simulation);
          const approvalHash = await broadcastTransaction(signedApproval, params.fromToken.chainId);
          
          console.log('⏳ Waiting for approval confirmation...');
          setExecutionStatus?.('Waiting for approval confirmation...');
          await waitForTransaction(approvalHash, 1, params.fromToken.chainId);
          
          console.log('✅ Token approved, waiting for state propagation...');
          
          // Add a longer delay to ensure the approval is propagated on Base
          const delayMs = params.fromToken.chainId === 8453 ? 3000 : 2000; // 3s for Base, 2s for others
          console.log(`⏳ Waiting ${delayMs}ms for approval propagation on chain ${params.fromToken.chainId}...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
          
          // Verify the approval was successful
          console.log('🔍 Verifying approval with params:', {
            tokenAddress: fromToken.address,
            userAddress: userAddress,
            spenderAddress: buildResult.approvalData.spenderAddress,
            requiredAmount: params.amountWei,
            chainId: fromToken.chainId
          });
          
          const approvalVerified = await checkTokenAllowance(
            fromToken.address,
            userAddress,
            buildResult.approvalData.spenderAddress as `0x${string}`,
            params.amountWei,
            fromToken.chainId
          );
          
          if (!approvalVerified) {
            console.error('❌ Approval verification failed after confirmation');
            // Double-check the exact allowance amount
            const publicClient = getPublicClient(config, { chainId: params.fromToken.chainId || 1 });
            if (publicClient) {
              try {
                const currentAllowance = await publicClient.readContract({
                  address: fromToken.address as `0x${string}`,
                  abi: [{
                    inputs: [
                      { name: "owner", type: "address" },
                      { name: "spender", type: "address" },
                    ],
                    name: "allowance",
                    outputs: [{ name: "", type: "uint256" }],
                    stateMutability: "view",
                    type: "function",
                  }],
                  functionName: "allowance",
                  args: [userAddress as `0x${string}`, buildResult.approvalData.spenderAddress as `0x${string}`],
                }) as bigint;
                
                console.error('Current allowance:', currentAllowance.toString(), 'Required:', params.amountWei);
              } catch (error) {
                console.error('Failed to check exact allowance:', error);
              }
            }
            throw new Error('Token approval failed to propagate. Please try again.');
          }
          
          console.log('✅ Token approval verified successfully');
          
          // After approval, we need to rebuild the transaction to get fresh data
          console.log('🔄 Rebuilding transaction after approval...');
          setExecutionStatus?.('Preparing transaction after approval...');
          
          // Small additional delay before rebuilding
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Rebuild the transaction with the same route ID
          const freshBuildResult = await buildManualTransaction(manualRouteId);
          
          // Update buildResult with fresh data
          buildResult = freshBuildResult;
          console.log('✅ Transaction rebuilt with fresh data');
        }
      }
    }
    
    // Step 3: Now execute the actual trade transaction
    const txData = buildResult.transactionData;
    
    console.log('📋 Transaction data from build-tx:', {
      to: txData.to,
      value: txData.value,
      hasData: !!txData.data,
      dataLength: txData.data?.length,
      gasLimit: txData.gasLimit,
      approvalSpender: buildResult.approvalData?.spenderAddress,
      approvalToken: buildResult.approvalData?.tokenAddress
    });
    
    // Step 3: Sign and send the transaction
    console.log('📝 Signing transaction...');
    setExecutionStatus?.('Please sign the transaction...');
    
    // Convert hex value to decimal string if needed
    let valueInWei = '0';
    if (txData.value && txData.value !== '0x00') {
      // Convert hex to decimal
      valueInWei = BigInt(txData.value).toString();
    }
    
    const txParams = {
      from: userAddress,
      to: txData.to,
      value: valueInWei,
      data: txData.data,
      chainId: params.fromToken.chainId
    };
    
    // Simulate first, but use Bungee's recommended gas limit if simulation fails
    const simulation = await simulateTransaction(txParams);
    if (!simulation.success) {
      console.log('Simulation failed:', simulation.error);
      
      // Check for specific errors that should stop execution
      if (simulation.error?.includes('TRANSFER_FROM_FAILED') ||
          simulation.error?.includes('insufficient allowance') ||
          simulation.error?.includes('insufficient balance')) {
        console.error('❌ Critical simulation error:', simulation.error);
        
        // Check current allowance to provide better error message
        const currentAllowance = await checkTokenAllowance(
          buildResult.approvalData?.tokenAddress || params.fromToken.address,
          params.userAddress,
          buildResult.approvalData?.spenderAddress || txData.to,
          params.amountWei,
          params.fromToken.chainId
        );
        
        if (!currentAllowance) {
          setExecutionStatus?.('Token approval missing or insufficient. Please try again.');
        } else {
          setExecutionStatus?.('Transaction simulation failed. Please check your token balance.');
        }
        
        return {
          transactionHash: '',
          status: 'failed',
          error: `Simulation failed: ${simulation.error}. Allowance check: ${currentAllowance ? 'OK' : 'FAILED'}`
        };
      }
      
      // For other simulation failures, try with Bungee's gas estimate
      console.log('Using Bungee-recommended gas limit:', txData.gasLimit);
      const gasPrices = await getCurrentGasPrices(params.fromToken.chainId);
      const fallbackSimulation = {
        assetChanges: [],
        gasUsed: txData.gasLimit || '300000',
        gasLimit: txData.gasLimit || '300000',
        maxFeePerGas: gasPrices.maxFeePerGas,
        maxPriorityFeePerGas: gasPrices.maxPriorityFeePerGas,
        success: true,
        warnings: [{
          type: 'network-congestion' as const,
          message: 'Using Bungee gas estimate due to simulation failure',
          severity: 'warning' as const
        }]
      };
      
      const signedTx = await signTransaction(txParams, fallbackSimulation);
      const txHash = await broadcastTransaction(signedTx, params.fromToken.chainId);
      console.log('✅ Transaction broadcasted:', txHash);
      
      return {
        transactionHash: txHash,
        status: 'pending' as const
      };
    }
    
    // Sign the transaction
    const signedTx = await signTransaction(txParams, simulation);
    
    // Step 4: Broadcast the transaction
    console.log('📤 Broadcasting transaction...');
    setExecutionStatus?.('Broadcasting transaction...');
    
    const txHash = await broadcastTransaction(signedTx, params.fromToken.chainId);
    console.log('✅ Transaction broadcasted:', txHash);
    
    // Step 5: Monitor the transaction
    setExecutionStatus?.('Transaction submitted. Waiting for confirmation...');
    
    // For manual trades, we can use standard blockchain monitoring
    // since the transaction is a direct on-chain swap
    try {
      await waitForTransaction(txHash, 1, params.fromToken.chainId);
      console.log('✅ Manual trade confirmed on-chain');
      setExecutionStatus?.('Trade completed successfully!');
      
      return {
        transactionHash: txHash,
        status: 'success'
      };
    } catch (waitError: any) {
      console.error('Transaction wait error:', waitError);
      
      // Check if this is a revert error
      if (waitError.message?.includes('reverted') || 
          waitError.message?.includes('failed') ||
          waitError.details?.includes('TRANSFER_FROM_FAILED')) {
        console.error('❌ Transaction reverted on-chain');
        setExecutionStatus?.('Transaction failed. Please try again.');
        
        return {
          transactionHash: txHash,
          status: 'failed',
          error: 'Transaction reverted: ' + (waitError.details || waitError.message || 'Unknown error')
        };
      }
      
      // For other errors (timeout, network issues), return as pending
      console.warn('⏳ Transaction status unknown, returning as pending');
      setExecutionStatus?.('Transaction submitted. Waiting for confirmation...');
      
      return {
        transactionHash: txHash,
        status: 'pending'
      };
    }
    
  } catch (error) {
    console.error('❌ Manual trade execution failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    setExecutionStatus?.(`Failed: ${errorMessage}`);
    
    return {
      transactionHash: '',
      status: 'failed',
      error: errorMessage
    };
  }
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
    const { routeId, route, fromToken, toToken, userAddress, slippage, quoteResponse, tradeType } = params;
    
    // Route to manual trade execution if trade type is manual
    if (tradeType === 'manual') {
      return await executeManualTrade(params, setExecutionStatus);
    }
    
    
    // For ERC20 sell (Permit2 flow), we need to handle this differently
    if (!fromToken.isNative) {
      console.log('🔄 Following Permit2 flow for ERC20 sell...');
      setExecutionStatus?.('Checking token approval...');
      
      // Get approval data from the route
      const approvalData = route.approvalData;
      if (!approvalData) {
        throw new Error('No approval data found in route');
      }
      
      // Step 1: Check and execute approval if needed
      // For Bungee, we need to approve the Bungee contract directly
      const BUNGEE_CONTRACT = "0x3a23F943181408EAC424116Af7b7790c94Cb97a5";
      const actualSpenderAddress = approvalData.spenderAddress || BUNGEE_CONTRACT;
      
      const hasApproval = await checkTokenAllowance(
        fromToken.address,
        userAddress,
        actualSpenderAddress,
        params.amountWei,
        fromToken.chainId
      );
      
      if (!hasApproval) {
        console.log('📝 Token approval required for Bungee contract...');
        setExecutionStatus?.('Approving token for trading...');
        
        await executeTokenApproval({
          tokenAddress: fromToken.address,
          spenderAddress: actualSpenderAddress,
          amount: params.amountWei,
          userAddress,
          chainId: fromToken.chainId
        });
        
        console.log('✅ Token approved for Bungee contract, waiting for state propagation...');
        
        // Add a small delay to ensure the approval is propagated
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Verify the approval was successful
        const approvalVerified = await checkTokenAllowance(
          fromToken.address,
          userAddress,
          actualSpenderAddress,
          params.amountWei,
          fromToken.chainId
        );
        
        if (!approvalVerified) {
          console.error('❌ Approval verification failed after confirmation');
          throw new Error('Token approval failed to propagate. Please try again.');
        }
        
        console.log('✅ Token approval verified');
      }
      
      // Step 2: Build the transaction to get signature data
      console.log('🔄 Building Bungee transaction...');
      setExecutionStatus?.('Preparing transaction...');
      
      let bungeeTransaction = await buildBungeeTransaction(
        routeId,
        userAddress,
        slippage,
        quoteResponse
      );
      
      // Step 3: Sign the Permit2 typed data
      if ((bungeeTransaction as any).requiresSignature) {
        console.log('📝 Signing Permit2 data...');
        setExecutionStatus?.('Please sign the transaction...');
        
        const signData = (bungeeTransaction as any).signData;
        if (!signData || !signData.domain || !signData.types || !signData.values) {
          throw new Error('Invalid signature data from Bungee API');
        }
        
        // Sign with the correct primary type for Permit2
        const userSignature = await signTypedData(
          signData.domain,
          signData.types,
          signData.values,
          userAddress
        );
        
        console.log('✅ Permit2 signature obtained');
        setExecutionStatus?.('Submitting transaction...');
        
        // Extract the witness from the signData
        const witness = signData.values?.witness;
        if (!witness) {
          throw new Error('No witness data found in sign response');
        }
        
        console.log('📤 Witness data extracted:', JSON.stringify(witness, null, 2));
        console.log('📤 Submitting witness with signature...');
        
        // Submit the witness directly, not a custom request
        return await submitSignedRequest(
          route.requestType || 'SINGLE_OUTPUT_REQUEST',
          witness,
          userSignature,
          routeId,
          setExecutionStatus
        );
      }
    } else {
      // For ETH buy flow (not implemented yet)
      throw new Error('ETH buy flow not implemented yet');
    }
    
    // This should not be reached in the new flow
    throw new Error('Invalid trade execution flow');
    
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
  onStatusUpdate?: (status: string) => void,
  chainId?: number
): Promise<TradeExecutionResult> => {
  try {
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes with 5-second intervals
    
    while (attempts < maxAttempts) {
      // Check Bungee status
      const bungeeStatus = await checkBungeeTransactionStatus(transactionHash, chainId || 1);
      
      if (onStatusUpdate) {
        onStatusUpdate(bungeeStatus.status);
      }
      
      if (bungeeStatus.status === 'COMPLETED') {
        // Get transaction receipt
        const receipt = await waitForTransaction(transactionHash, 1, chainId);
        
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
 * Submit a signed request to Bungee
 */
const submitSignedRequest = async (
  requestType: string,
  witness: any,  // The witness object from the quote response
  userSignature: string,
  quoteId: string,
  setExecutionStatus?: (status: string) => void
): Promise<TradeExecutionResult> => {
  try {
    // Submit the witness directly as the request
    const requestBody = {
      requestType,
      request: witness,  // Use the witness object directly
      userSignature,
      quoteId
    };
    
    console.log('Submitting signed request with witness:', JSON.stringify(requestBody, null, 2));
    
    const response = await fetch(`https://public-backend.bungee.exchange/api/v1/bungee/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });
    
    const data = await response.json();
    console.log('Submit response:', data);
    
    if (!data.success) {
      throw new Error(`Submit error: ${data.error?.message || 'Unknown error'}`);
    }
    
    const requestHash = data.result?.requestHash;
    if (!requestHash) {
      throw new Error('No request hash returned from submit');
    }
    
    console.log('🔍 Request submitted successfully, hash:', requestHash);
    
    // Start polling for completion
    setExecutionStatus?.('Transaction submitted, waiting for confirmation...');
    
    const finalStatus = await pollForCompletion(requestHash, setExecutionStatus);
    
    return {
      transactionHash: finalStatus.destinationData?.txHash || requestHash,
      status: 'success'
    };
    
  } catch (error) {
    console.error('Submit signed request failed:', error);
    throw error;
  }
};

/**
 * Check status of a Bungee request
 */
const checkBungeeRequestStatus = async (requestHash: string): Promise<any> => {
  const response = await fetch(
    `https://public-backend.bungee.exchange/api/v1/bungee/status?requestHash=${requestHash}`
  );
  const data = await response.json();
  
  if (!data.success) {
    throw new Error(`Status error: ${data.error?.message || 'Unknown error'}`);
  }
  
  return data.result?.[0] || data.result;
};

/**
 * Poll for transaction completion
 */
const pollForCompletion = async (
  requestHash: string,
  setExecutionStatus?: (status: string) => void,
  interval: number = 5000,
  maxAttempts: number = 60
): Promise<any> => {
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    try {
      const status = await checkBungeeRequestStatus(requestHash);
      const code = status?.bungeeStatusCode;
      
      console.log(`Status check ${attempts + 1}:`, status);
      
      // Status codes: 0 = pending, 3 = completed, 4/5 = failed
      if (code === 3) {
        console.log('✅ Transaction complete:', status.destinationData?.txHash);
        setExecutionStatus?.('Transaction completed successfully!');
        return status;
      } else if (code === 4 || code === 5) {
        throw new Error(`Transaction failed with code ${code}`);
      }
      
      setExecutionStatus?.(`Processing transaction... (${attempts + 1}/${maxAttempts})`);
      
    } catch (error) {
      console.error('Status check error:', error);
    }
    
    attempts++;
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  throw new Error('Polling timed out. Transaction may not have completed.');
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

