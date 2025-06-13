import React, { useState } from 'react';
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
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types/navigation';
import { theme } from '../styles/theme';

type CreateWalletScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'CreateWallet'
>;

type Props = {
  navigation: CreateWalletScreenNavigationProp;
};

const CreateWalletScreen: React.FC<Props> = ({ navigation }) => {
  const [tag, setTag] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);

  const handleTagChange = (text: string) => {
    // Remove @ if user types it, only allow alphanumeric and underscore
    const cleanedTag = text.replace(/[@\s]/g, '').toLowerCase();
    setTag(cleanedTag);
    
    // Reset availability check
    if (cleanedTag.length > 0) {
      setIsChecking(true);
      // Simulate availability check
      setTimeout(() => {
        setIsAvailable(cleanedTag.length >= 3);
        setIsChecking(false);
      }, 500);
    } else {
      setIsAvailable(null);
    }
  };

  const handleCreateWallet = () => {
    if (!isAvailable || tag.length < 3) {
      Alert.alert('Invalid Tag', 'Please choose a valid tag with at least 3 characters.');
      return;
    }

    // For now, just navigate to main tabs
    // We'll implement actual wallet creation later
    Alert.alert(
      'Wallet Created!', 
      'Your wallet has been created successfully.',
      [
        {
          text: 'OK',
          onPress: () => navigation.navigate('MainTabs'),
        },
      ]
    );
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
                ) : (
                  <Text style={styles.unavailableText}>✗ Too short</Text>
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
              (!isAvailable || tag.length < 3) && styles.buttonDisabled,
            ]}
            onPress={handleCreateWallet}
            disabled={!isAvailable || tag.length < 3}
          >
            <Text style={[
              styles.buttonText,
              (!isAvailable || tag.length < 3) && styles.buttonTextDisabled,
            ]}>
              Continue
            </Text>
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