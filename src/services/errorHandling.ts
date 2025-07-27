/**
 * Error handling service
 * Provides centralized error handling and user-friendly error messages
 */

import { Alert } from 'react-native';

export enum ErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  INSUFFICIENT_GAS = 'INSUFFICIENT_GAS',
  TOKEN_APPROVAL_FAILED = 'TOKEN_APPROVAL_FAILED',
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  QUOTE_FAILED = 'QUOTE_FAILED',
  SLIPPAGE_TOO_HIGH = 'SLIPPAGE_TOO_HIGH',
  BIOMETRIC_FAILED = 'BIOMETRIC_FAILED',
  WALLET_NOT_FOUND = 'WALLET_NOT_FOUND',
  INVALID_ADDRESS = 'INVALID_ADDRESS',
  INVALID_AMOUNT = 'INVALID_AMOUNT',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export interface AppError extends Error {
  type: ErrorType;
  userMessage: string;
  technicalMessage?: string;
  originalError?: Error;
  retryable?: boolean;
}

/**
 * Create a standardized app error
 */
export const createError = (
  type: ErrorType,
  userMessage: string,
  technicalMessage?: string,
  originalError?: Error,
  retryable: boolean = false
): AppError => {
  const error = new Error(userMessage) as AppError;
  error.type = type;
  error.userMessage = userMessage;
  error.technicalMessage = technicalMessage;
  error.originalError = originalError;
  error.retryable = retryable;
  error.name = 'AppError';
  
  return error;
};

/**
 * Parse and categorize errors
 */
export const parseError = (error: unknown): AppError => {
  // If already an AppError, return it
  if (error instanceof Error && 'type' in error) {
    return error as AppError;
  }
  
  // Parse error message for common patterns
  const errorMessage = error instanceof Error ? error.message : String(error);
  const lowerMessage = errorMessage.toLowerCase();
  
  // Network errors
  if (
    lowerMessage.includes('network') ||
    lowerMessage.includes('fetch failed') ||
    lowerMessage.includes('timeout') ||
    lowerMessage.includes('connection')
  ) {
    return createError(
      ErrorType.NETWORK_ERROR,
      'Network connection error. Please check your internet connection.',
      errorMessage,
      error instanceof Error ? error : undefined,
      true
    );
  }
  
  // Insufficient balance
  if (
    lowerMessage.includes('insufficient balance') ||
    lowerMessage.includes('insufficient funds') ||
    lowerMessage.includes('not enough')
  ) {
    return createError(
      ErrorType.INSUFFICIENT_BALANCE,
      'Insufficient balance to complete this transaction.',
      errorMessage,
      error instanceof Error ? error : undefined,
      false
    );
  }
  
  // Gas errors
  if (
    lowerMessage.includes('gas') ||
    lowerMessage.includes('out of gas')
  ) {
    return createError(
      ErrorType.INSUFFICIENT_GAS,
      'Not enough ETH to pay for transaction fees.',
      errorMessage,
      error instanceof Error ? error : undefined,
      false
    );
  }
  
  // Approval errors
  if (
    lowerMessage.includes('approval') ||
    lowerMessage.includes('allowance')
  ) {
    return createError(
      ErrorType.TOKEN_APPROVAL_FAILED,
      'Failed to approve token spending. Please try again.',
      errorMessage,
      error instanceof Error ? error : undefined,
      true
    );
  }
  
  // Transaction errors
  if (
    lowerMessage.includes('transaction failed') ||
    lowerMessage.includes('revert') ||
    lowerMessage.includes('execution reverted')
  ) {
    return createError(
      ErrorType.TRANSACTION_FAILED,
      'Transaction failed. Please try again.',
      errorMessage,
      error instanceof Error ? error : undefined,
      true
    );
  }
  
  // Quote errors
  if (
    lowerMessage.includes('quote') ||
    lowerMessage.includes('no routes')
  ) {
    return createError(
      ErrorType.QUOTE_FAILED,
      'Unable to find a suitable trade route. Try a different amount.',
      errorMessage,
      error instanceof Error ? error : undefined,
      true
    );
  }
  
  // Slippage errors
  if (
    lowerMessage.includes('slippage') ||
    lowerMessage.includes('price impact')
  ) {
    return createError(
      ErrorType.SLIPPAGE_TOO_HIGH,
      'Price impact is too high. Consider trading a smaller amount.',
      errorMessage,
      error instanceof Error ? error : undefined,
      false
    );
  }
  
  // Biometric errors
  if (
    lowerMessage.includes('biometric') ||
    lowerMessage.includes('face id') ||
    lowerMessage.includes('touch id') ||
    lowerMessage.includes('authentication')
  ) {
    return createError(
      ErrorType.BIOMETRIC_FAILED,
      'Authentication failed. Please try again.',
      errorMessage,
      error instanceof Error ? error : undefined,
      true
    );
  }
  
  // Service unavailable
  if (
    lowerMessage.includes('503') ||
    lowerMessage.includes('service unavailable') ||
    lowerMessage.includes('maintenance')
  ) {
    return createError(
      ErrorType.SERVICE_UNAVAILABLE,
      'Service temporarily unavailable. Please try again later.',
      errorMessage,
      error instanceof Error ? error : undefined,
      true
    );
  }
  
  // Invalid address
  if (
    lowerMessage.includes('invalid address') ||
    lowerMessage.includes('bad address')
  ) {
    return createError(
      ErrorType.INVALID_ADDRESS,
      'Invalid wallet address. Please check and try again.',
      errorMessage,
      error instanceof Error ? error : undefined,
      false
    );
  }
  
  // Invalid amount
  if (
    lowerMessage.includes('invalid amount') ||
    lowerMessage.includes('amount must be')
  ) {
    return createError(
      ErrorType.INVALID_AMOUNT,
      'Invalid amount. Please enter a valid amount.',
      errorMessage,
      error instanceof Error ? error : undefined,
      false
    );
  }
  
  // Default unknown error
  return createError(
    ErrorType.UNKNOWN_ERROR,
    'An unexpected error occurred. Please try again.',
    errorMessage,
    error instanceof Error ? error : undefined,
    true
  );
};

/**
 * Show error alert to user
 */
export const showErrorAlert = (
  error: AppError,
  onRetry?: () => void,
  onDismiss?: () => void
): void => {
  const buttons: any[] = [];
  
  if (error.retryable && onRetry) {
    buttons.push({
      text: 'Retry',
      onPress: onRetry,
      style: 'default'
    });
  }
  
  buttons.push({
    text: 'OK',
    onPress: onDismiss,
    style: 'cancel'
  });
  
  Alert.alert(
    getErrorTitle(error.type),
    error.userMessage,
    buttons
  );
};

/**
 * Get user-friendly error title
 */
const getErrorTitle = (type: ErrorType): string => {
  switch (type) {
    case ErrorType.NETWORK_ERROR:
      return 'Connection Error';
    case ErrorType.INSUFFICIENT_BALANCE:
      return 'Insufficient Balance';
    case ErrorType.INSUFFICIENT_GAS:
      return 'Insufficient Gas';
    case ErrorType.TOKEN_APPROVAL_FAILED:
      return 'Approval Failed';
    case ErrorType.TRANSACTION_FAILED:
      return 'Transaction Failed';
    case ErrorType.QUOTE_FAILED:
      return 'Quote Failed';
    case ErrorType.SLIPPAGE_TOO_HIGH:
      return 'High Price Impact';
    case ErrorType.BIOMETRIC_FAILED:
      return 'Authentication Failed';
    case ErrorType.WALLET_NOT_FOUND:
      return 'Wallet Not Found';
    case ErrorType.INVALID_ADDRESS:
      return 'Invalid Address';
    case ErrorType.INVALID_AMOUNT:
      return 'Invalid Amount';
    case ErrorType.SERVICE_UNAVAILABLE:
      return 'Service Unavailable';
    default:
      return 'Error';
  }
};

/**
 * Log error for debugging
 */
export const logError = (error: AppError, context?: string): void => {
  console.error(`[${context || 'App'}] ${error.type}:`, {
    userMessage: error.userMessage,
    technicalMessage: error.technicalMessage,
    originalError: error.originalError,
    stack: error.stack
  });
};

/**
 * Wrap async function with error handling
 */
export const withErrorHandling = <T extends (...args: any[]) => Promise<any>>(
  fn: T,
  context?: string,
  showAlert: boolean = true
): T => {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      const appError = parseError(error);
      logError(appError, context);
      
      if (showAlert) {
        showErrorAlert(appError);
      }
      
      throw appError;
    }
  }) as T;
};

export default {
  createError,
  parseError,
  showErrorAlert,
  logError,
  withErrorHandling,
  ErrorType
};