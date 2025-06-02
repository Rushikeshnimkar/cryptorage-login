"use client";

import React, { useEffect, useState, useRef } from "react";
import Confetti from "react-confetti";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiCheck,
  FiX,
  FiGithub,
  FiArrowRight,
  FiCamera,
  FiLock,
  FiCloud,
  FiMessageCircle,
} from "react-icons/fi";
import Head from "next/head";
import Image from "next/image";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useSignMessage, useDisconnect } from "wagmi";
import { supabase } from "../supabaseClient"; // adjust the path if needed
import logo from "../../public/logo.png";
import cryptorageText from "../../public/cryptorage-text.png";

interface StatusItemProps {
  label: string;
  value: string;
  isConnected: boolean;
}

const StatusItem: React.FC<StatusItemProps> = ({
  label,
  value,
  isConnected,
}) => (
  <div className="flex justify-between items-center py-2 px-3 bg-[#1e1f2a] rounded-md border border-[#3a3b46]">
    <span className="text-gray-400 text-sm font-medium">{label}:</span>
    <span className="font-semibold flex items-center text-sm">
      {value}
      {isConnected ? (
        <FiCheck className="ml-2 text-green-400 w-4 h-4" />
      ) : (
        <FiX className="ml-2 text-red-400 w-4 h-4" />
      )}
    </span>
  </div>
);

const WalletConnectInner: React.FC = () => {
  const { address, isConnected, chain } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { disconnect } = useDisconnect();

  const [extensionId, setExtensionId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] =
    useState<string>("Not connected");
  const [isExtensionConnected, setIsExtensionConnected] = useState(false);
  const [isExtensionEnvironment, setIsExtensionEnvironment] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showConfetti, setShowConfetti] = useState<boolean>(false);

  const ETHEREUM_CHAIN_ID = 1;

  const FeatureCard = ({
    icon: Icon,
    title,
    description,
  }: {
    icon: React.ComponentType<{ className: string }>;
    title: string;
    description: string;
  }) => (
    <motion.div
      className="bg-gradient-to-br from-[#2a2b36] to-[#1e1f2a] p-6 rounded-xl shadow-xl border border-[#3a3b46] hover:border-[#00e5ff] transition-all duration-300 group"
      whileHover={{
        scale: 1.02,
        y: -5,
        boxShadow: "0px 20px 40px rgba(0,229,255,0.1)",
      }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <div className="bg-gradient-to-br from-[#00e5ff] to-[#00b8cc] p-3 rounded-lg w-fit mb-4 group-hover:scale-110 transition-transform duration-300">
        <Icon className="text-2xl text-[#1a1b26]" />
      </div>
      <h3 className="text-xl font-bold mb-3 text-white group-hover:text-[#00e5ff] transition-colors duration-300">
        {title}
      </h3>
      <p className="text-gray-300 leading-relaxed">{description}</p>
    </motion.div>
  );

  // Detect if running in a Chrome-extension-like environment
  useEffect(() => {
    setIsExtensionEnvironment(
      typeof window !== "undefined" &&
        typeof chrome !== "undefined" &&
        !!chrome.runtime &&
        !!chrome.runtime.sendMessage
    );
  }, []);

  // Read extensionId from URL query string
  useEffect(() => {
    if (typeof window === "undefined") return;
    const urlParams = new URLSearchParams(window.location.search);
    const extId = urlParams.get("extensionId");
    if (extId) {
      setExtensionId(extId);
    } else {
      setError("Extension ID not found in URL");
    }
  }, []);

  // Update connectionStatus and error when wallet or network changes
  useEffect(() => {
    if (!isConnected) {
      setIsExtensionConnected(false);
      setConnectionStatus("Not connected");
      setError(null);
    } else if (chain?.id !== ETHEREUM_CHAIN_ID) {
      setConnectionStatus("Wrong network - Please switch to Ethereum");
      setError("Please switch to Ethereum mainnet");
    } else {
      setConnectionStatus("Wallet connected");
      setError(null);
    }
  }, [isConnected, chain]);

  const sendConnectionMessage = (signature: string) => {
    if (typeof chrome === "undefined") return;

    chrome.runtime.sendMessage(
      extensionId,
      {
        type: "WALLET_CONNECTED",
        address: address,
        signedMessage: signature,
        chainId: chain?.id,
        chainName: chain?.name,
      },
      (response: { success: unknown; error: unknown }) => {
        if (chrome.runtime.lastError) {
          setError(
            `Error connecting to extension: ${chrome.runtime.lastError.message}`
          );
          setIsExtensionConnected(false);
        } else if (response && response.success) {
          setConnectionStatus("Connected to extension");
          setIsExtensionConnected(true);
          setError(null);
          // Trigger confetti animation
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 5000);
        } else {
          const errorMsg = response
            ? response.error || "Unknown error"
            : "No response from extension";
          setError(`Failed to connect to extension: ${errorMsg}`);
          setIsExtensionConnected(false);
        }
      }
    );
  };

  const handleConnectToExtension = async () => {
    if (!isConnected || !address) {
      setError("Please connect your wallet first");
      return;
    }
    if (chain?.id !== ETHEREUM_CHAIN_ID) {
      setError("Please switch to Ethereum mainnet");
      return;
    }
    if (!extensionId) {
      setError("Extension ID not found");
      return;
    }

    try {
      setError(null);
      const message = `Connect to Cryptorage extension: ${extensionId}\nTimestamp: ${Date.now()}`;
      const signature = await signMessageAsync({ message });

      // If in Chrome extension environment, attempt to ping & connect
      if (isExtensionEnvironment && typeof chrome !== "undefined") {
        chrome.runtime.sendMessage(extensionId, { type: "PING" }, () => {
          if (chrome.runtime.lastError) {
            setError(
              `Extension not found or not installed. Please ensure the Cryptorage extension is installed and enabled. Error: ${chrome.runtime.lastError.message}`
            );
            setIsExtensionConnected(false);
            return;
          }
          sendConnectionMessage(signature);
        });
      } else {
        // Not in Chrome extension environment
        console.log("Signed message:", signature);
        setConnectionStatus("Wallet connected (No extension detected)");
        setError(
          "Chrome extension environment not detected. This feature works only in Chrome browser with the extension installed."
        );
        setIsExtensionConnected(false);
      }

      // Upsert wallet address into Supabase login table
      try {
        const { data, error: supabaseError } = await supabase
          .from("login")
          .upsert(
            {
              address: address,
              chain_id: chain?.id,
              chain_name: chain?.name,
              connected_at: new Date().toISOString(),
            },
            { onConflict: "address" }
          );

        if (supabaseError) {
          console.error("Supabase Upsert Error:", supabaseError.message);
        } else {
          console.log("Wallet address stored successfully:", data);
        }
      } catch (err) {
        console.error("Supabase Error:", err);
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "UserRejectedRequestError") {
        setError("Message signing was rejected by user");
      } else {
        setError(
          `Error signing message: ${
            err instanceof Error ? err.message : String(err)
          }`
        );
      }
      setIsExtensionConnected(false);
    }
  };

  const handleDisconnect = () => {
    disconnect();
    setIsExtensionConnected(false);
    setConnectionStatus("Not connected");
    setError(null);
  };

  const isOnEthereum = chain?.id === ETHEREUM_CHAIN_ID;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1b26] via-[#1e1f2a] to-[#1a1b26] text-white overflow-hidden">
      <Head>
        <title>
          Cryptorage - Secure Screenshot Storage | Final Year Project
        </title>
      </Head>

      {/* Confetti Animation */}
      <AnimatePresence>
        {showConfetti && (
          <motion.div
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className="fixed inset-0 w-full h-full z-50 pointer-events-none"
          >
            <Confetti />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Enhanced Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="relative w-full h-full">
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute inset-0 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 opacity-20"
              initial={{ rotate: 0, scale: 1 }}
              animate={{
                rotate: [0, 360],
                scale: [1, 1.05, 1],
              }}
              transition={{
                duration: 30 + i * 5,
                ease: "linear",
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
                    ease: "easeInOut",
                    repeat: Infinity,
                    delay: j * 0.1,
                  }}
                />
              ))}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Main Content Container */}
      <div className="relative z-10">
        {/* Header Section */}
        <header className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex items-center justify-between"
          >
            <div className="flex items-center space-x-4">
              <div className=" p-2 rounded-xl">
                <Image
                  src={logo}
                  alt="Cryptorage Logo"
                  width={40}
                  height={40}
                  className="w-10 h-10"
                />
              </div>
              <Image
                src={cryptorageText}
                alt="Cryptorage"
                className="h-8 w-auto"
              />
            </div>
            <motion.a
              href="https://github.com/Rushikeshnimkar/CryptoRage.git"
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className="bg-[#2a2b36] p-3 rounded-xl border border-[#3a3b46] hover:border-[#00e5ff] transition-all duration-300 group"
            >
              <FiGithub className="text-2xl text-[#00e5ff] group-hover:scale-110 transition-transform duration-300" />
            </motion.a>
          </motion.div>
        </header>

        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            {/* Left Content */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="space-y-6"
            >
              {/* Hero Text */}
              <div className="space-y-4">
                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="text-3xl lg:text-4xl font-bold leading-tight"
                >
                  <span className="bg-gradient-to-r from-[#00e5ff] to-[#00b8cc] bg-clip-text text-transparent">
                    Secure, Decentralized
                  </span>
                  <br />
                  <span className="text-white">Screenshot Storage</span>
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                  className="text-lg text-gray-300 leading-relaxed max-w-2xl"
                >
                  Capture, encrypt, and store screenshots directly on the
                  blockchain. Enjoy unparalleled security and accessibility for
                  your visual data.
                </motion.p>
              </div>

              {/* Connection Panel */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="bg-gradient-to-br from-[#2a2b36] to-[#1e1f2a] rounded-2xl p-6 border border-[#3a3b46] shadow-2xl backdrop-blur-sm"
              >
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-2 h-2 bg-[#00e5ff] rounded-full animate-pulse"></div>
                  <h2 className="text-xl font-bold text-white">
                    Connect to Cryptorage
                  </h2>
                </div>

                {/* RainbowKit Connect Button */}
                <div className="space-y-3">
                  <ConnectButton.Custom>
                    {({
                      account,
                      chain,
                      openAccountModal,
                      openChainModal,
                      openConnectModal,
                      authenticationStatus,
                      mounted,
                    }) => {
                      const ready =
                        mounted && authenticationStatus !== "loading";
                      const connected =
                        ready &&
                        account &&
                        chain &&
                        (!authenticationStatus ||
                          authenticationStatus === "authenticated");

                      return (
                        <div
                          {...(!ready && {
                            "aria-hidden": true,
                            style: {
                              opacity: 0,
                              pointerEvents: "none",
                              userSelect: "none",
                            },
                          })}
                        >
                          {!connected ? (
                            <button
                              onClick={openConnectModal}
                              type="button"
                              className="w-full bg-gradient-to-r from-[#00e5ff] to-[#00b8cc] hover:from-[#00b8cc] hover:to-[#008fa3] text-[#1a1b26] font-bold py-3 px-5 rounded-xl transition-all duration-300 text-base shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
                            >
                              Connect Wallet
                            </button>
                          ) : chain?.id !== ETHEREUM_CHAIN_ID ? (
                            <button
                              onClick={openChainModal}
                              type="button"
                              className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold py-3 px-5 rounded-xl transition-all duration-300 text-base shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
                            >
                              Switch to Ethereum
                            </button>
                          ) : (
                            <div className="grid grid-cols-2 gap-2">
                              <div className="bg-[#1e1f2a] border-2 border-[#00e5ff] text-[#00e5ff] font-bold py-2.5 px-3 rounded-xl flex items-center justify-center text-sm">
                                <div className="w-2.5 h-2.5 bg-[#627EEA] rounded-full mr-2"></div>
                                Ethereum
                              </div>
                              <button
                                onClick={openAccountModal}
                                type="button"
                                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-2.5 px-3 rounded-xl transition-all duration-300 flex items-center justify-center transform hover:scale-[1.02] text-sm"
                              >
                                <FiCheck className="mr-1.5 w-3.5 h-3.5" />
                                {account.displayName}
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    }}
                  </ConnectButton.Custom>

                  {/* Network Warning */}
                  {isConnected && !isOnEthereum && (
                    <div className="bg-red-500/10 border-2 border-red-500 text-red-400 font-semibold py-2.5 px-3 rounded-xl text-center backdrop-blur-sm text-sm">
                      ⚠️ Please switch to Ethereum mainnet to continue
                    </div>
                  )}

                  {/* Extension Connection Button */}
                  {isConnected && isOnEthereum && !isExtensionConnected && (
                    <button
                      onClick={handleConnectToExtension}
                      className="w-full bg-gradient-to-r from-[#00e5ff] to-[#00b8cc] hover:from-[#00b8cc] hover:to-[#008fa3] text-[#1a1b26] font-bold py-3 px-5 rounded-xl transition-all duration-300 text-base shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
                    >
                      Connect to Extension
                    </button>
                  )}

                  {/* Connected to Extension */}
                  {isExtensionConnected && (
                    <div className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white font-bold py-3 px-5 rounded-xl flex items-center justify-center shadow-lg text-base">
                      <FiCheck className="mr-2 w-4 h-4" />
                      Connected to Extension
                    </div>
                  )}
                </div>

                {/* Status Information */}
                <div className="mt-4 space-y-2">
                  <StatusItem
                    label="Wallet Status"
                    value={isConnected ? "Connected" : "Not connected"}
                    isConnected={isConnected}
                  />
                  <StatusItem
                    label="Account"
                    value={
                      address
                        ? `${address.slice(0, 6)}...${address.slice(-4)}`
                        : "None"
                    }
                    isConnected={!!address}
                  />
                  <StatusItem
                    label="Network"
                    value={isOnEthereum ? "Ethereum" : chain?.name || "None"}
                    isConnected={isOnEthereum}
                  />
                  <StatusItem
                    label="Extension Status"
                    value={connectionStatus}
                    isConnected={isExtensionConnected}
                  />
                </div>

                {/* Disconnect Button */}
                {isConnected && (
                  <button
                    onClick={handleDisconnect}
                    className="w-full mt-4 bg-red-500/10 border-2 border-red-500 text-red-400 hover:bg-red-500 hover:text-white font-bold py-2.5 px-4 rounded-xl transition-all duration-300 transform hover:scale-[1.02] text-sm"
                  >
                    Disconnect Wallet
                  </button>
                )}

                {/* Error Message */}
                {error && (
                  <div className="mt-3 p-3 bg-red-500/10 border border-red-500 text-red-400 rounded-xl backdrop-blur-sm">
                    <p className="text-sm font-medium">Error: {error}</p>
                  </div>
                )}
              </motion.div>
            </motion.div>

            {/* Right Content - Video */}

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative"
            >
              <div className="relative rounded-2xl overflow-hidden  ">
                <div className="absolute inset-0  rounded-2xl"></div>
                <video
                  ref={videoRef}
                  className="relative w-full h-auto max-h-[70vh] object-fil rounded-2xl"
                  loop
                  muted
                  playsInline
                  autoPlay
                >
                  <source
                    src="https://gateway.pinata.cloud/ipfs/bafybeid5soxfx7qdsg5y3o6geryvau6agxqxwzuegkrpimeblacgauc2su"
                    type="video/webm"
                  />
                  <track kind="captions" label="English" />
                  Your browser does not support the video tag.
                </video>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Features Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl lg:text-5xl font-bold mb-4">
              <span className="bg-gradient-to-r from-[#00e5ff] to-[#00b8cc] bg-clip-text text-transparent">
                Key Features
              </span>
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Discover the powerful capabilities that make Cryptorage the
              ultimate solution for secure screenshot management
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={FiCamera}
              title="One-Click Capture"
              description="Easily capture and store screenshots directly from your browser."
            />
            <FeatureCard
              icon={FiCamera}
              title="Full-Page Capture"
              description="Capture entire web pages with a single click, not just what's visible on your screen."
            />
            <FeatureCard
              icon={FiLock}
              title="End-to-End Encryption"
              description="Your screenshots are encrypted and stored securely on the blockchain."
            />
            <FeatureCard
              icon={FiCloud}
              title="Decentralized Storage"
              description="Access your screenshots from anywhere, anytime, with blockchain reliability."
            />
            <FeatureCard
              icon={FiMessageCircle}
              title="AI Image Chat"
              description="Ask questions about your screenshots using Llama 4 AI - get insights, explanations, and analysis instantly."
            />
          </div>
        </section>

        {/* How It Works Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="bg-gradient-to-br from-[#2a2b36] to-[#1e1f2a] rounded-3xl p-12 shadow-2xl border border-[#3a3b46] backdrop-blur-sm"
          >
            <div className="text-center mb-12">
              <h2 className="text-4xl lg:text-5xl font-bold mb-4">
                <span className="bg-gradient-to-r from-[#00e5ff] to-[#00b8cc] bg-clip-text text-transparent">
                  How It Works
                </span>
              </h2>
              <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                Get started with Cryptorage in just a few simple steps
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
              {[
                "Install the Cryptorage browser extension.",
                "Connect your Ethereum wallet.",
                "Choose between full-page or normal screenshot capture.",
                "Your screenshots are automatically encrypted and stored on the blockchain.",
                "Chat with AI about your screenshots or analyze image content using Llama 4.",
                "Access your screenshots from any device, anytime.",
              ].map((step, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="flex items-start space-x-4 bg-[#1e1f2a] p-6 rounded-xl border border-[#3a3b46]"
                >
                  <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-[#00e5ff] to-[#00b8cc] rounded-full flex items-center justify-center text-[#1a1b26] font-bold text-sm">
                    {index + 1}
                  </div>
                  <p className="text-gray-300 leading-relaxed">{step}</p>
                </motion.div>
              ))}
            </div>

            <div className="text-center">
              <motion.a
                href="https://github.com/Rushikeshnimkar/CryptoRage.git"
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="inline-flex items-center bg-gradient-to-r from-[#00e5ff] to-[#00b8cc] hover:from-[#00b8cc] hover:to-[#008fa3] text-[#1a1b26] font-bold py-4 px-8 rounded-xl transition-all duration-300 text-lg shadow-lg hover:shadow-xl"
              >
                Get Started <FiArrowRight className="ml-2 w-5 h-5" />
              </motion.a>
            </div>
          </motion.div>
        </section>
      </div>
    </div>
  );
};

export default WalletConnectInner;
