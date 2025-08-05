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
import portoService from '../services/portoService';
import { useWallet } from '../contexts/WalletContext';
import { isCloudBackupAvailable } from '../modules/cloudBackup';

type CreatePortoWalletScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'CreatePortoWallet'
>;

type Props = {
  navigation: CreatePortoWalletScreenNavigationProp;
};

const CreatePortoWalletScreen: React.FC<Props> = ({ navigation }) => {
  const [tag, setTag] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const walletContext = useWallet();

  const handleCreatePortoWallet = async () => {
    if (!tag.trim()) {
      Alert.alert('Invalid Tag', 'Please enter a valid tag name');
      return;
    }

    if (!isCloudBackupAvailable()) {
      Alert.alert(
        'Not Available',
        'Porto wallets require iOS 17.0 or later for passkey support.',
      );
      return;
    }

    setIsCreating(true);
    let wallet;

    try {
      console.log('Creating Porto wallet for tag:', tag);
      
      // Create Porto smart wallet
      wallet = await portoService.createPortoWallet(tag);
      
      console.log('Porto wallet created:', wallet);
      
      // The wallet context doesn't have direct setters for Porto wallets
      // For now, just navigate to the main app
      // In a full implementation, you'd update the WalletContext to support Porto wallets
      
      Alert.alert(
        'Wallet Created',
        `Your wallet has been created with passkey authentication.\n\nAddress: ${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}\n\nNote: This is currently an EOA. Smart contract upgrade pending Porto RPC availability.`,
        [
          {
            text: 'Continue',
            onPress: () => navigation.navigate('MainTabs'),
          },
        ],
      );
    } catch (error) {
      console.error('Porto wallet creation error:', error);
      
      // Only show error alert if the wallet wasn't actually created
      if (!wallet || !wallet.address) {
        Alert.alert(
          'Creation Failed',
          'Failed to create Porto wallet. Please try again.',
        );
      }
    } finally {
      setIsCreating(false);
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
          <Text style={styles.title}>Create Smart Wallet</Text>
          <Text style={styles.subtitle}>
            Porto smart wallets use passkeys for security{'\n'}
            and can pay gas fees in USDC
          </Text>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Choose your tag</Text>
            <TextInput
              style={styles.input}
              placeholder="@yourname"
              value={tag}
              onChangeText={setTag}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isCreating}
            />
            <Text style={styles.inputHint}>
              This will be your unique identifier on Blirp
            </Text>
          </View>

          {/* Features List */}
          <View style={styles.featuresContainer}>
            <Text style={styles.featuresTitle}>What you get:</Text>
            <View style={styles.featureItem}>
              <Text style={styles.featureBullet}>✓</Text>
              <Text style={styles.featureText}>No seed phrases to remember</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureBullet}>✓</Text>
              <Text style={styles.featureText}>Pay gas fees in USDC</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureBullet}>✓</Text>
              <Text style={styles.featureText}>Secured by Face ID/Touch ID</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureBullet}>✓</Text>
              <Text style={styles.featureText}>Account abstraction benefits</Text>
            </View>
          </View>

          {/* Create Button */}
          <TouchableOpacity
            style={[styles.createButton, isCreating && styles.createButtonDisabled]}
            onPress={handleCreatePortoWallet}
            disabled={isCreating || !tag.trim()}
          >
            {isCreating ? (
              <ActivityIndicator color={theme.colors.text.inverse} />
            ) : (
              <Text style={styles.createButtonText}>Create Smart Wallet</Text>
            )}
          </TouchableOpacity>

          {/* Info Text */}
          <Text style={styles.infoText}>
            Your wallet will be created on Base network.{'\n'}
            You can add funds after creation.
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
    paddingVertical: theme.spacing.md,
  },
  backButton: {
    padding: theme.spacing.sm,
  },
  backButtonText: {
    ...theme.typography.body,
    color: theme.colors.primary,
  },
  mainContent: {
    flex: 1,
    paddingTop: theme.spacing.xl,
  },
  title: {
    ...theme.typography.largeTitle,
    color: theme.colors.text.primary,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
  inputContainer: {
    marginBottom: theme.spacing.xl,
  },
  inputLabel: {
    ...theme.typography.subheadline,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  input: {
    ...theme.typography.title3,
    backgroundColor: theme.colors.surface,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    color: theme.colors.text.primary,
  },
  inputHint: {
    ...theme.typography.caption1,
    color: theme.colors.text.tertiary,
    marginTop: theme.spacing.xs,
  },
  featuresContainer: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.xl,
  },
  featuresTitle: {
    ...theme.typography.headline,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  featureBullet: {
    ...theme.typography.body,
    color: theme.colors.success,
    marginRight: theme.spacing.sm,
  },
  featureText: {
    ...theme.typography.body,
    color: theme.colors.text.secondary,
    flex: 1,
  },
  createButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    ...theme.shadows.md,
  },
  createButtonDisabled: {
    opacity: 0.5,
  },
  createButtonText: {
    ...theme.typography.headline,
    color: theme.colors.text.inverse,
  },
  infoText: {
    ...theme.typography.footnote,
    color: theme.colors.text.tertiary,
    textAlign: 'center',
  },
});

export default CreatePortoWalletScreen;