class EthereumWallet {
  provider: any;
  walletType: string;
  account: string | null;
  chainId: string | null;
  callbacks: {
    onAccountChanged: ((account: string) => void) | null;
    onChainChanged: ((chainId: string, chainName: string) => void) | null;
    onDisconnect: ((error: any) => void) | null;
  };
  _eventHandlers: {
    accountsChanged: ((accounts: string[]) => void) | null;
    chainChanged: ((chainId: string) => void) | null;
    disconnect: ((error: any) => void) | null;
  };
  constructor(provider: any, walletType: string) {
    this.provider = provider;
    this.walletType = walletType;
    this.account = null;
    this.chainId = null;
    this.callbacks = {
      onAccountChanged: null,
      onChainChanged: null,
      onDisconnect: null
    };
    // Store event handler references
    this._eventHandlers = {
      accountsChanged: null,
      chainChanged: null,
      disconnect: null
    };
    
    if (walletType === 'coinbase' && this.provider.isMetaMask === false) {
      this.provider =  (window as any).coinbaseWalletExtension;
    } else if (walletType === 'metamask' && this.provider.providers) {
      const metamaskProvider = this.provider.providers[0].providerMap.get('MetaMask');
      if (metamaskProvider) {
        this.provider = metamaskProvider;
      }
    }
    this._setupEventListeners();
  }

  _setupEventListeners() {
    if (!this.provider) return;

    // Remove existing event listeners
    this._removeEventListeners();

    // Account changes
    const handleAccountsChanged = (accounts: string[]) => {
      this.account = accounts[0] || null;
      this.callbacks.onAccountChanged?.(this.account as string);
    };

    // Chain changes
    const handleChainChanged = (chainId: string) => {
      this.chainId = chainId;
      this.callbacks.onChainChanged?.(chainId, this._getChainName(chainId));
    };

    // Disconnect
    const handleDisconnect = (error: any) => {
      this.account = null;
      this.chainId = null;
      this.callbacks.onDisconnect?.(error);
    };

    // Save handler references
    this._eventHandlers.accountsChanged = handleAccountsChanged;
    this._eventHandlers.chainChanged = handleChainChanged;
    this._eventHandlers.disconnect = handleDisconnect;

    // Add new event listeners
    this.provider.on('accountsChanged', handleAccountsChanged);
    this.provider.on('chainChanged', handleChainChanged);
    this.provider.on('disconnect', handleDisconnect);
  }

  // Remove event listeners
  _removeEventListeners() {
    if (!this.provider) return;

    Object.entries(this._eventHandlers).forEach(([event, handler]) => {
      if (handler) {
        if (this.provider.off) {
          this.provider.off(event, handler);
        } else if (this.provider.removeListener) {
          this.provider.removeListener(event, handler);
        }
      }
    });

    // Reset handler references
    this._eventHandlers = {
      accountsChanged: null,
      chainChanged: null,
      disconnect: null
    };
  }

  // Call when component unmount or need to clean up
  destroy() {
    this._removeEventListeners();
  }

  isInstalled() {
    switch (this.walletType) {
      case 'metamask':
        return !!this.provider?.isMetaMask;
      case 'coinbase':
        return !!this.provider?.isCoinbaseWallet;
      case 'trust':
        return !!this.provider?.isTrust;
      default:
        return false;
    }
  }

  /**
   * Check if connected
   * @returns {Promise<boolean>} Whether connected
   */
  async isConnected() {
    if (!this.isInstalled()) return false;
    try {
      const accounts = await this.provider.request({ method: 'eth_accounts' });
      this.account = accounts[0];
      return accounts && accounts.length > 0;
    } catch (error) {
      console.error('Check connection status failed:', error);
      return false;
    }
  }

  /**
   * Connect to MetaMask
   * @returns {Promise<string>} Connected address
   */
  async connect() {
    if (!this.isInstalled()) {
      throw new Error('MetaMask is not installed');
    }

    try {
      const accounts = await this.provider.request({ 
        method: 'eth_requestAccounts' 
      });
      this.account = accounts[0];
      this.chainId = await this.provider.request({ method: 'eth_chainId' });
      return this.account;
    } catch (error) {
      console.error('Connect failed:', error);
      throw error;
    }
  }

  /**
   * Get current network information
   * @returns {Promise<{chainId: string, chainName: string, isTestnet: boolean}>}
   */
  async getNetwork() {
    if (!this.isInstalled()) {
      throw new Error('MetaMask is not installed');
    }

    try {
      const chainId = await this.provider.request({ method: 'eth_chainId' });
      return {
        chainId,
        chainName: this._getChainName(chainId),
        isTestnet: this._isTestnet(chainId)
      };
    } catch (error) {
      console.error('Get network information failed:', error);
      throw error;
    }
  }

  /**
   * Check if address is a contract
   * @param {string} address - Address to check
   * @returns {Promise<boolean>} Whether it is a contract
   */
  async isContract(address: string) {
    if (!this.isInstalled()) {
      throw new Error('MetaMask is not installed');
    }

    try {
      const code = await this.provider.request({
        method: 'eth_getCode',
        params: [address, 'latest']
      });
      console.log('code-', code)
      return code !== '0x' && code !== '0x0';
    } catch (error) {
      console.error('Check contract address failed:', error);
      throw error;
    }
  }

  /**
   * Transfer
   * @param {Object} params - Transfer parameters
   * @param {string} params.to - Recipient address (required)
   * @param {string} params.amount - Transfer amount (required)
   * @param {string} params.chainId - Target chain ID (required)
   * @param {string} params.token - Token symbol (ETH/USDT/USDC) (required)
   * @param {Function} callback - Callback function
   */
  async transfer({ to, amount, chainId, token }: { to: string, amount: string, chainId: string, token: string }, callback: any) {
    try {
      // 1. Check if wallet is installed
      if (!this.isInstalled()) {
        this._handleCallback(callback, new Error(`${this.walletType} wallet is not installed`));
        return;
      }

      // 2. Auto-connect if not connected
      if (!await this.isConnected()) {
        await this.connect();
      }

      // 3. Get current network and check if switch needed
      const currentNetwork = await this.getNetwork();
      console.log('currentNetwork', currentNetwork)
      console.log('chainId', chainId)
      
      // If chainId is provided and different from current, switch network
      if (chainId && currentNetwork.chainId !== chainId) {
        // Switch network
        try {
          await this.provider.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId }],
          });
          // Wait a moment for network switch to complete
          await new Promise(resolve => setTimeout(resolve, 1000));
          // Get updated network info after switch
          const updatedNetwork = await this.getNetwork();
          console.log('Switched to network:', updatedNetwork);
        } catch (switchError:any) {
          // Network doesn't exist, needs to be added
          if (switchError.code === 4902) {
            throw new Error(`Network ${chainId} not added to wallet`);
          }
          throw switchError;
        }
      }

      // Use current network's chainId for transaction
      const finalNetwork = await this.getNetwork();
      const targetChainId = finalNetwork.chainId;
      console.log('Using chainId for transaction:', targetChainId, token);

      // 4. Get token address and validate
      const { tokenAddress, isNativeToken, decimals } = this._getTokenInfo(targetChainId, token);
      console.log('Token info:', { tokenAddress, isNativeToken, decimals, token });

      // 5. Check if address is a contract (skip for token transfers)
      if (isNativeToken) {
        const isContract = await this.isContract(to);
        if (isContract) {
          this._handleCallback(callback, new Error('The receiving address is a contract address, please confirm before trying again'));
          return;
        }
      }

      // 6. Send transaction
      let txHash;
      if (isNativeToken) {
        // Native currency transfer
        const value = this._toWei(amount);
        txHash = await this.provider.request({
          method: 'eth_sendTransaction',
          params: [{
            from: this.account,
            to,
            value,
            chainId: targetChainId
          }]
        });
      } else {
        // ERC-20 token transfer
        const value = this._toTokenWei(amount, decimals);
        const data = this._buildERC20TransferData(to, value);
        
        txHash = await this.provider.request({
          method: 'eth_sendTransaction',
          params: [{
            from: this.account,
            to: tokenAddress,
            value: '0x0', // No ETH value for token transfer
            data: data,
            chainId: targetChainId,
            // gas: '0x186a0',
            gasPrice: await this.provider.request({ method: 'eth_gasPrice' })
            // gasPrice: '0x3b9aca00',
          }]
        });
      }

      // 7. Listen for transaction confirmation
      this._waitForTransactionReceipt(txHash, callback);

    } catch (error) {
      this._handleCallback(callback, error);
    }
  }

  /**
   * Get token information based on chain and token symbol
   * @private
   */
  _getTokenInfo(chainId: string, tokenSymbol: string) {
    // Find chain config
    const chainConfig = Object.values(CHAINS).find(chain => chain.chainId === chainId);
    
    if (!chainConfig) {
      throw new Error(`Unsupported chain: ${chainId}`);
    }

    // Default to native currency if no token specified
    if (!tokenSymbol || tokenSymbol.toUpperCase() === chainConfig.nativeCurrency) {
      return {
        tokenAddress: null,
        isNativeToken: true,
        decimals: this._getNativeCurrencyDecimals(chainId)
      };
    }

    const token = tokenSymbol.toUpperCase();
    
    // Check if token is supported on this chain
    if (!chainConfig.tokens.includes(token)) {
      throw new Error(`Token ${token} not supported on ${chainConfig.name}`);
    }

    // Get token address and decimals using comprehensive mapping
    const tokenInfo = this._getTokenAddressAndDecimals(chainId, token);

    if (!tokenInfo.tokenAddress) {
      throw new Error(`Token address not found for ${token} on ${chainConfig.name}`);
    }

    return {
      tokenAddress: tokenInfo.tokenAddress,
      isNativeToken: false,
      decimals: tokenInfo.decimals
    };
  }

  /**
   * Get native currency decimals for each chain
   * @private
   */
  _getNativeCurrencyDecimals(chainId: any) {
    const nativeDecimals: Record<any, any> = {
      '0x1': 18,      // ETH - Ethereum
      '0xaa36a7': 18, // ETH - Sepolia
      '0xa4b1': 18,   // ETH - Arbitrum
      '0xa': 18,      // ETH - Optimism
      '0x89': 18,     // POL - Polygon
      '0x38': 18,     // BNB - BSC
      '0xa86a': 18,   // AVAX - Avalanche
      '0x2b6653dc': 6, // TRX - TRON
      '0x5a': 9, // SOL - Solana
    };

    return nativeDecimals[chainId] || 18; // Default to 18 decimals
  }

  /**
   * Get token contract address and decimals
   * @private
   */
  _getTokenAddressAndDecimals(chainId: string, tokenSymbol: string) {
    // Comprehensive token mapping with precise decimals
    const tokenMappings:any = {
      // Ethereum Mainnet
      '0x1': {
        'USDT': { address: '0xdac17f958d2ee523a2206206994597c13d831ec7', decimals: 6 },
        'USDC': { address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', decimals: 6 },
      },
      // Sepolia Testnet
      '0xaa36a7': {
        'PYUSDT': { address: '0x...', decimals: 6 }, // Add actual testnet address
      },
      // Arbitrum One
      '0xa4b1': {
        'USDT': { address: '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9', decimals: 6 },
        'ARB': { address: '0x912ce59144191c1204e64559fe8253a0e49e6548', decimals: 18 },
      },
      // Optimism
      '0xa': {
        'USDT': { address: '0x94b008aa00579c1307b0ef2c499ad98a8ce58e58', decimals: 6 },
      },
      // Polygon
      '0x89': {
        'USDT': { address: '0xc2132d05d31c914a87c6611c10748aeb04b58e8f', decimals: 6 },
      },
      // BSC
      '0x38': {
        'USDT': { address: '0x55d398326f99059ff775485246999027b3197955', decimals: 18 },
      },
      // Avalanche C-Chain
      '0xa86a': {
        'USDT': { address: '0x9702230a8ea53601f5cd2dc00fdbc13d4df4a8c7', decimals: 6 },
      },
      // TRON (for reference, though not used in EVM context)
      '0x2b6653dc': {
        'USDT': { address: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t', decimals: 6 },
      },
      // SOL
      '0x5a': {
        'USDT': { address: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', decimals: 6 },
        'USDC': { address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', decimals: 6 },
      },
    };

    const chainTokens = tokenMappings[chainId];
    if (!chainTokens || !chainTokens[tokenSymbol]) {
      // Fallback to legacy method for compatibility
      return this._getLegacyTokenInfo(chainId, tokenSymbol);
    }

    return {
      tokenAddress: chainTokens[tokenSymbol].address,
      decimals: chainTokens[tokenSymbol].decimals
    };
  }

  /**
   * Legacy token info method for backward compatibility
   * @private
   */
  _getLegacyTokenInfo(chainId: string, token: string) {
    const chainConfig:any = Object.values(CHAINS).find(chain => chain.chainId === chainId);
    let tokenAddress;
    let decimals = 18; // Default decimals

    switch (token) {
      case 'USDT':
        tokenAddress = chainConfig.usdt_address;
        // Specific decimals for different chains
        if (chainId === '0x38') { // BSC
          decimals = 18;
        } else if (chainId === '0x2b6653dc') { // TRON
          decimals = 6;
        } else {
          decimals = 6; // Most other chains
        }
        break;
      case 'USDC':
        tokenAddress = chainConfig.usdc_address;
        decimals = chainId === '0x38' ? 18 : 6; // BSC uses 18, others use 6
        break;
      case 'PYUSDT':
        tokenAddress = chainConfig.pyusdt_address;
        decimals = 6;
        break;
      case 'ARB':
        tokenAddress = chainConfig.arb_address;
        decimals = 18;
        break;
      default:
        throw new Error(`Token address not configured for ${token}`);
    }

    return {
      tokenAddress,
      decimals
    };
  }

  /**
   * Convert amount to token wei with specific decimals
   * @private
   */
  _toTokenWei(amount: string, decimals: number) {
    const value = parseFloat(amount) * Math.pow(10, decimals);
    return '0x' + Math.floor(value).toString(16);
  }

  /**
   * Build ERC-20 transfer function data
   * @private
   */
  _buildERC20TransferData(to: string, value: string) {
    // ERC-20 transfer function signature: transfer(address,uint256)
    const functionSignature = '0xa9059cbb';
    const addressParam = to.slice(2).padStart(64, '0'); // Remove 0x and pad to 32 bytes
    const valueParam = value.slice(2).padStart(64, '0'); // Remove 0x and pad to 32 bytes
    
    return functionSignature + addressParam + valueParam;
  }

  /**
   * Listen for transaction receipt
   * @private
   */
  async _waitForTransactionReceipt(txHash: string, callback: any) {
    try {
      const receipt:any = await this._pollForTransactionReceipt(txHash);
      console.log('receipt', receipt)
      if (receipt.status === '0x1') {
        this._handleCallback(callback, null, { 
          success: true, 
          txHash,
          receipt
        } as any);
      } else {
        this._handleCallback(callback, new Error('Transaction execution failed'));
      }
    } catch (error) {
      this._handleCallback(callback, error);
    }
  }

  /**
   * Poll for transaction receipt
   * @private
   */
  _pollForTransactionReceipt(txHash: string, attempts = 0) {
    return new Promise((resolve, reject) => {
      if (attempts > 30) { // 30 * 2s = 1 minute timeout
        reject(new Error('Get transaction receipt timeout'));
        return;
      }

      setTimeout(async () => {
        console.log('poll for watching receipt cnt=', attempts);
        try {
          const receipt = await this.provider.request({
            method: 'eth_getTransactionReceipt',
            params: [txHash]
          });

          if (receipt) {
            resolve(receipt);
          } else {
            resolve(this._pollForTransactionReceipt(txHash, attempts + 1));
          }
        } catch (error) {
          reject(error);
        }
      }, 2000); // Check every 2 seconds
    });
  }

  /**
   * Handle callback
   * @private
   */
  _handleCallback(callback: any, error: any, result = null) {
    if (typeof callback === 'function') {
      if (error) {
        callback({
          success: false,
          error: error.message || 'Unknown error',
          details: error
        });
      } else {
        callback(null, {
          success: true,
          ...result as any,
        });
      }
    }
  }

  /**
   * Convert ETH to wei
   * @private
   */
  _toWei(eth: string) {
    return '0x' + (parseFloat(eth) * 1e18).toString(16);
  }

  /**
   * Get chain name
   * @private
   */
  _getChainName(chainId: '0x1'|'0x38'|'0x89'|'0xa86a'|'0x2105') {
    const chains = {
      '0x1': 'Ethereum Mainnet',
      '0x38': 'Binance Smart Chain',
      '0x89': 'Polygon',
      '0xa86a': 'Avalanche C-Chain',
      '0x2105': 'Base',
      '0xaa36a7': 'Sepolia',
    };
    return chains[chainId] || `Unknown Chain (${chainId})`;
  }

  /**
   * Check if it is a testnet
   * @private
   */
  _isTestnet(chainId: string) {
    const testnetIds = [
      '0x3',    // Ropsten
      '0x4',    // Rinkeby
      '0x5',    // Goerli
      '0x61',   // BSC Testnet
      '0x13881', // Mumbai
      '0xaa36a7' // Sepolia
    ];
    return testnetIds.includes(chainId);
  }
}

// Usage example
const getProvider = (walletType: string) => {
  const _window = window as any;
  if (typeof window === 'undefined') return null;
  if (walletType === 'coinbase') return _window.coinbaseWalletExtension;
  if (walletType === 'metamask') return _window.ethereum?.isMetaMask ? _window.ethereum : null;
  if (walletType === 'trust') return _window.trustWallet;
  return null;
};

// Create wallet instance
export const createWallet = (walletType: string): EthereumWallet | null => {
  const provider = getProvider(walletType);
  return provider ? new EthereumWallet(provider, walletType) : null;
};

export const metamaskWallet = createWallet('metamask') as EthereumWallet;
export const coinbaseWallet = createWallet('coinbase') as EthereumWallet;
export const trustWallet = createWallet('trust') as EthereumWallet;
