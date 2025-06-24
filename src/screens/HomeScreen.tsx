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

  // Get ETH balance for display
  const ethToken = balanceData ? getEthBalance(balanceData.tokens) : null;
  const ethBalance = ethToken ? formatTokenBalance(ethToken.balance_formatted, ethToken.usd_value) : '0.0000';
  const totalUsdValue = balanceData?.total_usd_value || 0;
  const formattedUsdValue = `$${totalUsdValue.toFixed(2)}`;

  // Mock transactions for now
  const transactions = [];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Balance Card */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Total Balance</Text>
        {loading ? (
          <ActivityIndicator size="large" color={theme.colors.text.inverse} style={styles.loader} />
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : (
          <>
            <Text style={styles.balanceAmount}>{ethBalance} ETH</Text>
            <Text style={styles.balanceUSD}>{formattedUsdValue}</Text>
          </>
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('Pay')}
        >
          <View style={styles.actionIconContainer}>
            <Icon name="send" size={24} color={theme.colors.primary} />
          </View>
          <Text style={styles.actionText}>Pay</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('Receive')}
        >
          <View style={styles.actionIconContainer}>
            <Icon name="download" size={24} color={theme.colors.primary} />
          </View>
          <Text style={styles.actionText}>Receive</Text>
        </TouchableOpacity>
      </View>

      {/* Assets Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Assets</Text>
        {loading ? (
          <View style={styles.assetCard}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
          </View>
        ) : error ? (
          <View style={styles.assetCard}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : balanceData && balanceData.tokens.length > 0 ? (
          <View style={styles.assetCard}>
            {balanceData.tokens.map((token, index) => (
              <View 
                key={token.token_address || 'ETH'} 
                style={[
                  styles.assetRow,
                  index > 0 && styles.assetRowBorder,
                ]}
              >
                <View style={styles.assetInfo}>
                  <View style={styles.assetIcon}>
                    <Text style={styles.assetIconText}>
                      {token.symbol === 'ETH' ? 'Ξ' : token.symbol.charAt(0)}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.assetName}>{token.name}</Text>
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
        ) : (
          <View style={styles.assetCard}>
            <Text style={styles.emptyStateText}>No assets found</Text>
          </View>
        )}
      </View>

      {/* Recent Transactions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Transactions</Text>
        {transactions.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="time-outline" size={48} color={theme.colors.text.tertiary} />
            <Text style={styles.emptyStateText}>No transactions yet</Text>
          </View>
        ) : (
          <View style={styles.transactionsContainer}>
            {transactions.map((tx) => (
              <TouchableOpacity key={tx.id} style={styles.transactionCard}>
                <View style={styles.transactionIcon}>
                  <Icon
                    name={tx.type === 'received' ? 'arrow-down' : 'arrow-up'}
                    size={20}
                    color={tx.type === 'received' ? theme.colors.success : theme.colors.text.primary}
                  />
                </View>
                <View style={styles.transactionInfo}>
                  <Text style={styles.transactionTitle}>
                    {tx.type === 'received' ? `From ${tx.from}` : `To ${tx.to}`}
                  </Text>
                  <Text style={styles.transactionDate}>{tx.date}</Text>
                </View>
                <Text style={[
                  styles.transactionAmount,
                  tx.type === 'received' && styles.transactionAmountReceived,
                ]}>
                  {tx.type === 'received' ? '+' : '-'}{tx.amount} ETH
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
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
  },
  balanceCard: {
    backgroundColor: theme.colors.primary,
    margin: theme.spacing.lg,
    padding: theme.spacing.xl,
    borderRadius: theme.borderRadius.xl,
    alignItems: 'center',
    ...theme.shadows.lg,
  },
  balanceLabel: {
    ...theme.typography.callout,
    color: theme.colors.text.inverse,
    opacity: 0.8,
    marginBottom: theme.spacing.sm,
  },
  balanceAmount: {
    ...theme.typography.largeTitle,
    color: theme.colors.text.inverse,
    marginBottom: theme.spacing.xs,
  },
  balanceUSD: {
    ...theme.typography.title2,
    color: theme.colors.text.inverse,
    opacity: 0.9,
  },
  actionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.md,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
  },
  actionIconContainer: {
    width: 64,
    height: 64,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
    ...theme.shadows.md,
  },
  actionText: {
    ...theme.typography.callout,
    color: theme.colors.text.primary,
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  sectionTitle: {
    ...theme.typography.title3,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
  },
  assetCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
  },
  assetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
  assetRowBorder: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.md,
  },
  assetInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  assetIcon: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  assetIconText: {
    fontSize: 20,
    color: theme.colors.text.inverse,
    fontWeight: '700',
  },
  assetName: {
    ...theme.typography.headline,
    color: theme.colors.text.primary,
  },
  assetSymbol: {
    ...theme.typography.footnote,
    color: theme.colors.text.tertiary,
  },
  assetBalance: {
    alignItems: 'flex-end',
  },
  assetAmount: {
    ...theme.typography.headline,
    color: theme.colors.text.primary,
  },
  assetValue: {
    ...theme.typography.footnote,
    color: theme.colors.text.tertiary,
  },
  transactionsContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
  },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  transactionIcon: {
    width: 36,
    height: 36,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionTitle: {
    ...theme.typography.callout,
    color: theme.colors.text.primary,
    marginBottom: 2,
  },
  transactionDate: {
    ...theme.typography.footnote,
    color: theme.colors.text.tertiary,
  },
  transactionAmount: {
    ...theme.typography.callout,
    color: theme.colors.text.primary,
    fontWeight: '600',
  },
  transactionAmountReceived: {
    color: theme.colors.success,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xxl,
  },
  emptyStateText: {
    ...theme.typography.callout,
    color: theme.colors.text.tertiary,
    marginTop: theme.spacing.md,
  },
  loader: {
    marginVertical: theme.spacing.lg,
  },
  errorText: {
    ...theme.typography.callout,
    color: theme.colors.error || '#FF6B6B',
    textAlign: 'center',
    padding: theme.spacing.md,
  },
});

export default HomeScreen;
