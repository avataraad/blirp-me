import React from 'react';
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
import { useWallet } from '../contexts/WalletContext';
import { isCloudBackupAvailable } from '../modules/cloudBackup';
import { restoreFromPasskey } from '../modules/cloudBackup/helpers';

type WelcomeScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'Welcome'
>;

type Props = {
  navigation: WelcomeScreenNavigationProp;
};

const WelcomeScreen: React.FC<Props> = ({ navigation }) => {
  const { restoreFromCloudBackup } = useWallet();

  const handleSignIn = async () => {
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Logo/Brand Section */}
        <View style={styles.brandSection}>
          <View style={styles.logoPlaceholder}>
            <Text style={styles.logoText}>₿</Text>
          </View>
          <Text style={styles.title}>Blirp</Text>
          <Text style={styles.subtitle}>Be your own bank</Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonSection}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate('PhoneNumber')}
          >
            <Text style={styles.primaryButtonText}>Create New Wallet</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleSignIn}
          >
            <Text style={styles.secondaryButtonText}>Sign In with Passkey</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Your keys, your crypto. Secured by your device.
          </Text>
          
          {/* Development: Supabase Test Button */}
          <TouchableOpacity
            style={styles.devButton}
            onPress={() => navigation.navigate('SupabaseTest')}
          >
            <Text style={styles.devButtonText}>Test Supabase Connection</Text>
          </TouchableOpacity>
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
    justifyContent: 'space-between',
  },
  brandSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  logoText: {
    fontSize: 64,
    color: theme.colors.text.inverse,
    fontWeight: '700',
  },
  title: {
    ...theme.typography.largeTitle,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    ...theme.typography.title3,
    color: theme.colors.text.secondary,
    fontWeight: '400',
  },
  buttonSection: {
    paddingVertical: theme.spacing.xl,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    ...theme.shadows.md,
  },
  primaryButtonText: {
    ...theme.typography.headline,
    color: theme.colors.text.inverse,
  },
  secondaryButton: {
    backgroundColor: theme.colors.background,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  secondaryButtonText: {
    ...theme.typography.headline,
    color: theme.colors.primary,
  },
  footer: {
    paddingVertical: theme.spacing.xl,
    alignItems: 'center',
  },
  footerText: {
    ...theme.typography.footnote,
    color: theme.colors.text.tertiary,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  devButton: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.3)',
  },
  devButtonText: {
    ...theme.typography.caption1,
    color: theme.colors.primary,
    textAlign: 'center',
  },
});

export default WelcomeScreen;
