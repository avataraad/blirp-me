import 'react-native-url-polyfill/auto';
import './src/utils/crypto-polyfill';
import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AppNavigator from './src/navigation/AppNavigator';
import { WalletProvider } from './src/contexts/WalletContext';
import { SettingsProvider } from './src/contexts/SettingsContext';
import { resumeMonitoring, clearOldTransactions } from './src/services/transactionMonitor';

console.log('App.tsx: Starting app');

// Create a client for React Query
const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    // Initialize transaction monitoring on app startup
    const initializeMonitoring = async () => {
      try {
        // Clear old transactions
        await clearOldTransactions();
        
        // Resume monitoring for pending transactions
        await resumeMonitoring();
      } catch (error) {
        console.error('Failed to initialize transaction monitoring:', error);
      }
    };
    
    initializeMonitoring();
  }, []);
  
  return (
    <QueryClientProvider client={queryClient}>
      <SettingsProvider>
        <WalletProvider>
          <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
          <AppNavigator />
        </WalletProvider>
      </SettingsProvider>
    </QueryClientProvider>
  );
};

export default App;
