import WalletConnectModal from './WalletConnectModal';
import { useState } from "react";

export default function Example() {
   const [isModalVisible, setIsModalVisible] = useState(false);

    const showModal = () => {
      setIsModalVisible(true);
    };

    const handleCancel = () => {
      setIsModalVisible(false);
    };
    
  return (
    <div>
      <button onClick={() => showModal()}>Connect wallet</button>
      <WalletConnectModal 
        visible={isModalVisible}
        onClose={handleCancel}
      />
    </div>
  )
}
