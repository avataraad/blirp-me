/**
 * Transaction monitoring service
 * Monitors transaction status and provides real-time updates
 */

import { TransactionReceipt } from './transactionService';
import { checkBungeeTransactionStatus, BungeeTransactionStatus } from './bungeeService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

export interface MonitoredTransaction {
  hash: string;
  type: 'send' | 'trade' | 'approve';
  fromAddress: string;
  toAddress?: string;
  amount?: string;
  tokenSymbol?: string;
  timestamp: number;
  status: 'pending' | 'confirmed' | 'failed';
  confirmations: number;
  receipt?: TransactionReceipt;
  error?: string;
}

export interface TransactionMonitorConfig {
  pollingInterval: number; // milliseconds
  maxPollingAttempts: number;
  confirmationsRequired: number;
  showNotifications: boolean;
}

const DEFAULT_CONFIG: TransactionMonitorConfig = {
  pollingInterval: 5000, // 5 seconds
  maxPollingAttempts: 60, // 5 minutes total
  confirmationsRequired: 1,
  showNotifications: true
};

const STORAGE_KEY = '@BlirpMe/monitored_transactions';

// Active monitors
const activeMonitors = new Map<string, NodeJS.Timeout>();

/**
 * Start monitoring a transaction
 * @param transaction Transaction to monitor
 * @param config Optional configuration
 * @param onUpdate Optional callback for status updates
 */
export const startMonitoring = async (
  transaction: Omit<MonitoredTransaction, 'confirmations' | 'status'>,
  config: Partial<TransactionMonitorConfig> = {},
  onUpdate?: (tx: MonitoredTransaction) => void
): Promise<void> => {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };
  
  // Initialize transaction
  const monitoredTx: MonitoredTransaction = {
    ...transaction,
    status: 'pending',
    confirmations: 0
  };
  
  // Save to storage
  await saveTransaction(monitoredTx);
  
  // Start polling
  let attempts = 0;
  
  const checkStatus = async () => {
    attempts++;
    
    try {
      // For trades, check Bungee status
      if (transaction.type === 'trade') {
        const bungeeStatus = await checkBungeeTransactionStatus(transaction.hash);
        
        if (bungeeStatus.status === 'COMPLETED') {
          monitoredTx.status = 'confirmed';
          monitoredTx.confirmations = fullConfig.confirmationsRequired;
          
          if (fullConfig.showNotifications) {
            showSuccessNotification(monitoredTx);
          }
          
          await updateTransaction(monitoredTx);
          stopMonitoring(transaction.hash);
          
          if (onUpdate) onUpdate(monitoredTx);
          return;
        }
        
        if (bungeeStatus.status === 'FAILED') {
          monitoredTx.status = 'failed';
          monitoredTx.error = bungeeStatus.error || 'Transaction failed';
          
          if (fullConfig.showNotifications) {
            showFailureNotification(monitoredTx);
          }
          
          await updateTransaction(monitoredTx);
          stopMonitoring(transaction.hash);
          
          if (onUpdate) onUpdate(monitoredTx);
          return;
        }
      } else {
        // For regular transactions, would check via provider
        // This is a simplified version - in production would use actual provider
        console.log(`Checking transaction status: ${transaction.hash}`);
        
        // Simulate confirmation after 3 attempts for demo
        if (attempts >= 3) {
          monitoredTx.status = 'confirmed';
          monitoredTx.confirmations = fullConfig.confirmationsRequired;
          
          if (fullConfig.showNotifications) {
            showSuccessNotification(monitoredTx);
          }
          
          await updateTransaction(monitoredTx);
          stopMonitoring(transaction.hash);
          
          if (onUpdate) onUpdate(monitoredTx);
          return;
        }
      }
      
      // Update progress
      if (onUpdate) onUpdate(monitoredTx);
      
      // Check if max attempts reached
      if (attempts >= fullConfig.maxPollingAttempts) {
        monitoredTx.status = 'failed';
        monitoredTx.error = 'Transaction timeout';
        
        if (fullConfig.showNotifications) {
          showTimeoutNotification(monitoredTx);
        }
        
        await updateTransaction(monitoredTx);
        stopMonitoring(transaction.hash);
        
        if (onUpdate) onUpdate(monitoredTx);
      }
      
    } catch (error) {
      console.error('Error checking transaction status:', error);
      
      if (attempts >= fullConfig.maxPollingAttempts) {
        monitoredTx.status = 'failed';
        monitoredTx.error = error instanceof Error ? error.message : 'Unknown error';
        
        await updateTransaction(monitoredTx);
        stopMonitoring(transaction.hash);
        
        if (onUpdate) onUpdate(monitoredTx);
      }
    }
  };
  
  // Start polling
  const interval = setInterval(checkStatus, fullConfig.pollingInterval);
  activeMonitors.set(transaction.hash, interval);
  
  // Initial check
  checkStatus();
};

/**
 * Stop monitoring a transaction
 * @param hash Transaction hash
 */
export const stopMonitoring = (hash: string): void => {
  const interval = activeMonitors.get(hash);
  if (interval) {
    clearInterval(interval);
    activeMonitors.delete(hash);
  }
};

/**
 * Stop all active monitors
 */
export const stopAllMonitoring = (): void => {
  activeMonitors.forEach((interval) => clearInterval(interval));
  activeMonitors.clear();
};

/**
 * Get all monitored transactions
 * @returns List of monitored transactions
 */
export const getMonitoredTransactions = async (): Promise<MonitoredTransaction[]> => {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to load monitored transactions:', error);
    return [];
  }
};

/**
 * Get pending transactions
 * @returns List of pending transactions
 */
export const getPendingTransactions = async (): Promise<MonitoredTransaction[]> => {
  const all = await getMonitoredTransactions();
  return all.filter(tx => tx.status === 'pending');
};

/**
 * Clear old transactions (older than 7 days)
 */
export const clearOldTransactions = async (): Promise<void> => {
  const all = await getMonitoredTransactions();
  const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
  
  const recent = all.filter(tx => tx.timestamp > weekAgo);
  
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(recent));
  } catch (error) {
    console.error('Failed to clear old transactions:', error);
  }
};

/**
 * Resume monitoring for pending transactions
 * Called on app startup
 */
export const resumeMonitoring = async (
  config?: Partial<TransactionMonitorConfig>,
  onUpdate?: (tx: MonitoredTransaction) => void
): Promise<void> => {
  const pending = await getPendingTransactions();
  
  for (const tx of pending) {
    // Don't monitor transactions older than 1 hour
    if (Date.now() - tx.timestamp > 3600000) {
      tx.status = 'failed';
      tx.error = 'Transaction expired';
      await updateTransaction(tx);
      continue;
    }
    
    startMonitoring(tx, config, onUpdate);
  }
};

// Private helper functions

const saveTransaction = async (tx: MonitoredTransaction): Promise<void> => {
  const transactions = await getMonitoredTransactions();
  transactions.push(tx);
  
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
  } catch (error) {
    console.error('Failed to save transaction:', error);
  }
};

const updateTransaction = async (tx: MonitoredTransaction): Promise<void> => {
  const transactions = await getMonitoredTransactions();
  const index = transactions.findIndex(t => t.hash === tx.hash);
  
  if (index !== -1) {
    transactions[index] = tx;
    
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
    } catch (error) {
      console.error('Failed to update transaction:', error);
    }
  }
};

const showSuccessNotification = (tx: MonitoredTransaction): void => {
  let message = '';
  
  switch (tx.type) {
    case 'send':
      message = `Successfully sent ${tx.amount} ${tx.tokenSymbol}`;
      break;
    case 'trade':
      message = 'Trade completed successfully';
      break;
    case 'approve':
      message = `Token approval successful`;
      break;
  }
  
  Alert.alert('Transaction Confirmed', message, [{ text: 'OK' }]);
};

const showFailureNotification = (tx: MonitoredTransaction): void => {
  let message = tx.error || 'Transaction failed';
  
  Alert.alert('Transaction Failed', message, [{ text: 'OK' }]);
};

const showTimeoutNotification = (tx: MonitoredTransaction): void => {
  Alert.alert(
    'Transaction Timeout',
    'The transaction is taking longer than expected. You can check its status later.',
    [{ text: 'OK' }]
  );
};

export default {
  startMonitoring,
  stopMonitoring,
  stopAllMonitoring,
  getMonitoredTransactions,
  getPendingTransactions,
  clearOldTransactions,
  resumeMonitoring
};