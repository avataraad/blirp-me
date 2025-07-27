import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { theme } from '../styles/theme';
import supabaseService from '../services/supabaseService';
import userProfileService from '../services/userProfileService';

const SupabaseTestScreen: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  const addResult = (title: string, data: any) => {
    const result = {
      id: Date.now(),
      title,
      data,
      timestamp: new Date().toLocaleTimeString(),
    };
    setResults(prev => [result, ...prev]);
  };

  const testConnection = async () => {
    setIsLoading(true);
    try {
      const success = await supabaseService.testConnection();
      addResult('Connection Test', {
        success,
        message: success ? 'Connection successful!' : 'Connection failed',
      });
    } catch (error) {
      addResult('Connection Test', {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
    setIsLoading(false);
  };

  const getDatabaseInfo = async () => {
    setIsLoading(true);
    try {
      const info = await supabaseService.getDatabaseInfo();
      addResult('Database Info', info);
    } catch (error) {
      addResult('Database Info', {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
    setIsLoading(false);
  };

  const testBasicOperations = async () => {
    setIsLoading(true);
    try {
      const result = await supabaseService.testBasicOperations();
      addResult('Basic Operations', result);
    } catch (error) {
      addResult('Basic Operations', {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
    setIsLoading(false);
  };

  const testUserProfiles = async () => {
    setIsLoading(true);
    try {
      const success = await userProfileService.testConnection();
      addResult('User Profiles Table', {
        success,
        message: success ? 'User profiles table accessible!' : 'User profiles table not found - needs to be created',
      });
    } catch (error) {
      addResult('User Profiles Table', {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
    setIsLoading(false);
  };

  const testCreateProfile = async () => {
    setIsLoading(true);
    try {
      const testProfile = await userProfileService.createProfile({
        tag: 'testuser123',
        phone_number: '+1234567890',
        ethereum_address: '0x742d35Cc6634C0532925a3b8D2c6d5c5B1c1b8c2',
        display_name: 'Test User',
      });

      addResult('Create Test Profile', {
        success: !!testProfile,
        profile: testProfile,
        message: testProfile ? 'Test profile created successfully!' : 'Failed to create test profile',
      });
    } catch (error) {
      addResult('Create Test Profile', {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
    setIsLoading(false);
  };

  const runAllTests = async () => {
    setResults([]);
    await testConnection();
    await getDatabaseInfo();
    await testBasicOperations();
    await testUserProfiles();
    await testCreateProfile();
    
    Alert.alert('Tests Complete', 'Check the results below for details.');
  };

  const clearResults = () => {
    setResults([]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>Supabase Connection Test</Text>
          <Text style={styles.subtitle}>
            Test the connection to your Supabase backend
          </Text>
        </View>

        <View style={styles.buttonSection}>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={runAllTests}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={theme.colors.text.inverse} />
            ) : (
              <Text style={styles.primaryButtonText}>Run All Tests</Text>
            )}
          </TouchableOpacity>

          <View style={styles.individualTests}>
            <TouchableOpacity
              style={styles.button}
              onPress={testConnection}
              disabled={isLoading}
            >
              <Text style={styles.buttonText}>Test Connection</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.button}
              onPress={getDatabaseInfo}
              disabled={isLoading}
            >
              <Text style={styles.buttonText}>Get DB Info</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.button}
              onPress={testBasicOperations}
              disabled={isLoading}
            >
              <Text style={styles.buttonText}>Test Operations</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.button}
              onPress={testUserProfiles}
              disabled={isLoading}
            >
              <Text style={styles.buttonText}>Test User Profiles</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.button}
              onPress={testCreateProfile}
              disabled={isLoading}
            >
              <Text style={styles.buttonText}>Test Create Profile</Text>
            </TouchableOpacity>
          </View>
        </View>

        {results.length > 0 && (
          <View style={styles.resultsSection}>
            <View style={styles.resultsHeader}>
              <Text style={styles.resultsTitle}>Test Results</Text>
              <TouchableOpacity onPress={clearResults}>
                <Text style={styles.clearText}>Clear</Text>
              </TouchableOpacity>
            </View>

            {results.map((result) => (
              <View key={result.id} style={styles.resultCard}>
                <View style={styles.resultHeader}>
                  <Text style={styles.resultTitle}>{result.title}</Text>
                  <Text style={styles.resultTime}>{result.timestamp}</Text>
                </View>
                <Text style={styles.resultData}>
                  {JSON.stringify(result.data, null, 2)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
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
  header: {
    padding: theme.spacing.lg,
    alignItems: 'center',
  },
  title: {
    ...theme.typography.title1,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.text.secondary,
    textAlign: 'center',
  },
  buttonSection: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  button: {
    backgroundColor: theme.colors.surface,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
    marginBottom: theme.spacing.lg,
  },
  buttonText: {
    ...theme.typography.callout,
    color: theme.colors.text.primary,
  },
  primaryButtonText: {
    ...theme.typography.headline,
    color: theme.colors.text.inverse,
  },
  individualTests: {
    gap: theme.spacing.sm,
  },
  resultsSection: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  resultsTitle: {
    ...theme.typography.title3,
    color: theme.colors.text.primary,
  },
  clearText: {
    ...theme.typography.callout,
    color: theme.colors.primary,
  },
  resultCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  resultTitle: {
    ...theme.typography.headline,
    color: theme.colors.text.primary,
  },
  resultTime: {
    ...theme.typography.caption1,
    color: theme.colors.text.tertiary,
  },
  resultData: {
    ...theme.typography.caption1,
    color: theme.colors.text.secondary,
    fontFamily: 'Courier',
    backgroundColor: theme.colors.background,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
  },
});

export default SupabaseTestScreen;