import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types/navigation';
import { theme } from '../styles/theme';
import { validatePhoneNumber, formatPhoneNumber } from '../utils/phoneValidation';
import userProfileService from '../services/userProfileService';

type PhoneNumberScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'PhoneNumber'
>;

type Props = {
  navigation: PhoneNumberScreenNavigationProp;
};

const PhoneNumberScreen: React.FC<Props> = ({ navigation }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState('US');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const handlePhoneNumberChange = (text: string) => {
    // Remove any non-numeric characters except + for country code
    const cleaned = text.replace(/[^0-9+]/g, '');
    setPhoneNumber(cleaned);
    
    // Clear errors when user starts typing
    if (errors.length > 0) {
      setErrors([]);
    }
  };

  const validateAndProceed = async () => {
    setIsLoading(true);
    setErrors([]);

    try {
      // Validate phone number format
      const validation = validatePhoneNumber(phoneNumber, countryCode);
      
      if (!validation.isValid) {
        setErrors([validation.error || 'Invalid phone number']);
        setIsLoading(false);
        return;
      }

      // Check if phone number is already registered
      const isRegistered = await userProfileService.isPhoneNumberRegistered(
        validation.formattedNumber!
      );

      if (isRegistered) {
        Alert.alert(
          'Phone Number Already Registered',
          'This phone number is already associated with another account. Please use a different phone number or sign in to your existing account.',
          [{ text: 'OK' }]
        );
        setIsLoading(false);
        return;
      }

      // Navigate to verification step with validated phone number
      // Store both formatted (for display) and E.164 (for database) formats
      navigation.navigate('PhoneVerification', {
        phoneNumber: validation.formattedNumber!,
        e164PhoneNumber: validation.e164Number!,
      });

      // Mock SMS sending alert
      Alert.alert(
        'Verification Code Sent',
        `We've sent a 6-digit verification code to ${validation.formattedNumber}`,
        [{ text: 'OK' }]
      );

    } catch (error) {
      console.error('Phone validation error:', error);
      setErrors(['Unable to validate phone number. Please try again.']);
    }

    setIsLoading(false);
  };

  const getPlaceholderText = () => {
    switch (countryCode) {
      case 'US':
      case 'CA':
        return '+1 (555) 123-4567';
      case 'GB':
        return '+44 7911 123456';
      case 'AU':
        return '+61 4 1234 5678';
      default:
        return 'Enter your phone number';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardView} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>What's your phone number?</Text>
          <Text style={styles.subtitle}>
            We'll use this to send you payment notifications and help friends find you.
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Country Code Selector (simplified for now) */}
          <View style={styles.countrySection}>
            <Text style={styles.countryLabel}>Country</Text>
            <View style={styles.countrySelector}>
              <Text style={styles.countryFlag}>🇺🇸</Text>
              <Text style={styles.countryText}>United States (+1)</Text>
            </View>
          </View>

          {/* Phone Number Input */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Phone Number</Text>
            <TextInput
              style={[
                styles.phoneInput,
                errors.length > 0 && styles.phoneInputError
              ]}
              value={phoneNumber}
              onChangeText={handlePhoneNumberChange}
              placeholder={getPlaceholderText()}
              placeholderTextColor={theme.colors.text.tertiary}
              keyboardType="phone-pad"
              autoFocus
              returnKeyType="done"
              onSubmitEditing={validateAndProceed}
            />
            {errors.map((error, index) => (
              <Text key={index} style={styles.errorText}>
                {error}
              </Text>
            ))}
          </View>
        </View>

        {/* Continue Button */}
        <View style={styles.buttonSection}>
          <TouchableOpacity
            style={[
              styles.continueButton,
              (!phoneNumber || isLoading) && styles.continueButtonDisabled
            ]}
            onPress={validateAndProceed}
            disabled={!phoneNumber || isLoading}
          >
            <Text style={[
              styles.continueButtonText,
              (!phoneNumber || isLoading) && styles.continueButtonTextDisabled
            ]}>
              {isLoading ? 'Validating...' : 'Continue'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.disclaimer}>
            By continuing, you agree to receive SMS notifications for payments and account updates.
          </Text>
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
  keyboardView: {
    flex: 1,
    justifyContent: 'space-between',
  },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.lg,
  },
  title: {
    ...theme.typography.largeTitle,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
    textAlign: 'left',
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.text.secondary,
    lineHeight: 22,
  },
  form: {
    paddingHorizontal: theme.spacing.lg,
    flex: 1,
  },
  countrySection: {
    marginBottom: theme.spacing.xl,
  },
  countryLabel: {
    ...theme.typography.footnote,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  countrySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  countryFlag: {
    fontSize: 24,
    marginRight: theme.spacing.sm,
  },
  countryText: {
    ...theme.typography.body,
    color: theme.colors.text.primary,
  },
  inputSection: {
    marginBottom: theme.spacing.lg,
  },
  inputLabel: {
    ...theme.typography.footnote,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  phoneInput: {
    ...theme.typography.title3,
    backgroundColor: theme.colors.surface,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    color: theme.colors.text.primary,
    minHeight: 56,
  },
  phoneInputError: {
    borderColor: theme.colors.destructive,
  },
  errorText: {
    ...theme.typography.caption1,
    color: theme.colors.destructive,
    marginTop: theme.spacing.sm,
  },
  buttonSection: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  continueButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    minHeight: 56,
    justifyContent: 'center',
    ...theme.shadows.sm,
  },
  continueButtonDisabled: {
    backgroundColor: theme.colors.border,
  },
  continueButtonText: {
    ...theme.typography.headline,
    color: theme.colors.text.inverse,
    fontWeight: '600',
  },
  continueButtonTextDisabled: {
    color: theme.colors.text.tertiary,
  },
  disclaimer: {
    ...theme.typography.caption1,
    color: theme.colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 16,
  },
});

export default PhoneNumberScreen;