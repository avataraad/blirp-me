import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image,
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
  const { walletAddress, logout } = useWallet();
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

  const handleSignOut = () => {
    logout();
  };

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
      {/* Header */}
      <View style={styles.header}>
        <Image 
          source={require('../../assets/images/blirp_logo_white.png')} 
          style={styles.blirpLogo}
          resizeMode="contain"
        />
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.headerIcon}>
            <Icon name="chatbubble-outline" size={24} color={theme.colors.text.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIcon} onPress={handleSignOut}>
            <Icon name="log-out-outline" size={24} color={theme.colors.text.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Total Balance */}
      <View style={styles.balanceSection}>
        <View style={styles.balanceHeader}>
          <Text style={styles.balanceLabel}>Total Balance</Text>
          <TouchableOpacity>
            <Icon name="eye-outline" size={20} color={theme.colors.text.secondary} />
          </TouchableOpacity>
        </View>
        {loading ? (
          <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loader} />
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : (
          <Text style={styles.balanceAmount}>
            ${totalUsdValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('Pay')}
        >
          <Text style={styles.actionText}>Pay</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('Receive')}
        >
          <Text style={styles.actionText}>Request</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => navigation.navigate('Trade')}
        >
          <Text style={styles.actionText}>Trade</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionText}>•••</Text>
        </TouchableOpacity>
      </View>

      {/* Rate Boost Card */}
      <View style={styles.rateBoostCard}>
        <View style={styles.rateBoostContent}>
          <View style={styles.rateBoostHeader}>
            <View style={styles.rateBoostIcon}>
              <Icon name="trending-up" size={20} color={theme.colors.text.inverse} />
            </View>
            <Text style={styles.rateBoostTitle}>Rate Boost</Text>
            <TouchableOpacity style={styles.instantButton}>
              <Icon name="flash" size={16} color={theme.colors.text.primary} />
              <Text style={styles.instantText}>Instant</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.rateBoostDescription}>
            Earn 5.25% APY on your digital dollars
          </Text>
          <TouchableOpacity>
            <Text style={styles.learnMore}>Learn more</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.tryButton}>
          <Text style={styles.tryButtonText}>Try</Text>
        </TouchableOpacity>
      </View>

      {/* Cash Section - USD Digital */}
      {cash.length > 0 && (
        <View style={styles.cashSection}>
          {cash.map((token) => (
            <View key={token.token_address} style={styles.assetRow}>
              <View style={styles.assetInfo}>
                <View style={[styles.assetIcon, styles.cashIcon]}>
                  <Text style={styles.assetIconText}>$</Text>
                </View>
                <Text style={styles.assetName}>{getCustomAssetName(token.symbol)}</Text>
              </View>
              <Text style={styles.assetValue}>
                ${token.usd_value?.toFixed(2) || '0.00'}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Assets Section */}
      {assets.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Assets</Text>
            <TouchableOpacity>
              <Text style={styles.seeAll}>See all ❯</Text>
            </TouchableOpacity>
          </View>
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
                  <View style={[
                    styles.assetIcon, 
                    token.symbol === 'ETH' ? styles.ethereumIcon : styles.bitcoinIcon
                  ]}>
                    <Text style={styles.assetIconText}>
                      {token.symbol === 'ETH' ? '♦' : '₿'}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.assetName}>{getCustomAssetName(token.symbol)}</Text>
                    <Text style={styles.assetAmount}>
                      {formatTokenBalance(token.balance_formatted, token.usd_value)} {token.symbol}
                    </Text>
                  </View>
                </View>
                <View style={styles.assetBalance}>
                  <Text style={styles.assetValue}>
                    ${token.usd_value?.toFixed(2) || '0.00'}
                  </Text>
                  <Text style={[
                    styles.assetChange,
                    // Mock price changes for now
                    token.symbol === 'ETH' ? styles.negativeChange : styles.positiveChange
                  ]}>
                    {token.symbol === 'ETH' ? '-1.2%' : '+2.4%'}
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
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Earn</Text>
            <TouchableOpacity>
              <Text style={styles.seeAll}>See all ❯</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.assetCard}>
            {earn.map((token) => (
              <View key={token.token_address} style={styles.assetRow}>
                <View style={styles.assetInfo}>
                  <View style={[styles.assetIcon, styles.earnIcon]}>
                    <Text style={styles.assetIconText}>♦</Text>
                  </View>
                  <View>
                    <Text style={styles.assetName}>Ethereum Staking</Text>
                    <Text style={styles.earnAPY}>4.2% APY</Text>
                  </View>
                </View>
                <View style={styles.assetBalance}>
                  <Text style={styles.earnValue}>+$24.67</Text>
                  <Text style={styles.earnPeriod}>This month</Text>
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
    backgroundColor: theme.colors.background,
  },
  contentContainer: {
    paddingBottom: theme.spacing.xl,
    paddingHorizontal: 20,
  },
  
  // Header with Blirp logo and icons
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
  },
  blirpLogo: {
    width: 32,
    height: 32,
  },
  headerIcons: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  headerIcon: {
    padding: theme.spacing.xs,
  },
  
  // Total Balance section
  balanceSection: {
    marginBottom: theme.spacing.xl,
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  balanceLabel: {
    ...theme.typography.body,
    color: theme.colors.text.secondary,
  },
  balanceAmount: {
    ...theme.typography.displayXL,
    color: theme.colors.text.primary,
    fontWeight: '700',
  },
  
  // Action buttons row
  actionsContainer: {
    flexDirection: 'row',
    marginBottom: theme.spacing.xl,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    ...theme.typography.callout,
    color: theme.colors.text.primary,
    fontWeight: '500',
  },
  
  // Rate Boost Card
  rateBoostCard: {
    backgroundColor: '#E8F5E8',
    borderRadius: 16,
    padding: 20,
    marginBottom: theme.spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rateBoostContent: {
    flex: 1,
  },
  rateBoostHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  rateBoostIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  rateBoostTitle: {
    ...theme.typography.headline,
    color: theme.colors.text.primary,
    fontWeight: '600',
    flex: 1,
  },
  instantButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  instantText: {
    ...theme.typography.footnote,
    color: theme.colors.text.primary,
    fontWeight: '500',
  },
  rateBoostDescription: {
    ...theme.typography.footnote,
    color: theme.colors.text.secondary,
    marginBottom: 8,
  },
  learnMore: {
    ...theme.typography.footnote,
    color: theme.colors.text.primary,
    fontWeight: '500',
  },
  tryButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 16,
  },
  tryButtonText: {
    ...theme.typography.callout,
    color: theme.colors.text.inverse,
    fontWeight: '600',
  },
  
  // Cash section (single row)
  cashSection: {
    marginBottom: theme.spacing.xl,
  },
  
  // Section styling
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    ...theme.typography.title3,
    color: theme.colors.text.primary,
    fontWeight: '600',
  },
  seeAll: {
    ...theme.typography.callout,
    color: theme.colors.text.secondary,
  },
  
  // Asset cards
  assetCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
  },
  assetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    minHeight: 72,
  },
  assetRowBorder: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  
  // Asset info
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
    marginRight: 16,
  },
  cashIcon: {
    backgroundColor: theme.colors.primary,
  },
  bitcoinIcon: {
    backgroundColor: '#F7931A',
  },
  ethereumIcon: {
    backgroundColor: '#627EEA',
  },
  earnIcon: {
    backgroundColor: '#627EEA',
  },
  assetIconText: {
    fontSize: 18,
    color: theme.colors.text.inverse,
    fontWeight: '600',
  },
  assetName: {
    ...theme.typography.body,
    color: theme.colors.text.primary,
    fontWeight: '500',
    marginBottom: 2,
  },
  assetAmount: {
    ...theme.typography.footnote,
    color: theme.colors.text.secondary,
  },
  earnAPY: {
    ...theme.typography.footnote,
    color: theme.colors.text.secondary,
  },
  
  // Balance styling
  assetBalance: {
    alignItems: 'flex-end',
  },
  assetValue: {
    ...theme.typography.body,
    color: theme.colors.text.primary,
    fontWeight: '600',
    marginBottom: 2,
  },
  assetChange: {
    ...theme.typography.footnote,
    fontWeight: '500',
  },
  positiveChange: {
    color: theme.colors.primary,
  },
  negativeChange: {
    color: theme.colors.danger,
  },
  
  // Earn section specific
  earnValue: {
    ...theme.typography.body,
    color: theme.colors.primary,
    fontWeight: '600',
    marginBottom: 2,
  },
  earnPeriod: {
    ...theme.typography.footnote,
    color: theme.colors.text.secondary,
  },
  
  // States
  emptyState: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xxl,
    paddingHorizontal: theme.spacing.lg,
  },
  emptyStateText: {
    ...theme.typography.body,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.md,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    ...theme.typography.footnote,
    color: theme.colors.text.tertiary,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
  },
  loader: {
    marginVertical: theme.spacing.lg,
  },
  errorText: {
    ...theme.typography.body,
    color: theme.colors.danger,
    textAlign: 'center',
    padding: theme.spacing.md,
  },
});

export default HomeScreen;
