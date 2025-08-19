import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types/navigation';
import { theme } from '../styles/theme';
import { useWallet } from '../contexts/WalletContext';
import { PasskeyManager } from '../services/passkeyManager';

type RecoverPortoWalletScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'RecoverPortoWallet'
>;

type Props = {
  navigation: RecoverPortoWalletScreenNavigationProp;
};

const RecoverPortoWalletScreen: React.FC<Props> = ({ navigation }) => {
  const [tag, setTag] = useState('');
  const [isRecovering, setIsRecovering] = useState(false);
  const { recoverWallet } = useWallet();

  const handleRecoverWithPasskey = async () => {
    setIsRecovering(true);

    try {
      console.log('Starting Porto wallet recovery with passkey');
      
      // Trigger passkey authentication
      const passkey = await PasskeyManager.authenticateWithPasskey();
      
      if (passkey) {
        // Try to recover wallet with the tag extracted from passkey
        const result = await recoverWallet(passkey.displayName || tag);
        
        if (result.success && result.wallet) {
          console.log('Porto wallet recovered:', result.wallet);
          
          Alert.alert(
            'Wallet Recovered',
            `Welcome back! Your wallet has been recovered.\n\nAddress: ${result.wallet.address.slice(0, 6)}...${result.wallet.address.slice(-4)}`,
            [
              {
                text: 'Continue',
                onPress: () => navigation.navigate('MainTabs'),
              },
            ],
          );
        } else {
          throw new Error('Failed to recover wallet');
        }
      } else {
        throw new Error('Passkey authentication cancelled');
      }
    } catch (error) {
      console.error('Porto wallet recovery error:', error);
      
      Alert.alert(
        'Recovery Failed',
        error instanceof Error ? error.message : 'Failed to recover Porto wallet. Please try again or create a new wallet.',
        [
          {
            text: 'Try Again',
            style: 'cancel',
          },
          {
            text: 'Create New',
            onPress: () => navigation.navigate('CreatePortoWallet'),
          },
        ],
      );
    } finally {
      setIsRecovering(false);
    }
  };

  const handleRecoverWithTag = async () => {
    if (!tag.trim()) {
      Alert.alert('Invalid Tag', 'Please enter your wallet tag');
      return;
    }

    setIsRecovering(true);

    try {
      console.log('Recovering Porto wallet for tag:', tag);
      
      // Try to recover wallet with the provided tag
      const result = await recoverWallet(tag);
      
      if (result.success && result.wallet) {
        console.log('Porto wallet recovered:', result.wallet);
        
        Alert.alert(
          'Wallet Recovered',
          `Your wallet has been recovered.\n\nAddress: ${result.wallet.address.slice(0, 6)}...${result.wallet.address.slice(-4)}`,
          [
            {
              text: 'Continue',
              onPress: () => navigation.navigate('MainTabs'),
            },
          ],
        );
      } else {
        throw new Error('No wallet found for this tag');
      }
    } catch (error) {
      console.error('Porto wallet recovery error:', error);
      
      Alert.alert(
        'Recovery Failed',
        'No wallet found for this tag. Please check your tag or create a new wallet.',
        [
          {
            text: 'Try Again',
            style: 'cancel',
          },
          {
            text: 'Create New',
            onPress: () => navigation.navigate('CreatePortoWallet'),
          },
        ],
      );
    } finally {
      setIsRecovering(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        </View>

        {/* Main Content */}
        <View style={styles.mainContent}>
          <Text style={styles.title}>Recover Smart Wallet</Text>
          <Text style={styles.subtitle}>
            Sign in with your existing passkey or enter your tag
          </Text>

          {/* Passkey Recovery Button */}
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleRecoverWithPasskey}
            disabled={isRecovering}
          >
            {isRecovering ? (
              <ActivityIndicator color={theme.colors.white} />
            ) : (
              <Text style={styles.primaryButtonText}>Sign In with Passkey</Text>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Tag Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Enter your tag</Text>
            <TextInput
              style={styles.input}
              placeholder="@yourtag"
              value={tag}
              onChangeText={setTag}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <TouchableOpacity
            style={[styles.secondaryButton, !tag.trim() && styles.disabledButton]}
            onPress={handleRecoverWithTag}
            disabled={isRecovering || !tag.trim()}
          >
            {isRecovering ? (
              <ActivityIndicator color={theme.colors.primary} />
            ) : (
              <Text style={styles.secondaryButtonText}>Recover with Tag</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Don't have a wallet?{' '}
            <Text
              style={styles.footerLink}
              onPress={() => navigation.navigate('CreatePortoWallet')}
            >
              Create one
            </Text>
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
  },
  header: {
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
  },
  backButton: {
    padding: theme.spacing.sm,
    marginLeft: -theme.spacing.sm,
  },
  backButtonText: {
    ...theme.typography.body,
    color: theme.colors.primary,
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
  },
  title: {
    ...theme.typography.largeTitle,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  primaryButtonText: {
    ...theme.typography.buttonLarge,
    color: theme.colors.white,
  },
  secondaryButton: {
    backgroundColor: theme.colors.surface,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  secondaryButtonText: {
    ...theme.typography.buttonLarge,
    color: theme.colors.primary,
  },
  disabledButton: {
    opacity: 0.5,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: theme.spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.border,
  },
  dividerText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginHorizontal: theme.spacing.md,
  },
  inputContainer: {
    marginBottom: theme.spacing.lg,
  },
  inputLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    ...theme.typography.body,
    color: theme.colors.text,
  },
  footer: {
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
  },
  footerText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  footerLink: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
});

export default RecoverPortoWalletScreen;