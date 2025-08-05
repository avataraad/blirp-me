import { PortoRpcClient } from './portoRpcClient';
import { PasskeyManager } from './passkeyManager';
import { PORTO_CONFIG } from '../config/porto-config';

interface TransactionCall {
  to: string;
  value?: string;
  data?: string;
}

interface TransactionStatus {
  status: 'pending' | 'success' | 'failed';
  transactionHash?: string;
  error?: string;
}

export class PortoTransactionService {
  private rpcClient: PortoRpcClient;
  
  constructor() {
    this.rpcClient = new PortoRpcClient();
  }

  /**
   * Send transaction(s) with Porto smart wallet
   * Supports single or batched transactions
   */
  async sendTransaction(
    accountAddress: string,
    passkeyId: string,
    calls: TransactionCall[]
  ): Promise<string> {
    try {
      // Phase 1: Prepare calls (simulation + quote generation)
      const prepareResult = await this.rpcClient.request('wallet_prepareCalls', [{
        account: accountAddress,
        calls,
        chainId: PORTO_CONFIG.currentChainId,
        capabilities: {
          feeToken: PORTO_CONFIG.currentUsdcAddress, // Pay gas in USDC
          // Optional: Add merchant RPC URL for sponsored transactions
          // merchantRpcUrl: 'https://your-merchant-rpc.com/sponsor'
        }
      }]);
      
      console.log('Transaction prepared:', {
        digest: prepareResult.digest,
        gasEstimate: prepareResult.gasEstimate,
        feeAmount: prepareResult.feeAmount
      });
      
      // Phase 2: Sign with passkey (triggers biometric authentication)
      const signature = await PasskeyManager.signWithPasskey(
        passkeyId,
        prepareResult.digest
      );
      
      // Phase 3: Execute transaction
      const sendResult = await this.rpcClient.request('wallet_sendPreparedCalls', [{
        context: prepareResult.context,
        signature
      }]);
      
      console.log('Transaction sent, bundle ID:', sendResult.id);
      
      // Return bundle ID for status tracking
      return sendResult.id;
      
    } catch (error) {
      console.error('Transaction failed:', error);
      throw error;
    }
  }

  /**
   * Prepare transaction without sending (for quotes/estimates)
   */
  async prepareTransaction(
    accountAddress: string,
    calls: TransactionCall[],
    merchantRpcUrl?: string
  ): Promise<{
    digest: string;
    gasEstimate: string;
    feeAmount: string;
    context: any;
  }> {
    try {
      const capabilities: any = {
        feeToken: PORTO_CONFIG.currentUsdcAddress,
      };
      
      if (merchantRpcUrl) {
        capabilities.merchantRpcUrl = merchantRpcUrl;
      }
      
      const prepareResult = await this.rpcClient.request('wallet_prepareCalls', [{
        account: accountAddress,
        calls,
        chainId: PORTO_CONFIG.currentChainId,
        capabilities
      }]);
      
      return prepareResult;
    } catch (error) {
      console.error('Transaction preparation failed:', error);
      throw error;
    }
  }

  /**
   * Send prepared transaction with signature
   */
  async sendPreparedTransaction(
    context: any,
    passkeyId: string,
    digest: string
  ): Promise<string> {
    try {
      // Sign with passkey
      const signature = await PasskeyManager.signWithPasskey(passkeyId, digest);
      
      // Send the prepared transaction
      const sendResult = await this.rpcClient.request('wallet_sendPreparedCalls', [{
        context,
        signature
      }]);
      
      return sendResult.id;
    } catch (error) {
      console.error('Failed to send prepared transaction:', error);
      throw error;
    }
  }

  /**
   * Check transaction status using bundle ID
   */
  async getTransactionStatus(bundleId: string): Promise<TransactionStatus> {
    try {
      const result = await this.rpcClient.request('wallet_getCallsStatus', [bundleId]);
      
      return {
        status: result.status,
        transactionHash: result.transactionHash,
        error: result.error
      };
    } catch (error) {
      console.error('Failed to get transaction status:', error);
      throw error;
    }
  }

  /**
   * Wait for transaction confirmation
   */
  async waitForTransaction(
    bundleId: string,
    maxAttempts: number = 30,
    intervalMs: number = 2000
  ): Promise<TransactionStatus> {
    for (let i = 0; i < maxAttempts; i++) {
      const status = await this.getTransactionStatus(bundleId);
      
      if (status.status === 'success' || status.status === 'failed') {
        return status;
      }
      
      // Wait before next attempt
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
    
    throw new Error('Transaction confirmation timeout');
  }

  /**
   * Estimate gas for transaction
   */
  async estimateGas(
    accountAddress: string,
    calls: TransactionCall[]
  ): Promise<{
    gasAmount: string;
    feeAmount: string;
    feeToken: string;
  }> {
    try {
      const prepareResult = await this.prepareTransaction(accountAddress, calls);
      
      return {
        gasAmount: prepareResult.gasEstimate,
        feeAmount: prepareResult.feeAmount,
        feeToken: PORTO_CONFIG.currentUsdcAddress
      };
    } catch (error) {
      console.error('Gas estimation failed:', error);
      throw error;
    }
  }

  /**
   * Check if transaction will be sponsored
   */
  async checkSponsorship(
    accountAddress: string,
    calls: TransactionCall[],
    merchantRpcUrl: string
  ): Promise<boolean> {
    try {
      const prepareResult = await this.prepareTransaction(
        accountAddress,
        calls,
        merchantRpcUrl
      );
      
      // If fee amount is 0, transaction is sponsored
      return prepareResult.feeAmount === '0' || prepareResult.feeAmount === '0x0';
    } catch (error) {
      console.error('Sponsorship check failed:', error);
      return false;
    }
  }
}