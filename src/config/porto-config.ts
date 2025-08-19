export const PORTO_RPC_ENDPOINTS = {
  mainnet: 'https://base-mainnet.rpc.ithaca.xyz', // Base Mainnet (corrected endpoint)
  testnet: 'https://base-sepolia.rpc.ithaca.xyz', // Base Sepolia (recommended for development)
  development: 'https://porto-dev.rpc.ithaca.xyz',
  local: 'http://localhost:9200'
};

export const PORTO_CONFIG = {
  // Dynamic RPC endpoint based on isTestnet flag below
  get rpcEndpoint() {
    return this.isTestnet ? PORTO_RPC_ENDPOINTS.testnet : PORTO_RPC_ENDPOINTS.mainnet;
  },
  
  // Chain configuration
  chainId: 8453,  // Base Mainnet
  testnetChainId: 84532,  // Base Sepolia
  
  // Token addresses
  usdcAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC on Base
  testnetUsdcAddress: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // USDC on Base Sepolia
  
  // Porto delegation contracts (account proxy addresses)
  delegationContract: '0x623b5b44647871268d481d2930f60d5d7f37a1fe', // Porto account proxy on Base Sepolia
  mainnetDelegationContract: '0x664ab8c20b629422f5398e58ff8989e68b26a4e6', // Porto account proxy on Base Mainnet
  
  // App configuration
  // For iOS app, rpId should be the app's associated domain
  // In development/testing, we can use the app bundle ID format
  rpId: 'blirp.me', // This should match your Associated Domains configuration
  rpName: 'BlirpMe',
  
  // Environment
  isTestnet: false, // Use Base mainnet
  
  // Get current chain config
  get currentChainId() {
    return this.isTestnet ? this.testnetChainId : this.chainId;
  },
  
  get currentUsdcAddress() {
    return this.isTestnet ? this.testnetUsdcAddress : this.usdcAddress;
  },
  
  get currentDelegationContract() {
    return this.isTestnet ? this.delegationContract : this.mainnetDelegationContract;
  }
};