import React, { useEffect } from 'react';
import { WalletKitProvider, ConnectButton, useWalletKit } from '@mysten/wallet-kit';

const EXTENSION_ID = 'elgbajfdjbgcmcmofmlcmckilomicdmi'; // Replace with your actual extension ID

const WalletConnectInner: React.FC = () => {
  const { isConnected, currentAccount } = useWalletKit();

  useEffect(() => {
    if (isConnected && currentAccount) {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        // Chrome extension API is available
        chrome.runtime.sendMessage(EXTENSION_ID, 
          { type: 'WALLET_CONNECTED', address: currentAccount.address },
          (response) => {
            if (chrome.runtime.lastError) {
              console.error(chrome.runtime.lastError);
            } else if (response && response.success) {
              console.log('Successfully connected to extension');
              window.close();
            }
          }
        );
      } else {
        // Chrome extension API is not available
        console.log('Chrome extension API not available');
        // Here you might want to implement an alternative method
        // For example, you could store the address in localStorage
        localStorage.setItem('connectedAddress', currentAccount.address);
        window.close();
      }
    }
  }, [isConnected, currentAccount]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <h1 className="text-2xl font-bold mb-4">Connect your Sui Wallet</h1>
      <ConnectButton />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <WalletKitProvider>
      <WalletConnectInner />
    </WalletKitProvider>
  );
};

export default App;