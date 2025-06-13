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
import Icon from 'react-native-vector-icons/Ionicons';

type SignInScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'SignIn'
>;

type Props = {
  navigation: SignInScreenNavigationProp;
};

const SignInScreen: React.FC<Props> = ({ navigation }) => {
  const handleSignIn = () => {
    // For now, just show an alert and navigate
    // We'll implement actual passkey authentication later
    Alert.alert(
      'Sign In',
      'Passkey authentication will be implemented here.',
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
            onPress={handleSignIn}
          >
            <Icon name="lock-closed-outline" size={20} color={theme.colors.text.inverse} />
            <Text style={styles.signInButtonText}>Sign In with Passkey</Text>
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
});

export default SignInScreen;