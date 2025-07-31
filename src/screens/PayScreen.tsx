import React, { useState, useEffect, useCallback } from 'react';
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
  const { walletAddress: contextWalletAddress } = useWallet();
  const { enabledChains } = useSettings();
  
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [isValidAddress, setIsValidAddress] = useState<boolean | null>(null);
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);
  const [isResolvingTag, setIsResolvingTag] = useState(false);
  
  // Real blockchain data
  const [balance, setBalance] = useState<number>(0);
  const [ethPrice, setEthPrice] = useState<number>(1900);
  const [currentChainId, setCurrentChainId] = useState<SupportedChainId>(1);
  const walletAddress = contextWalletAddress || '';
  
  // Transaction simulation state
  const [simulation, setSimulation] = useState<SimulationResult | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [gasEstimateUSD, setGasEstimateUSD] = useState<string>('0.00');
  
  // Transaction execution state
  const [isExecuting, setIsExecuting] = useState(false);

  // Set current chain based on enabled chains
  useEffect(() => {
    if (enabledChains.length > 0) {
      // Use the first enabled chain as the current chain
      setCurrentChainId(enabledChains[0]);
    } else {
      // Default to Ethereum mainnet if no chains are enabled
      setCurrentChainId(1);
    }
  }, [enabledChains]);

  // Load wallet data on component mount
  useEffect(() => {
    const loadWalletData = async () => {
      try {
        if (!walletAddress) {
          // No wallet address available
          console.error('No wallet address available');
          Alert.alert('Error', 'Please sign in to your wallet first');
          return;
        }
        
        // Get balance from the current chain
        const balanceResult = await getBalance(config, {
          address: walletAddress as `0x${string}`,
          chainId: currentChainId
        });
        
        // Load ETH price
        const priceResult = await getEthPrice();
        
        setBalance(parseFloat(formatEther(balanceResult.value)));
        setEthPrice(priceResult);
      } catch (error) {
        console.error('Failed to load wallet data:', error);
        Alert.alert('Error', 'Failed to load wallet data');
      }
    };

    loadWalletData();
    
    // Seed demo tags for testing
    tagService.seedDemoTags();
  }, [walletAddress, currentChainId]);

  // Simulate transaction when recipient and amount are valid
  const simulateTransactionDebounced = useCallback(
    async (recipientAddr: string, amountEth: string) => {
      if (!recipientAddr || !amountEth || !walletAddress) return;
      
      try {
        setIsSimulating(true);
        const amountWei = parseEther(amountEth).toString();
        
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
    if (isValidAddress && amount && !isNaN(parseFloat(amount)) && resolvedAddress) {
      // Debounce simulation calls
      const timeoutId = setTimeout(() => {
        simulateTransactionDebounced(resolvedAddress, amount);
      }, 500);
      
      return () => clearTimeout(timeoutId);
    } else {
      setSimulation(null);
    }
  }, [resolvedAddress, amount, isValidAddress, simulateTransactionDebounced]);

  const handleRecipientChange = async (text: string) => {
    setRecipient(text);
    setResolvedAddress(null);

    // Validate recipient
    if (text.startsWith('@')) {
      // Tag validation and resolution
      setIsResolvingTag(true);
      
      try {
        const tagValidation = tagService.validateTag(text);
        
        if (tagValidation.isValid) {
          const address = await tagService.resolveTag(text);
          
          if (address) {
            setResolvedAddress(address);
            setIsValidAddress(true);
          } else {
            setIsValidAddress(false);
          }
        } else {
          setIsValidAddress(false);
        }
      } catch (error) {
        console.error('Tag resolution error:', error);
        setIsValidAddress(false);
      } finally {
        setIsResolvingTag(false);
      }
    } else if (text.startsWith('0x')) {
      // Ethereum address validation
      try {
        const isValid = isAddress(text);
        setIsValidAddress(isValid);
        if (isValid) {
          // Get checksummed address
          const checksummedAddress = getAddress(text);
          setResolvedAddress(checksummedAddress);
        }
      } catch {
        setIsValidAddress(false);
      }
    } else {
      setIsValidAddress(null);
    }
  };

  const handleAmountChange = (text: string) => {
    // Only allow numbers and one decimal point
    const cleaned = text.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) {return;}
    if (parts[1]?.length > 4) {return;} // Max 4 decimal places
    setAmount(cleaned);
  };

  const handleSend = async () => {
    if (!isValidAddress) {
      Alert.alert('Invalid Recipient', 'Please enter a valid tag or Ethereum address.');
      return;
    }

    if (!amount || parseFloat(amount) === 0) {
      Alert.alert('Invalid Amount', 'Please enter an amount to send.');
      return;
    }

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

    const confirmMessage = `
Send ${amount} ETH to ${recipient}
Network: ${CHAIN_NAMES[currentChainId] || 'Unknown'}

Network Fee: ~${parseFloat(gasEth).toFixed(6)} ETH (~$${gasEstimateUSD})
Total: ${(parseFloat(amount) + parseFloat(gasEth)).toFixed(6)} ETH

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

      const amountWei = parseEther(amount).toString();
      
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
              setAmount('');
              setSimulation(null);
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

  // Calculate total amount including gas fees
  const gasEstimateEth = simulation && simulation.success ? 
    parseFloat(formatEther(
      BigInt(simulation.gasLimit) * BigInt(simulation.maxFeePerGas)
    )) : 0.0003; // Fallback estimate (~$1 at $3000 ETH)
  
  const totalAmount = amount ? parseFloat(amount) + gasEstimateEth : gasEstimateEth;
  const isInsufficientBalance = totalAmount > balance;
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
        {/* Balance Display */}
        <View style={styles.balanceSection}>
          <Text style={styles.balanceLabel}>
            Available Balance {enabledChains.length > 0 && CHAIN_NAMES[currentChainId] ? `(${CHAIN_NAMES[currentChainId]})` : ''}
          </Text>
          <Text style={styles.balanceAmount}>
            {walletAddress ? balance.toFixed(4) : '0.0000'} ETH
            {walletAddress && balance === 0 && <ActivityIndicator size="small" color={theme.colors.primary} />}
          </Text>
          <Text style={styles.balanceUSD}>${walletAddress ? balanceUSD.toFixed(2) : '0.00'}</Text>
        </View>

        {/* Recipient Input */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>To</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={recipient}
              onChangeText={handleRecipientChange}
              placeholder="@tag or 0x address"
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
          {resolvedAddress && recipient.startsWith('@') && (
            <Text style={styles.resolvedAddress}>
              {resolvedAddress.slice(0, 6)}...{resolvedAddress.slice(-4)}
            </Text>
          )}
        </View>

        {/* Amount Input */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Amount</Text>
          <View style={styles.amountContainer}>
            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.input, styles.amountInput]}
                value={amount}
                onChangeText={handleAmountChange}
                placeholder="0.0000"
                placeholderTextColor={theme.colors.text.tertiary}
                keyboardType="decimal-pad"
              />
              <Text style={styles.currencyLabel}>ETH</Text>
            </View>
            {amount && (
              <Text style={styles.amountUSD}>
                ≈ ${(parseFloat(amount) * ethPrice).toFixed(2)}
              </Text>
            )}
          </View>
        </View>

        {/* Transaction Summary */}
        {amount && (
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Amount</Text>
              <Text style={styles.summaryValue}>{amount} ETH</Text>
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
                {totalAmount.toFixed(6)} ETH
              </Text>
            </View>
          </View>
        )}

        {/* Send Button */}
        <View style={styles.buttonSection}>
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!isValidAddress || !amount || isInsufficientBalance || isExecuting || (simulation && !simulation.success)) && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!isValidAddress || !amount || isInsufficientBalance || isExecuting || (simulation && !simulation.success)}
          >
            {isExecuting ? (
              <ActivityIndicator size="small" color={theme.colors.text.inverse} />
            ) : (
              <Text style={[
                styles.sendButtonText,
                (!isValidAddress || !amount || isInsufficientBalance || (simulation && !simulation.success)) && styles.sendButtonTextDisabled,
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
  balanceUSD: {
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
  amountUSD: {
    ...theme.typography.footnote,
    color: theme.colors.text.tertiary,
    paddingHorizontal: theme.spacing.sm,
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
  errorText: {
    color: theme.colors.danger,
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
});

export default PayScreen;
