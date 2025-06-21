/**
 * web3-wallet SDK - Provides functionality for interacting with browser wallets
 * @author bitlinkpay.com
 * @version 1.0.0
 */

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
    this._setupEventListeners();
    if(walletType === 'metamask' && this.provider.providerMap.get('MetaMask')) {
      this.provider = this.provider.providerMap.get('MetaMask')
    }
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
   * @param {string} params.to - Recipient address
   * @param {string} params.amount - Transfer amount (in ETH)
   * @param {string} [params.chainId] - Target chain ID (optional)
   * @param {Function} callback - Callback function
   */
  async transfer({ to, amount, chainId }, callback) {
    if (!this.isInstalled()) {
      this._handleCallback(callback, new Error('MetaMask is not installed'));
      return;
    }

    try {
      // 1. Check if connected
      if (!(await this.isConnected())) {
        console.log('Wallet is not connected, connecting...');
        try {
          await this.connect();
        } catch (error) {
          this._handleCallback(callback, new Error('Connect wallet failed: ' + (error.message || 'Unknown error')));
          return;
        }
      }

      // 2. Check target network
      const currentNetwork = await this.getNetwork()
      console.log('currentNetwork', currentNetwork)
      console.log('chainId', chainId)
      if (chainId && currentNetwork.chainId !== chainId) {
        try { 
          await this.provider.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: chainId }],
          });
        } catch (switchError) {
          this._handleCallback(callback, new Error(`Switch network failed: ${switchError.message}`));
          return;
        }
      }

      // 3. Check if address is a contract
      const isContract = await this.isContract(to);
      if (isContract) {
        this._handleCallback(callback, new Error('The receiving address is a contract address, please confirm before trying again'));
        return;
      }

      // 4. Convert amount to wei
      const value = this._toWei(amount);
      
      // 5. Send transaction
      const txHash = await this.provider.request({
        method: 'eth_sendTransaction',
        params: [{
          from: this.account,
          to,
          value,
          chainId: currentNetwork.chainId
        }]
      });

      // 6. Listen for transaction confirmation
      this._waitForTransactionReceipt(txHash, callback);

    } catch (error) {
      this._handleCallback(callback, error);
    }
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