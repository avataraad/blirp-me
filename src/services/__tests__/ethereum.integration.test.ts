/**
 * Integration test for Ethereum service
 * Run this test to verify actual connection to Ethereum mainnet
 * 
 * To run: npm test -- src/services/__tests__/ethereum.integration.test.ts
 */

import { getProvider, testConnection, getNetworkInfo } from '../ethereum';

// Skip these tests in CI environment
const describeIntegration = process.env.CI ? describe.skip : describe;

describeIntegration('Ethereum Service Integration', () => {
  it('should connect to Ethereum mainnet successfully', async () => {
    const isConnected = await testConnection();
    expect(isConnected).toBe(true);
  }, 10000); // 10 second timeout for network calls

  it('should get correct network information', async () => {
    const network = await getNetworkInfo();
    expect(network).toBeDefined();
    expect(network?.chainId).toBe(1);
    expect(network?.name).toBe('mainnet');
  }, 10000);

  it('should fetch current block number', async () => {
    const provider = getProvider();
    const blockNumber = await provider.getBlockNumber();
    
    expect(blockNumber).toBeGreaterThan(0);
    console.log('Current Ethereum block number:', blockNumber);
  }, 10000);
});