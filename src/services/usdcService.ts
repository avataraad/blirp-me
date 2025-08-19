import { getBalance, readContract } from '@wagmi/core';
import { config } from '../config/wagmi';
import { formatUnits, parseUnits } from 'viem';
import { PORTO_CONFIG } from '../config/porto-config';

// USDC Contract ABI (minimal - just what we need)
const USDC_ABI = [
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// USDC addresses on different chains
const USDC_ADDRESSES = {
  8453: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // Base Mainnet
  84532: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // Base Sepolia
} as const;

class USDCService {
  /**
   * Get USDC balance for an address on a specific chain
   */
  async getUSDCBalance(address: string, chainId: number = 8453): Promise<string> {
    try {
      const usdcAddress = USDC_ADDRESSES[chainId as keyof typeof USDC_ADDRESSES];
      if (!usdcAddress) {
        console.error('USDC address not found for chain:', chainId);
        return '0.00';
      }

      // Read balance from USDC contract
      const balance = await readContract(config, {
        address: usdcAddress as `0x${string}`,
        abi: USDC_ABI,
        functionName: 'balanceOf',
        args: [address as `0x${string}`],
        chainId: chainId as any,
      });

      // USDC has 6 decimals
      return formatUnits(balance, 6);
    } catch (error) {
      console.error('Error fetching USDC balance:', error);
      return '0.00';
    }
  }

  /**
   * Format USDC amount for display (2 decimal places)
   */
  formatUSDCAmount(amount: string): string {
    const num = parseFloat(amount);
    if (isNaN(num)) return '0.00';
    return num.toFixed(2);
  }

  /**
   * Check if user has enough USDC for gas
   */
  async hasEnoughUSDCForGas(
    address: string,
    estimatedGas: string,
    chainId: number = 8453
  ): Promise<boolean> {
    try {
      const balance = await this.getUSDCBalance(address, chainId);
      const balanceNum = parseFloat(balance);
      const gasNum = parseFloat(estimatedGas);
      
      // Add 10% buffer for safety
      const requiredAmount = gasNum * 1.1;
      
      return balanceNum >= requiredAmount;
    } catch (error) {
      console.error('Error checking USDC gas sufficiency:', error);
      return false;
    }
  }

  /**
   * Get USDC price (for now, assume 1 USDC = 1 USD)
   */
  async getUSDCPrice(): Promise<number> {
    // USDC is a stablecoin pegged to USD
    // In production, you might want to fetch the actual price
    // from an oracle or price feed
    return 1.0;
  }

  /**
   * Convert USDC amount to USD
   */
  async convertUSDCToUSD(usdcAmount: string): Promise<number> {
    const amount = parseFloat(usdcAmount);
    const price = await this.getUSDCPrice();
    return amount * price;
  }

  /**
   * Estimate USDC gas cost for a transaction
   * This is a placeholder - actual gas estimation should come from Porto RPC
   */
  estimateUSDCGasCost(gasUnits: bigint, gasPriceGwei: bigint): string {
    // Porto handles gas estimation internally
    // This is just for display purposes
    // Typical USDC gas cost on Base is around $0.01 - $0.10
    return '0.05'; // Default estimate
  }

  /**
   * Parse USDC amount from user input
   */
  parseUSDCAmount(input: string): string {
    try {
      const amount = parseFloat(input);
      if (isNaN(amount) || amount < 0) return '0';
      
      // Convert to 6 decimal precision
      return parseUnits(amount.toString(), 6).toString();
    } catch (error) {
      console.error('Error parsing USDC amount:', error);
      return '0';
    }
  }

  /**
   * Get minimum USDC balance required for transactions
   */
  getMinimumUSDCBalance(): string {
    // Minimum to cover basic transaction gas
    return '0.10'; // $0.10 USDC
  }

  /**
   * Check if USDC balance is low (warning threshold)
   */
  isLowBalance(balance: string): boolean {
    const balanceNum = parseFloat(balance);
    const threshold = 1.0; // Warn if below $1 USDC
    return balanceNum < threshold;
  }
}

export default new USDCService();