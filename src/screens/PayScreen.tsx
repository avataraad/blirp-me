import React, { useState } from 'react';
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
} from 'react-native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { MainTabParamList } from '../types/navigation';
import { theme } from '../styles/theme';
import Icon from 'react-native-vector-icons/Ionicons';

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
  
  // Mock balance - will be replaced with real data
  const balance = 0.1234;
  const balanceUSD = 234.56;
  const gasEstimate = 0.001;
  const gasEstimateUSD = 1.90;

  const handleRecipientChange = (text: string) => {
    setRecipient(text);
    
    // Simple validation for demo
    if (text.startsWith('@')) {
      setIsValidAddress(text.length > 3);
    } else if (text.startsWith('0x')) {
      setIsValidAddress(text.length === 42);
    } else {
      setIsValidAddress(null);
    }
  };

  const handleAmountChange = (text: string) => {
    // Only allow numbers and one decimal point
    const cleaned = text.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) return;
    if (parts[1]?.length > 4) return; // Max 4 decimal places
    setAmount(cleaned);
  };

  const handleSend = () => {
    if (!isValidAddress) {
      Alert.alert('Invalid Recipient', 'Please enter a valid tag or Ethereum address.');
      return;
    }
    
    if (!amount || parseFloat(amount) === 0) {
      Alert.alert('Invalid Amount', 'Please enter an amount to send.');
      return;
    }
    
    if (parseFloat(amount) + gasEstimate > balance) {
      Alert.alert('Insufficient Balance', 'You don\'t have enough ETH to complete this transaction.');
      return;
    }

    // For now, just show success
    Alert.alert(
      'Transaction Sent',
      `Sent ${amount} ETH to ${recipient}`,
      [
        {
          text: 'OK',
          onPress: () => {
            navigation.navigate('Home');
          },
        },
      ]
    );
  };

  const totalAmount = amount ? parseFloat(amount) + gasEstimate : gasEstimate;
  const isInsufficientBalance = totalAmount > balance;

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
          <Text style={styles.balanceAmount}>{balance.toFixed(4)} ETH</Text>
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
                ≈ ${(parseFloat(amount) * (balanceUSD / balance)).toFixed(2)}
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
              <Text style={styles.summaryValue}>~{gasEstimate} ETH</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryTotalLabel}>Total</Text>
              <Text style={[
                styles.summaryTotalValue,
                isInsufficientBalance && styles.insufficientBalance
              ]}>
                {totalAmount.toFixed(4)} ETH
              </Text>
            </View>
          </View>
        )}

        {/* Send Button */}
        <View style={styles.buttonSection}>
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!isValidAddress || !amount || isInsufficientBalance) && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!isValidAddress || !amount || isInsufficientBalance}
          >
            <Text style={[
              styles.sendButtonText,
              (!isValidAddress || !amount || isInsufficientBalance) && styles.sendButtonTextDisabled,
            ]}>
              {isInsufficientBalance ? 'Insufficient Balance' : 'Send'}
            </Text>
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
});

export default PayScreen;