/**
 * Token service for fetching token metadata and balances
 * Integrates with Moralis API and the verified token list
 */

import { ETHEREUM_MAINNET_TOKENS, BASE_MAINNET_TOKENS, VerifiedToken, getTokensByChainId } from '../config/tokens';
import { TokenBalance, getWalletBalances } from './balance';
import { SupportedChainId } from '../config/chains';

export interface TokenWithBalance extends VerifiedToken {
  balance: string;
  balanceFormatted: string;
  usdValue: number | null;
  usdPrice: number | null;
  priceChange24h: number | null;
}

/**
 * Get all verified tokens with their balances for a wallet
 * @param walletAddress The wallet address to check
 * @param chains Array of chain IDs to query (optional)
 * @returns Array of tokens with balance information
 */
export const getVerifiedTokensWithBalances = async (
  walletAddress: string,
  chains?: SupportedChainId[]
): Promise<TokenWithBalance[]> => {
  try {
    // Fetch all balances from Moralis for enabled chains
    const walletData = await getWalletBalances(walletAddress, chains || [1, 8453]);
    const moralisTokens = walletData.tokens;
    
    // Get all verified tokens for the chains
    const allVerifiedTokens: VerifiedToken[] = [];
    if (!chains || chains.length === 0) {
      // Default to all chains
      allVerifiedTokens.push(...ETHEREUM_MAINNET_TOKENS, ...BASE_MAINNET_TOKENS);
    } else {
      // Get tokens for specific chains
      chains.forEach(chainId => {
        allVerifiedTokens.push(...getTokensByChainId(chainId));
      });
    }
    
    // Map verified tokens with their balance data
    const tokensWithBalances: TokenWithBalance[] = allVerifiedTokens.map(verifiedToken => {
      // Find matching token from Moralis data
      const moralisToken = moralisTokens.find(t => {
        if (verifiedToken.isNative) {
          return t.native_token || t.token_address === null;
        }
        return t.token_address?.toLowerCase() === verifiedToken.address.toLowerCase();
      });
      
      return {
        ...verifiedToken,
        balance: moralisToken?.balance || '0',
        balanceFormatted: moralisToken?.balance_formatted || '0',
        usdValue: moralisToken?.usd_value || 0,
        usdPrice: moralisToken?.usd_price || null,
        priceChange24h: moralisToken?.usd_price_24hr_percent_change || null
      };
    });
    
    return tokensWithBalances;
  } catch (error) {
    console.error('Failed to get verified tokens with balances:', error);
    // Return tokens with zero balances on error
    return ETHEREUM_MAINNET_TOKENS.map(token => ({
      ...token,
      balance: '0',
      balanceFormatted: '0',
      usdValue: 0,
      usdPrice: null,
      priceChange24h: null
    }));
  }
};

/**
 * Sort tokens by balance (USD value) and then by market cap
 * @param tokens Array of tokens with balance
 * @returns Sorted array of tokens
 */
export const sortTokensByBalanceAndMarketCap = (
  tokens: TokenWithBalance[]
): TokenWithBalance[] => {
  return [...tokens].sort((a, b) => {
    // First sort by USD value (tokens with balance come first)
    if (a.usdValue && b.usdValue) {
      return b.usdValue - a.usdValue;
    }
    if (a.usdValue && !b.usdValue) return -1;
    if (!a.usdValue && b.usdValue) return 1;
    
    // Then sort by market cap (using a predefined order for now)
    // In a real implementation, you'd fetch market cap data
    const marketCapOrder = ['ETH', 'USDC', 'stETH', 'cbBTC'];
    const aIndex = marketCapOrder.indexOf(a.symbol);
    const bIndex = marketCapOrder.indexOf(b.symbol);
    
    if (aIndex !== -1 && bIndex !== -1) {
      return aIndex - bIndex;
    }
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    
    return 0;
  });
};

/**
 * Get a specific token with balance information
 * @param walletAddress The wallet address
 * @param tokenAddress The token contract address (or 'ETH' for native)
 * @returns Token with balance or undefined
 */
export const getTokenWithBalance = async (
  walletAddress: string,
  tokenAddress: string
): Promise<TokenWithBalance | undefined> => {
  const allTokens = await getVerifiedTokensWithBalances(walletAddress);
  
  if (tokenAddress.toLowerCase() === 'eth' || tokenAddress === '0x0000000000000000000000000000000000000000') {
    return allTokens.find(t => t.isNative);
  }
  
  return allTokens.find(t => t.address.toLowerCase() === tokenAddress.toLowerCase());
};

/**
 * Format token amount for display
 * @param amount The raw amount (in smallest unit)
 * @param decimals Token decimals
 * @param maxDecimals Maximum decimals to show
 * @returns Formatted amount string
 */
export const formatTokenAmount = (
  amount: string,
  decimals: number,
  maxDecimals: number = 6
): string => {
  try {
    const divisor = Math.pow(10, decimals);
    const value = parseFloat(amount) / divisor;
    
    if (value === 0) return '0';
    if (value < 0.000001) return value.toExponential(2);
    
    // Dynamic decimal places based on value
    if (value > 1000) return value.toFixed(2);
    if (value > 10) return value.toFixed(4);
    
    return value.toFixed(maxDecimals);
  } catch (error) {
    return '0';
  }
};