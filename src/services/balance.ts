import axios from 'axios';
import Config from 'react-native-config';
import { getBalance } from '@wagmi/core';
import { formatEther } from 'viem';
import { config } from '../config/wagmi';
import { ETHEREUM_MAINNET_TOKENS, getTokenByAddress, getTokenBySymbol } from '../config/tokens';

// Moralis API configuration
const MORALIS_API_KEY = Config.MORALIS_API_KEY;
const MORALIS_BASE_URL = 'https://deep-index.moralis.io/api/v2.2';

export interface TokenBalance {
  token_address: string | null; // null for native token
  name: string;
  symbol: string;
  logo: string | null;
  thumbnail: string | null;
  decimals: number;
  balance: string;
  balance_formatted: string;
  possible_spam: boolean;
  verified_contract?: boolean;
  usd_price: number | null;
  usd_price_24hr_percent_change: number | null;
  usd_value: number | null;
  native_token?: boolean;
  portfolio_percentage?: number;
}

export interface WalletBalanceResponse {
  tokens: TokenBalance[];
  cursor: string | null;
  total_usd_value: number;
  total_tokens_count: number;
  total_positions_count: number;
}

/**
 * Fetch all token balances for a wallet address using Moralis API
 * @param address Ethereum address to check balances for
 * @param chain Chain to query (default: 'eth')
 * @returns WalletBalanceResponse with all token balances
 */
export const getWalletBalances = async (
  address: string,
  chain: string = 'eth'
): Promise<WalletBalanceResponse> => {
  try {
    const allTokens: TokenBalance[] = [];
    let cursor: string | null = null;
    let hasMore = true;

    while (hasMore) {
      const params: any = {
        chain,
        exclude_spam: true,
        exclude_unverified_contracts: true,
      };

      if (cursor) {
        params.cursor = cursor;
      }

      const response = await axios.get(
        `${MORALIS_BASE_URL}/wallets/${address}/tokens`,
        {
          params,
          headers: {
            'X-API-Key': MORALIS_API_KEY,
            'Accept': 'application/json',
          },
        }
      );

      const data = response.data;
      
      // Process tokens from this page
      const tokens = data.result || [];
      allTokens.push(...tokens);

      // Check if there are more pages
      cursor = data.cursor || null;
      hasMore = !!cursor && tokens.length > 0;
    }

    // Calculate total USD value and portfolio percentages
    const totalUsdValue = allTokens.reduce((sum, token) => {
      return sum + (token.usd_value || 0);
    }, 0);

    // Add portfolio percentage to each token
    const tokensWithPercentage = allTokens.map(token => ({
      ...token,
      portfolio_percentage: totalUsdValue > 0 
        ? ((token.usd_value || 0) / totalUsdValue) * 100 
        : 0,
    }));

    // Filter to only include tokens from our verified list
    const verifiedTokens = tokensWithPercentage.filter(token => {
      // For native ETH, check if it's ETH (Moralis uses different representations)
      if (token.symbol === 'ETH' && (
        token.token_address === null || 
        token.token_address === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee' ||
        token.native_token === true
      )) {
        return true;
      }
      // For ERC20 tokens, check if the address matches our verified list
      if (token.token_address && token.token_address !== '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') {
        const verifiedToken = getTokenByAddress(token.token_address);
        return !!verifiedToken;
      }
      return false;
    });

    // Sort by USD value (highest first)
    verifiedTokens.sort((a, b) => (b.usd_value || 0) - (a.usd_value || 0));

    // Recalculate total USD value for verified tokens only
    const verifiedTotalUsdValue = verifiedTokens.reduce((sum, token) => {
      return sum + (token.usd_value || 0);
    }, 0);

    // Update portfolio percentages based on verified tokens only
    const verifiedTokensWithPercentage = verifiedTokens.map(token => ({
      ...token,
      portfolio_percentage: verifiedTotalUsdValue > 0 
        ? ((token.usd_value || 0) / verifiedTotalUsdValue) * 100 
        : 0,
    }));

    console.log('🔍 All tokens from Moralis:', tokensWithPercentage.map(t => ({
      symbol: t.symbol,
      token_address: t.token_address,
      native_token: t.native_token,
      balance_formatted: t.balance_formatted,
      usd_value: t.usd_value
    })));
    
    console.log('💰 Verified tokens found:', verifiedTokensWithPercentage.map(t => ({
      symbol: t.symbol,
      usd_value: t.usd_value,
      balance_formatted: t.balance_formatted
    })));

    return {
      tokens: verifiedTokensWithPercentage,
      cursor: null, // We've fetched all pages
      total_usd_value: verifiedTotalUsdValue,
      total_tokens_count: verifiedTokensWithPercentage.length,
      total_positions_count: verifiedTokensWithPercentage.filter(t => 
        parseFloat(t.balance_formatted) > 0
      ).length,
    };
  } catch (error) {
    console.error('Failed to fetch wallet balances:', error);
    
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 400) {
        throw new Error('Invalid wallet address');
      }
      if (error.response?.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      throw new Error(`Failed to fetch balances: ${error.response?.data?.message || error.message}`);
    }
    
    throw new Error('Failed to fetch balances: Unknown error');
  }
};

/**
 * Get only the ETH balance from the token list
 * @param tokens Array of token balances
 * @returns ETH balance or null if not found
 */
export const getEthBalanceFromTokens = (tokens: TokenBalance[]): TokenBalance | null => {
  return tokens.find(token => 
    token.symbol === 'ETH' && token.token_address === null
  ) || null;
};

/**
 * Get ETH balance for a specific address using wagmi/viem
 * @param address Ethereum address
 * @returns ETH balance as string
 */
export const getEthBalance = async (address: string): Promise<string> => {
  try {
    // Use wagmi/core for React Native
    const balance = await getBalance(config, {
      address: address as `0x${string}`,
      chainId: 1
    });
    return formatEther(balance.value);
  } catch (error) {
    console.error('Failed to get ETH balance:', error);
    // Fallback to Moralis
    try {
      return await getEthBalanceFromMoralis(address);
    } catch (fallbackError) {
      console.error('Fallback balance fetch failed:', fallbackError);
      return '0';
    }
  }
};

/**
 * Get ETH balance for a specific address using Moralis (with token data)
 * @param address Ethereum address
 * @returns ETH balance as string
 */
export const getEthBalanceFromMoralis = async (address: string): Promise<string> => {
  try {
    const balances = await getWalletBalances(address);
    const ethToken = getEthBalanceFromTokens(balances.tokens);
    return ethToken ? ethToken.balance_formatted : '0';
  } catch (error) {
    console.error('Failed to get ETH balance from Moralis:', error);
    return '0';
  }
};

/**
 * Get current ETH price in USD
 * @returns ETH price in USD
 */
export const getEthPrice = async (): Promise<number> => {
  try {
    const response = await axios.get(
      `${MORALIS_BASE_URL}/erc20/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/price`,
      {
        params: { chain: 'eth' },
        headers: {
          'X-API-Key': MORALIS_API_KEY,
          'Accept': 'application/json',
        },
      }
    );
    
    return response.data.usdPrice || 1900; // Fallback price
  } catch (error) {
    console.error('Failed to get ETH price:', error);
    return 1900; // Fallback price
  }
};

/**
 * Get top tokens by USD value
 * @param tokens Array of token balances
 * @param limit Number of tokens to return
 * @returns Array of top tokens
 */
export const getTopTokens = (tokens: TokenBalance[], limit: number = 5): TokenBalance[] => {
  return tokens
    .filter(token => (token.usd_value || 0) > 0)
    .slice(0, limit);
};

/**
 * Filter tokens with significant value (> $1)
 * @param tokens Array of token balances
 * @param minValue Minimum USD value (default: 1)
 * @returns Filtered token array
 */
export const getSignificantTokens = (
  tokens: TokenBalance[], 
  minValue: number = 1
): TokenBalance[] => {
  return tokens.filter(token => (token.usd_value || 0) >= minValue);
};

/**
 * Format balance for display with appropriate decimals
 * @param balance Formatted balance string
 * @param usdValue USD value
 * @returns Formatted balance string
 */
export const formatTokenBalance = (balance: string, usdValue: number | null): string => {
  const numBalance = parseFloat(balance);
  
  if (numBalance === 0) return '0';
  
  // For high value assets, show fewer decimals
  if (usdValue && usdValue > 100) {
    return numBalance.toFixed(4);
  }
  
  // For low value assets, show more decimals if needed
  if (numBalance < 0.0001) {
    return numBalance.toExponential(2);
  }
  
  return numBalance.toFixed(6);
};