/**
 * TronLink Wallet SDK - Provides functionality for interacting with TronLink wallet
 * @author bitlinkpay.com
 * @version 1.0.0
 */

// TronLink Wallet Class
class TronLinkWallet {
  constructor() {
    this.provider = null;
    this.tronWeb = null;
    this.account = null;
    this.walletType = 'TronLink';
    this.eventListeners = new Map();
    
    this._initProvider();
  }

  /**
   * Initialize TronLink provider
   * @private
   */
  _initProvider() {
    if (typeof window !== 'undefined' && window.tronWeb) {
      this.tronWeb = window.tronWeb;
      this.provider = window.tronWeb;
      console.log('TronLink provider detected');
    }
  }

  /**
   * Check if TronLink is installed
   */
  isInstalled() {
    return typeof window !== 'undefined' && 
           typeof window.tronWeb !== 'undefined' && 
           window.tronWeb.ready;
  }

  /**
   * Connect to TronLink wallet
   */
  async connect() {
    try {
      if (!this.isInstalled()) {
        throw new Error('TronLink wallet is not installed');
      }

      // Wait for TronLink to be ready
      if (!window.tronWeb.ready) {
        await this._waitForTronWebReady();
      }

      // Request account access
      const result = await window.tronWeb.request({
        method: 'tron_requestAccounts'
      });

      if (result.code === 200) {
        this.account = window.tronWeb.defaultAddress.base58;
        console.log('TronLink connected:', this.account);
        return this.account;
      } else {
        throw new Error('User rejected connection request');
      }
    } catch (error) {
      console.error('TronLink connection failed:', error);
      throw error;
    }
  }

  /**
   * Wait for TronWeb to be ready
   * @private
   */
  _waitForTronWebReady() {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 50;
      
      const checkReady = () => {
        if (window.tronWeb && window.tronWeb.ready) {
          resolve();
        } else if (attempts < maxAttempts) {
          attempts++;
          setTimeout(checkReady, 100);
        } else {
          reject(new Error('TronWeb failed to initialize'));
        }
      };
      
      checkReady();
    });
  }

  /**
   * Check if wallet is connected
   */
  async isConnected() {
    try {
      if (!this.isInstalled()) {
        return false;
      }

      this.account = window.tronWeb.defaultAddress.base58;
      return !!this.account;
    } catch (error) {
      console.error('Error checking connection status:', error);
      return false;
    }
  }

  /**
   * Get current account address
   */
  async getAccount() {
    try {
      if (!await this.isConnected()) {
        throw new Error('Wallet not connected');
      }
      
      return this.account;
    } catch (error) {
      console.error('Error getting account:', error);
      throw error;
    }
  }

  /**
   * Get network information
   */
  async getNetwork() {
    try {
      if (!this.isInstalled()) {
        throw new Error('TronLink not installed');
      }

      // Get node info to determine network
      const nodeInfo = await window.tronWeb.trx.getNodeInfo();
      const isMainnet = nodeInfo.configNodeInfo && 
                       nodeInfo.configNodeInfo.codeVersion && 
                       !nodeInfo.configNodeInfo.codeVersion.includes('testnet');

      return {
        chainId: isMainnet ? '0x2b6653dc' : '0x2b6653dd', // Mainnet: 728126428, Testnet: 728126429
        name: isMainnet ? 'TRON Mainnet' : 'TRON Testnet',
        nativeCurrency: 'TRX',
        isMainnet: isMainnet
      };
    } catch (error) {
      console.error('Error getting network:', error);
      // Default to mainnet if unable to determine
      return {
        chainId: '0x2b6653dc',
        name: 'TRON Mainnet',
        nativeCurrency: 'TRX',
        isMainnet: true
      };
    }
  }

  /**
   * Transfer TRX or TRC20 tokens
   * @param {Object} params - Transfer parameters
   * @param {string} params.to - Recipient address (required)
   * @param {string} params.amount - Transfer amount (required)
   * @param {string} [params.token] - Token symbol (TRX/USDT) (optional, defaults to TRX)
   * @param {string} [params.tokenAddress] - Token contract address (optional)
   * @param {Function} callback - Callback function
   */
  async transfer({ to, amount, token = 'TRX', tokenAddress }, callback) {
    try {
      // 1. Check if wallet is installed and connected
      if (!this.isInstalled()) {
        throw new Error('TronLink wallet is not installed');
      }

      if (!await this.isConnected()) {
        await this.connect();
      }

      // 2. Validate recipient address
      if (!window.tronWeb.isAddress(to)) {
        throw new Error('Invalid recipient address');
      }

      // 3. Get network info
      const network = await this.getNetwork();
      console.log('Current network:', network);

      let txHash;

      if (token === 'TRX' || !token) {
        // Native TRX transfer
        txHash = await this._transferTRX(to, amount);
      } else {
        // TRC20 token transfer
        const contractAddress = tokenAddress || this._getTokenAddress(token, network.isMainnet);
        txHash = await this._transferTRC20(to, amount, contractAddress, token);
      }

      // 4. Wait for transaction confirmation
      this._waitForTransactionReceipt(txHash, callback);

    } catch (error) {
      this._handleCallback(callback, error);
    }
  }

  /**
   * Transfer TRX (native currency)
   * @private
   */
  async _transferTRX(to, amount) {
    try {
      const amountSun = window.tronWeb.toSun(amount); // Convert TRX to Sun (1 TRX = 1,000,000 Sun)
      
      const transaction = await window.tronWeb.trx.sendTransaction(to, amountSun);
      
      if (transaction.result) {
        console.log('TRX transfer successful:', transaction.txid);
        return transaction.txid;
      } else {
        throw new Error('Transaction failed');
      }
    } catch (error) {
      console.error('TRX transfer error:', error);
      throw error;
    }
  }

  /**
   * Transfer TRC20 tokens
   * @private
   */
  async _transferTRC20(to, amount, contractAddress, tokenSymbol) {
    try {
      // Get token contract
      const contract = await window.tronWeb.contract().at(contractAddress);
      
      // Get token decimals
      const decimals = await contract.decimals().call();
      const tokenDecimals = parseInt(decimals.toString());
      
      // Convert amount to token units
      const tokenAmount = window.tronWeb.toBigNumber(amount).multipliedBy(Math.pow(10, tokenDecimals));
      
      console.log(`Transferring ${amount} ${tokenSymbol} (${tokenAmount.toString()} units) to ${to}`);
      
      // Execute transfer
      const transaction = await contract.transfer(to, tokenAmount.toString()).send();
      
      if (transaction) {
        console.log(`${tokenSymbol} transfer successful:`, transaction);
        return transaction;
      } else {
        throw new Error('Token transfer failed');
      }
    } catch (error) {
      console.error(`${tokenSymbol} transfer error:`, error);
      throw error;
    }
  }

  /**
   * Get token contract address
   * @private
   */
  _getTokenAddress(tokenSymbol, isMainnet = true) {
    const tokenAddresses = {
      mainnet: {
        'USDT': 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
        'USDC': 'TEkxiTehnzSmSe2XqrBj4w32RUN966rdz8',
        'JST': 'TCFLL5dx5ZJdKnWuesXxi1VPwjLVmWZZy9'
      },
      testnet: {
        'USDT': 'TG3XXyExBkPp9nzdajDZsozEu4BkaSJozs', // Nile testnet USDT
      }
    };

    const addresses = isMainnet ? tokenAddresses.mainnet : tokenAddresses.testnet;
    const address = addresses[tokenSymbol.toUpperCase()];
    
    if (!address) {
      throw new Error(`Token ${tokenSymbol} not supported on ${isMainnet ? 'mainnet' : 'testnet'}`);
    }
    
    return address;
  }

  /**
   * Wait for transaction receipt
   * @private
   */
  async _waitForTransactionReceipt(txHash, callback) {
    try {
      console.log('Waiting for transaction confirmation:', txHash);
      
      // Poll for transaction confirmation
      let attempts = 0;
      const maxAttempts = 30; // 30 attempts = ~60 seconds
      
      const pollReceipt = async () => {
        try {
          const receipt = await window.tronWeb.trx.getTransactionInfo(txHash);
          
          if (receipt && receipt.id) {
            console.log('Transaction confirmed:', receipt);
            this._handleCallback(callback, null, {
              success: true,
              txHash: txHash,
              receipt: receipt
            });
            return;
          }
          
          attempts++;
          if (attempts < maxAttempts) {
            setTimeout(pollReceipt, 2000); // Check every 2 seconds
          } else {
            throw new Error('Transaction confirmation timeout');
          }
        } catch (error) {
          console.error('Error polling transaction receipt:', error);
          this._handleCallback(callback, error);
        }
      };
      
      // Start polling after a short delay
      setTimeout(pollReceipt, 1000);
      
    } catch (error) {
      this._handleCallback(callback, error);
    }
  }

  /**
   * Add event listener
   */
  addEventListener(event, handler) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event).add(handler);

    // Setup TronLink specific event listeners
    if (event === 'accountsChanged' && window.tronWeb) {
      window.addEventListener('message', this._handleAccountChange.bind(this));
    }
  }

  /**
   * Remove event listener
   */
  removeEventListener(event, handler) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).delete(handler);
    }
  }

  /**
   * Handle account change events
   * @private
   */
  _handleAccountChange(event) {
    if (event.data && event.data.message && event.data.message.action === 'accountsChanged') {
      const newAccount = event.data.message.data;
      if (newAccount !== this.account) {
        this.account = newAccount;
        this._emitEvent('accountsChanged', [newAccount]);
      }
    }
  }

  /**
   * Emit event to listeners
   * @private
   */
  _emitEvent(event, args) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).forEach(handler => {
        try {
          handler(...args);
        } catch (error) {
          console.error(`Error in ${event} event handler:`, error);
        }
      });
    }
  }

  /**
   * Handle callback function
   * @private
   */
  _handleCallback(callback, error, result = null) {
    if (typeof callback === 'function') {
      callback(error, result);
    }
  }

  /**
   * Cleanup event listeners
   */
  cleanup() {
    this.eventListeners.clear();
    // Remove any window event listeners if needed
  }
}

// Factory function to create TronLink wallet instance
export function createTronLinkWallet() {
  return new TronLinkWallet();
}

// Pre-created TronLink wallet instance
export const tronLinkWallet = createTronLinkWallet();

export default TronLinkWallet;
