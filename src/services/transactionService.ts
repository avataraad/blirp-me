import axios from 'axios';
import Config from 'react-native-config';
import { encodeFunctionData, formatEther, parseEther, parseGwei, parseTransaction } from 'viem';
import { estimateFeesPerGas, estimateGas, getTransactionCount, sendRawTransaction, waitForTransactionReceipt } from '@wagmi/core';
import { privateKeyToAccount } from 'viem/accounts';
import { config } from '../config/wagmi';
import * as Keychain from 'react-native-keychain';

// Alchemy API configuration
const ALCHEMY_API_KEY = Config.ALCHEMY_API_KEY;
const ALCHEMY_RPC_URL = Config.ALCHEMY_RPC_URL;

// Types for transaction simulation
export interface AssetChange {
  address: string;
  tokenAddress: string | null; // null for native ETH
  amount: string; // Wei amount (can be negative)
  decimals: number;
  symbol?: string;
  name?: string;
  logo?: string;
}

export interface SimulationResult {
  assetChanges: AssetChange[];
  gasUsed: string;
  gasLimit: string;
  maxFeePerGas: string;
  maxPriorityFeePerGas: string;
  error?: string;
  success: boolean;
  warnings: TransactionWarning[];
}

export interface TransactionWarning {
  type: 'high-gas' | 'large-amount' | 'insufficient-balance' | 'network-congestion' | 'unknown-contract';
  message: string;
  severity: 'warning' | 'error';
}

export interface TransactionParams {
  from: string;
  to: string;
  value: string; // Wei amount
  data?: string; // For contract interactions
  tokenAddress?: string; // For ERC-20 transfers
  tokenAmount?: string; // For ERC-20 transfers
}

export interface SignedTransaction {
  hash: string;
  rawTransaction: string;
  from: string;
  to: string;
  value: string;
  gasLimit: string;
  maxFeePerGas: string;
  maxPriorityFeePerGas: string;
  nonce: number;
}

export interface TransactionReceipt {
  transactionHash: string;
  blockNumber: number;
  blockHash: string;
  from: string;
  to: string;
  gasUsed: string;
  effectiveGasPrice: string;
  status: number; // 1 for success, 0 for failure
  logs: any[];
}

/**
 * Get current gas prices using viem
 */
export const getCurrentGasPrices = async (): Promise<{
  maxFeePerGas: string;
  maxPriorityFeePerGas: string;
  gasPrice: string;
}> => {
  try {
    const fees = await estimateFeesPerGas(config, {
      chainId: 1
    });
    
    return {
      maxFeePerGas: fees.maxFeePerGas?.toString() || parseGwei('15').toString(),
      maxPriorityFeePerGas: fees.maxPriorityFeePerGas?.toString() || parseGwei('1.5').toString(),
      gasPrice: fees.maxFeePerGas?.toString() || parseGwei('15').toString()
    };
  } catch (error) {
    console.error('Failed to get gas prices:', error);
    // Use reasonable fallback gas prices (15 gwei base, 1.5 gwei priority)
    return {
      maxFeePerGas: parseGwei('15').toString(),
      maxPriorityFeePerGas: parseGwei('1.5').toString(),
      gasPrice: parseGwei('15').toString()
    };
  }
};

/**
 * Build transaction data for ERC-20 token transfer
 */
const buildERC20TransferData = (to: string, amount: string): string => {
  return encodeFunctionData({
    abi: [{
      name: 'transfer',
      type: 'function',
      inputs: [
        { name: 'to', type: 'address' },
        { name: 'amount', type: 'uint256' }
      ],
      outputs: [{ name: '', type: 'bool' }],
      stateMutability: 'nonpayable'
    }],
    functionName: 'transfer',
    args: [to as `0x${string}`, BigInt(amount)]
  });
};

/**
 * Simulate transaction using Alchemy's simulation API
 */
export const simulateTransaction = async (params: TransactionParams): Promise<SimulationResult> => {
  try {
    // Get current gas prices
    const gasPrices = await getCurrentGasPrices();
    
    // For ETH transfers, use standard gas limit
    const gasLimit = params.tokenAddress ? '100000' : '21000';
    
    // Build basic asset changes for ETH transfers (skip Alchemy simulation to avoid rate limits)
    const assetChanges: AssetChange[] = [];
    
    if (!params.tokenAddress) {
      // ETH transfer
      assetChanges.push({
        address: params.from,
        tokenAddress: null,
        amount: `-${params.value}`,
        decimals: 18,
        symbol: 'ETH',
        name: 'Ethereum',
        logo: null
      });
      assetChanges.push({
        address: params.to,
        tokenAddress: null,
        amount: params.value,
        decimals: 18,
        symbol: 'ETH',
        name: 'Ethereum',
        logo: null
      });
    }

    // Generate warnings
    const warnings = generateTransactionWarnings(params, gasLimit, gasPrices.maxFeePerGas);

    return {
      assetChanges,
      gasUsed: gasLimit,
      gasLimit: gasLimit,
      maxFeePerGas: gasPrices.maxFeePerGas,
      maxPriorityFeePerGas: gasPrices.maxPriorityFeePerGas,
      success: true,
      warnings
    };

  } catch (error) {
    console.error('Transaction simulation failed:', error);
    
    const gasPrices = await getCurrentGasPrices();
    
    return {
      assetChanges: [],
      gasUsed: '21000',
      gasLimit: '21000',
      maxFeePerGas: gasPrices.maxFeePerGas,
      maxPriorityFeePerGas: gasPrices.maxPriorityFeePerGas,
      error: error instanceof Error ? error.message : 'Simulation failed',
      success: false,
      warnings: [{
        type: 'network-congestion',
        message: 'Unable to simulate transaction. Network may be congested.',
        severity: 'warning'
      }]
    };
  }
};

/**
 * Generate transaction warnings based on simulation results
 */
const generateTransactionWarnings = (
  params: TransactionParams, 
  gasUsed: string, 
  maxFeePerGas: string
): TransactionWarning[] => {
  const warnings: TransactionWarning[] = [];
  
  // Calculate gas cost in wei
  const gasCostWei = BigInt(gasUsed) * BigInt(maxFeePerGas);
  const gasCostEth = formatEther(gasCostWei);
  
  // High gas warning (>$10 USD assuming $1900 ETH)
  if (parseFloat(gasCostEth) > 0.005) {
    warnings.push({
      type: 'high-gas',
      message: `High network fee: ~${parseFloat(gasCostEth).toFixed(4)} ETH`,
      severity: 'warning'
    });
  }
  
  // Large amount warning (>1 ETH for native transfers)
  if (!params.tokenAddress) {
    const valueEth = formatEther(BigInt(params.value));
    if (parseFloat(valueEth) > 1) {
      warnings.push({
        type: 'large-amount',
        message: `Large transfer: ${parseFloat(valueEth).toFixed(4)} ETH`,
        severity: 'warning'
      });
    }
  }
  
  // Unknown contract warning
  if (params.data && params.data !== '0x') {
    warnings.push({
      type: 'unknown-contract',
      message: 'Interacting with smart contract',
      severity: 'warning'
    });
  }
  
  return warnings;
};

/**
 * Convert gas amounts to USD estimates
 */
export const convertGasToUSD = async (gasWei: string, ethPriceUSD: number = 1900): Promise<string> => {
  try {
    const gasEth = formatEther(BigInt(gasWei));
    const gasUSD = parseFloat(gasEth) * ethPriceUSD;
    return gasUSD.toFixed(2);
  } catch (error) {
    return '0.00';
  }
};

/**
 * Format asset change for display
 */
export const formatAssetChange = (change: AssetChange): {
  formattedAmount: string;
  isPositive: boolean;
  symbol: string;
} => {
  try {
    const amount = formatEther(BigInt(change.amount) * BigInt(10 ** (18 - change.decimals)));
    const isPositive = !amount.startsWith('-');
    const formattedAmount = isPositive ? amount : amount.slice(1); // Remove negative sign
    
    return {
      formattedAmount: parseFloat(formattedAmount).toFixed(6),
      isPositive,
      symbol: change.symbol || (change.tokenAddress ? 'TOKEN' : 'ETH')
    };
  } catch (error) {
    return {
      formattedAmount: '0',
      isPositive: true,
      symbol: change.symbol || 'ETH'
    };
  }
};

/**
 * Get the wallet's private key from secure storage
 */
const getPrivateKeyFromSecureStorage = async (): Promise<string> => {
  try {
    const credentials = await Keychain.getInternetCredentials('blirpme_wallet');
    if (!credentials || !credentials.password) {
      throw new Error('No wallet found in secure storage');
    }
    return credentials.password; // The private key is stored as the password
  } catch (error) {
    console.error('Failed to retrieve private key:', error);
    throw new Error('No wallet found in secure storage');
  }
};

/**
 * Get the current nonce for an address
 */
const getCurrentNonce = async (address: string): Promise<number> => {
  try {
    const nonce = await getTransactionCount(config, {
      address: address as `0x${string}`,
      blockTag: 'pending' // Include pending transactions
    });
    
    return Number(nonce);
  } catch (error) {
    console.error('Failed to get nonce:', error);
    throw new Error('Unable to get transaction nonce');
  }
};

/**
 * Sign a transaction with the wallet's private key
 */
export const signTransaction = async (
  params: TransactionParams,
  simulationResult: SimulationResult
): Promise<SignedTransaction> => {
  try {
    // Get the private key from secure storage
    const privateKey = await getPrivateKeyFromSecureStorage();
    const account = privateKeyToAccount(privateKey as `0x${string}`);
    
    // Get current nonce
    const nonce = await getCurrentNonce(params.from);
    
    // Build transaction object
    let transaction: any = {
      to: params.to as `0x${string}`,
      value: BigInt(params.value),
      nonce,
      gas: BigInt(simulationResult.gasLimit),
      maxFeePerGas: BigInt(simulationResult.maxFeePerGas),
      maxPriorityFeePerGas: BigInt(simulationResult.maxPriorityFeePerGas),
      type: 'eip1559' as const,
      chainId: 1 // Ethereum mainnet
    };
    
    // Handle ERC-20 token transfers
    if (params.tokenAddress && params.tokenAmount) {
      transaction.to = params.tokenAddress as `0x${string}`;
      transaction.value = BigInt(0);
      transaction.data = buildERC20TransferData(params.to, params.tokenAmount) as `0x${string}`;
    }
    
    // Sign the transaction with viem
    const signedTx = await account.signTransaction(transaction);
    const parsedTx = parseTransaction(signedTx);
    
    return {
      hash: parsedTx.hash!,
      rawTransaction: signedTx,
      from: params.from,
      to: params.to,
      value: params.value,
      gasLimit: simulationResult.gasLimit,
      maxFeePerGas: simulationResult.maxFeePerGas,
      maxPriorityFeePerGas: simulationResult.maxPriorityFeePerGas,
      nonce
    };
  } catch (error) {
    console.error('Transaction signing failed:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to sign transaction');
  }
};

/**
 * Broadcast a signed transaction to the network via Alchemy
 */
export const broadcastTransaction = async (
  signedTransaction: SignedTransaction
): Promise<string> => {
  try {
    const hash = await sendRawTransaction(config, {
      serializedTransaction: signedTransaction.rawTransaction as `0x${string}`
    });
    
    return hash;
  } catch (error) {
    console.error('Transaction broadcast failed:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to broadcast transaction');
  }
};

/**
 * Wait for a transaction to be mined and get its receipt
 */
export const waitForTransaction = async (
  transactionHash: string,
  confirmations: number = 1
): Promise<TransactionReceipt> => {
  try {
    const receipt = await waitForTransactionReceipt(config, {
      hash: transactionHash as `0x${string}`,
      confirmations
    });
    
    return {
      transactionHash: receipt.transactionHash,
      blockNumber: Number(receipt.blockNumber),
      blockHash: receipt.blockHash,
      from: receipt.from,
      to: receipt.to || '',
      gasUsed: receipt.gasUsed.toString(),
      effectiveGasPrice: receipt.effectiveGasPrice.toString(),
      status: receipt.status === 'success' ? 1 : 0,
      logs: receipt.logs
    };
  } catch (error) {
    console.error('Failed to get transaction receipt:', error);
    throw new Error('Failed to confirm transaction');
  }
};

/**
 * Complete transaction flow: simulate, sign, and broadcast
 */
export const executeTransaction = async (
  params: TransactionParams,
  requireBiometric: boolean = true
): Promise<{
  transactionHash: string;
  receipt?: TransactionReceipt;
}> => {
  try {
    // Step 1: Simulate the transaction
    const simulation = await simulateTransaction(params);
    if (!simulation.success) {
      throw new Error(simulation.error || 'Transaction simulation failed');
    }
    
    // Step 2: Request biometric authentication if required
    if (requireBiometric) {
      const biometricAuth = await Keychain.getInternetCredentials('blirpme_wallet', {
        authenticationPrompt: {
          title: 'Confirm Transaction',
          subtitle: 'Authenticate to sign this transaction',
          description: `Sending ${formatEther(BigInt(params.value))} ETH`,
          cancel: 'Cancel'
        }
      });
      
      if (!biometricAuth) {
        throw new Error('Biometric authentication failed');
      }
    }
    
    // Step 3: Sign the transaction
    const signedTx = await signTransaction(params, simulation);
    
    // Step 4: Broadcast the transaction
    const txHash = await broadcastTransaction(signedTx);
    
    return {
      transactionHash: txHash
    };
  } catch (error) {
    console.error('Transaction execution failed:', error);
    throw error;
  }
};