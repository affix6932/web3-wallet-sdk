/**
 * web3-wallet SDK - Provides functionality for interacting with browser wallets
 * @author bitlinkpay.com
 * @version 1.0.0
 */

import { CHAINS } from './util.js';

// ethereumWallet.js
class EthereumWallet {
  constructor(provider, walletType) {
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
    if (walletType === 'metamask' && this.provider && this.provider.providerMap && typeof this.provider.providerMap.get === 'function') {
      const metamaskProvider = this.provider.providerMap.get('MetaMask');
      if (metamaskProvider) {
        this.provider = metamaskProvider;
      }
    }
    if (walletType === 'coinbase' && this.provider && this.provider.providerMap && typeof this.provider.providerMap.get === 'function') {
      const coinbaseProvider = this.provider.providerMap.get('CoinbaseWallet');
      if (coinbaseProvider) {
        this.provider = coinbaseProvider;
      }
    }
    
    this._setupEventListeners();
  }

  _setupEventListeners() {
    if (!this.provider) return;

    // Remove existing event listeners
    this._removeEventListeners();

    // Account changes
    const handleAccountsChanged = (accounts) => {
      this.account = accounts[0] || null;
      this.callbacks.onAccountChanged?.(this.account);
    };

    // Chain changes
    const handleChainChanged = (chainId) => {
      this.chainId = chainId;
      this.callbacks.onChainChanged?.(chainId, this._getChainName(chainId));
    };

    // Disconnect
    const handleDisconnect = (error) => {
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
  async isContract(address) {
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
  async transfer({ to, amount, chainId, token }, callback) {
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
        } catch (switchError) {
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
            chainId: targetChainId
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
  _getTokenInfo(chainId, tokenSymbol) {
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
  _getNativeCurrencyDecimals(chainId) {
    const nativeDecimals = {
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
  _getTokenAddressAndDecimals(chainId, tokenSymbol) {
    // Comprehensive token mapping with precise decimals
    const tokenMappings = {
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
  _getLegacyTokenInfo(chainId, token) {
    const chainConfig = Object.values(CHAINS).find(chain => chain.chainId === chainId);
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
  _toTokenWei(amount, decimals) {
    const value = parseFloat(amount) * Math.pow(10, decimals);
    return '0x' + Math.floor(value).toString(16);
  }

  /**
   * Build ERC-20 transfer function data
   * @private
   */
  _buildERC20TransferData(to, value) {
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
  async _waitForTransactionReceipt(txHash, callback) {
    try {
      const receipt = await this._pollForTransactionReceipt(txHash);
      console.log('receipt', receipt)
      if (receipt.status === '0x1') {
        this._handleCallback(callback, null, { 
          success: true, 
          txHash,
          receipt
        });
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
  _pollForTransactionReceipt(txHash, attempts = 0) {
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
  _handleCallback(callback, error, result = null) {
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
          ...result
        });
      }
    }
  }

  /**
   * Convert ETH to wei
   * @private
   */
  _toWei(eth) {
    return '0x' + (parseFloat(eth) * 1e18).toString(16);
  }

  /**
   * Get chain name
   * @private
   */
  _getChainName(chainId) {
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
  _isTestnet(chainId) {
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
const getProvider = (walletType) => {
  if (typeof window === 'undefined') return null;
  if (walletType === 'metamask') return window.ethereum?.isMetaMask ? window.ethereum : null;
  if (walletType === 'coinbase') return window.coinbaseWalletExtension;
  if (walletType === 'trust') return window.trustWallet;
  return null;
};

// Create wallet instance
export const createWallet = (walletType) => {
  const provider = getProvider(walletType);
  return provider ? new EthereumWallet(provider, walletType) : null;
};

export const metamaskWallet = createWallet('metamask');
export const coinbaseWallet = createWallet('coinbase');
export const trustWallet = createWallet('trust');

// ### Security Recommendations
// 1. Always verify the validity of the receiving address
// 2. Do not hardcode private information in the code
// 3. Use HTTPS environment for transactions
// 4. Suggest thorough testing on the test network before formal use