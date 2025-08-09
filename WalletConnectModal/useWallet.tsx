import { useEffect, useState } from 'react';
// @ts-ignore
import { metamaskWallet, coinbaseWallet, trustWallet } from '../../utils/web-wallet-sdk.js';
// or cite ts as below
import { metamaskWallet, coinbaseWallet, trustWallet } from '../../utils/web-wallet-sdk';

const isChrome = () => {
  const userAgent = navigator.userAgent.toLowerCase();
  return userAgent.indexOf('chrome') > -1 && userAgent.indexOf('edge') === -1 && userAgent.indexOf('opr') === -1;
}
const _wallets = [
  {
    name: 'MetaMask',
    icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAiIGhlaWdodD0iMzAiIHZpZXdCb3g9IjAgMCAzMCAzMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48c3ZnIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgd2lkdGg9IjIzIiBoZWlnaHQ9IjIzIiB4PSIzLjUiIHk9IjMuNSIgdmlld0JveD0iMCAwIDE0MS41MSAxMzYuNDIiPjxwYXRoIGZpbGw9IiNGRjVDMTYiIGQ9Im0xMzIuMjQgMTMxLjc1LTMwLjQ4LTkuMDctMjIuOTkgMTMuNzQtMTYuMDMtLjAxLTIzLTEzLjc0LTMwLjQ3IDkuMDhMMCAxMDAuNDdsOS4yNy0zNC43M0wwIDM2LjQgOS4yNyAwbDQ3LjYgMjguNDRoMjcuNzZMMTMyLjI0IDBsOS4yNyAzNi4zOC05LjI3IDI5LjM2IDkuMjcgMzQuNzItOS4yNyAzMS4zWiIvPjxwYXRoIGZpbGw9IiNGRjVDMTYiIGQ9Im05LjI3IDAgNDcuNjEgMjguNDZMNTQuOTggNDggOS4yOSAwWm0zMC40NyAxMDAuNDggMjAuOTUgMTUuOTUtMjAuOTUgNi4yNHYtMjIuMlpNNTkuMDEgNzQuMSA1NSA0OCAyOS4yMiA2NS43NWgtLjAybC4wOCAxOC4yNyAxMC40NS05LjkyaDE5LjI5Wk0xMzIuMjUgMGwtNDcuNiAyOC40Nkw4Ni41MSA0OGw0NS43Mi00OFptLTMwLjQ3IDEwMC40OC0yMC45NCAxNS45NSAyMC45NCA2LjI0di0yMi4yWm0xMC41My0zNC43M0w4Ni41MyA0OCA4Mi41IDc0LjFoMTkuMjdsMTAuNDYgOS45LjA3LTE4LjI2WiIvPjxwYXRoIGZpbGw9IiNFMzQ4MDciIGQ9Im0zOS43MyAxMjIuNjctMzAuNDYgOS4wOEwwIDEwMC40OGgzOS43M3YyMi4yWk01OS4wMiA3NC4xbDUuODIgMzcuNzEtOC4wNy0yMC45Ny0yNy40OS02LjgyIDEwLjQ2LTkuOTJINTlabTQyLjc2IDQ4LjU5IDMwLjQ3IDkuMDcgOS4yNy0zMS4yN2gtMzkuNzR6TTgyLjUgNzQuMDlsLTUuODIgMzcuNzEgOC4wNi0yMC45NyAyNy41LTYuODItMTAuNDctOS45MnoiLz48cGF0aCBmaWxsPSIjRkY4RDVEIiBkPSJtMCAxMDAuNDcgOS4yNy0zNC43M0gyOS4ybC4wNyAxOC4yNyAyNy41IDYuODIgOC4wNiAyMC45Ny00LjE1IDQuNjItMjAuOTQtMTUuOTZIMFptMTQxLjUgMC05LjI2LTM0LjczaC0xOS45M2wtLjA3IDE4LjI3LTI3LjUgNi44Mi04LjA2IDIwLjk3IDQuMTUgNC42MiAyMC45NC0xNS45NmgzOS43NFpNODQuNjQgMjguNDRINTYuODhsLTEuODkgMTkuNTQgOS44NCA2My44aDExLjg1bDkuODUtNjMuOC0xLjktMTkuNTRaIi8+PHBhdGggZmlsbD0iIzY2MTgwMCIgZD0iTTkuMjcgMCAwIDM2LjM4bDkuMjcgMjkuMzZIMjkuMkw1NC45OCA0OHptNDMuOTggODEuNjdoLTkuMDNsLTQuOTIgNC44MSAxNy40NyA0LjMzLTMuNTItOS4xNVpNMTMyLjI0IDBsOS4yNyAzNi4zOC05LjI3IDI5LjM2aC0xOS45M0w4Ni41MyA0OHpNODguMjcgODEuNjdoOS4wNGw0LjkyIDQuODItMTcuNDkgNC4zNCAzLjUzLTkuMTdabS05LjUgNDIuMyAyLjA2LTcuNTQtNC4xNS00LjYySDY0LjgybC00LjE0IDQuNjIgMi4wNSA3LjU0Ii8+PHBhdGggZmlsbD0iI0MwQzRDRCIgZD0iTTc4Ljc3IDEyMy45N3YxMi40NUg2Mi43NHYtMTIuNDVoMTYuMDJaIi8+PHBhdGggZmlsbD0iI0U3RUJGNiIgZD0ibTM5Ljc0IDEyMi42NiAyMyAxMy43NnYtMTIuNDZsLTIuMDUtNy41NHptNjIuMDMgMC0yMyAxMy43NnYtMTIuNDZsMi4wNi03LjU0eiIvPjwvc3ZnPjwvc3ZnPg==',
    installed: false,
  },
  {
    name: 'Coinbase Wallet',
    icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAyNCIgaGVpZ2h0PSIxMDI0IiB2aWV3Qm94PSIwIDAgMTAyNCAxMDI0IiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8Y2lyY2xlIGN4PSI1MTIiIGN5PSI1MTIiIHI9IjUxMiIgZmlsbD0iIzAwNTJGRiIvPgo8cGF0aCBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGNsaXAtcnVsZT0iZXZlbm9kZCIgZD0iTTE1MiA1MTJDMTUyIDcxMC44MjMgMzEzLjE3NyA4NzIgNTEyIDg3MkM3MTAuODIzIDg3MiA4NzIgNzEwLjgyMyA4NzIgNTEyQzg3MiAzMTMuMTc3IDcxMC44MjMgMTUyIDUxMiAxNTJDMzEzLjE3NyAxNTIgMTUyIDMxMy4xNzcgMTUyIDUxMlpNNDIwIDM5NkM0MDYuNzQ1IDM5NiAzOTYgNDA2Ljc0NSAzOTYgNDIwVjYwNEMzOTYgNjE3LjI1NSA0MDYuNzQ1IDYyOCA0MjAgNjI4SDYwNEM2MTcuMjU1IDYyOCA2MjggNjE3LjI1NSA2MjggNjA0VjQyMEM2MjggNDA2Ljc0NSA2MTcuMjU1IDM5NiA2MDQgMzk2SDQyMFoiIGZpbGw9IndoaXRlIi8+Cjwvc3ZnPgo=',
    installed: false,
  },
  {
    name: 'Trust Wallet',
    icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTgiIGhlaWdodD0iNjUiIHZpZXdCb3g9IjAgMCA1OCA2NSIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTAgOS4zODk0OUwyOC44OTA3IDBWNjUuMDA0MkM4LjI1NDUgNTYuMzM2OSAwIDM5LjcyNDggMCAzMC4zMzUzVjkuMzg5NDlaIiBmaWxsPSIjMDUwMEZGIi8+CjxwYXRoIGQ9Ik01Ny43ODIyIDkuMzg5NDlMMjguODkxNSAwVjY1LjAwNDJDNDkuNTI3NyA1Ni4zMzY5IDU3Ljc4MjIgMzkuNzI0OCA1Ny43ODIyIDMwLjMzNTNWOS4zODk0OVoiIGZpbGw9InVybCgjcGFpbnQwX2xpbmVhcl8yMjAxXzY5NDIpIi8+CjxkZWZzPgo8bGluZWFyR3JhZGllbnQgaWQ9InBhaW50MF9saW5lYXJfMjIwMV82OTQyIiB4MT0iNTEuMzYxNSIgeTE9Ii00LjE1MjkzIiB4Mj0iMjkuNTM4NCIgeTI9IjY0LjUxNDciIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIj4KPHN0b3Agb2Zmc2V0PSIwLjAyMTEyIiBzdG9wLWNvbG9yPSIjMDAwMEZGIi8+CjxzdG9wIG9mZnNldD0iMC4wNzYyNDIzIiBzdG9wLWNvbG9yPSIjMDA5NEZGIi8+CjxzdG9wIG9mZnNldD0iMC4xNjMwODkiIHN0b3AtY29sb3I9IiM0OEZGOTEiLz4KPHN0b3Agb2Zmc2V0PSIwLjQyMDA0OSIgc3RvcC1jb2xvcj0iIzAwOTRGRiIvPgo8c3RvcCBvZmZzZXQ9IjAuNjgyODg2IiBzdG9wLWNvbG9yPSIjMDAzOEZGIi8+CjxzdG9wIG9mZnNldD0iMC45MDI0NjUiIHN0b3AtY29sb3I9IiMwNTAwRkYiLz4KPC9saW5lYXJHcmFkaWVudD4KPC9kZWZzPgo8L3N2Zz4K',
    installed: false,
  },
  // { name: 'TokenPocket', icon: 'tokenpocket' },
  // { name: 'WalletConnect', icon: 'walletconnect' },
  // { name: 'Bitget Wallet', icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiIgdmlld0JveD0iMCAwIDUxMiA1MTIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI1MTIiIGhlaWdodD0iNTEyIiBmaWxsPSIjMDAxRjI5Ii8+CjxwYXRoIGQ9Ik0yMTkuOTQ4IDk1LjcwMjJDMjAxLjYyMyA5NS42OTI5IDE4My4zMyA5NS42ODM1IDE2NC45NDEgOTUuNzExNkMxNTMuODIyIDk1LjcxMTYgMTQ5LjY1MSAxMDkuNjcxIDE1Ny45MjEgMTE3LjkzOUwyODMuMDk4IDI0My4xMTdDMjg3LjAwNCAyNDYuNjkgMjg5LjQ0MSAyNTAuNTc0IDI4OS41MyAyNTUuNjkzQzI4OS40NDEgMjYwLjgxMiAyODcuMDA0IDI2NC42OTYgMjgzLjA5OCAyNjguMjY5TDE1Ny45MjEgMzkzLjQ0NkMxNDkuNjUxIDQwMS43MTUgMTUzLjgyMiA0MTUuNjc0IDE2NC45NDEgNDE1LjY3NEMxODMuMzMgNDE1LjcwMiAyMDEuNjIzIDQxNS42OTMgMjE5Ljk0OCA0MTUuNjgzQzIyOS4xMjIgNDE1LjY3OSAyMzguMzA1IDQxNS42NzQgMjQ3LjUxMSA0MTUuNjc0QzI1OS41NTUgNDE1LjY3NCAyNjYuNzIgNDA5LjI0IDI3My4xNTQgNDAyLjgwNUwzODYuMDQ3IDI4OS45MTJDMzk1LjA1NyAyODAuOTAyIDQwMy4xMTkgMjY4LjkzOSA0MDMuMDA5IDI1NS42OTNDNDAzLjExOSAyNDIuNDQ3IDM5NS4wNTcgMjMwLjQ4NCAzODYuMDQ3IDIyMS40NzRMMjczLjE1NCAxMDguNThDMjY2LjcyIDEwMi4xNDYgMjU5LjU1NSA5NS43MTE2IDI0Ny41MTEgOTUuNzExNkMyMzguMzA1IDk1LjcxMTYgMjI5LjEyMiA5NS43MDY5IDIxOS45NDggOTUuNzAyMloiIGZpbGw9IiMwMEYwRkYiLz4KPC9zdmc+Cg==' },
];

export function useWallet() {
  const [wallets, setWallets] = useState<{name: string; icon: string; installed: boolean}[]>([]);

  const transferCallback = (error:any, result: any) => {
    if (error) {
      console.error('transfer error:', error);
      confirm(error.error);
    } else {
      console.log('transfer success:', result);
    }
  }
  const checkMetaMaskWallet = async () => {
    if (!metamaskWallet.isInstalled()) {
      console.error('Please install MetaMask extension');
      return;
    }
    // transfer params data need you handle yourself data.
    const account = await metamaskWallet.transfer(
      {
        to: '0xe8987B513639E5B0aa6F5314dd46846675FF6f83', // address (required)
        amount: '1', // required
        chainId: '0x38', // Target chain ID, required
        token: 'USDT', // requried
      },
      transferCallback
    );
    // you can get the account by this way.
    console.log(account, 'metamask connnect success.')
  }

  const checkCoinBaseWallet = async () => {
    if (!coinbaseWallet.isInstalled()) {
      console.error('Please install Coinbase extension');
      return;
    }
    coinbaseWallet.transfer(
      {
        to: 'TJ9YY38mMsPLrMvfHAdTkWakBMa21kk2HC',
        amount: '1',
        chainId: '0x38',
        token: 'usdt',
      },
      transferCallback
    );
  }

  const checkTrustWallet = async () => {
    if (!trustWallet.isInstalled()) {
      console.log('Please install Trust extension');
      return;
    }
    
    const data = await trustWallet.transfer(
      {
        to: '0x02Bc6dB5E70A3457b0BAD85DDA296d58D2B852BC', // requried
        amount: '1', // required
        chainId: '0xaa36a7',  // chain ID(required)
        token: 'usdt', // required
      },
      transferCallback
    );
    console.log('data= ',data)
    // ex 1. get current network
    const network = await trustWallet.getNetwork()
    console.log('network:', network)

    // ex 2. check address
    const isContract = await trustWallet.isContract('0x02Bc6dB5E70A3457b0BAD85DDA296d58D2B852BC')
    console.log('check address:', isContract)
  }

  const updateWallets = () => {
    setWallets([
      {..._wallets[0], installed: metamaskWallet.isInstalled()},
      {..._wallets[1], installed: coinbaseWallet.isInstalled()},
      {..._wallets[2], installed: !trustWallet.isInstalled()},
    ]);
  }

  useEffect(()=> {
    if (isChrome()) {
      setWallets([
        {..._wallets[0], installed: metamaskWallet.isInstalled()},
        {..._wallets[1], installed: coinbaseWallet.isInstalled()},
        {..._wallets[2], installed: trustWallet.isInstalled()},
      ]);
      // set callback
      coinbaseWallet.callbacks.onAccountChanged = (account: string) => {
        console.log('Account changed:', account);
      };
      coinbaseWallet.callbacks.onChainChanged = (chainId: string, chainName: string) => {
        console.log('Chain changed:', chainId, chainName);
      };
      coinbaseWallet.callbacks.onDisconnect = (error: any) => {
        console.log('Disconnected:', error);
      };
      
      // set callback
      metamaskWallet.callbacks.onAccountChanged = (account: string) => {
        console.log('Account changed:', account);
      };
      metamaskWallet.callbacks.onChainChanged = (chainId: string, chainName: string) => {
        console.log('Chain changed:', chainId, chainName);
      };
      metamaskWallet.callbacks.onDisconnect = (error: any) => {
        console.log('Disconnected:', error);
      };
      // clear when component unmount.
      return () => {
        coinbaseWallet.destroy();
      };
    }
  }, [])

  return {
    wallets,
    updateWallets,
    checkMetaMaskWallet,
    checkCoinBaseWallet,
    checkTrustWallet,
  }
}