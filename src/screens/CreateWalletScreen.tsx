import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../types/navigation';
import { theme } from '../styles/theme';
import { useWallet } from '../contexts/WalletContext';
import walletService from '../services/walletService';
import userProfileService from '../services/userProfileService';

type CreateWalletScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'CreateWallet' | 'CreateWalletTag'
>;

type CreateWalletScreenRouteProp = RouteProp<RootStackParamList, 'CreateWalletTag'>;

type Props = {
  navigation: CreateWalletScreenNavigationProp;
  route?: CreateWalletScreenRouteProp;
};

const CreateWalletScreen: React.FC<Props> = ({ navigation, route }) => {
  const [tag, setTag] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const { createWallet, isLoading, wallet } = useWallet();
  
  // Get phone numbers from route params (if coming from phone number screen)
  const phoneNumber = route?.params?.phoneNumber; // Formatted for display
  const e164PhoneNumber = route?.params?.e164PhoneNumber; // E.164 format for database
  
  // Ref for debouncing tag availability checks
  const checkTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced tag availability check
  const checkTagAvailability = useCallback(async (tagToCheck: string) => {
    if (tagToCheck.length < 3) {
      setIsAvailable(null);
      setIsChecking(false);
      return;
    }

    setIsChecking(true);
    try {
      const available = await userProfileService.isTagAvailable(tagToCheck);
      setIsAvailable(available);
      console.log(`Tag "${tagToCheck}" availability:`, available);
    } catch (error) {
      console.error('Error checking tag availability:', error);
      setIsAvailable(false);
    } finally {
      setIsChecking(false);
    }
  }, []);

  const handleTagChange = (text: string) => {
    // Remove @ if user types it, only allow alphanumeric and underscore
    const cleanedTag = text.replace(/[@\s]/g, '').toLowerCase();
    setTag(cleanedTag);

    // Clear previous timeout
    if (checkTimeoutRef.current) {
      clearTimeout(checkTimeoutRef.current);
    }

    // Reset state immediately
    setIsAvailable(null);
    setIsChecking(false);

    // Debounce the availability check (500ms delay)
    if (cleanedTag.length >= 3) {
      setIsChecking(true);
      checkTimeoutRef.current = setTimeout(() => {
        checkTagAvailability(cleanedTag);
      }, 500);
    }
  };

  const handleCreateWallet = async () => {
    // Validate tag before proceeding
    if (tag.length < 3) {
      Alert.alert('Invalid Tag', 'Please choose a tag with at least 3 characters.');
      return;
    }

    if (!isAvailable) {
      Alert.alert(
        'Tag Not Available',
        `The tag "@${tag}" is already taken. Please choose a different tag.`,
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      console.log('🔄 Starting wallet creation process...');
      
      // Create the actual wallet
      const result = await createWallet(tag);

      if (!result.success) {
        Alert.alert('Error', 'Failed to create wallet. Please try again.');
        return;
      }

      console.log('✅ Wallet created successfully:', result.wallet);

      // If we have phone number and wallet data, create user profile
      if (e164PhoneNumber && result.wallet) {
        console.log('📱 Attempting to create user profile with:', {
          tag,
          phoneNumber: e164PhoneNumber,
          walletAddress: result.wallet.address,
        });

        try {
          const profile = await userProfileService.createProfile({
            tag,
            phone_number: e164PhoneNumber, // Use E.164 format for database
            ethereum_address: result.wallet.address,
            display_name: tag,
          });

          if (profile) {
            console.log('✅ User profile created successfully:', profile);
          } else {
            console.warn('⚠️ User profile creation returned null');
          }
        } catch (profileError: any) {
          console.error('❌ User profile creation failed:', profileError);
          
          // Handle specific error cases
          if (profileError.message === 'ETHEREUM_ADDRESS_ALREADY_REGISTERED') {
            Alert.alert(
              'Wallet Already Registered',
              'This wallet address is already associated with another BlirpMe account. This is an unexpected error. Please try again or contact support.',
              [{ text: 'OK' }]
            );
            return; // Stop the flow here
          } else if (profileError.message === 'TAG_ALREADY_TAKEN') {
            Alert.alert(
              'Tag Already Taken',
              `The tag "@${tag}" was just taken by another user. Please choose a different tag.`,
              [{ text: 'OK' }]
            );
            return; // Stop the flow here
          } else {
            // Generic error
            Alert.alert(
              'Profile Creation Failed',
              'Your wallet was created successfully, but we couldn\'t create your user profile. You can try again later.',
              [{ text: 'OK' }]
            );
          }
        }
      } else {
        console.log('⚠️ Missing data for profile creation:', {
          hasPhoneNumber: !!e164PhoneNumber,
          hasWallet: !!result.wallet,
          phoneNumber: phoneNumber,
          e164PhoneNumber: e164PhoneNumber
        });
      }

      Alert.alert(
        'Wallet Created!',
        'Your wallet has been created and secured with your device biometrics.',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('MainTabs'),
          },
        ]
      );
    } catch (error) {
      console.error('❌ Wallet creation error:', error);
      Alert.alert('Error', 'Failed to create wallet. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        {/* Header Section */}
        <View style={styles.header}>
          <Text style={styles.title}>Choose your tag</Text>
          <Text style={styles.description}>
            Your tag is like a username. Others can send you crypto using @{tag || 'yourtag'}
          </Text>
        </View>

        {/* Input Section */}
        <View style={styles.inputSection}>
          <View style={styles.inputContainer}>
            <Text style={styles.inputPrefix}>@</Text>
            <TextInput
              style={styles.input}
              value={tag}
              onChangeText={handleTagChange}
              placeholder="yourtag"
              placeholderTextColor={theme.colors.text.tertiary}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={20}
            />
            {tag.length > 0 && (
              <View style={styles.statusContainer}>
                {isChecking ? (
                  <Text style={styles.checkingText}>Checking...</Text>
                ) : isAvailable ? (
                  <Text style={styles.availableText}>✓ Available</Text>
                ) : tag.length < 3 ? (
                  <Text style={styles.unavailableText}>✗ Too short</Text>
                ) : (
                  <Text style={styles.unavailableText}>✗ Already taken</Text>
                )}
              </View>
            )}
          </View>
          <Text style={styles.hint}>
            Must be at least 3 characters. Letters, numbers, and underscores only.
          </Text>
        </View>

        {/* Button Section */}
        <View style={styles.buttonSection}>
          <TouchableOpacity
            style={[
              styles.button,
              (!isAvailable || tag.length < 3 || isLoading) && styles.buttonDisabled,
            ]}
            onPress={handleCreateWallet}
            disabled={!isAvailable || tag.length < 3 || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={theme.colors.text.inverse} />
            ) : (
              <Text style={[
                styles.buttonText,
                (!isAvailable || tag.length < 3) && styles.buttonTextDisabled,
              ]}>
                Continue
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>🔐 Secured by your device</Text>
            <Text style={styles.infoText}>
              Your wallet will be protected by Face ID or Touch ID. No passwords to remember.
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
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
  inputSection: {
    paddingVertical: theme.spacing.lg,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.md,
    height: 56,
    marginBottom: theme.spacing.sm,
  },
  inputPrefix: {
    ...theme.typography.title2,
    color: theme.colors.text.secondary,
    marginRight: theme.spacing.xs,
  },
  input: {
    flex: 1,
    ...theme.typography.title2,
    color: theme.colors.text.primary,
    padding: 0,
  },
  statusContainer: {
    marginLeft: theme.spacing.sm,
  },
  checkingText: {
    ...theme.typography.footnote,
    color: theme.colors.text.tertiary,
  },
  availableText: {
    ...theme.typography.footnote,
    color: theme.colors.success,
    fontWeight: '600',
  },
  unavailableText: {
    ...theme.typography.footnote,
    color: theme.colors.danger,
    fontWeight: '600',
  },
  hint: {
    ...theme.typography.footnote,
    color: theme.colors.text.tertiary,
    paddingHorizontal: theme.spacing.sm,
  },
  buttonSection: {
    paddingVertical: theme.spacing.lg,
  },
  button: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    ...theme.shadows.md,
  },
  buttonDisabled: {
    backgroundColor: theme.colors.surface,
    ...theme.shadows.sm,
  },
  buttonText: {
    ...theme.typography.headline,
    color: theme.colors.text.inverse,
  },
  buttonTextDisabled: {
    color: theme.colors.text.tertiary,
  },
  infoSection: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: theme.spacing.xl,
  },
  infoCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
  },
  infoTitle: {
    ...theme.typography.headline,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  infoText: {
    ...theme.typography.callout,
    color: theme.colors.text.secondary,
    lineHeight: 22,
  },
});

export default CreateWalletScreen;
