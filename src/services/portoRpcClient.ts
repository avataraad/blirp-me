import { PORTO_CONFIG } from '../config/porto-config';

interface RpcRequest {
  jsonrpc: '2.0';
  id: number | string;
  method: string;
  params: any[];
}

interface RpcResponse {
  jsonrpc: '2.0';
  id: number | string;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

export class PortoRpcClient {
  private endpoint: string;
  private requestId: number = 0;
  private cachedCapabilities: any = null;

  constructor(endpoint: string = PORTO_CONFIG.rpcEndpoint) {
    this.endpoint = endpoint;
  }

  async request(method: string, params: any[] = []): Promise<any> {
    const request: RpcRequest = {
      jsonrpc: '2.0',
      id: ++this.requestId,
      method,
      params
    };

    console.log(`\n📤 RPC Request: ${method}`);
    console.log('Endpoint:', this.endpoint);
    console.log('Request ID:', request.id);
    console.log('Params:', JSON.stringify(params, null, 2));

    try {
      console.log('\nSending request to:', this.endpoint);
      const startTime = Date.now();
      
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request)
      });

      const responseTime = Date.now() - startTime;
      console.log(`Response received in ${responseTime}ms`);
      console.log('HTTP Status:', response.status, response.statusText);
      
      const responseText = await response.text();
      console.log('Raw Response:', responseText);
      
      let result: RpcResponse;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse response as JSON:', parseError);
        throw new Error(`Invalid JSON response from RPC server: ${responseText.substring(0, 200)}`);
      }
      
      if (result.error) {
        console.error(`\n❌ RPC Error Response for ${method}:`);
        console.error('Error Code:', result.error.code);
        console.error('Error Message:', result.error.message);
        console.error('Error Data:', result.error.data);
        throw new Error(`RPC Error ${result.error.code}: ${result.error.message}${result.error.data ? ` - ${JSON.stringify(result.error.data)}` : ''}`);
      }
      
      console.log(`\n📥 RPC Success Response for ${method}:`, JSON.stringify(result.result, null, 2));
      return result.result;
    } catch (error) {
      console.error(`RPC request failed for ${method}:`, error);
      throw error;
    }
  }

  async batchRequest(requests: Array<{ method: string; params: any[] }>): Promise<any[]> {
    const batchRequest = requests.map((req, index) => ({
      jsonrpc: '2.0' as const,
      id: index,
      method: req.method,
      params: req.params
    }));
    
    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(batchRequest)
      });
      
      const results = await response.json();
      return results.map((r: RpcResponse) => {
        if (r.error) {
          throw new Error(`RPC Error ${r.error.code}: ${r.error.message}`);
        }
        return r.result;
      });
    } catch (error) {
      console.error('Batch RPC request failed:', error);
      throw error;
    }
  }

  async getCapabilities(chainId?: number): Promise<any> {
    // Use provided chainId or get from config
    const targetChainId = chainId || require('../config/porto-config').PORTO_CONFIG.currentChainId;
    
    // Check cache for this specific chain
    const cacheKey = `capabilities_${targetChainId}`;
    if (this.cachedCapabilities && this.cachedCapabilities[cacheKey]) {
      return this.cachedCapabilities[cacheKey];
    }
    
    try {
      console.log(`Fetching Porto capabilities for chain ${targetChainId}...`);
      // wallet_getCapabilities expects an array of chain IDs as the parameter
      const capabilities = await this.request('wallet_getCapabilities', [[targetChainId]]);
      
      // Cache the result
      if (!this.cachedCapabilities) {
        this.cachedCapabilities = {};
      }
      this.cachedCapabilities[cacheKey] = capabilities;
      
      console.log('Porto capabilities:', JSON.stringify(capabilities, null, 2));
      return capabilities;
    } catch (error) {
      console.error('Failed to fetch capabilities:', error);
      // Return empty object if fetch fails
      return {};
    }
  }
}