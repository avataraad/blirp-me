import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../types/navigation';
import { theme } from '../styles/theme';
import Icon from 'react-native-vector-icons/Ionicons';
import { 
  getBungeeQuote,
  getBestRoute,
  formatQuoteDetails,
  BungeeQuoteResponse,
  BungeeRoute
} from '../services/bungeeService';
import { executeTrade } from '../services/tradeExecutionService';
import { VerifiedToken } from '../config/tokens';
import { TokenWithBalance, formatTokenAmount } from '../services/tokenService';
import { formatEther, parseEther } from 'viem';
import { useWallet } from '../contexts/WalletContext';
import { startMonitoring } from '../services/transactionMonitor';
import { parseError, showErrorAlert } from '../services/errorHandling';

type TradeReviewScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'TradeReview'
>;

type TradeReviewScreenRouteProp = RouteProp<RootStackParamList, 'TradeReview'>;

type Props = {
  navigation: TradeReviewScreenNavigationProp;
  route: TradeReviewScreenRouteProp;
};

const TradeReviewScreen: React.FC<Props> = ({ navigation, route }) => {
  const { walletAddress } = useWallet();
  const { tradeMode, tradeType, fromToken, toToken, amountUSD, amountWei } = route.params;
  
  const [quote, setQuote] = useState<BungeeQuoteResponse | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<BungeeRoute | null>(null);
  const [isLoadingQuote, setIsLoadingQuote] = useState(true);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionStatus, setExecutionStatus] = useState<string>('');
  
  // Fetch quote on mount
  useEffect(() => {
    fetchQuote();
  }, []);
  
  const fetchQuote = async () => {
    if (!walletAddress) return;
    
    try {
      setIsLoadingQuote(true);
      
      // Configure parameters based on trade type
      const enableManual = tradeType === 'manual';
      const disableAuto = tradeType === 'manual';
      
      const quoteResponse = await getBungeeQuote(
        fromToken,
        toToken,
        amountWei,
        walletAddress,
        1, // 1% slippage
        enableManual,
        disableAuto
      );
      
      setQuote(quoteResponse);
      
      // Select best route
      const bestRoute = getBestRoute(quoteResponse);
      setSelectedRoute(bestRoute);
      
    } catch (error) {
      const appError = parseError(error);
      showErrorAlert(
        appError,
        fetchQuote,
        () => navigation.goBack()
      );
    } finally {
      setIsLoadingQuote(false);
    }
  };
  
  const handleExecuteTrade = async () => {
    if (!selectedRoute || !walletAddress || !quote) return;
    
    setIsExecuting(true);
    setExecutionStatus('Preparing transaction...');
    
    try {
      // Execute the trade
      const result = await executeTrade({
        routeId: selectedRoute.routeId,
        route: selectedRoute,
        fromToken,
        toToken,
        amountWei,
        userAddress: walletAddress,
        slippage: 1,
        quoteResponse: quote,
        tradeType: tradeType
      }, setExecutionStatus);
      
      if (result.status === 'failed') {
        throw new Error(result.error || 'Trade execution failed');
      }
      
      // Start background monitoring
      // For manual trades, monitor as a regular transaction, not a trade
      const monitorType = tradeType === 'manual' ? 'send' : 'trade';
      await startMonitoring({
        hash: result.transactionHash,
        type: monitorType as 'send' | 'trade',
        fromAddress: walletAddress,
        amount: parseFloat(formatEther(BigInt(amountWei))).toFixed(6),
        tokenSymbol: `${fromToken.symbol} → ${toToken.symbol}`,
        timestamp: Date.now()
      });
      
      // Navigate back immediately
      Alert.alert(
        'Trade Submitted!',
        'Your trade has been submitted. You can track its progress in your transaction history.',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('MainTabs')
          }
        ]
      );
      
    } catch (error) {
      const appError = parseError(error);
      showErrorAlert(appError);
    } finally {
      setIsExecuting(false);
      setExecutionStatus('');
    }
  };
  
  if (isLoadingQuote) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Fetching best quote...</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  if (!quote || !selectedRoute) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Icon name="alert-circle" size={48} color={theme.colors.destructive} />
          <Text style={styles.errorText}>Unable to fetch quote</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchQuote}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
  
  const quoteDetails = formatQuoteDetails(quote, selectedRoute);
  
  // Debug logging
  console.log('TradeReview Debug:', {
    selectedRoute: selectedRoute,
    toAmount: selectedRoute.toAmount,
    toToken: toToken,
    toTokenDecimals: toToken.decimals,
    toTokenPrice: toToken.usdPrice,
    amountWei: amountWei,
    fromToken: fromToken
  });
  
  // Format amounts based on token decimals
  const fromAmountFormatted = formatTokenAmount(amountWei, fromToken.decimals, 6);
  const toAmountFormatted = formatTokenAmount(selectedRoute.toAmount, toToken.decimals, 6);
  const minAmountFormatted = formatTokenAmount(selectedRoute.outputAmountMin, toToken.decimals, 6);
  
  console.log('Formatted amounts:', {
    fromAmountFormatted,
    toAmountFormatted,
    minAmountFormatted
  });
  
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Back Button */}
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={styles.backButton}
        >
          <Icon name="arrow-back" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        
        {/* Trade Summary */}
        <View style={styles.summaryContainer}>
          <View style={styles.tokenRow}>
            <Text style={styles.tokenLabel}>You {tradeMode}</Text>
            <View style={styles.tokenAmount}>
              <Text style={styles.amountText}>
                {parseFloat(fromAmountFormatted).toFixed(6)} {fromToken.symbol}
              </Text>
              <Text style={styles.amountUSD}>${amountUSD}</Text>
            </View>
          </View>
          
          <View style={styles.arrowContainer}>
            <Icon name="arrow-down" size={24} color={theme.colors.text.secondary} />
          </View>
          
          <View style={styles.tokenRow}>
            <Text style={styles.tokenLabel}>You receive</Text>
            <View style={styles.tokenAmount}>
              <Text style={styles.amountText}>
                {parseFloat(toAmountFormatted).toFixed(6)} {toToken.symbol}
              </Text>
              <Text style={styles.amountUSD}>
                ${selectedRoute.toAmountUSD?.toFixed(2) || '0.00'}
              </Text>
            </View>
          </View>
        </View>
        
        {/* Quote Details */}
        <View style={styles.detailsContainer}>
          <Text style={styles.detailsTitle}>Transaction Details</Text>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Exchange Rate</Text>
            <Text style={styles.detailValue}>
              1 {fromToken.symbol} = {quoteDetails.exchangeRate} {toToken.symbol}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Minimum Received</Text>
            <Text style={styles.detailValue}>
              {parseFloat(minAmountFormatted).toFixed(6)} {toToken.symbol}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Network Fee</Text>
            <Text style={styles.detailValue}>${quoteDetails.networkFee}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Estimated Time</Text>
            <Text style={styles.detailValue}>~{quoteDetails.estimatedTime} min</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Route</Text>
            <Text style={styles.detailValue}>
              {selectedRoute.routePath.join(' → ')}
            </Text>
          </View>
        </View>
        
        
        {/* Execute Button */}
        <TouchableOpacity
          style={[styles.executeButton, isExecuting && styles.executeButtonDisabled]}
          onPress={handleExecuteTrade}
          disabled={isExecuting}
        >
          {isExecuting ? (
            <View style={styles.executingContainer}>
              <ActivityIndicator size="small" color={theme.colors.text.inverse} />
              <Text style={styles.executeButtonText}>{executionStatus}</Text>
            </View>
          ) : (
            <Text style={styles.executeButtonText}>Confirm Trade</Text>
          )}
        </TouchableOpacity>
        
        {/* Info */}
        <Text style={styles.infoText}>
          By confirming, you agree to execute this trade at the current market rate.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...theme.typography.body,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.md,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  errorText: {
    ...theme.typography.headline,
    color: theme.colors.text.primary,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
  },
  retryButtonText: {
    ...theme.typography.callout,
    color: theme.colors.text.inverse,
    fontWeight: '600',
  },
  backButton: {
    padding: theme.spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  headerTitle: {
    ...theme.typography.headline,
    color: theme.colors.text.primary,
    fontWeight: '600',
  },
  summaryContainer: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: theme.spacing.lg,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.lg,
  },
  tokenRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tokenLabel: {
    ...theme.typography.callout,
    color: theme.colors.text.secondary,
  },
  tokenAmount: {
    alignItems: 'flex-end',
  },
  amountText: {
    ...theme.typography.headline,
    color: theme.colors.text.primary,
    fontWeight: '600',
  },
  amountUSD: {
    ...theme.typography.caption1,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },
  arrowContainer: {
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
  detailsContainer: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: theme.spacing.lg,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.lg,
  },
  detailsTitle: {
    ...theme.typography.headline,
    color: theme.colors.text.primary,
    fontWeight: '600',
    marginBottom: theme.spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
  detailLabel: {
    ...theme.typography.callout,
    color: theme.colors.text.secondary,
  },
  detailValue: {
    ...theme.typography.callout,
    color: theme.colors.text.primary,
    fontWeight: '500',
  },
  warningText: {
    color: theme.colors.warning,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.warning + '20',
    marginHorizontal: theme.spacing.lg,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.lg,
  },
  warningMessage: {
    ...theme.typography.caption1,
    color: theme.colors.warning,
    marginLeft: theme.spacing.sm,
    flex: 1,
  },
  executeButton: {
    backgroundColor: theme.colors.primary,
    marginHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
    ...theme.shadows.md,
  },
  executeButtonDisabled: {
    backgroundColor: theme.colors.border,
    ...theme.shadows.sm,
  },
  executeButtonText: {
    ...theme.typography.headline,
    color: theme.colors.text.inverse,
    fontWeight: '600',
  },
  executingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    ...theme.typography.caption1,
    color: theme.colors.text.tertiary,
    textAlign: 'center',
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
});

export default TradeReviewScreen;