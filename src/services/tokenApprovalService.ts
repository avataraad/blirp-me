/**
 * Token approval service for ERC20 tokens
 * Handles checking and creating approval transactions
 */

import { encodeFunctionData, parseAbi, Address } from 'viem';
import { getPublicClient } from '@wagmi/core';
import { config } from '../config/wagmi';

// ERC20 ABI for approval functions
export const ERC20_ABI = parseAbi([
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
]);

export interface ApprovalData {
  tokenAddress: Address;
  userAddress: Address;
  spenderAddress: Address;
  amount: bigint;
}

export interface ApprovalTransaction {
  to: Address;
  data: `0x${string}`;
  chainId: number;
  value: string;
}

/**
 * Check if token approval is needed
 * @param approvalData - Approval data containing addresses and amount
 * @returns Current allowance amount
 */
export const checkAllowance = async (
  approvalData: ApprovalData
): Promise<bigint> => {
  try {
    const publicClient = getPublicClient(config);
    if (!publicClient) {
      throw new Error('Public client not available');
    }
    
    const currentAllowance = await publicClient.readContract({
      address: approvalData.tokenAddress,
      abi: ERC20_ABI,
      functionName: 'allowance',
      args: [approvalData.userAddress, approvalData.spenderAddress],
    });
    
    console.log('Current allowance:', {
      token: approvalData.tokenAddress,
      owner: approvalData.userAddress,
      spender: approvalData.spenderAddress,
      currentAllowance: currentAllowance.toString(),
      requiredAmount: approvalData.amount.toString(),
      needsApproval: currentAllowance < approvalData.amount
    });
    
    return currentAllowance;
  } catch (error) {
    console.error('Error checking allowance:', error);
    throw new Error('Failed to check token allowance');
  }
};

/**
 * Build approval transaction if needed
 * @param chainId - Chain ID for the transaction
 * @param approvalData - Approval data containing addresses and amount
 * @returns Approval transaction or null if not needed
 */
export const buildApprovalTransaction = async (
  chainId: number,
  approvalData: ApprovalData
): Promise<ApprovalTransaction | null> => {
  try {
    // Check current allowance
    const currentAllowance = await checkAllowance(approvalData);
    
    // If allowance is sufficient, no approval needed
    if (currentAllowance >= approvalData.amount) {
      console.log('Sufficient allowance, no approval needed');
      return null;
    }
    
    // Create approval transaction data
    const data = encodeFunctionData({
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [approvalData.spenderAddress, approvalData.amount],
    });
    
    const approvalTx: ApprovalTransaction = {
      to: approvalData.tokenAddress,
      data,
      chainId: chainId,
      value: '0x00',
    };
    
    console.log('Built approval transaction:', {
      to: approvalTx.to,
      data: approvalTx.data,
      chainId: approvalTx.chainId,
      amount: approvalData.amount.toString()
    });
    
    return approvalTx;
  } catch (error) {
    console.error('Error building approval transaction:', error);
    throw new Error('Failed to build approval transaction');
  }
};

/**
 * Check if a token needs approval for trading
 * @param tokenAddress - Token contract address
 * @param ownerAddress - Token owner address
 * @param spenderAddress - Spender contract address
 * @param amount - Amount to check
 * @returns Whether approval is needed
 */
export const needsApproval = async (
  tokenAddress: Address,
  ownerAddress: Address,
  spenderAddress: Address,
  amount: bigint
): Promise<boolean> => {
  try {
    console.log('needsApproval called with:', {
      tokenAddress,
      ownerAddress,
      spenderAddress,
      amount: amount.toString()
    });
    const currentAllowance = await checkAllowance({
      tokenAddress,
      userAddress: ownerAddress,
      spenderAddress,
      amount
    });
    
    const needsApproval = currentAllowance < amount;
    console.log('needsApproval result:', {
      currentAllowance: currentAllowance.toString(),
      requiredAmount: amount.toString(),
      needsApproval
    });
    
    return needsApproval;
  } catch (error) {
    console.error('Error checking approval need:', error);
    // Assume approval is needed if we can't check
    return true;
  }
};