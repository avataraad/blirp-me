import React, { useState, useEffect } from 'react';
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
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../types/navigation';
import { theme } from '../styles/theme';

type PhoneVerificationScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'PhoneVerification'
>;

type PhoneVerificationScreenRouteProp = RouteProp<RootStackParamList, 'PhoneVerification'>;

type Props = {
  navigation: PhoneVerificationScreenNavigationProp;
  route: PhoneVerificationScreenRouteProp;
};

const PhoneVerificationScreen: React.FC<Props> = ({ navigation, route }) => {
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const [canResend, setCanResend] = useState(false);

  const { phoneNumber, e164PhoneNumber } = route.params;

  // Mock verification code for now (in production, this would come from SMS)
  const MOCK_VERIFICATION_CODE = '123456';

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prevTime) => {
        if (prevTime <= 1) {
          setCanResend(true);
          clearInterval(timer);
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleCodeChange = (text: string) => {
    // Only allow numbers and limit to 6 digits
    const cleanCode = text.replace(/[^0-9]/g, '').substring(0, 6);
    setCode(cleanCode);
  };

  const handleVerifyCode = async () => {
    if (code.length !== 6) {
      Alert.alert('Invalid Code', 'Please enter a 6-digit verification code.');
      return;
    }

    setIsLoading(true);

    try {
      // Mock verification - in production, verify against backend
      if (code === MOCK_VERIFICATION_CODE) {
        // Verification successful, proceed to tag creation
        navigation.navigate('CreateWalletTag', { 
          phoneNumber, 
          e164PhoneNumber 
        });
      } else {
        Alert.alert(
          'Verification Failed',
          'Invalid verification code. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Verification error:', error);
      Alert.alert('Error', 'Unable to verify code. Please try again.');
    }

    setIsLoading(false);
  };

  const handleResendCode = () => {
    if (!canResend) return;

    // Mock resend - in production, trigger new SMS
    Alert.alert(
      'Code Sent',
      `A new verification code has been sent to ${phoneNumber}`,
      [{ text: 'OK' }]
    );

    // Reset timer
    setTimeLeft(60);
    setCanResend(false);
    setCode('');

    const timer = setInterval(() => {
      setTimeLeft((prevTime) => {
        if (prevTime <= 1) {
          setCanResend(true);
          clearInterval(timer);
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardView} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Enter verification code</Text>
          <Text style={styles.subtitle}>
            We sent a 6-digit code to {phoneNumber}
          </Text>
          <Text style={styles.mockNote}>
            📱 For demo: Use code <Text style={styles.mockCode}>123456</Text>
          </Text>
        </View>

        {/* Code Input */}
        <View style={styles.form}>
          <TextInput
            style={styles.codeInput}
            value={code}
            onChangeText={handleCodeChange}
            placeholder="Enter 6-digit code"
            placeholderTextColor={theme.colors.text.tertiary}
            keyboardType="number-pad"
            autoFocus
            maxLength={6}
            returnKeyType="done"
            onSubmitEditing={handleVerifyCode}
            textAlign="center"
          />

          {/* Resend Code */}
          <View style={styles.resendSection}>
            {canResend ? (
              <TouchableOpacity onPress={handleResendCode}>
                <Text style={styles.resendText}>Resend code</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.timerText}>
                Resend code in {formatTime(timeLeft)}
              </Text>
            )}
          </View>
        </View>

        {/* Verify Button */}
        <View style={styles.buttonSection}>
          <TouchableOpacity
            style={[
              styles.verifyButton,
              (code.length !== 6 || isLoading) && styles.verifyButtonDisabled
            ]}
            onPress={handleVerifyCode}
            disabled={code.length !== 6 || isLoading}
          >
            <Text style={[
              styles.verifyButtonText,
              (code.length !== 6 || isLoading) && styles.verifyButtonTextDisabled
            ]}>
              {isLoading ? 'Verifying...' : 'Verify'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.changeNumberButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.changeNumberText}>Change phone number</Text>
          </TouchableOpacity>
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
    marginBottom: theme.spacing.lg,
  },
  mockNote: {
    ...theme.typography.footnote,
    color: theme.colors.text.tertiary,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    textAlign: 'center',
  },
  mockCode: {
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  form: {
    paddingHorizontal: theme.spacing.lg,
    flex: 1,
  },
  codeInput: {
    ...theme.typography.largeTitle,
    backgroundColor: theme.colors.surface,
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    color: theme.colors.text.primary,
    letterSpacing: 8,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  resendSection: {
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  resendText: {
    ...theme.typography.callout,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  timerText: {
    ...theme.typography.callout,
    color: theme.colors.text.tertiary,
  },
  buttonSection: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  verifyButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    minHeight: 56,
    justifyContent: 'center',
    ...theme.shadows.sm,
  },
  verifyButtonDisabled: {
    backgroundColor: theme.colors.border,
  },
  verifyButtonText: {
    ...theme.typography.headline,
    color: theme.colors.text.inverse,
    fontWeight: '600',
  },
  verifyButtonTextDisabled: {
    color: theme.colors.text.tertiary,
  },
  changeNumberButton: {
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
  changeNumberText: {
    ...theme.typography.callout,
    color: theme.colors.text.secondary,
  },
});

export default PhoneVerificationScreen;