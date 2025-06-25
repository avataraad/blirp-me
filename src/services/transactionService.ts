import axios from 'axios';
import Config from 'react-native-config';
import { ethers } from 'ethers';
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
 * Get current gas prices from Alchemy
 */
export const getCurrentGasPrices = async (): Promise<{
  maxFeePerGas: string;
  maxPriorityFeePerGas: string;
  gasPrice: string;
}> => {
  try {
    const response = await axios.post(ALCHEMY_RPC_URL, {
      id: 1,
      jsonrpc: '2.0',
      method: 'eth_feeHistory',
      params: [
        '0x1', // 1 block
        'latest',
        [50] // 50th percentile
      ]
    });

    const feeHistory = response.data.result;
    const baseFeePerGas = parseInt(feeHistory.baseFeePerGas?.[0] || '0x4a817c800', 16);
    const priorityFee = parseInt(feeHistory.reward?.[0]?.[0] || '0x77359400', 16);
    
    // Add 10% buffer to priority fee
    const maxPriorityFeePerGas = Math.floor(priorityFee * 1.1);
    const maxFeePerGas = baseFeePerGas * 2 + maxPriorityFeePerGas;

    return {
      maxFeePerGas: maxFeePerGas.toString(),
      maxPriorityFeePerGas: maxPriorityFeePerGas.toString(),
      gasPrice: maxFeePerGas.toString()
    };
  } catch (error) {
    console.error('Failed to get gas prices:', error);
    // Fallback gas prices (in wei)
    return {
      maxFeePerGas: '20000000000', // 20 gwei
      maxPriorityFeePerGas: '2000000000', // 2 gwei
      gasPrice: '20000000000'
    };
  }
};

/**
 * Build transaction data for ERC-20 token transfer
 */
const buildERC20TransferData = (to: string, amount: string): string => {
  const transferInterface = new ethers.utils.Interface([
    'function transfer(address to, uint256 amount) returns (bool)'
  ]);
  
  return transferInterface.encodeFunctionData('transfer', [to, amount]);
};

/**
 * Simulate transaction using Alchemy's simulation API
 */
export const simulateTransaction = async (params: TransactionParams): Promise<SimulationResult> => {
  try {
    // Get current gas prices
    const gasPrices = await getCurrentGasPrices();
    
    // Build transaction object
    let transaction: any = {
      from: params.from,
      to: params.to,
      value: params.value,
      maxFeePerGas: gasPrices.maxFeePerGas,
      maxPriorityFeePerGas: gasPrices.maxPriorityFeePerGas
    };

    // Handle ERC-20 token transfers
    if (params.tokenAddress && params.tokenAmount) {
      transaction.to = params.tokenAddress;
      transaction.value = '0x0'; // No ETH value for token transfers
      transaction.data = buildERC20TransferData(params.to, params.tokenAmount);
    }

    // Call Alchemy simulation API
    const response = await axios.post(ALCHEMY_RPC_URL, {
      id: 1,
      jsonrpc: '2.0',
      method: 'alchemy_simulateAssetChanges',
      params: [{
        ...transaction,
        gas: '0x5208' // 21000 gas limit for estimation
      }]
    });

    if (response.data.error) {
      return {
        assetChanges: [],
        gasUsed: '21000',
        gasLimit: '21000',
        maxFeePerGas: gasPrices.maxFeePerGas,
        maxPriorityFeePerGas: gasPrices.maxPriorityFeePerGas,
        error: response.data.error.message,
        success: false,
        warnings: [{
          type: 'insufficient-balance',
          message: response.data.error.message,
          severity: 'error'
        }]
      };
    }

    const result = response.data.result;
    
    // Estimate gas usage more accurately
    const gasEstimateResponse = await axios.post(ALCHEMY_RPC_URL, {
      id: 2,
      jsonrpc: '2.0',
      method: 'eth_estimateGas',
      params: [transaction]
    });

    const gasUsed = gasEstimateResponse.data.result ? 
      parseInt(gasEstimateResponse.data.result, 16).toString() : '21000';

    // Process asset changes
    const assetChanges: AssetChange[] = result.changes?.map((change: any) => ({
      address: change.address,
      tokenAddress: change.assetType === 'NATIVE' ? null : change.contractAddress,
      amount: change.amount,
      decimals: change.decimals || 18,
      symbol: change.symbol,
      name: change.name,
      logo: change.logo
    })) || [];

    // Generate warnings
    const warnings = generateTransactionWarnings(params, gasUsed, gasPrices.maxFeePerGas);

    return {
      assetChanges,
      gasUsed,
      gasLimit: Math.floor(parseInt(gasUsed) * 1.2).toString(), // 20% buffer
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
  const gasCostWei = ethers.BigNumber.from(gasUsed).mul(ethers.BigNumber.from(maxFeePerGas));
  const gasCostEth = ethers.utils.formatEther(gasCostWei);
  
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
    const valueEth = ethers.utils.formatEther(params.value);
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
    const gasEth = ethers.utils.formatEther(gasWei);
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
    const amount = ethers.utils.formatUnits(change.amount, change.decimals);
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
    const response = await axios.post(ALCHEMY_RPC_URL, {
      id: 1,
      jsonrpc: '2.0',
      method: 'eth_getTransactionCount',
      params: [address, 'pending'] // Use 'pending' to include pending transactions
    });
    
    return parseInt(response.data.result, 16);
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
    const wallet = new ethers.Wallet(privateKey);
    
    // Get current nonce
    const nonce = await getCurrentNonce(params.from);
    
    // Build transaction object (note: don't include 'from' field)
    let transaction: ethers.providers.TransactionRequest = {
      to: params.to,
      value: ethers.BigNumber.from(params.value),
      nonce,
      gasLimit: ethers.BigNumber.from(simulationResult.gasLimit),
      maxFeePerGas: ethers.BigNumber.from(simulationResult.maxFeePerGas),
      maxPriorityFeePerGas: ethers.BigNumber.from(simulationResult.maxPriorityFeePerGas),
      type: 2, // EIP-1559 transaction
      chainId: 1 // Ethereum mainnet
    };
    
    // Handle ERC-20 token transfers
    if (params.tokenAddress && params.tokenAmount) {
      transaction.to = params.tokenAddress;
      transaction.value = ethers.BigNumber.from(0);
      transaction.data = buildERC20TransferData(params.to, params.tokenAmount);
    }
    
    // Sign the transaction
    const signedTx = await wallet.signTransaction(transaction);
    const parsedTx = ethers.utils.parseTransaction(signedTx);
    
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
    const response = await axios.post(ALCHEMY_RPC_URL, {
      id: 1,
      jsonrpc: '2.0',
      method: 'eth_sendRawTransaction',
      params: [signedTransaction.rawTransaction]
    });
    
    if (response.data.error) {
      throw new Error(response.data.error.message);
    }
    
    return response.data.result; // Transaction hash
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
    const provider = new ethers.providers.JsonRpcProvider(ALCHEMY_RPC_URL);
    const receipt = await provider.waitForTransaction(transactionHash, confirmations);
    
    return {
      transactionHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      blockHash: receipt.blockHash,
      from: receipt.from,
      to: receipt.to,
      gasUsed: receipt.gasUsed.toString(),
      effectiveGasPrice: receipt.effectiveGasPrice.toString(),
      status: receipt.status!,
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
          description: `Sending ${ethers.utils.formatEther(params.value)} ETH`,
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