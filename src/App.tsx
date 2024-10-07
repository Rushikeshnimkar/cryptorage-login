import React, { useEffect, useState, useRef } from 'react';
import Confetti from 'react-confetti';
import { WalletKitProvider, ConnectButton, useWalletKit } from '@mysten/wallet-kit';
import { motion, AnimatePresence, useViewportScroll, useTransform } from 'framer-motion';
import { FiLock, FiCloud, FiCamera, FiCheck, FiX, FiArrowRight, FiShare2, FiType, FiGithub } from 'react-icons/fi';
import { Helmet } from 'react-helmet';

const WalletConnectInner: React.FC = () => {
  const { isConnected, currentAccount, signMessage } = useWalletKit();
  const [extensionId, setExtensionId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<string>('Not connected');
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isExtensionEnvironment, setIsExtensionEnvironment] = useState(false);
  const { scrollYProgress } = useViewportScroll();
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.5], [1, 0.8]);

  // State to control confetti display
  const [showConfetti, setShowConfetti] = useState<boolean>(false);

  useEffect(() => {
    setIsExtensionEnvironment(typeof chrome !== 'undefined' && !!chrome.runtime && !!chrome.runtime.sendMessage);
  }, []);

  const toggleVideo = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const extId = urlParams.get('extensionId');
    if (extId) {
      setExtensionId(extId);
    } else {
      setError('Extension ID not found in URL');
    }
  }, []);

  const handleConnect = async () => {
    if (!isConnected || !currentAccount) {
      setError('Please connect your wallet first');
      return;
    }

    if (!extensionId) {
      setError('Extension ID not found');
      return;
    }

    try {
      const message = `Connect to Cryptorage extension: ${extensionId}`;
      const signedMessage = await signMessage({
        message: new TextEncoder().encode(message),
      });

      // Check if we're in a Chrome extension environment
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage(
          extensionId,
          {
            type: 'WALLET_CONNECTED',
            address: currentAccount.address,
            signedMessage: signedMessage.signature,
          },
          (response) => {
            if (chrome.runtime.lastError) {
              setError(`Error connecting to extension: ${chrome.runtime.lastError.message}`);
            } else if (response && response.success) {
              setConnectionStatus('Connected to extension');
              setError(null);
              // Trigger confetti animation
              setShowConfetti(true);
              // Stop confetti after 5 seconds
              setTimeout(() => setShowConfetti(false), 5000);
            } else {
              setError(`Unexpected response from extension: ${JSON.stringify(response)}`);
            }
          }
        );
      } else {
        // We're not in a Chrome extension environment
        console.log('Signed message:', signedMessage.signature);
        setConnectionStatus('Wallet connected (Extension not detected)');
        setError(null);
      }
    } catch (err) {
      setError(`Error signing message: ${err}`);
    }
  };

  const FeatureCard = ({
    icon: Icon,
    title,
    description,
  }: {
    icon: React.ComponentType<any>;
    title: string;
    description: string;
  }) => (
    <motion.div
      className="bg-[#2a2b36] p-6 rounded-lg shadow-lg cursor-pointer hover:border-2 border-[#00e5ff]  z-50"
      whileHover={{ scale: 1.05, boxShadow: '0px 10px 20px rgba(0,0,0,0.2)' }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      <Icon className="text-4xl mb-4 text-[#00e5ff]" />
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-gray-300">{description}</p>
    </motion.div>
  );

  

  return (
    <div className="min-h-screen bg-[#1a1b26] text-white overflow-hidden">
      <Helmet>
        <title>Cryptorage - Secure, Decentralized Screenshot Storage</title>
        <meta name="description" content="Capture, encrypt, and store screenshots directly on the blockchain with Cryptorage. Enjoy unparalleled security and accessibility for your visual data." />
        <meta name="keywords" content="Cryptorage, blockchain, screenshot storage, decentralized, encryption, Sui wallet" />
        
        {/* OpenGraph metadata */}
        <meta property="og:title" content="Cryptorage - Secure, Decentralized Screenshot Storage" />
        <meta property="og:description" content="Capture, encrypt, and store screenshots directly on the blockchain with Cryptorage. Enjoy unparalleled security and accessibility for your visual data." />
        <meta property="og:image" content="./og-image.png" /> {/* Replace with your actual OG image URL */}
        <meta property="og:url" content="https://cryptorage-login.vercel.app/" />
        <meta property="og:type" content="website" />
        
        {/* Twitter Card metadata */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Cryptorage - Secure, Decentralized Screenshot Storage" />
        <meta name="twitter:description" content="Capture, encrypt, and store screenshots directly on the blockchain with Cryptorage. Enjoy unparalleled security and accessibility for your visual data." />
        <meta name="twitter:image" content="./og-image.png" /> {/* Replace with your actual Twitter card image URL */}
        
        <link rel="canonical" href="https://cryptorage-login.vercel.app/" />
        <script type="application/ld+json">
    {`
      {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": "Cryptorage",
        "description": "Secure, Decentralized Screenshot Storage",
        "applicationCategory": "UtilitiesApplication",
        "operatingSystem": "Web"
      }
    `}
  </script>
      </Helmet>
      {/* Confetti Animation with Fade-Out Effect */}
      <AnimatePresence>
        {showConfetti && (
          <motion.div
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            style={{ position: 'absolute', width: '100%', height: '100%' }}
          >
            <Confetti />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Simplified background effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="relative w-full h-full">
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute inset-0 grid grid-cols-5 gap-4 opacity-20"
              initial={{ rotate: 0, scale: 1 }}
              animate={{
                rotate: [0, 360],
                scale: [1, 1.05, 1],
              }}
              transition={{
                duration: 30 + i * 5,
                ease: 'linear',
                repeat: Infinity,
              }}
            >
              {[...Array(30)].map((_, j) => (
                <motion.div
                  key={j}
                  className="bg-[#00e5ff] rounded-full"
                  initial={{ opacity: 0.1 }}
                  animate={{ opacity: [0.1, 0.2, 0.1] }}
                  transition={{
                    duration: 5 + (j % 3),
                    ease: 'easeInOut',
                    repeat: Infinity,
                    delay: j * 0.1,
                  }}
                />
              ))}
            </motion.div>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div className="grid grid-cols-1 lg:grid-cols-5 space-x-72 items-center">
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <motion.h1
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-5xl font-bold"
              >
                Cryptorage
              </motion.h1>
              <motion.a
                href="https://github.com/Rushikeshnimkar/CryptoRage.git"
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="text-[#00e5ff] hover:text-[#00b8cc] transition-colors duration-300"
              >
                <FiGithub className="text-3xl" />
              </motion.a>
            </div>
            <motion.p
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-2xl text-[#00e5ff] mb-6"
            >
              Secure, Decentralized Screenshot Storage
            </motion.p>
            <motion.p
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-lg text-gray-300 mb-8"
            >
              Capture, encrypt, and store screenshots directly on the blockchain. Enjoy unparalleled security and accessibility for your visual data.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="bg-[#2a2b36] rounded-lg p-6 mb-8"
            >
              <h2 className="text-2xl font-bold mb-4">Connect to Cryptorage</h2>
              <ConnectButton className="w-full bg-[#00e5ff] hover:bg-[#00b8cc] text-[#1a1b26] font-bold py-3 px-4 rounded-lg transition duration-300 text-lg shadow-lg mb-4" />
              {isConnected && (
                connectionStatus !== 'Connected to extension' ? (
                  <button
                    onClick={handleConnect}
                    className="w-full bg-[#00e5ff] hover:bg-[#00b8cc] text-[#1a1b26] font-bold py-3 px-4 rounded-lg transition duration-300 text-lg shadow-lg"
                  >
                    Connect to Extension
                  </button>
                ) : (
                  <div className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg transition duration-300 text-lg shadow-lg flex items-center justify-center">
                    <FiCheck className="mr-2" /> Connected
                  </div>
                )
              )}
              <div className="mt-4 text-sm space-y-2">
                <StatusItem label="Wallet status" value={isConnected ? 'Connected' : 'Not connected'} isConnected={isConnected} />
                <StatusItem label="Account" value={currentAccount ? `${currentAccount.address.slice(0, 6)}...${currentAccount.address.slice(-4)}` : 'None'} isConnected={!!currentAccount} />
                <StatusItem label="Extension status" value={connectionStatus} isConnected={connectionStatus === 'Connected to extension'} />
              </div>
              {error && (
                <p className="text-red-500 mt-4 text-center bg-red-500/10 p-2 rounded-lg">
                  Error: {error}
                </p>
              )}
            </motion.div>
          </div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="relative w-full max-w-md mx-auto lg:max-w-full lg:col-span-3"
          >
            <div className="absolute inset-0 rounded-lg filter blur-3xl"></div>
            <div className="relative z-10 rounded-lg shadow-2xl overflow-hidden aspect-[1000/1500] max-h-[80vh]">
              <video
                ref={videoRef}
                className="relative inset-0 w-full h-[100] object-cover"
                loop
                muted
                playsInline
                autoPlay
              >
                <source src="https://gateway.pinata.cloud/ipfs/QmPfCXii7NjwzChkLZeD6g4BJkFb2cyF1xAvQrQ8m1ZVS5" type="video/mp4" />
                Your browser does not support the video tag.
              </video>
              <button className="absolute inset-0 w-full h-full flex items-center justify-center bg-opacity-50 transition-opacity duration-300 opacity-0"></button>
            </div>
          </motion.div>
        </motion.div>

        <motion.div
  initial="hidden"
  animate="visible"
  variants={{
    hidden: {
      opacity: 0,
      y: 20,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        staggerChildren: 0.15,
      },
    },
  }}
  className="mt-24"
>
  <h2 className="text-3xl font-bold mb-8 text-center">Key Features</h2>
  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
    <FeatureCard icon={FiCamera} title="One-Click Capture" description="Easily capture and store screenshots directly from your browser." />
    <FeatureCard icon={FiCamera} title="Full-Page Capture" description="Capture entire web pages with a single click, not just what's visible on your screen." />
    <FeatureCard icon={FiLock} title="End-to-End Encryption" description="Your screenshots are encrypted and stored securely on the blockchain." />
    <FeatureCard icon={FiCloud} title="Decentralized Storage" description="Access your screenshots from anywhere, anytime, with blockchain reliability." />
    <FeatureCard icon={FiShare2} title="Team Sharing" description="Share your screenshots securely within your team for enhanced collaboration." />
    <FeatureCard icon={FiType} title="Text Extraction" description="Automatically extract and search text from your screenshots using advanced OCR technology." />
  </div>
</motion.div>
        <AnimatePresence>
        <motion.div
  className="mt-24 bg-[#2a2b36] rounded-lg p-8 shadow-md"
>
  <h2 className="text-4xl font-bold mb-6 text-[#00e5ff]">How It Works</h2>
  <ol className="list-decimal list-inside space-y-4 text-gray-300">
    <li className="flex items-start">
      <span className="mr-3 text-[#00e5ff] font-bold text-lg">1.</span>
      Install the Cryptorage browser extension.
    </li>
    <li className="flex items-start">
      <span className="mr-3 text-[#00e5ff] font-bold text-lg">2.</span>
      Connect your Sui wallet.
    </li>
    <li className="flex items-start">
      <span className="mr-3 text-[#00e5ff] font-bold text-lg">3.</span>
      Choose between full-page or normal screenshot capture.
    </li>
    <li className="flex items-start">
      <span className="mr-3 text-[#00e5ff] font-bold text-lg">4.</span>
      Your screenshots are automatically encrypted and stored on the blockchain.
    </li>
    <li className="flex items-start">
      <span className="mr-3 text-[#00e5ff] font-bold text-lg">5.</span>
      Share screenshots with your team or extract text as needed.
    </li>
    <li className="flex items-start">
      <span className="mr-3 text-[#00e5ff] font-bold text-lg">6.</span>
      Access your screenshots from any device, anytime.
    </li>
  </ol>
  <a
    href="https://github.com/Rushikeshnimkar/CryptoRage.git"
    target="_blank"
    rel="noopener noreferrer"
    className="mt-8 bg-[#00e5ff] hover:bg-[#00b8cc] text-[#1a1b26] font-bold py-3 px-6 w-[180px] rounded-lg transition-colors duration-300 text-lg shadow-lg flex items-center justify-center"
  >
    Get Started <FiArrowRight className="ml-2" />
  </a>
</motion.div>
        </AnimatePresence>
      </div>
    
    </div>
  );
};

const StatusItem = ({
  label,
  value,
  isConnected,
}: {
  label: string;
  value: string;
  isConnected: boolean;
}) => (
  <div className="flex justify-between items-center">
    <span className="text-gray-400">{label}:</span>
    <span className="font-semibold flex items-center">
      {value}
      {isConnected ? <FiCheck className="ml-2 text-green-500" /> : <FiX className="ml-2 text-red-500" />}
    </span>
  </div>
);

const App: React.FC = () => {
  return (
    <WalletKitProvider>
      <WalletConnectInner />
    </WalletKitProvider>
  );
};

export default App;