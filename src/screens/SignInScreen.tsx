import React from 'react';
import 'react-native-get-random-values';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types/navigation';
import { theme } from '../styles/theme';
import Icon from 'react-native-vector-icons/Ionicons';
import { useWallet } from '../contexts/WalletContext';
import { isCloudBackupAvailable } from '../modules/cloudBackup';
import { restoreFromPasskey } from '../modules/cloudBackup/helpers';
import { PortoRecoveryService } from '../services/portoRecoveryService';
import { Passkey } from 'react-native-passkey';
import { PORTO_CONFIG } from '../config/porto-config';
import AsyncStorage from '@react-native-async-storage/async-storage';

type SignInScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'SignIn'
>;

type Props = {
  navigation: SignInScreenNavigationProp;
};

const SignInScreen: React.FC<Props> = ({ navigation }) => {
  const { restoreFromCloudBackup, restorePortoWallet } = useWallet();

  const handleEOASignIn = async () => {
    if (!isCloudBackupAvailable()) {
      Alert.alert(
        'Not Available',
        'Cloud backup requires iOS 17.0 or later.',
      );
      return;
    }

    try {
      // Get both private key and tag from passkey
      const { tag, privateKey } = await restoreFromPasskey();

      // Restore the wallet with the retrieved tag and private key
      const success = await restoreFromCloudBackup(tag, privateKey);

      if (success) {
        navigation.navigate('MainTabs');
      } else {
        Alert.alert(
          'Restore Failed',
          'Could not restore wallet. Please try again.'
        );
      }
    } catch (error) {
      console.error('Sign in error:', error);
      Alert.alert('Error', 'Failed to sign in with passkey');
    }
  };

  const handlePortoSignIn = async () => {
    try {
      // Check if passkeys are supported
      const isSupported = await Passkey.isSupported();
      if (!isSupported) {
        Alert.alert(
          'Not Supported',
          'Passkey authentication is not supported on this device.',
        );
        return;
      }

      // Create a recovery service instance
      const recoveryService = new PortoRecoveryService();
      
      // Check if there are any Porto wallets stored
      const hasWallets = await recoveryService.hasStoredWallets();
      if (!hasWallets) {
        Alert.alert(
          'No Porto Wallets',
          'No Porto wallets found on this device. Please create a new wallet first.',
        );
        return;
      }

      // Generate challenge for passkey authentication
      const challengeBytes = new Uint8Array(32);
      crypto.getRandomValues(challengeBytes);
      const challenge = btoa(String.fromCharCode(...Array.from(challengeBytes)));

      try {
        // First, get all stored Porto accounts to find their credential IDs
        const keys = await AsyncStorage.getAllKeys();
        const accountKeys = keys.filter(k => k.startsWith('porto_account_'));
        
        if (accountKeys.length === 0) {
          Alert.alert(
            'No Porto Wallets',
            'No Porto wallets found on this device.',
          );
          return;
        }

        // Collect all credential IDs from stored accounts
        const allowCredentials: Array<{id: string, type: 'public-key'}> = [];
        const credentialToAccount: Record<string, any> = {};
        
        for (const key of accountKeys) {
          const data = await AsyncStorage.getItem(key);
          if (data) {
            const accountData = JSON.parse(data);
            if (accountData.passkeyId) {
              allowCredentials.push({
                id: accountData.passkeyId,
                type: 'public-key'
              });
              credentialToAccount[accountData.passkeyId] = accountData;
            }
          }
        }

        // Now let the user select from their Porto passkeys only
        // This should trigger Face ID directly without the browser-style prompt
        const passkeyResult = await Passkey.get({
          rpId: PORTO_CONFIG.rpId,
          challenge,
          userVerification: 'required',
          allowCredentials: allowCredentials.length > 0 ? allowCredentials : undefined
        });

        console.log('Passkey authentication successful:', passkeyResult.id);

        // Find the account associated with this credential
        const accountData = credentialToAccount[passkeyResult.id];
        
        if (accountData) {
          // Update the wallet context with Porto wallet data
          const success = await restorePortoWallet(accountData.address, accountData.tag);
          
          if (success) {
            console.log('Porto wallet restored successfully:', accountData.address);
            navigation.navigate('MainTabs');
          } else {
            Alert.alert(
              'Recovery Failed',
              'Could not restore Porto wallet. Please try again.',
            );
          }
        } else {
          Alert.alert(
            'Wallet Not Found',
            'Could not find a Porto wallet associated with this passkey.',
          );
        }
      } catch (passkeyError: any) {
        if (passkeyError.code === 'NotAllowedError') {
          console.log('User cancelled passkey selection');
        } else {
          console.error('Passkey authentication error:', passkeyError);
          Alert.alert(
            'Authentication Failed',
            'Could not authenticate with passkey. Please try again.',
          );
        }
      }
    } catch (error) {
      console.error('Porto sign in error:', error);
      Alert.alert('Error', 'Failed to sign in with Porto wallet');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header Section */}
        <View style={styles.header}>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.description}>
            Sign in with your device's biometric authentication
          </Text>
        </View>

        {/* Illustration Section */}
        <View style={styles.illustrationSection}>
          <View style={styles.iconContainer}>
            <Icon name="finger-print" size={80} color={theme.colors.primary} />
          </View>
          <Text style={styles.securityText}>
            Your wallet is secured by Face ID, Touch ID, or your device's PIN
          </Text>
        </View>

        {/* Button Section */}
        <View style={styles.buttonSection}>
          <TouchableOpacity
            style={styles.signInButton}
            onPress={handleEOASignIn}
          >
            <Icon name="key-outline" size={20} color={theme.colors.text.inverse} />
            <Text style={styles.signInButtonText}>Sign In with EOA Wallet</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.signInButton, styles.portoButton]}
            onPress={handlePortoSignIn}
          >
            <Icon name="shield-checkmark-outline" size={20} color={theme.colors.primary} />
            <Text style={[styles.signInButtonText, styles.portoButtonText]}>Sign In with Porto Wallet</Text>
          </TouchableOpacity>

          <Text style={styles.footerText}>
            No passwords. No seed phrases. Just you.
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
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.lg,
  },
  title: {
    ...theme.typography.title1,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  description: {
    ...theme.typography.body,
    color: theme.colors.text.secondary,
    lineHeight: 24,
  },
  illustrationSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: theme.spacing.xxl,
  },
  iconContainer: {
    width: 160,
    height: 160,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
    ...theme.shadows.lg,
  },
  securityText: {
    ...theme.typography.callout,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    paddingHorizontal: theme.spacing.xl,
    lineHeight: 22,
  },
  buttonSection: {
    paddingVertical: theme.spacing.xl,
    alignItems: 'center',
  },
  signInButton: {
    flexDirection: 'row',
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    width: '100%',
    justifyContent: 'center',
    marginBottom: theme.spacing.lg,
    ...theme.shadows.md,
  },
  signInButtonText: {
    ...theme.typography.headline,
    color: theme.colors.text.inverse,
    marginLeft: theme.spacing.sm,
  },
  footerText: {
    ...theme.typography.footnote,
    color: theme.colors.text.tertiary,
    textAlign: 'center',
  },
  portoButton: {
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    marginTop: theme.spacing.md,
  },
  portoButtonText: {
    color: theme.colors.primary,
  },
});

export default SignInScreen;
