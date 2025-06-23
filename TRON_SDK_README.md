## tron-sdk

tron-sdk is a JavaScript SDK for interacting with TronLink wallet, supporting TronLink.

### Installation

```bash
copy tron-sdk.js file to project
```

### Usage

```javascript
import { createTronLinkWallet } from './tron-sdk.js';

const wallet = createTronLinkWallet();

wallet.connect();
```

### API

#### isInstalled()

Check if TronLink is installed, return true on success, false on failure.

```javascript
wallet.isInstalled();
```

#### connect()

Connect to TronLink wallet, return Promise, success returns wallet instance, failure returns error information.

```javascript
wallet.connect();
```

#### transfer(options, callback)

Transfer, return Promise, success returns transfer result, failure returns error information.

```javascript
wallet.transfer({
  to: '0x...', // Recipient address
  amount: '0.01', // Amount to transfer (ETH)
  token: 'TRX' // Token symbol (TRX/USDT)
}, (error, result) => {
  if (error) {
    console.error('Transfer failed:', error);
  } else {
    console.log('Transfer successful:', result);
  }
});
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

### Example

```javascript
import { tronLinkWallet } from 'path/tronSdk.js';

const transferTron = async () => {
  if (!tronLinkWallet.isInstalled()) {
    console.error('please install TronLink extension.');
    return;
  }
  try {
    if (!tronLinkWallet.isConnected()) {
      await tronLinkWallet.connect();
    }
    const result = await tronLinkWallet.transfer(
      {
        to: 'xxde...', // Recipient address (required)
        amount: '0.01', // Transfer amount (required)
        token: 'TRX', // Token symbol: TRX/USDT/USDC (optional, defaults to TRX)
      },
      (error, result) => {
        if (error) {
          console.error('TRON transfer failed:', error);
        } else {
          console.log('TRON transfer successful:', result);
        }
      }
    );
  } catch (error) {
    console.error('TRON transfer error:', error);
  }
};
```

