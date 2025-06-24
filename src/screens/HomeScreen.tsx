import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { MainTabParamList } from '../types/navigation';
import { theme } from '../styles/theme';
import Icon from 'react-native-vector-icons/Ionicons';
import { useWallet } from '../contexts/WalletContext';
import {
  getWalletBalances,
  getEthBalance,
  formatTokenBalance,
  WalletBalanceResponse,
} from '../services/balance';

type HomeScreenNavigationProp = BottomTabNavigationProp<
  MainTabParamList,
  'Home'
>;

type Props = {
  navigation: HomeScreenNavigationProp;
};

const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const { walletAddress } = useWallet();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [balanceData, setBalanceData] = useState<WalletBalanceResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch balances
  const fetchBalances = useCallback(async () => {
    if (!walletAddress) {
      setError('No wallet address available');
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const response = await getWalletBalances(walletAddress);
      setBalanceData(response);
    } catch (err) {
      console.error('Failed to fetch balances:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch balances');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [walletAddress]);

  // Fetch on mount and when address changes
  useEffect(() => {
    fetchBalances();
  }, [fetchBalances]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchBalances();
  }, [fetchBalances]);

  // Asset mapping with custom names from Issue #38
  const getAssetsBySection = () => {
    if (!balanceData?.tokens) return { cash: [], assets: [], earn: [] };

    const cash = balanceData.tokens.filter(token => token.symbol === 'USDC');
    const assets = balanceData.tokens.filter(token => 
      token.symbol === 'ETH' || token.symbol === 'cbBTC'
    );
    const earn = balanceData.tokens.filter(token => token.symbol === 'cbETH');

    return { cash, assets, earn };
  };

  const { cash, assets, earn } = getAssetsBySection();
  const totalUsdValue = balanceData?.total_usd_value || 0;

  // Custom asset names from Issue #38
  const getCustomAssetName = (symbol: string) => {
    switch (symbol) {
      case 'USDC': return 'Digital USD';
      case 'ETH': return 'Ethereum';
      case 'cbBTC': return 'Bitcoin';
      case 'cbETH': return 'Ethereum'; // In Earn section
      default: return symbol;
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Portfolio Header */}
      <View style={styles.portfolioHeader}>
        <Text style={styles.portfolioLabel}>Portfolio</Text>
        {loading ? (
          <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loader} />
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : (
          <Text style={styles.portfolioAmount}>
            ${totalUsdValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('Pay')}
        >
          <View style={styles.actionIcon}>
            <Icon name="arrow-up" size={20} color={theme.colors.text.inverse} />
          </View>
          <Text style={styles.actionText}>Send</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('Receive')}
        >
          <View style={styles.actionIcon}>
            <Icon name="arrow-down" size={20} color={theme.colors.text.inverse} />
          </View>
          <Text style={styles.actionText}>Receive</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton}>
          <View style={styles.actionIcon}>
            <Icon name="swap-horizontal" size={20} color={theme.colors.text.inverse} />
          </View>
          <Text style={styles.actionText}>Swap</Text>
        </TouchableOpacity>
      </View>

      {/* Cash Section */}
      {cash.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cash</Text>
          <View style={styles.assetCard}>
            {cash.map((token) => (
              <View key={token.token_address} style={styles.assetRow}>
                <View style={styles.assetInfo}>
                  <View style={[styles.assetIcon, styles.cashIcon]}>
                    <Text style={styles.assetIconText}>$</Text>
                  </View>
                  <View>
                    <Text style={styles.assetName}>{getCustomAssetName(token.symbol)}</Text>
                    <Text style={styles.assetSymbol}>{token.symbol}</Text>
                  </View>
                </View>
                <View style={styles.assetBalance}>
                  <Text style={styles.assetValue}>
                    ${token.usd_value?.toFixed(2) || '0.00'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Assets Section */}
      {assets.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Assets</Text>
          <View style={styles.assetCard}>
            {assets.map((token, index) => (
              <View 
                key={token.token_address || token.symbol} 
                style={[
                  styles.assetRow,
                  index > 0 && styles.assetRowBorder,
                ]}
              >
                <View style={styles.assetInfo}>
                  <View style={styles.assetIcon}>
                    <Text style={styles.assetIconText}>
                      {token.symbol === 'ETH' ? 'Ξ' : '₿'}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.assetName}>{getCustomAssetName(token.symbol)}</Text>
                    <Text style={styles.assetSymbol}>{token.symbol}</Text>
                  </View>
                </View>
                <View style={styles.assetBalance}>
                  <Text style={styles.assetAmount}>
                    {formatTokenBalance(token.balance_formatted, token.usd_value)}
                  </Text>
                  <Text style={styles.assetValue}>
                    ${token.usd_value?.toFixed(2) || '0.00'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Earn Section */}
      {earn.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Earn</Text>
          <View style={styles.assetCard}>
            {earn.map((token) => (
              <View key={token.token_address} style={styles.assetRow}>
                <View style={styles.assetInfo}>
                  <View style={[styles.assetIcon, styles.earnIcon]}>
                    <Text style={styles.assetIconText}>Ξ</Text>
                  </View>
                  <View>
                    <Text style={styles.assetName}>{getCustomAssetName(token.symbol)}</Text>
                    <Text style={styles.assetSymbol}>Staking • {token.symbol}</Text>
                  </View>
                </View>
                <View style={styles.assetBalance}>
                  <Text style={styles.assetAmount}>
                    {formatTokenBalance(token.balance_formatted, token.usd_value)}
                  </Text>
                  <Text style={styles.assetValue}>
                    ${token.usd_value?.toFixed(2) || '0.00'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Empty State */}
      {!loading && !error && cash.length === 0 && assets.length === 0 && earn.length === 0 && (
        <View style={styles.emptyState}>
          <Icon name="wallet-outline" size={48} color={theme.colors.text.tertiary} />
          <Text style={styles.emptyStateText}>No assets found</Text>
          <Text style={styles.emptyStateSubtext}>
            Your portfolio will appear here once you have assets
          </Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background, // #FFFFFF Pure white from design system
  },
  contentContainer: {
    paddingBottom: theme.spacing.xl,
    paddingHorizontal: 20, // 20px margins from design system
  },
  
  // Portfolio Header - using design system typography
  portfolioHeader: {
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
    alignItems: 'flex-start',
  },
  portfolioLabel: {
    ...theme.typography.body, // 17px from design system
    color: theme.colors.text.secondary, // #8E8E93 70% opacity
    marginBottom: theme.spacing.xs,
  },
  portfolioAmount: {
    ...theme.typography.displayXL, // 52px fontSize from design system
    color: theme.colors.text.primary, // #000000 Black
    fontWeight: '600', // Semi-bold from design system
  },
  
  // Action buttons - using design system button specs
  actionsContainer: {
    flexDirection: 'row',
    marginBottom: theme.spacing.xl, // 32px spacing
    gap: theme.spacing.sm, // 8px gap
  },
  actionButton: {
    backgroundColor: theme.colors.surface, // #F9F9F7 Light Gray Cards
    paddingHorizontal: theme.spacing.lg, // 24px horizontal padding
    paddingVertical: theme.spacing.sm, // 8px vertical padding
    borderRadius: 24, // Pill shape from design system
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    ...theme.typography.body, // 17px body text
    color: theme.colors.text.primary, // #000000 Black
    fontWeight: '500',
  },
  
  // Section styling - 8pt grid spacing
  section: {
    marginBottom: theme.spacing.xl, // 32px between sections
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md, // 16px spacing
  },
  sectionTitle: {
    ...theme.typography.title3, // 20px section titles from design system
    color: theme.colors.text.primary, // #000000 Black
    fontWeight: '600',
  },
  sectionSeeAll: {
    ...theme.typography.callout, // 16px callout
    color: theme.colors.text.secondary, // #8E8E93 Gray
  },
  
  // Asset cards - using design system card specs
  assetCard: {
    backgroundColor: theme.colors.surface, // #F9F9F7 Light Gray
    borderRadius: 16, // 16px corner radius from design system
    padding: 0, // Individual rows handle padding
  },
  assetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24, // 24px card padding from design system
    minHeight: 56, // 56px minimum touch target
  },
  assetRowBorder: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border, // #C6C6C8
  },
  
  // Asset info - using design system spacing
  assetInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  assetIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md, // 16px spacing
  },
  cashIcon: {
    backgroundColor: theme.colors.primary, // #32D74B Mint Green
  },
  bitcoinIcon: {
    backgroundColor: '#000000', // Black for contrast
  },
  ethereumIcon: {
    backgroundColor: '#000000', // Black for contrast  
  },
  earnIcon: {
    backgroundColor: theme.colors.primary, // #32D74B for earn
  },
  assetIconText: {
    fontSize: 18,
    color: theme.colors.text.inverse, // #FFFFFF
    fontWeight: '600',
  },
  assetName: {
    ...theme.typography.body, // 17px body text
    color: theme.colors.text.primary, // #000000 Black
    fontWeight: '500',
    marginBottom: 2,
  },
  assetSymbol: {
    ...theme.typography.footnote, // 13px caption from design system
    color: theme.colors.text.secondary, // #8E8E93 Gray
  },
  
  // Balance styling - right aligned
  assetBalance: {
    alignItems: 'flex-end',
  },
  assetAmount: {
    ...theme.typography.body, // 17px body text
    color: theme.colors.text.primary, // #000000 Black
    fontWeight: '600',
    marginBottom: 2,
  },
  assetValue: {
    ...theme.typography.footnote, // 13px caption
    color: theme.colors.text.secondary, // #8E8E93 Gray
  },
  assetChange: {
    ...theme.typography.footnote, // 13px caption
    fontWeight: '500',
  },
  positiveChange: {
    color: theme.colors.primary, // #32D74B Mint Green for positive
  },
  negativeChange: {
    color: theme.colors.danger, // #FF3B30 Error Red for negative
  },
  
  // Earn section specific styling
  earnValue: {
    ...theme.typography.body, // 17px body text
    color: theme.colors.primary, // #32D74B Mint Green
    fontWeight: '600',
    marginBottom: 2,
  },
  earnPeriod: {
    ...theme.typography.footnote, // 13px caption
    color: theme.colors.text.secondary, // #8E8E93 Gray
  },
  
  // Empty states
  emptyState: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xxl, // 48px spacing
    paddingHorizontal: theme.spacing.lg, // 24px spacing
  },
  emptyStateText: {
    ...theme.typography.body, // 17px body text
    color: theme.colors.text.secondary, // #8E8E93 Gray
    marginTop: theme.spacing.md, // 16px spacing
    textAlign: 'center',
  },
  emptyStateSubtext: {
    ...theme.typography.footnote, // 13px caption
    color: theme.colors.text.tertiary, // #C7C7CC Disabled
    marginTop: theme.spacing.sm, // 8px spacing
    textAlign: 'center',
  },
  
  // Loading and error states
  loader: {
    marginVertical: theme.spacing.lg, // 24px spacing
  },
  errorText: {
    ...theme.typography.body, // 17px body text
    color: theme.colors.danger, // #FF3B30 Error Red
    textAlign: 'center',
    padding: theme.spacing.md, // 16px spacing
  },
});

export default HomeScreen;
