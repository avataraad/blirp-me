import {
  createError,
  parseError,
  ErrorType,
  AppError,
  withErrorHandling
} from '../errorHandling';

describe('Error Handling Service', () => {
  describe('createError', () => {
    it('should create an AppError with all properties', () => {
      const originalError = new Error('Original error');
      const error = createError(
        ErrorType.NETWORK_ERROR,
        'User friendly message',
        'Technical details',
        originalError,
        true
      );
      
      expect(error).toBeInstanceOf(Error);
      expect(error.type).toBe(ErrorType.NETWORK_ERROR);
      expect(error.userMessage).toBe('User friendly message');
      expect(error.technicalMessage).toBe('Technical details');
      expect(error.originalError).toBe(originalError);
      expect(error.retryable).toBe(true);
      expect(error.name).toBe('AppError');
    });
  });
  
  describe('parseError', () => {
    it('should return AppError if already an AppError', () => {
      const appError = createError(
        ErrorType.NETWORK_ERROR,
        'Test error'
      );
      
      const parsed = parseError(appError);
      expect(parsed).toBe(appError);
    });
    
    it('should detect network errors', () => {
      const errors = [
        new Error('Network request failed'),
        new Error('fetch failed'),
        new Error('Connection timeout'),
        new Error('Network connection lost')
      ];
      
      errors.forEach(error => {
        const parsed = parseError(error);
        expect(parsed.type).toBe(ErrorType.NETWORK_ERROR);
        expect(parsed.retryable).toBe(true);
      });
    });
    
    it('should detect insufficient balance errors', () => {
      const errors = [
        new Error('Insufficient balance'),
        new Error('insufficient funds'),
        new Error('Not enough ETH')
      ];
      
      errors.forEach(error => {
        const parsed = parseError(error);
        expect(parsed.type).toBe(ErrorType.INSUFFICIENT_BALANCE);
        expect(parsed.retryable).toBe(false);
      });
    });
    
    it('should detect gas errors', () => {
      const errors = [
        new Error('out of gas'),
        new Error('Gas required exceeds limit')
      ];
      
      errors.forEach(error => {
        const parsed = parseError(error);
        expect(parsed.type).toBe(ErrorType.INSUFFICIENT_GAS);
      });
    });
    
    it('should detect approval errors', () => {
      const errors = [
        new Error('Token approval failed'),
        new Error('Insufficient allowance')
      ];
      
      errors.forEach(error => {
        const parsed = parseError(error);
        expect(parsed.type).toBe(ErrorType.TOKEN_APPROVAL_FAILED);
        expect(parsed.retryable).toBe(true);
      });
    });
    
    it('should detect transaction errors', () => {
      const errors = [
        new Error('Transaction failed'),
        new Error('execution reverted'),
        new Error('Transaction revert')
      ];
      
      errors.forEach(error => {
        const parsed = parseError(error);
        expect(parsed.type).toBe(ErrorType.TRANSACTION_FAILED);
        expect(parsed.retryable).toBe(true);
      });
    });
    
    it('should detect quote errors', () => {
      const errors = [
        new Error('Failed to fetch quote'),
        new Error('No routes available')
      ];
      
      errors.forEach(error => {
        const parsed = parseError(error);
        expect(parsed.type).toBe(ErrorType.QUOTE_FAILED);
      });
    });
    
    it('should detect slippage errors', () => {
      const errors = [
        new Error('Slippage too high'),
        new Error('Price impact exceeded')
      ];
      
      errors.forEach(error => {
        const parsed = parseError(error);
        expect(parsed.type).toBe(ErrorType.SLIPPAGE_TOO_HIGH);
        expect(parsed.retryable).toBe(false);
      });
    });
    
    it('should detect biometric errors', () => {
      const errors = [
        new Error('Biometric authentication failed'),
        new Error('Face ID not recognized'),
        new Error('Touch ID failed')
      ];
      
      errors.forEach(error => {
        const parsed = parseError(error);
        expect(parsed.type).toBe(ErrorType.BIOMETRIC_FAILED);
        expect(parsed.retryable).toBe(true);
      });
    });
    
    it('should detect service unavailable errors', () => {
      const errors = [
        new Error('503 Service Unavailable'),
        new Error('service unavailable'),
        new Error('Service is under maintenance')
      ];
      
      errors.forEach(error => {
        const parsed = parseError(error);
        expect(parsed.type).toBe(ErrorType.SERVICE_UNAVAILABLE);
        expect(parsed.retryable).toBe(true);
      });
    });
    
    it('should detect invalid address errors', () => {
      const errors = [
        new Error('Invalid address'),
        new Error('Bad address format')
      ];
      
      errors.forEach(error => {
        const parsed = parseError(error);
        expect(parsed.type).toBe(ErrorType.INVALID_ADDRESS);
        expect(parsed.retryable).toBe(false);
      });
    });
    
    it('should detect invalid amount errors', () => {
      const errors = [
        new Error('Invalid amount'),
        new Error('Amount must be greater than 0')
      ];
      
      errors.forEach(error => {
        const parsed = parseError(error);
        expect(parsed.type).toBe(ErrorType.INVALID_AMOUNT);
        expect(parsed.retryable).toBe(false);
      });
    });
    
    it('should handle unknown errors', () => {
      const error = new Error('Something unexpected happened');
      const parsed = parseError(error);
      
      expect(parsed.type).toBe(ErrorType.UNKNOWN_ERROR);
      expect(parsed.userMessage).toBe('An unexpected error occurred. Please try again.');
      expect(parsed.retryable).toBe(true);
    });
    
    it('should handle non-Error objects', () => {
      const parsed = parseError('string error');
      
      expect(parsed.type).toBe(ErrorType.UNKNOWN_ERROR);
      expect(parsed.technicalMessage).toBe('string error');
    });
  });
  
  describe('withErrorHandling', () => {
    it('should wrap async functions and parse errors', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Network error'));
      const wrapped = withErrorHandling(mockFn, 'TestContext', false);
      
      await expect(wrapped()).rejects.toThrow();
      
      try {
        await wrapped();
      } catch (error) {
        expect((error as AppError).type).toBe(ErrorType.NETWORK_ERROR);
      }
    });
    
    it('should pass through successful results', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');
      const wrapped = withErrorHandling(mockFn, 'TestContext', false);
      
      const result = await wrapped();
      expect(result).toBe('success');
    });
    
    it('should pass arguments correctly', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');
      const wrapped = withErrorHandling(mockFn, 'TestContext', false);
      
      await wrapped('arg1', 'arg2');
      expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');
    });
  });
});