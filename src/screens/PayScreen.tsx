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
} from 'react-native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { MainTabParamList } from '../types/navigation';
import { theme } from '../styles/theme';
import Icon from 'react-native-vector-icons/Ionicons';
import { ethers } from 'ethers';
import {
  simulateTransaction,
  executeTransaction,
  convertGasToUSD,
  SimulationResult,
} from '../services/transactionService';
import { getEthBalance, getEthPrice } from '../services/moralisService';

type PayScreenNavigationProp = BottomTabNavigationProp<
  MainTabParamList,
  'Pay'
>;

type Props = {
  navigation: PayScreenNavigationProp;
};

const PayScreen: React.FC<Props> = ({ navigation }) => {
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [isValidAddress, setIsValidAddress] = useState<boolean | null>(null);
  
  // Real blockchain data
  const [balance, setBalance] = useState<number>(0);
  const [ethPrice, setEthPrice] = useState<number>(1900);
  const [walletAddress, setWalletAddress] = useState<string>('');
  
  // Transaction simulation state
  const [simulation, setSimulation] = useState<SimulationResult | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [gasEstimateUSD, setGasEstimateUSD] = useState<string>('0.00');
  
  // Transaction execution state
  const [isExecuting, setIsExecuting] = useState(false);

  // Load wallet data on component mount
  useEffect(() => {
    const loadWalletData = async () => {
      try {
        // For demo purposes, using a hardcoded address - in real app this would come from wallet service
        const demoAddress = '0x742d35Cc6634C0532925a3b8D37AAb63e6f3Cd55';
        setWalletAddress(demoAddress);
        
        // Load balance and ETH price
        const [balanceResult, priceResult] = await Promise.all([
          getEthBalance(demoAddress),
          getEthPrice(),
        ]);
        
        setBalance(parseFloat(balanceResult));
        setEthPrice(priceResult);
      } catch (error) {
        console.error('Failed to load wallet data:', error);
        Alert.alert('Error', 'Failed to load wallet data');
      }
    };

    loadWalletData();
  }, []);

  // Simulate transaction when recipient and amount are valid
  const simulateTransactionDebounced = useCallback(
    async (recipientAddr: string, amountEth: string) => {
      if (!recipientAddr || !amountEth || !walletAddress) return;
      
      try {
        setIsSimulating(true);
        const amountWei = ethers.utils.parseEther(amountEth).toString();
        
        const result = await simulateTransaction({
          from: walletAddress,
          to: recipientAddr,
          value: amountWei,
        });
        
        setSimulation(result);
        
        if (result.success) {
          const gasWei = ethers.BigNumber.from(result.gasUsed).mul(result.maxFeePerGas);
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
    [walletAddress, ethPrice]
  );

  useEffect(() => {
    if (isValidAddress && amount && !isNaN(parseFloat(amount))) {
      // Debounce simulation calls
      const timeoutId = setTimeout(() => {
        simulateTransactionDebounced(recipient, amount);
      }, 500);
      
      return () => clearTimeout(timeoutId);
    } else {
      setSimulation(null);
    }
  }, [recipient, amount, isValidAddress, simulateTransactionDebounced]);

  const handleRecipientChange = (text: string) => {
    setRecipient(text);

    // Validate recipient
    if (text.startsWith('@')) {
      // @tag validation - TODO: implement tag resolution in Issue #43
      setIsValidAddress(text.length > 3);
    } else if (text.startsWith('0x')) {
      // Ethereum address validation
      try {
        const isValid = ethers.utils.isAddress(text);
        setIsValidAddress(isValid);
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

    const gasEth = ethers.utils.formatEther(
      ethers.BigNumber.from(simulation.gasUsed).mul(simulation.maxFeePerGas)
    );

    const confirmMessage = `
Send ${amount} ETH to ${recipient}

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
    if (!simulation || !walletAddress) return;

    try {
      setIsExecuting(true);

      const amountWei = ethers.utils.parseEther(amount).toString();
      
      const result = await executeTransaction({
        from: walletAddress,
        to: recipient,
        value: amountWei,
      });

      // Success
      Alert.alert(
        'Transaction Sent!',
        `Transaction Hash: ${result.transactionHash}\n\nYour transaction is being processed by the network.`,
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
    parseFloat(ethers.utils.formatEther(
      ethers.BigNumber.from(simulation.gasUsed).mul(simulation.maxFeePerGas)
    )) : 0.001; // Fallback estimate
  
  const totalAmount = amount ? parseFloat(amount) + gasEstimateEth : gasEstimateEth;
  const isInsufficientBalance = totalAmount > balance;
  const balanceUSD = balance * ethPrice;

  return (
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
          <Text style={styles.balanceLabel}>Available Balance</Text>
          <Text style={styles.balanceAmount}>
            {balance.toFixed(4)} ETH
            {balance === 0 && <ActivityIndicator size="small" color={theme.colors.primary} />}
          </Text>
          <Text style={styles.balanceUSD}>${balanceUSD.toFixed(2)}</Text>
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
              <Icon
                name={isValidAddress ? 'checkmark-circle' : 'close-circle'}
                size={24}
                color={isValidAddress ? theme.colors.success : theme.colors.danger}
              />
            )}
          </View>
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
});

export default PayScreen;
