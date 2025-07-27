import 'react-native-url-polyfill/auto';
import './src/utils/crypto-polyfill';
import React from 'react';
import { StatusBar } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AppNavigator from './src/navigation/AppNavigator';
import { WalletProvider } from './src/contexts/WalletContext';

console.log('App.tsx: Starting app');

// Create a client for React Query
const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <WalletProvider>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <AppNavigator />
      </WalletProvider>
    </QueryClientProvider>
  );
};

export default App;
