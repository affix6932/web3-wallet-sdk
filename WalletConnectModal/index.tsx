import { Modal } from 'antd';
import { useTranslation } from 'react-i18next';
import './index.less';
import defaultIconUrl from '../../assets/logo_dark.png'
import { useWallet } from './useWallet';
import { useEffect } from 'react';

interface WalletConnectModalProps {
  visible: boolean;
  onClose: () => void;
}

const WalletConnectModal: React.FC<WalletConnectModalProps> = ({ visible, onClose }) => {
  const { t } = useTranslation();
  
  const {
    wallets,
    updateWallets,
    checkMetaMaskWallet,
    checkCoinBaseWallet,
    checkTrustWallet
  } = useWallet();

  useEffect(() => {
    if (visible) {
      updateWallets();
    }
  }, [visible])

  const handleWalletSelect = async (walletName: string, installed: boolean) => {
    console.log(`Connecting to ${walletName}...`);
    if (!installed) return false;
    const _walletName = walletName.toLocaleLowerCase();
    if (_walletName === 'metamask') {
      console.log('%cmetamask', 'color:orange')
      checkMetaMaskWallet();
    } else if (_walletName.includes('coinbase')) {
      console.log('%ccoinbase', 'color:blue')
      checkCoinBaseWallet();
    } else if (_walletName.includes('trust')) {
      checkTrustWallet();
    }
  };

  return (
    <Modal
      title={null}
      open={visible}
      onCancel={onClose}
      footer={null}
      width={400}
      style={{ top: 300 }}
      className="wallet-connect-modal"
      closeIcon={<span className="close-icon">×</span>}
    >
      <div className="wallet-connect-content">
        <h3>Connect Wallet</h3>
        
        <div className="wallet-list">
          {wallets.map((wallet) => (
            <div 
              key={wallet.name}
              className="wallet-item"
              onClick={() => handleWalletSelect(wallet.name, wallet.installed)}
            >
              <img 
                src={wallet.icon} 
                alt={wallet.name} 
                className="wallet-icon"
                onError={(e) => {
                  // Fallback to default icon if image fails to load
                  (e.target as HTMLImageElement).src = defaultIconUrl;
                }}
              />
              <span>{wallet.name}</span>
              {
                wallet.installed ? <span className="new-badge">installed</span> : <span className="new-badge uninstall">uninstall</span>
              }
            </div>
          ))}
        </div>
        
        <div className="terms">
          By connecting your wallet, you agree to our <a href="#">Terms of Service</a> and our <a href="#">Privacy Policy</a>.
        </div>
      </div>
    </Modal>
  );
};

export default WalletConnectModal;
