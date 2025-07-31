import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CHAIN_IDS, SupportedChainId, DEFAULT_ENABLED_CHAINS } from '../config/chains';

interface SettingsContextType {
  enabledChains: SupportedChainId[];
  isChainEnabled: (chainId: SupportedChainId) => boolean;
  toggleChain: (chainId: SupportedChainId) => void;
  setEnabledChains: (chains: SupportedChainId[]) => void;
  isLoading: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const STORAGE_KEY = '@BlirpMe:enabledChains';

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

interface SettingsProviderProps {
  children: ReactNode;
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children }) => {
  const [enabledChains, setEnabledChainsState] = useState<SupportedChainId[]>(DEFAULT_ENABLED_CHAINS);
  const [isLoading, setIsLoading] = useState(true);

  // Load settings from storage on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const chains = JSON.parse(stored) as number[];
        // Validate that stored chains are still supported
        const validChains = chains.filter(chainId => 
          chainId === CHAIN_IDS.ETHEREUM || chainId === CHAIN_IDS.BASE
        ) as SupportedChainId[];
        
        if (validChains.length > 0) {
          setEnabledChainsState(validChains);
        }
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async (chains: SupportedChainId[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(chains));
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  const setEnabledChains = (chains: SupportedChainId[]) => {
    setEnabledChainsState(chains);
    saveSettings(chains);
  };

  const isChainEnabled = (chainId: SupportedChainId): boolean => {
    return enabledChains.includes(chainId);
  };

  const toggleChain = (chainId: SupportedChainId) => {
    // Only allow one chain at a time
    if (!isChainEnabled(chainId)) {
      // Enable this chain and disable all others
      setEnabledChains([chainId]);
    }
    // If the chain is already enabled, do nothing (can't disable the only enabled chain)
  };

  return (
    <SettingsContext.Provider
      value={{
        enabledChains,
        isChainEnabled,
        toggleChain,
        setEnabledChains,
        isLoading,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};