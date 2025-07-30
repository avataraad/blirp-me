import Config from 'react-native-config';
import { encodeFunctionData, formatEther, formatGwei, parseGwei, parseTransaction, createWalletClient, http } from 'viem';
import { estimateFeesPerGas, getTransactionCount, waitForTransactionReceipt, getPublicClient } from '@wagmi/core';
import { privateKeyToAccount } from 'viem/accounts';
import { config } from '../config/wagmi';
import { mainnet } from '@wagmi/core/chains';
import { TypedDataDomain, TypedDataField } from 'viem';
import * as Keychain from 'react-native-keychain';

// Alchemy API configuration (kept for reference)
// const ALCHEMY_API_KEY = Config.ALCHEMY_API_KEY;
// const ALCHEMY_RPC_URL = Config.ALCHEMY_RPC_URL;

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
    const publicClient = getPublicClient(config, { chainId: 1 });
    if (!publicClient) {
      throw new Error('Failed to get public client');
    }
    
    // Get current gas price from the network
    const gasPrice = await publicClient.getGasPrice();
    
    // For EIP-1559, estimate fees
    const block = await publicClient.getBlock();
    const baseFeePerGas = block.baseFeePerGas || gasPrice;
    
    // Calculate maxPriorityFeePerGas (tip) - typically 1-2 gwei
    const maxPriorityFeePerGas = parseGwei('1').toString();
    
    // Calculate maxFeePerGas = (2 * baseFee) + maxPriorityFeePerGas
    const maxFeePerGas = (baseFeePerGas * 2n + BigInt(maxPriorityFeePerGas)).toString();
    
    console.log('Current gas prices:', {
      baseFeePerGas: formatGwei(baseFeePerGas),
      maxPriorityFeePerGas: formatGwei(BigInt(maxPriorityFeePerGas)),
      maxFeePerGas: formatGwei(BigInt(maxFeePerGas)),
      gasPrice: formatGwei(gasPrice)
    });
    
    return {
      maxFeePerGas,
      maxPriorityFeePerGas,
      gasPrice: gasPrice.toString()
    };
  } catch (error) {
    console.error('Failed to get gas prices:', error);
    // Use more reasonable fallback gas prices (5 gwei base, 1 gwei priority)
    return {
      maxFeePerGas: parseGwei('5').toString(),
      maxPriorityFeePerGas: parseGwei('1').toString(),
      gasPrice: parseGwei('5').toString()
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
 * Estimate gas for a transaction using eth_estimateGas
 */
export const estimateTransactionGas = async (params: {
  from: string;
  to: string;
  value?: string;
  data?: string;
}): Promise<string> => {
  try {
    const publicClient = getPublicClient(config, { chainId: 1 });
    if (!publicClient) {
      throw new Error('Failed to get public client');
    }
    
    const gasEstimate = await publicClient.estimateGas({
      account: params.from as `0x${string}`,
      to: params.to as `0x${string}`,
      value: params.value ? BigInt(params.value) : undefined,
      data: params.data as `0x${string}` | undefined,
    });
    
    // Add 10% buffer to gas estimate
    const bufferedGas = (gasEstimate * 110n) / 100n;
    return bufferedGas.toString();
  } catch (error) {
    console.error('Gas estimation failed:', error);
    // Return reasonable defaults
    return params.data ? '150000' : '21000';
  }
};

/**
 * Simulate transaction using Alchemy's simulation API
 */
export const simulateTransaction = async (params: TransactionParams): Promise<SimulationResult> => {
  try {
    // Get current gas prices
    const gasPrices = await getCurrentGasPrices();
    
    // Estimate gas using Alchemy's eth_estimateGas
    let gasLimit: string;
    if (params.data) {
      // For contract interactions, use eth_estimateGas
      gasLimit = await estimateTransactionGas({
        from: params.from,
        to: params.to,
        value: params.value,
        data: params.data
      });
    } else if (params.tokenAddress) {
      // For token transfers, build the data and estimate
      const transferData = buildERC20TransferData(params.to, params.tokenAmount!);
      gasLimit = await estimateTransactionGas({
        from: params.from,
        to: params.tokenAddress,
        value: '0',
        data: transferData
      });
    } else {
      // For ETH transfers, use standard gas limit
      gasLimit = '21000';
    }
    
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
 * Get the wallet's private key from secure storage with biometric authentication
 */
const getPrivateKeyFromSecureStorage = async (params: TransactionParams): Promise<string> => {
  try {
    // First, try to check if credentials exist without biometric prompt
    console.log('Checking for wallet credentials...');
    
    // Format transaction details for the authentication prompt
    let promptDescription: string;
    
    console.log('Transaction params for keychain:', {
      from: params.from,
      to: params.to,
      value: params.value,
      hasData: !!params.data,
      dataLength: params.data?.length
    });
    
    // Check if this is an approval transaction (value is 0 and has data)
    if (params.value === '0' && params.data && params.data.startsWith('0x095ea7b3')) {
      const tokenDisplay = params.to ? (params.to.slice(0, 6) + '...' + params.to.slice(-4)) : 'Unknown';
      promptDescription = `Approve token spending for ${tokenDisplay}`;
    } else {
      const amountEth = formatEther(BigInt(params.value || '0'));
      const recipientDisplay = params.to ? (params.to.slice(0, 6) + '...' + params.to.slice(-4)) : 'Unknown';
      promptDescription = `Sending ${amountEth} ETH to ${recipientDisplay}`;
    }
    
    const credentials = await Keychain.getInternetCredentials(
      'blirpme_wallet',
      {
        authenticationPrompt: {
          title: 'Confirm Transaction',
          subtitle: 'Authenticate to sign transaction',
          description: promptDescription,
          cancel: 'Cancel'
        }
      }
    );
    
    console.log('Keychain credentials retrieved:', {
      hasCredentials: !!credentials,
      hasPassword: !!(credentials && credentials.password),
      passwordLength: credentials?.password?.length || 0
    });
    
    if (!credentials || !credentials.password) {
      throw new Error('No wallet found in secure storage');
    }
    
    // Ensure the private key is properly formatted
    let privateKey = credentials.password;
    if (!privateKey.startsWith('0x')) {
      privateKey = '0x' + privateKey;
    }
    
    return privateKey;
  } catch (error) {
    console.error('Failed to retrieve private key:', error);
    if (error.message?.includes('UserCancel')) {
      throw new Error('Transaction cancelled by user');
    }
    throw new Error('Biometric authentication failed');
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
    // Get the private key from secure storage with biometric auth
    const privateKey = await getPrivateKeyFromSecureStorage(params);
    
    if (!privateKey) {
      throw new Error('Failed to retrieve private key from secure storage');
    }
    
    console.log('Private key format check:', {
      hasPrivateKey: !!privateKey,
      startsWithHex: privateKey.startsWith('0x'),
      length: privateKey.length
    });
    
    const account = privateKeyToAccount(privateKey as `0x${string}`);
    
    console.log('Transaction signing details:', {
      fromParam: params.from,
      derivedAddress: account.address,
      toAddress: params.to,
      hasData: !!params.data,
      dataPreview: params.data?.slice(0, 10)
    });
    
    // Verify the account address matches the expected from address
    if (account.address.toLowerCase() !== params.from.toLowerCase()) {
      throw new Error(`Account mismatch: derived ${account.address}, expected ${params.from}`);
    }
    
    // Get current nonce
    const nonce = await getCurrentNonce(params.from);
    
    // Build transaction object
    // Note: Do NOT include 'from' field when using account.signTransaction()
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
    
    // Include data field if provided
    if (params.data) {
      transaction.data = params.data as `0x${string}`;
    }
    
    // Handle ERC-20 token transfers (override data if needed)
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
 * Broadcast a signed transaction to the network
 */
export const broadcastTransaction = async (
  signedTransaction: SignedTransaction
): Promise<string> => {
  try {
    // Get the public client from wagmi config
    const publicClient = getPublicClient(config, { chainId: mainnet.id });
    
    if (!publicClient) {
      throw new Error('Public client not available');
    }
    
    // Send the raw transaction using viem's sendRawTransaction
    const hash = await publicClient.sendRawTransaction({
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
 * Sign EIP-712 typed data for Bungee transactions
 */
export const signTypedData = async (
  domain: TypedDataDomain,
  types: Record<string, TypedDataField[]>,
  values: Record<string, any>,
  userAddress: string
): Promise<string> => {
  try {
    // Get the private key from secure storage with biometric auth
    const privateKey = await getPrivateKeyFromSecureStorage({ 
      from: userAddress,
      to: userAddress,
      value: '0' 
    });
    
    const account = privateKeyToAccount(privateKey as `0x${string}`);
    
    // Create a wallet client for signing
    const walletClient = createWalletClient({
      account,
      chain: mainnet,
      transport: http()
    });
    
    // For Permit2, the primary type is typically 'PermitWitnessTransferFrom'
    let primaryType = Object.keys(types).find(type => 
      type === 'PermitWitnessTransferFrom' || 
      type === 'PermitTransferFrom'
    );
    
    // Fallback to finding any non-EIP712Domain type
    if (!primaryType) {
      primaryType = Object.keys(types).find(type => type !== 'EIP712Domain') || Object.keys(types)[0];
    }
    
    console.log('Signing typed data with primary type:', primaryType);
    
    // Sign the typed data
    const signature = await walletClient.signTypedData({
      domain,
      types,
      primaryType,
      message: values
    });
    
    console.log('EIP-712 signature generated:', signature);
    return signature;
  } catch (error) {
    console.error('Failed to sign typed data:', error);
    throw new Error('Failed to sign transaction data: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
};

/**
 * Complete transaction flow: simulate, sign, and broadcast
 */
export const executeTransaction = async (
  params: TransactionParams
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
    
    // Step 2: Sign the transaction (biometric auth happens inside signTransaction)
    const signedTx = await signTransaction(params, simulation);
    
    // Step 3: Broadcast the transaction
    const txHash = await broadcastTransaction(signedTx);
    
    return {
      transactionHash: txHash
    };
  } catch (error) {
    console.error('Transaction execution failed:', error);
    throw error;
  }
};