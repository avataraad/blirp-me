import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Modal,
  FlatList,
  Image,
} from 'react-native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { MainTabParamList } from '../types/navigation';
import { theme } from '../styles/theme';
import Icon from 'react-native-vector-icons/Ionicons';
import { useWallet } from '../contexts/WalletContext';
import { useSettings } from '../contexts/SettingsContext';
import { getVerifiedTokensWithBalances, sortTokensByBalanceAndMarketCap, TokenWithBalance } from '../services/tokenService';
import { formatTokenAmount } from '../services/tokenService';
import { getEthPrice } from '../services/balance';
import { estimateTradeGas, TradeGasEstimate } from '../services/tradeGasEstimation';
import { checkTokenAllowance } from '../services/tradeExecutionService';
import { parseEther, parseUnits } from 'viem';
import { getBungeeQuote, BungeeQuoteResponse } from '../services/bungeeService';
import { formatTokenAmount as formatAmount } from '../services/tokenService';

// Bungee contract address for approval checks
const BUNGEE_CONTRACT = '0x3a23F943181408EAC424116Af7b7790c94Cb97a5';
import { CompositeNavigationProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types/navigation';
import { parseError, showErrorAlert } from '../services/errorHandling';

type TradeScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Trade'>,
  StackNavigationProp<RootStackParamList>
>;

type Props = {
  navigation: TradeScreenNavigationProp;
};

type TradeMode = 'buy' | 'sell';

const TradeScreen: React.FC<Props> = ({ navigation }) => {
  const { walletAddress } = useWallet();
  const { enabledChains, tradeMode: tradeType } = useSettings();
  
  // State
  const [tradeMode, setTradeMode] = useState<TradeMode>('buy');
  const [selectedToken, setSelectedToken] = useState<TokenWithBalance | null>(null);
  const [tokens, setTokens] = useState<TokenWithBalance[]>([]);
  const [isLoadingTokens, setIsLoadingTokens] = useState(true);
  const [showTokenSelector, setShowTokenSelector] = useState(false);
  const [amountUSD, setAmountUSD] = useState('');
  const [ethPrice, setEthPrice] = useState<number>(0);
  const [gasEstimate, setGasEstimate] = useState<TradeGasEstimate | null>(null);
  const [isEstimatingGas, setIsEstimatingGas] = useState(false);
  const [isMaxAmount, setIsMaxAmount] = useState(false);
  const [approvalStatus, setApprovalStatus] = useState<{
    isChecking: boolean;
    hasApproval: boolean;
    requiredAmount: string;
  }>({
    isChecking: false,
    hasApproval: true, // Default to true (ETH doesn't need approval)
    requiredAmount: '0'
  });
  
  // Quote state
  const [quote, setQuote] = useState<BungeeQuoteResponse | null>(null);
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  
  // Load tokens and prices
  useEffect(() => {
    loadTokensAndPrices();
  }, [walletAddress, enabledChains]);
  
  const loadTokensAndPrices = async () => {
    if (!walletAddress) return;
    
    setIsLoadingTokens(true);
    try {
      const [tokensData, ethPriceData] = await Promise.all([
        getVerifiedTokensWithBalances(walletAddress, enabledChains),
        getEthPrice()
      ]);
      
      const sortedTokens = sortTokensByBalanceAndMarketCap(tokensData);
      setTokens(sortedTokens);
      setEthPrice(ethPriceData);
      
      // Set default selected token (first non-ETH token for buy, first token with balance for sell)
      if (tradeMode === 'buy') {
        const firstNonETH = sortedTokens.find(t => !t.isNative);
        setSelectedToken(firstNonETH || null);
      } else {
        const firstWithBalance = sortedTokens.find(t => t.usdValue && t.usdValue > 0 && !t.isNative);
        setSelectedToken(firstWithBalance || null);
      }
    } catch (error) {
      const appError = parseError(error);
      showErrorAlert(appError, () => loadTokensAndPrices());
    } finally {
      setIsLoadingTokens(false);
    }
  };
  
  
  // Update gas estimate when trade parameters change
  useEffect(() => {
    if (selectedToken && ethPrice > 0) {
      updateGasEstimate();
    }
  }, [selectedToken, tradeMode, ethPrice, enabledChains]);

  // Check token approval when selling tokens
  useEffect(() => {
    const checkApproval = async () => {
      if (!selectedToken || !walletAddress || !amountUSD) {
        return;
      }

      // Only need approval when selling non-native tokens
      if (tradeMode === 'sell' && !selectedToken.isNative) {
        setApprovalStatus(prev => ({ ...prev, isChecking: true }));
        
        try {
          // Convert USD amount to token amount
          const tokenAmount = parseFloat(amountUSD) / (selectedToken.priceUSD || 1);
          const amountWei = parseUnits(tokenAmount.toString(), selectedToken.decimals).toString();
          
          // Use the first enabled chain or default to mainnet
          const currentChainId = enabledChains.length > 0 ? enabledChains[0] : 1;
          
          const hasApproval = await checkTokenAllowance(
            selectedToken.address,
            walletAddress,
            BUNGEE_CONTRACT,
            amountWei,
            currentChainId
          );
          
          setApprovalStatus({
            isChecking: false,
            hasApproval,
            requiredAmount: amountWei
          });
        } catch (error) {
          console.error('Failed to check approval:', error);
          setApprovalStatus({
            isChecking: false,
            hasApproval: false,
            requiredAmount: '0'
          });
        }
      } else {
        // Reset to default for ETH or buy mode
        setApprovalStatus({
          isChecking: false,
          hasApproval: true,
          requiredAmount: '0'
        });
      }
    };

    checkApproval();
  }, [selectedToken, walletAddress, amountUSD, tradeMode, enabledChains]);
  
  // Fetch quote when amount changes (with debounce)
  useEffect(() => {
    if (!selectedToken || !amountUSD || !walletAddress || parseFloat(amountUSD) <= 0) {
      setQuote(null);
      setQuoteError(null);
      return;
    }
    
    const fetchQuote = async () => {
      try {
        setIsLoadingQuote(true);
        setQuoteError(null);
        
        // Calculate amount in wei
        let amountWei: string;
        const usdAmount = parseFloat(amountUSD);
        
        if (tradeMode === 'buy') {
          // For buying, we need to calculate ETH amount from USD
          const ethAmount = usdAmount / ethPrice;
          amountWei = parseEther(ethAmount.toString()).toString();
        } else {
          // For selling, convert USD to token amount
          if (selectedToken.isNative) {
            const ethAmount = usdAmount / ethPrice;
            amountWei = parseEther(ethAmount.toString()).toString();
          } else {
            const tokenAmount = usdAmount / (selectedToken.usdPrice || 1);
            amountWei = parseUnits(tokenAmount.toString(), selectedToken.decimals).toString();
          }
        }
        
        // Get the tokens for the trade
        const ethToken = tokens.find(t => t.isNative);
        if (!ethToken) return;
        
        const fromToken = tradeMode === 'buy' ? ethToken : selectedToken;
        const toToken = tradeMode === 'buy' ? selectedToken : ethToken;
        
        // Get quote from Bungee
        const currentChainId = enabledChains.length > 0 ? enabledChains[0] : 1;
        const quoteResponse = await getBungeeQuote(
          fromToken,
          toToken,
          amountWei,
          walletAddress,
          1, // 1% slippage
          true, // enableManual
          false, // disableAuto
          currentChainId
        );
        
        setQuote(quoteResponse);
        
        // Debug log the quote response
        if (quoteResponse.routes && quoteResponse.routes.length > 0) {
          console.log('Quote received:', {
            toAmount: quoteResponse.routes[0].toAmount,
            toAmountUSD: quoteResponse.routes[0].toAmountUSD,
            toToken: quoteResponse.routes[0].toToken,
            decimals: quoteResponse.routes[0].toToken.decimals
          });
        }
      } catch (error) {
        console.error('Failed to fetch quote:', error);
        setQuoteError('Failed to get quote');
        setQuote(null);
      } finally {
        setIsLoadingQuote(false);
      }
    };
    
    // Debounce the quote fetching
    const timeoutId = setTimeout(fetchQuote, 1000); // Wait 1 second after user stops typing
    
    return () => clearTimeout(timeoutId);
  }, [selectedToken, amountUSD, walletAddress, tradeMode, ethPrice, tokens, enabledChains]);
  
  const updateGasEstimate = async () => {
    if (!selectedToken) return;
    
    setIsEstimatingGas(true);
    try {
      // Use the first enabled chain or default to mainnet
      const currentChainId = enabledChains.length > 0 ? enabledChains[0] : 1;
      
      const estimate = await estimateTradeGas(
        tradeMode,
        selectedToken,
        ethPrice,
        approvalStatus.hasApproval, // Pass current approval status
        currentChainId
      );
      setGasEstimate(estimate);
    } catch (error) {
      console.error('Failed to estimate gas:', error);
      // Don't show alert for gas estimation errors - just log them
    } finally {
      setIsEstimatingGas(false);
    }
  };
  
  // Get ETH balance
  const ethToken = tokens.find(t => t.isNative);
  const ethBalance = ethToken?.usdValue || 0;
  
  // Calculate max amount for selling (accounting for gas)
  const getMaxSellAmount = useCallback(() => {
    if (!selectedToken) return '0';
    
    if (selectedToken.isNative) {
      // For ETH, subtract gas costs
      const gasUSD = parseFloat(gasEstimate?.totalGasUSD || '0');
      const maxUSD = Math.max(0, (selectedToken.usdValue || 0) - gasUSD);
      return maxUSD.toFixed(2);
    }
    
    return (selectedToken.usdValue || 0).toFixed(2);
  }, [selectedToken, gasEstimate]);
  
  // Calculate max amount for buying (ETH balance minus gas)
  const getMaxBuyAmount = useCallback(() => {
    const gasUSD = parseFloat(gasEstimate?.totalGasUSD || '0');
    const maxUSD = Math.max(0, ethBalance - gasUSD);
    return maxUSD.toFixed(2);
  }, [ethBalance, gasEstimate]);
  
  const handleMaxPress = () => {
    setIsMaxAmount(true);
    if (tradeMode === 'buy') {
      setAmountUSD(getMaxBuyAmount());
    } else {
      setAmountUSD(getMaxSellAmount());
    }
  };
  
  const handleTokenSelect = (token: TokenWithBalance) => {
    setSelectedToken(token);
    setShowTokenSelector(false);
    // Reset amount when token changes
    setAmountUSD('');
    setIsMaxAmount(false);
  };
  
  const handleTradeModeChange = (mode: TradeMode) => {
    setTradeMode(mode);
    setAmountUSD('');
    
    // Update default selected token based on mode
    if (mode === 'buy') {
      const firstNonETH = tokens.find(t => !t.isNative);
      setSelectedToken(firstNonETH || null);
    } else {
      const firstWithBalance = tokens.find(t => t.usdValue && t.usdValue > 0 && !t.isNative);
      setSelectedToken(firstWithBalance || null);
    }
  };
  
  const isReviewDisabled = () => {
    if (!amountUSD || parseFloat(amountUSD) <= 0) return true;
    if (!selectedToken) return true;
    
    if (tradeMode === 'buy') {
      return parseFloat(amountUSD) > parseFloat(getMaxBuyAmount());
    } else {
      return parseFloat(amountUSD) > parseFloat(getMaxSellAmount());
    }
  };
  
  const handleReviewTrade = () => {
    if (!selectedToken || !amountUSD) return;
    
    // Calculate amount in wei/smallest unit
    let amountWei: string;
    const usdAmount = parseFloat(amountUSD);
    
    if (tradeMode === 'buy') {
      // For buying, we need to calculate ETH amount from USD
      const ethAmount = usdAmount / ethPrice;
      amountWei = parseEther(ethAmount.toString()).toString();
    } else {
      // For selling, we need to handle the conversion more carefully
      if (selectedToken.isNative) {
        if (isMaxAmount && selectedToken.balance) {
          // Use exact ETH balance for max trades
          amountWei = selectedToken.balance.toString();
        } else {
          // For ETH, convert USD to ETH amount
          const ethAmount = usdAmount / ethPrice;
          amountWei = parseEther(ethAmount.toString()).toString();
        }
      } else {
        // For tokens, use exact balance if this is a max trade
        if (isMaxAmount && selectedToken.balance) {
          // Use the exact token balance for max trades
          amountWei = selectedToken.balance.toString();
        } else {
          // For partial trades, convert USD to token amount
          const tokenAmount = usdAmount / (selectedToken.usdPrice || 1);
          // Ensure we have enough precision for the conversion
          const tokenAmountString = tokenAmount.toFixed(selectedToken.decimals);
          amountWei = parseUnits(tokenAmountString, selectedToken.decimals).toString();
          
          // Ensure we don't exceed the balance
          if (selectedToken.balance && BigInt(amountWei) > BigInt(selectedToken.balance)) {
            amountWei = selectedToken.balance.toString();
          }
        }
      }
    }
    
    // Get the tokens for the trade
    const ethToken = tokens.find(t => t.isNative);
    if (!ethToken) return;
    
    const fromToken = tradeMode === 'buy' ? ethToken : selectedToken;
    const toToken = tradeMode === 'buy' ? selectedToken : ethToken;
    
    // Navigate to review screen
    navigation.navigate('TradeReview', {
      tradeMode,
      tradeType,
      fromToken,
      toToken,
      amountUSD,
      amountWei
    });
  };
  
  const renderTokenItem = ({ item }: { item: TokenWithBalance }) => {
    const isDisabled = tradeMode === 'sell' && (!item.usdValue || item.usdValue === 0);
    
    return (
      <TouchableOpacity
        style={[styles.tokenItem, isDisabled && styles.tokenItemDisabled]}
        onPress={() => !isDisabled && handleTokenSelect(item)}
        disabled={isDisabled}
      >
        <View style={styles.tokenIconContainer}>
          {item.logoURI ? (
            <Image source={{ uri: item.logoURI }} style={styles.tokenIcon} />
          ) : (
            <View style={[styles.tokenIcon, styles.tokenIconPlaceholder]}>
              <Text style={styles.tokenIconText}>{item.symbol[0]}</Text>
            </View>
          )}
        </View>
        <View style={styles.tokenInfo}>
          <Text style={[styles.tokenSymbol, isDisabled && styles.tokenTextDisabled]}>
            {item.symbol}
          </Text>
          <Text style={[styles.tokenName, isDisabled && styles.tokenTextDisabled]}>
            {item.name}
          </Text>
        </View>
        <View style={styles.tokenBalance}>
          <Text style={[styles.tokenBalanceAmount, isDisabled && styles.tokenTextDisabled]}>
            {formatTokenAmount(item.balance, item.decimals, 4)}
          </Text>
          {item.usdValue ? (
            <Text style={[styles.tokenBalanceUSD, isDisabled && styles.tokenTextDisabled]}>
              ${item.usdValue.toFixed(2)}
            </Text>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };
  
  if (!walletAddress) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyState}>
          <Icon name="wallet-outline" size={48} color={theme.colors.text.tertiary} />
          <Text style={styles.emptyStateText}>Please connect your wallet first</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Available ETH Balance */}
          <View style={styles.balanceSection}>
            <Text style={styles.balanceLabel}>Available ETH</Text>
            <Text style={styles.balanceAmount}>${ethBalance.toFixed(2)}</Text>
            <Text style={styles.balanceETH}>{formatTokenAmount(ethToken?.balance || '0', 18)} ETH</Text>
          </View>

          {/* Trade Mode Toggle */}
          <View style={styles.tradeModeContainer}>
            <TouchableOpacity
              style={[styles.tradeModeButton, tradeMode === 'buy' && styles.tradeModeButtonActive]}
              onPress={() => handleTradeModeChange('buy')}
            >
              <Text style={[styles.tradeModeText, tradeMode === 'buy' && styles.tradeModeTextActive]}>
                Buy
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tradeModeButton, tradeMode === 'sell' && styles.tradeModeButtonActive]}
              onPress={() => handleTradeModeChange('sell')}
            >
              <Text style={[styles.tradeModeText, tradeMode === 'sell' && styles.tradeModeTextActive]}>
                Sell
              </Text>
            </TouchableOpacity>
          </View>
          
          {/* Token Selector */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>
              {tradeMode === 'buy' ? 'Buy' : 'Sell'}
            </Text>
            <TouchableOpacity
              style={styles.tokenSelector}
              onPress={() => setShowTokenSelector(true)}
              disabled={isLoadingTokens}
            >
              {isLoadingTokens ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : selectedToken ? (
                <>
                  <View style={styles.selectedTokenInfo}>
                    {selectedToken.logoURI ? (
                      <Image source={{ uri: selectedToken.logoURI }} style={styles.selectedTokenIcon} />
                    ) : (
                      <View style={[styles.selectedTokenIcon, styles.tokenIconPlaceholder]}>
                        <Text style={styles.tokenIconText}>{selectedToken.symbol[0]}</Text>
                      </View>
                    )}
                    <Text style={styles.selectedTokenSymbol}>{selectedToken.symbol}</Text>
                  </View>
                  <Icon name="chevron-down" size={20} color={theme.colors.text.secondary} />
                </>
              ) : (
                <Text style={styles.placeholderText}>Select a token</Text>
              )}
            </TouchableOpacity>
          </View>
          
          {/* Amount Input */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>Amount</Text>
              <TouchableOpacity onPress={handleMaxPress}>
                <Text style={styles.maxButton}>Max</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.amountInputContainer}>
              <Text style={styles.currencySymbol}>$</Text>
              <TextInput
                style={styles.amountInput}
                value={amountUSD}
                onChangeText={(text) => {
                  setAmountUSD(text);
                  setIsMaxAmount(false);
                }}
                placeholder="0.00"
                placeholderTextColor={theme.colors.text.tertiary}
                keyboardType="decimal-pad"
                editable={!!selectedToken}
              />
            </View>
          </View>
          
          {/* Transaction Details */}
          <View style={styles.detailsContainer}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Network Fee</Text>
              <View style={styles.detailValue}>
                {isEstimatingGas ? (
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                ) : gasEstimate ? (
                  <>
                    <Text style={styles.detailValueText}>${gasEstimate.totalGasUSD}</Text>
                    <Text style={styles.detailValueSubtext}>~{gasEstimate.totalGasETH} ETH</Text>
                  </>
                ) : (
                  <Text style={styles.detailValueText}>-</Text>
                )}
              </View>
            </View>
            
            {/* Show approval status for token sells */}
            {tradeMode === 'sell' && !selectedToken?.isNative && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Token Approval</Text>
                {approvalStatus.isChecking ? (
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                ) : approvalStatus.hasApproval ? (
                  <View style={styles.approvalStatus}>
                    <Icon name="checkmark-circle" size={16} color={theme.colors.success} />
                    <Text style={[styles.detailValueSubtext, { color: theme.colors.success }]}>
                      Approved
                    </Text>
                  </View>
                ) : (
                  <View style={styles.approvalStatus}>
                    <Icon name="alert-circle" size={16} color={theme.colors.warning} />
                    <Text style={[styles.detailValueSubtext, { color: theme.colors.warning }]}>
                      Approval needed
                    </Text>
                  </View>
                )}
              </View>
            )}
            
            {/* Always show "You will receive" when there's an amount */}
            {amountUSD && parseFloat(amountUSD) > 0 && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>You will receive</Text>
                <View style={styles.detailValue}>
                  {isLoadingQuote ? (
                    <ActivityIndicator size="small" color={theme.colors.primary} />
                  ) : quote && quote.success && quote.routes && quote.routes.length > 0 ? (
                    <>
                      <Text style={styles.detailValueText}>
                        {formatAmount(quote.routes[0].toAmount, quote.routes[0].toToken.decimals, 6)} {quote.routes[0].toToken.symbol}
                      </Text>
                      <Text style={styles.detailValueSubtext}>
                        ${typeof quote.routes[0].toAmountUSD === 'number' ? quote.routes[0].toAmountUSD.toFixed(2) : '0.00'}
                      </Text>
                    </>
                  ) : quoteError ? (
                    <Text style={[styles.detailValueSubtext, { color: theme.colors.destructive }]}>
                      Failed to get quote
                    </Text>
                  ) : (
                    <Text style={styles.detailValueSubtext}>
                      Calculating...
                    </Text>
                  )}
                </View>
              </View>
            )}
          </View>
          
          {/* Review Button */}
          <TouchableOpacity
            style={[styles.reviewButton, isReviewDisabled() && styles.reviewButtonDisabled]}
            disabled={isReviewDisabled()}
            onPress={handleReviewTrade}
          >
            <Text style={[styles.reviewButtonText, isReviewDisabled() && styles.reviewButtonTextDisabled]}>
              Review Trade
            </Text>
          </TouchableOpacity>
          
          {/* Warnings */}
          {tradeMode === 'buy' && parseFloat(amountUSD) > parseFloat(getMaxBuyAmount()) && (
            <View style={styles.warningContainer}>
              <Icon name="alert-circle" size={16} color={theme.colors.destructive} />
              <Text style={styles.warningText}>Insufficient ETH balance</Text>
            </View>
          )}
          
          {tradeMode === 'sell' && selectedToken && parseFloat(amountUSD) > parseFloat(getMaxSellAmount()) && (
            <View style={styles.warningContainer}>
              <Icon name="alert-circle" size={16} color={theme.colors.destructive} />
              <Text style={styles.warningText}>
                Insufficient {selectedToken.symbol} balance
              </Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
      
      {/* Token Selector Modal */}
      <Modal
        visible={showTokenSelector}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowTokenSelector(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Token</Text>
              <TouchableOpacity onPress={() => setShowTokenSelector(false)}>
                <Icon name="close" size={24} color={theme.colors.text.primary} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={tokens.filter(t => tradeMode === 'buy' ? !t.isNative : true)}
              renderItem={renderTokenItem}
              keyExtractor={(item) => item.address}
              style={styles.tokenList}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  emptyStateText: {
    ...theme.typography.body,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.md,
    textAlign: 'center',
  },
  tradeModeContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: 4,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  tradeModeButton: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  tradeModeButtonActive: {
    backgroundColor: theme.colors.background,
    ...theme.shadows.sm,
  },
  tradeModeText: {
    ...theme.typography.headline,
    color: theme.colors.text.secondary,
  },
  tradeModeTextActive: {
    color: theme.colors.text.primary,
    fontWeight: '600',
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  sectionLabel: {
    ...theme.typography.footnote,
    color: theme.colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: theme.spacing.sm,
  },
  maxButton: {
    ...theme.typography.footnote,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  tokenSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    minHeight: 56,
  },
  selectedTokenInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedTokenIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: theme.spacing.sm,
  },
  selectedTokenSymbol: {
    ...theme.typography.headline,
    color: theme.colors.text.primary,
  },
  placeholderText: {
    ...theme.typography.body,
    color: theme.colors.text.tertiary,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.sm,
  },
  currencySymbol: {
    ...theme.typography.title2,
    color: theme.colors.text.secondary,
    marginRight: theme.spacing.xs,
  },
  amountInput: {
    flex: 1,
    ...theme.typography.title2,
    color: theme.colors.text.primary,
    padding: 0,
  },
  conversionText: {
    ...theme.typography.footnote,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.xs,
  },
  detailsContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.xl,
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
    alignItems: 'flex-end',
  },
  detailValueText: {
    ...theme.typography.callout,
    color: theme.colors.text.primary,
    fontWeight: '600',
  },
  detailValueSubtext: {
    ...theme.typography.caption1,
    color: theme.colors.text.tertiary,
  },
  approvalStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reviewButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    ...theme.shadows.md,
  },
  reviewButtonDisabled: {
    backgroundColor: theme.colors.border,
    ...theme.shadows.sm,
  },
  reviewButtonText: {
    ...theme.typography.headline,
    color: theme.colors.text.inverse,
    fontWeight: '600',
  },
  reviewButtonTextDisabled: {
    color: theme.colors.text.tertiary,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.lg,
  },
  warningText: {
    ...theme.typography.caption1,
    color: theme.colors.destructive,
    marginLeft: theme.spacing.xs,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    ...theme.typography.headline,
    color: theme.colors.text.primary,
    fontWeight: '600',
  },
  tokenList: {
    paddingBottom: theme.spacing.xl,
  },
  tokenItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  tokenItemDisabled: {
    opacity: 0.5,
  },
  tokenIconContainer: {
    marginRight: theme.spacing.md,
  },
  tokenIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  tokenIconPlaceholder: {
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tokenIconText: {
    ...theme.typography.headline,
    color: theme.colors.text.primary,
  },
  tokenInfo: {
    flex: 1,
  },
  tokenSymbol: {
    ...theme.typography.headline,
    color: theme.colors.text.primary,
    fontWeight: '600',
  },
  tokenName: {
    ...theme.typography.caption1,
    color: theme.colors.text.secondary,
  },
  tokenBalance: {
    alignItems: 'flex-end',
  },
  tokenBalanceAmount: {
    ...theme.typography.callout,
    color: theme.colors.text.primary,
  },
  tokenBalanceUSD: {
    ...theme.typography.caption1,
    color: theme.colors.text.secondary,
  },
  tokenTextDisabled: {
    color: theme.colors.text.tertiary,
  },
  balanceSection: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginVertical: theme.spacing.md,
    alignItems: 'center',
  },
  balanceLabel: {
    ...theme.typography.footnote,
    color: theme.colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: theme.spacing.xs,
  },
  balanceAmount: {
    ...theme.typography.title1,
    color: theme.colors.text.primary,
    fontWeight: '700',
  },
  balanceETH: {
    ...theme.typography.callout,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.xs,
  },
  executionStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  executionStatusText: {
    ...theme.typography.caption1,
    color: theme.colors.text.secondary,
    marginLeft: theme.spacing.sm,
  },
  quoteContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  quoteRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
  },
  quoteLabel: {
    ...theme.typography.callout,
    color: theme.colors.text.secondary,
  },
  quoteValue: {
    ...theme.typography.callout,
    color: theme.colors.text.primary,
    fontWeight: '600',
  },
  quoteLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  quoteLoadingText: {
    ...theme.typography.caption1,
    color: theme.colors.text.secondary,
    marginLeft: theme.spacing.sm,
  },
  quoteError: {
    ...theme.typography.caption1,
    color: theme.colors.destructive,
    textAlign: 'center',
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
});

export default TradeScreen;