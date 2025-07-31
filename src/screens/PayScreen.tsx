import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { MainTabParamList } from '../types/navigation';
import { theme } from '../styles/theme';
import Icon from 'react-native-vector-icons/Ionicons';
import { isAddress, parseEther, formatEther } from 'viem';
import {
  simulateTransaction,
  executeTransaction,
  convertGasToUSD,
  SimulationResult,
} from '../services/transactionService';
import { getEthBalance, getEthPrice } from '../services/balance';
import tagService from '../services/tagService';
import { useWallet } from '../contexts/WalletContext';
import { useSettings } from '../contexts/SettingsContext';
import { getAddress } from 'viem';
import { getBalance } from '@wagmi/core';
import { config } from '../config/wagmi';
import { SupportedChainId, CHAIN_NAMES } from '../config/chains';

type PayScreenNavigationProp = BottomTabNavigationProp<
  MainTabParamList,
  'Pay'
>;

type Props = {
  navigation: PayScreenNavigationProp;
};

const PayScreen: React.FC<Props> = ({ navigation }) => {
  const { walletAddress: contextWalletAddress, wallet } = useWallet();
  const { enabledChains } = useSettings();
  
  const [recipient, setRecipient] = useState('');
  const [amountUSD, setAmountUSD] = useState('');
  const [isValidAddress, setIsValidAddress] = useState<boolean | null>(null);
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);
  const [resolvedDisplayName, setResolvedDisplayName] = useState<string | null>(null);
  const [isResolvingTag, setIsResolvingTag] = useState(false);
  const [tagError, setTagError] = useState<string | null>(null);
  
  // Real blockchain data
  const [balance, setBalance] = useState<number>(0);
  const [ethPrice, setEthPrice] = useState<number>(1900);
  // Initialize currentChainId based on enabledChains
  const [currentChainId, setCurrentChainId] = useState<SupportedChainId>(
    enabledChains.length > 0 ? enabledChains[0] : 1
  );
  const [isLoadingBalance, setIsLoadingBalance] = useState(true);
  // Try to get wallet address from either direct property or wallet object
  const walletAddress = contextWalletAddress || wallet?.address || '';
  
  // Transaction simulation state
  const [simulation, setSimulation] = useState<SimulationResult | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [gasEstimateUSD, setGasEstimateUSD] = useState<string>('0.00');
  const [isMaxAmount, setIsMaxAmount] = useState(false);
  
  // Transaction execution state
  const [isExecuting, setIsExecuting] = useState(false);

  // Set current chain based on enabled chains
  useEffect(() => {
    if (enabledChains.length > 0) {
      // Use the first enabled chain as the current chain
      const newChainId = enabledChains[0];
      if (newChainId !== currentChainId) {
        console.log('PayScreen: Changing chain from', currentChainId, 'to', newChainId);
        setCurrentChainId(newChainId);
      }
    } else {
      // Default to Ethereum mainnet if no chains are enabled
      if (currentChainId !== 1) {
        console.log('PayScreen: No chains enabled, defaulting to mainnet');
        setCurrentChainId(1);
      }
    }
  }, [enabledChains, currentChainId]);

  // Add ref to track if we're currently loading
  const loadingRef = useRef(false);
  
  // Load wallet data on component mount
  useEffect(() => {
    const loadWalletData = async () => {
      // Prevent multiple simultaneous loads
      if (loadingRef.current) {
        console.log('PayScreen: Skipping balance load - already loading');
        return;
      }
      
      loadingRef.current = true;
      
      try {
        console.log('PayScreen: Loading wallet data...', {
          walletAddress,
          contextWalletAddress,
          wallet,
          currentChainId,
          enabledChains
        });
        
        if (!walletAddress) {
          // No wallet address available
          console.error('PayScreen: No wallet address available');
          // Don't show alert on initial load, just log
          loadingRef.current = false;
          return;
        }
        
        console.log('PayScreen: Fetching balance for address:', walletAddress, 'on chain:', currentChainId);
        
        // Get balance from the current chain
        const balanceResult = await getBalance(config, {
          address: walletAddress as `0x${string}`,
          chainId: currentChainId
        });
        
        console.log('PayScreen: Balance result:', {
          value: balanceResult.value.toString(),
          formatted: formatEther(balanceResult.value),
          chainId: currentChainId
        });
        
        // Load ETH price
        const priceResult = await getEthPrice();
        console.log('PayScreen: ETH price:', priceResult);
        
        const balanceInEth = parseFloat(formatEther(balanceResult.value));
        console.log('PayScreen: Setting balance to:', balanceInEth, 'ETH');
        
        setBalance(balanceInEth);
        setEthPrice(priceResult);
        setIsLoadingBalance(false);
      } catch (error) {
        console.error('PayScreen: Failed to load wallet data:', error);
        setIsLoadingBalance(false);
        // Don't show alert for balance loading errors, just log
      } finally {
        loadingRef.current = false;
      }
    };

    if (walletAddress || contextWalletAddress) {
      setIsLoadingBalance(true);
      loadWalletData();
    } else {
      setIsLoadingBalance(false);
    }
  }, [walletAddress, contextWalletAddress, currentChainId]);

  // Simulate transaction when recipient and amount are valid
  const simulateTransactionDebounced = useCallback(
    async (recipientAddr: string, amountInUSD: string) => {
      if (!recipientAddr || !amountInUSD || !walletAddress) return;
      
      // Convert USD to ETH
      const ethAmount = parseFloat(amountInUSD) / ethPrice;
      if (isNaN(ethAmount) || ethAmount <= 0) return;
      
      try {
        setIsSimulating(true);
        const amountWei = parseEther(ethAmount.toString()).toString();
        
        const result = await simulateTransaction({
          from: walletAddress,
          to: recipientAddr,
          value: amountWei,
          chainId: currentChainId,
        });
        
        setSimulation(result);
        
        if (result.success) {
          // Calculate gas cost: gasLimit * maxFeePerGas
          const gasWei = BigInt(result.gasLimit) * BigInt(result.maxFeePerGas);
          const gasUSD = await convertGasToUSD(gasWei.toString(), ethPrice);
          setGasEstimateUSD(gasUSD);
        }
      } catch (error) {
        console.error('Simulation failed:', error);
        setSimulation(null);
      } finally {
        setIsSimulating(false);
      }
    },
    [walletAddress, ethPrice, currentChainId]
  );

  useEffect(() => {
    if (isValidAddress && amountUSD && !isNaN(parseFloat(amountUSD)) && resolvedAddress) {
      // Debounce simulation calls
      const timeoutId = setTimeout(() => {
        simulateTransactionDebounced(resolvedAddress, amountUSD);
      }, 500);
      
      return () => clearTimeout(timeoutId);
    } else {
      setSimulation(null);
    }
  }, [resolvedAddress, amountUSD, isValidAddress, simulateTransactionDebounced]);

  const handleRecipientChange = async (text: string) => {
    // Remove @ if user types it
    const cleanText = text.replace(/^@/, '');
    setRecipient(cleanText);
    setResolvedAddress(null);
    setResolvedDisplayName(null);
    setTagError(null);

    // Handle empty input
    if (!cleanText) {
      setIsValidAddress(null);
      return;
    }

    // Check if it's an Ethereum address (user pasted an address)
    if (cleanText.startsWith('0x')) {
      // Ethereum address validation
      try {
        const isValid = isAddress(cleanText);
        setIsValidAddress(isValid);
        if (isValid) {
          // Get checksummed address
          const checksummedAddress = getAddress(cleanText);
          setResolvedAddress(checksummedAddress);
        }
      } catch {
        setIsValidAddress(false);
      }
    } else {
      // Assume it's a tag/username
      setIsResolvingTag(true);
      
      try {
        const tagValidation = tagService.validateTag(cleanText);
        
        if (tagValidation.isValid) {
          const tagMapping = await tagService.getTagMapping(cleanText);
          
          if (tagMapping) {
            setResolvedAddress(tagMapping.address);
            setResolvedDisplayName(tagMapping.displayName || cleanText);
            setIsValidAddress(true);
          } else {
            setIsValidAddress(false);
            setTagError('Username not found');
          }
        } else {
          setIsValidAddress(false);
          setTagError(tagValidation.error || 'Invalid username');
        }
      } catch (error) {
        console.error('Tag resolution error:', error);
        setIsValidAddress(false);
        setTagError(error instanceof Error ? error.message : 'Network error');
      } finally {
        setIsResolvingTag(false);
      }
    }
  };

  const handleAmountChange = (text: string) => {
    // Only allow numbers and one decimal point
    const cleaned = text.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) return;
    if (parts[1]?.length > 2) return; // Max 2 decimal places for USD
    setAmountUSD(cleaned);
    setIsMaxAmount(false); // Reset max amount flag when user manually changes amount
  };

  const handleMaxAmount = async () => {
    if (!walletAddress || balance <= 0) return;
    
    try {
      // Use the actual recipient address if available for more accurate gas estimation
      const targetAddress = resolvedAddress || '0x0000000000000000000000000000000000000001';
      
      // Simulate a transaction with a reasonable amount to get accurate gas estimate
      const testAmountWei = parseEther('0.001').toString();
      const gasSimulation = await simulateTransaction({
        from: walletAddress,
        to: targetAddress,
        value: testAmountWei,
        chainId: currentChainId,
      });
      
      if (gasSimulation.success) {
        // Calculate gas cost with a more conservative buffer
        const gasWei = BigInt(gasSimulation.gasLimit) * BigInt(gasSimulation.maxFeePerGas);
        
        // Use different buffers based on network
        // Base network (chainId 8453) can have more volatile gas prices
        const bufferPercentage = currentChainId === 8453 ? BigInt(10) : BigInt(5); // 10% for Base, 5% for others
        const gasWithBuffer = gasWei + (gasWei * bufferPercentage / BigInt(100));
        
        // Add a minimum gas reservation to handle edge cases
        const minGasReservation = parseEther('0.0002'); // ~$0.50 at $2500 ETH
        const totalGasReservation = gasWithBuffer > minGasReservation ? gasWithBuffer : minGasReservation;
        
        const gasEth = parseFloat(formatEther(totalGasReservation));
        
        // Calculate max sendable amount
        const maxSendableEth = Math.max(0, balance - gasEth);
        const maxSendableUSD = maxSendableEth * ethPrice;
        
        // Apply an additional safety margin to prevent rounding issues
        // Reduce by 0.1% to account for any precision loss in conversions
        const safetyMargin = 0.999;
        const safeSendableEth = maxSendableEth * safetyMargin;
        const safeSendableUSD = safeSendableEth * ethPrice;
        
        // Set the amount with 2 decimal places
        setAmountUSD(safeSendableUSD.toFixed(2));
        setIsMaxAmount(true);
        
        console.log('Max amount calculation:', {
          balance,
          gasEstimate: formatEther(gasWei),
          gasWithBuffer: formatEther(gasWithBuffer),
          totalGasReservation: gasEth,
          maxSendableEth,
          safeSendableEth,
          safeSendableUSD,
          chainId: currentChainId,
          bufferPercentage: bufferPercentage.toString() + '%'
        });
      }
    } catch (error) {
      console.error('Failed to calculate max amount:', error);
      // Fallback: use a more conservative estimate
      const estimatedGasEth = currentChainId === 8453 ? 0.001 : 0.0005; // More conservative for Base
      const maxSendableEth = Math.max(0, balance - estimatedGasEth);
      const safeSendableEth = maxSendableEth * 0.999; // Apply safety margin
      const safeSendableUSD = safeSendableEth * ethPrice;
      setAmountUSD(safeSendableUSD.toFixed(2));
      setIsMaxAmount(true);
    }
  };

  const handleSend = async () => {
    if (!isValidAddress) {
      const errorMessage = tagError || 'Please enter a valid username or Ethereum address.';
      Alert.alert('Invalid Recipient', errorMessage);
      return;
    }

    if (!amountUSD || parseFloat(amountUSD) === 0) {
      Alert.alert('Invalid Amount', 'Please enter an amount to send.');
      return;
    }
    
    // Convert USD to ETH for the transaction
    const ethAmount = parseFloat(amountUSD) / ethPrice;

    if (!simulation || !simulation.success) {
      Alert.alert('Transaction Error', simulation?.error || 'Unable to simulate transaction');
      return;
    }

    // Show transaction preview with warnings
    const warningMessages = simulation.warnings
      .filter(w => w.severity === 'warning')
      .map(w => w.message)
      .join('\n');

    const gasEth = formatEther(
      BigInt(simulation.gasLimit) * BigInt(simulation.maxFeePerGas)
    );

    const recipientDisplay = resolvedDisplayName 
      ? `@${recipient} (${resolvedDisplayName})`
      : recipient.startsWith('0x') 
        ? `${recipient.slice(0, 6)}...${recipient.slice(-4)}`
        : `@${recipient}`;
    
    const confirmMessage = `
Send $${amountUSD} to ${recipientDisplay}
Network: ${CHAIN_NAMES[currentChainId] || 'Unknown'}

Amount: ${ethAmount.toFixed(6)} ETH
Network Fee: ~${parseFloat(gasEth).toFixed(6)} ETH (~$${gasEstimateUSD})
Total: ${(ethAmount + parseFloat(gasEth)).toFixed(6)} ETH (~$${(parseFloat(amountUSD) + parseFloat(gasEstimateUSD)).toFixed(2)})

${warningMessages ? '\n⚠️ Warnings:\n' + warningMessages : ''}

This action requires biometric authentication.`;

    Alert.alert(
      'Confirm Transaction',
      confirmMessage,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          style: 'default',
          onPress: executeTransactionHandler,
        },
      ]
    );
  };

  const executeTransactionHandler = async () => {
    if (!simulation) return;

    try {
      setIsExecuting(true);

      if (!walletAddress) {
        Alert.alert('Error', 'No wallet address available');
        return;
      }

      // Convert USD to ETH for the transaction
      const ethAmount = parseFloat(amountUSD) / ethPrice;
      const amountWei = parseEther(ethAmount.toString()).toString();
      
      const result = await executeTransaction({
        from: walletAddress,
        to: resolvedAddress || recipient,
        value: amountWei,
        chainId: currentChainId,
      });

      // Success
      Alert.alert(
        'Transaction Sent!',
        `Transaction Hash: ${result.transactionHash}\n\nYour transaction is being processed on ${CHAIN_NAMES[currentChainId] || 'the network'}.`,
        [
          {
            text: 'View Home',
            onPress: () => {
              // Reset form
              setRecipient('');
              setAmountUSD('');
              setSimulation(null);
              setResolvedAddress(null);
              setResolvedDisplayName(null);
              setTagError(null);
              navigation.navigate('Home');
            },
          },
        ]
      );
    } catch (error) {
      console.error('Transaction failed:', error);
      Alert.alert(
        'Transaction Failed',
        error instanceof Error ? error.message : 'Unknown error occurred'
      );
    } finally {
      setIsExecuting(false);
    }
  };

  // Calculate ETH equivalent and total amounts
  const ethAmount = amountUSD ? parseFloat(amountUSD) / ethPrice : 0;
  const gasEstimateEth = simulation && simulation.success ? 
    parseFloat(formatEther(
      BigInt(simulation.gasLimit) * BigInt(simulation.maxFeePerGas)
    )) : 0.0003; // Fallback estimate
  
  const totalAmountETH = ethAmount + gasEstimateEth;
  const totalAmountUSD = parseFloat(amountUSD || '0') + parseFloat(gasEstimateUSD);
  
  // For max amount, allow a tiny tolerance for rounding errors (0.0001 ETH ~= $0.25)
  const tolerance = isMaxAmount ? 0.0001 : 0;
  const isInsufficientBalance = totalAmountETH > (balance + tolerance);
  const balanceUSD = balance * ethPrice;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        {/* Balance Display - USD First */}
        <View style={styles.balanceSection}>
          <Text style={styles.balanceLabel}>
            Available Balance {enabledChains.length > 0 && CHAIN_NAMES[currentChainId] ? `(${CHAIN_NAMES[currentChainId]})` : ''}
          </Text>
          {isLoadingBalance ? (
            <View>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={styles.balanceETH}>Loading balance...</Text>
            </View>
          ) : !walletAddress ? (
            <View>
              <Text style={styles.balanceAmount}>$0.00</Text>
              <Text style={styles.balanceETH}>No wallet connected</Text>
            </View>
          ) : (
            <>
              <Text style={styles.balanceAmount}>
                ${balanceUSD.toFixed(2)}
              </Text>
              <Text style={styles.balanceETH}>{balance.toFixed(4)} ETH</Text>
            </>
          )}
        </View>

        {/* Recipient Input */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>To</Text>
          <View style={styles.inputContainer}>
            <Text style={styles.atSymbol}>@</Text>
            <TextInput
              style={styles.input}
              value={recipient}
              onChangeText={handleRecipientChange}
              placeholder="username"
              placeholderTextColor={theme.colors.text.tertiary}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {recipient.length > 0 && isValidAddress !== null && (
              <View style={styles.validationContainer}>
                {isResolvingTag ? (
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                ) : (
                  <Icon
                    name={isValidAddress ? 'checkmark-circle' : 'close-circle'}
                    size={24}
                    color={isValidAddress ? theme.colors.success : theme.colors.danger}
                  />
                )}
              </View>
            )}
          </View>
          {/* Show resolved display name */}
          {resolvedDisplayName && !recipient.startsWith('0x') && (
            <Text style={styles.resolvedName}>
              {resolvedDisplayName}
            </Text>
          )}
          {/* Show resolved address for tags */}
          {resolvedAddress && !recipient.startsWith('0x') && (
            <Text style={styles.resolvedAddress}>
              {resolvedAddress.slice(0, 6)}...{resolvedAddress.slice(-4)}
            </Text>
          )}
          {/* Show error message */}
          {tagError && !isResolvingTag && (
            <Text style={styles.errorText}>
              {tagError}
            </Text>
          )}
          {/* Subtle hint about address support */}
          <Text style={styles.inputHint}>
            You can also paste an Ethereum address
          </Text>
        </View>

        {/* Amount Input - USD First */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Amount</Text>
          <View style={styles.amountContainer}>
            <View style={styles.inputContainer}>
              <Text style={styles.currencySymbol}>$</Text>
              <TextInput
                style={[styles.input, styles.amountInput]}
                value={amountUSD}
                onChangeText={handleAmountChange}
                placeholder="0.00"
                placeholderTextColor={theme.colors.text.tertiary}
                keyboardType="decimal-pad"
              />
              <Text style={styles.currencyLabel}>USD</Text>
              <TouchableOpacity 
                style={styles.maxButton} 
                onPress={handleMaxAmount}
                disabled={!walletAddress || balance <= 0}
              >
                <Text style={[
                  styles.maxButtonText,
                  (!walletAddress || balance <= 0) && styles.maxButtonTextDisabled
                ]}>
                  MAX
                </Text>
              </TouchableOpacity>
            </View>
            {amountUSD && (
              <Text style={styles.ethEquivalent}>
                ≈ {ethAmount.toFixed(6)} ETH
              </Text>
            )}
          </View>
        </View>

        {/* Transaction Summary */}
        {amountUSD && (
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Amount</Text>
              <Text style={styles.summaryValue}>
                ${amountUSD} ({ethAmount.toFixed(6)} ETH)
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Network Fee</Text>
              <View style={styles.gasEstimateContainer}>
                {isSimulating ? (
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                ) : (
                  <Text style={styles.summaryValue}>
                    ~{gasEstimateEth.toFixed(6)} ETH
                    {gasEstimateUSD !== '0.00' && (
                      <Text style={styles.gasUSD}> (~${gasEstimateUSD})</Text>
                    )}
                  </Text>
                )}
              </View>
            </View>
            
            {/* Warnings */}
            {simulation?.warnings && simulation.warnings.length > 0 && (
              <View style={styles.warningsContainer}>
                {simulation.warnings.map((warning, index) => (
                  <View key={index} style={styles.warningRow}>
                    <Icon
                      name={warning.severity === 'error' ? 'alert-circle' : 'warning'}
                      size={16}
                      color={warning.severity === 'error' ? theme.colors.danger : theme.colors.warning}
                    />
                    <Text style={[
                      styles.warningText,
                      warning.severity === 'error' && styles.errorText
                    ]}>
                      {warning.message}
                    </Text>
                  </View>
                ))}
              </View>
            )}
            
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryTotalLabel}>Total</Text>
              <Text style={[
                styles.summaryTotalValue,
                isInsufficientBalance && styles.insufficientBalance,
              ]}>
                ${totalAmountUSD.toFixed(2)} ({totalAmountETH.toFixed(6)} ETH)
              </Text>
            </View>
          </View>
        )}

        {/* Send Button */}
        <View style={styles.buttonSection}>
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!isValidAddress || !amountUSD || isInsufficientBalance || isExecuting || (simulation && !simulation.success)) && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!isValidAddress || !amountUSD || isInsufficientBalance || isExecuting || (simulation && !simulation.success)}
          >
            {isExecuting ? (
              <ActivityIndicator size="small" color={theme.colors.text.inverse} />
            ) : (
              <Text style={[
                styles.sendButtonText,
                (!isValidAddress || !amountUSD || isInsufficientBalance || (simulation && !simulation.success)) && styles.sendButtonTextDisabled,
              ]}>
                {isInsufficientBalance 
                  ? 'Insufficient Balance' 
                  : simulation && !simulation.success 
                    ? 'Transaction Error'
                    : 'Send'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
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
  contentContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  balanceSection: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
  },
  balanceLabel: {
    ...theme.typography.footnote,
    color: theme.colors.text.tertiary,
    marginBottom: theme.spacing.xs,
  },
  balanceAmount: {
    ...theme.typography.title1,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  balanceETH: {
    ...theme.typography.callout,
    color: theme.colors.text.secondary,
  },
  inputSection: {
    marginBottom: theme.spacing.xl,
  },
  inputLabel: {
    ...theme.typography.headline,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.md,
    height: 56,
  },
  input: {
    flex: 1,
    ...theme.typography.body,
    color: theme.colors.text.primary,
    padding: 0,
  },
  amountContainer: {
    gap: theme.spacing.sm,
  },
  amountInput: {
    ...theme.typography.title2,
  },
  currencyLabel: {
    ...theme.typography.headline,
    color: theme.colors.text.secondary,
    marginLeft: theme.spacing.sm,
  },
  ethEquivalent: {
    ...theme.typography.footnote,
    color: theme.colors.text.tertiary,
    paddingHorizontal: theme.spacing.sm,
  },
  atSymbol: {
    ...theme.typography.body,
    color: theme.colors.text.secondary,
    marginRight: theme.spacing.xs,
  },
  currencySymbol: {
    ...theme.typography.title2,
    color: theme.colors.text.secondary,
    marginRight: theme.spacing.xs,
  },
  resolvedName: {
    ...theme.typography.callout,
    color: theme.colors.text.primary,
    marginTop: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    fontWeight: '600',
  },
  errorText: {
    ...theme.typography.caption1,
    color: theme.colors.danger,
    marginTop: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
  },
  inputHint: {
    ...theme.typography.caption2,
    color: theme.colors.text.quaternary,
    marginTop: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    fontStyle: 'italic',
  },
  summaryCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginVertical: theme.spacing.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  summaryLabel: {
    ...theme.typography.callout,
    color: theme.colors.text.secondary,
  },
  summaryValue: {
    ...theme.typography.callout,
    color: theme.colors.text.primary,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.sm,
  },
  summaryTotalLabel: {
    ...theme.typography.headline,
    color: theme.colors.text.primary,
  },
  summaryTotalValue: {
    ...theme.typography.headline,
    color: theme.colors.text.primary,
    fontWeight: '700',
  },
  insufficientBalance: {
    color: theme.colors.danger,
  },
  buttonSection: {
    marginTop: theme.spacing.lg,
  },
  sendButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    ...theme.shadows.md,
  },
  sendButtonDisabled: {
    backgroundColor: theme.colors.surface,
    ...theme.shadows.sm,
  },
  sendButtonText: {
    ...theme.typography.headline,
    color: theme.colors.text.inverse,
  },
  sendButtonTextDisabled: {
    color: theme.colors.text.tertiary,
  },
  gasEstimateContainer: {
    alignItems: 'flex-end',
  },
  gasUSD: {
    ...theme.typography.caption2,
    color: theme.colors.text.tertiary,
  },
  warningsContainer: {
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.xs,
    gap: theme.spacing.xs,
  },
  warningText: {
    ...theme.typography.caption1,
    color: theme.colors.warning,
    flex: 1,
  },
  validationContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resolvedAddress: {
    ...theme.typography.caption1,
    color: theme.colors.text.tertiary,
    marginTop: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
  },
  networkSelector: {
    paddingTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
  },
  networkLabel: {
    ...theme.typography.footnote,
    color: theme.colors.text.tertiary,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  networkButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  networkButton: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface,
    minWidth: 100,
    alignItems: 'center',
  },
  networkButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  networkButtonText: {
    ...theme.typography.callout,
    color: theme.colors.text.secondary,
    fontWeight: '500',
  },
  networkButtonTextActive: {
    color: theme.colors.text.inverse,
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  loadingText: {
    ...theme.typography.footnote,
    color: theme.colors.text.secondary,
  },
  maxButton: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    marginLeft: theme.spacing.xs,
  },
  maxButtonText: {
    ...theme.typography.caption1,
    color: theme.colors.primary,
    fontWeight: '700',
  },
  maxButtonTextDisabled: {
    color: theme.colors.text.tertiary,
  },
});

export default PayScreen;