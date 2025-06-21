## web-wallet-sdk

web-wallet-sdk is a JavaScript SDK for interacting with browser wallets, supporting MetaMask, Coinbase Wallet, and Trust Wallet.

### Installation

```bash
copy web-wallet-sdk.js file to project
```

### Usage

#### Usage Method One, Self-built Wallet Instance
```javascript
import { createWallet } from './web-wallet-sdk.js'; // Import createWallet factory function

const wallet = createWallet('metamask'); // Create wallet instance

wallet.connect(); // Connect to wallet
```

### Usage Method Two, Using Predefined Wallet Instances
```javascript
import { metamaskWallet, coinbaseWallet, trustWallet } from './web-wallet-sdk.js'; // Import predefined wallet instances

// You can directly initiate a transfer, the transfer function will detect if the wallet is connected
metamaskWallet.transfer({
  to: '0x...', // Recipient address
  amount: '0.01', // Amount to transfer (ETH)
  chainId: '0xaa36a7' // Target chain ID (optional)
}, (error, result) => {
  if (error) {
    console.error('Transfer failed:', error);
  } else {
    console.log('Transfer successful:', result);
  }
});
```

### API

#### createWallet(walletType)

Create a wallet instance, supporting MetaMask, Coinbase Wallet, and Trust Wallet.

- walletType: Wallet type, optional values are 'metamask', 'coinbase', 'trust'.

#### isInstalled()

Check if the wallet is installed, return true on success, false on failure.

```javascript
wallet.isInstalled();
```

#### connect()

Connect to the wallet, return Promise, success returns wallet instance, failure returns error information.

```javascript
wallet.connect();
```

#### transfer(options, callback)

Transfer, return Promise, success returns transfer result, failure returns error information.

```javascript
wallet.transfer({
  to: '0x...', // Recipient address
  amount: '0.01', // Amount to transfer (ETH)
  chainId: '0xaa36a7' // Target chain ID (optional)
}, (error, result) => {
  if (error) {
    console.error('Transfer failed:', error);
  } else {
    console.log('Transfer successful:', result);
  }
});

// result eg.
const result = {
  receipt: {
    blockHash: "0x6b74202f0f616d26feaefd84cd53bf945d971d616d85f69222e435b9d07efa69",
    blockNumber: "0x8327f0",
    contractAddress: null,
    cumulativeGasUsed: "0x18f4ac",
    effectiveGasPrice: "0x59725f90",
    from: "0x02bc6db5e70a3457b0bad85dda296d58d2b852bc",
    gasUsed: "0x5208",
    logs: [],
    logsBloom: "0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
    status: "0x1",
    to: "0x3cbeb4d6890f7270d1725680fc604a2ec2da9d6e",
    transactionHash: "0xd2fc81bcd42dab097c85028be07275a1daec6b0a2a86f8da32173209ed4b8480",
    transactionIndex: "0xe",
    type: "0x2",
  },
  success: true,
  txHash: "0xd2fc81bcd42dab097c85028be07275a1daec6b0a2a86f8da32173209ed4b8480",
}
```

#### getNetwork()

Get the current network, return Promise, success returns network information, failure returns error information.

```javascript
wallet.getNetwork();
```

#### destroy()

Destroy the wallet instance, release resources.

```javascript
wallet.destroy();
```

### Events

#### onAccountChanged(account)

Account change event, success returns account information, failure returns error information.

```javascript
wallet.onAccountChanged(account);
```

#### onChainChanged(chainId, chainName)

Chain change event, success returns chain information, failure returns error information.

```javascript
wallet.onChainChanged(chainId, chainName);
```

#### onDisconnect(error)

Disconnect event, success returns disconnect information, failure returns error information.

```javascript
wallet.onDisconnect(error);
```

### Example

```javascript
const wallet = createWallet('metamask');

wallet.connect();

wallet.onAccountChanged(account);

wallet.onChainChanged(chainId, chainName);

wallet.onDisconnect(error);

wallet.transfer({
  to: '0x...', // Recipient address
  amount: '0.01', // Amount to transfer (ETH)
  chainId: '0xaa36a7' // Target chain ID (optional)
}, (error, result) => {
  if (error) {
    console.error('Transfer failed:', error);
  } else {
    console.log('Transfer successful:', result);
  }
});

wallet.getNetwork();

wallet.destroy();
```
