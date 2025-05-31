"use client";

import React, { useEffect, useState, useRef } from "react";
import Confetti from "react-confetti";
import { motion, AnimatePresence } from "framer-motion";
import { FiCheck, FiX, FiGithub } from "react-icons/fi";
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
  <div className="flex justify-between items-center">
    <span className="text-gray-400">{label}:</span>
    <span className="font-semibold flex items-center">
      {value}
      {isConnected ? (
        <FiCheck className="ml-2 text-green-500" />
      ) : (
        <FiX className="ml-2 text-red-500" />
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
        setError(`Error signing message: ${err instanceof Error ? err.message : String(err)}`);
      }
      setIsExtensionConnected(false);
    }

    function sendConnectionMessage(signature: string) {
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
    <div className="min-h-screen bg-[#1a1b26] text-white overflow-hidden">
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
            className="absolute inset-0 w-full h-full"
          >
            <Confetti />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Animated Background */}
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
        <motion.div className="grid grid-cols-1 lg:grid-cols-5 lg:space-x-72 items-center">
          {/* Left Section */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="flex items-center"
              >
                <Image
                  src={logo}
                  alt="Cryptorage Logo"
                  width={56}
                  height={56}
                  className="w-14 h-14"
                />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="flex items-center"
              >
                <Image
                  src={cryptorageText}
                  alt="Cryptorage"
                  className="h-8 w-auto"
                />
              </motion.div>
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
              className="text-2xl text-[#00e5ff] mb-6 mt-10"
            >
              Secure, Decentralized Screenshot Storage
            </motion.p>
            <motion.p
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-lg text-gray-300 mb-8"
            >
              Capture, encrypt, and store screenshots directly on the
              blockchain. Enjoy unparalleled security and accessibility for your
              visual data.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="bg-[#2a2b36] rounded-lg p-6 mb-8"
            >
              <h2 className="text-2xl font-bold mb-4">Connect to Cryptorage</h2>

              {/* RainbowKit Connect Button */}
              <div className="mb-4">
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
                    const ready = mounted && authenticationStatus !== "loading";
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
                            className="w-full bg-[#00e5ff] hover:bg-[#00b8cc] text-[#1a1b26] font-bold py-3 px-4 rounded-lg transition duration-300 text-lg shadow-lg"
                          >
                            Connect Wallet
                          </button>
                        ) : chain?.id !== ETHEREUM_CHAIN_ID ? (
                          <button
                            onClick={openChainModal}
                            type="button"
                            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg transition duration-300 text-lg shadow-lg"
                          >
                            Switch to Ethereum
                          </button>
                        ) : (
                          <div className="flex gap-2">
                            <div className="flex-1 bg-[#2a2b36] border border-[#00e5ff] text-[#00e5ff] font-bold py-2 px-3 rounded-lg flex items-center justify-center">
                              <div
                                style={{
                                  background: "#627EEA",
                                  width: 12,
                                  height: 12,
                                  borderRadius: 999,
                                  overflow: "hidden",
                                  marginRight: 8,
                                  display: "inline-block",
                                }}
                              >
                                <div
                                  style={{
                                    width: 12,
                                    height: 12,
                                    background: "#627EEA",
                                  }}
                                />
                              </div>
                              Ethereum
                            </div>

                            <button
                              onClick={openAccountModal}
                              type="button"
                              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-3 rounded-lg transition duration-300 flex items-center justify-center"
                            >
                              <FiCheck className="mr-2" />
                              {account.displayName}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  }}
                </ConnectButton.Custom>
              </div>

              {/* Network Warning */}
              {isConnected && !isOnEthereum && (
                <div className="w-full bg-red-600/20 border border-red-600 text-red-400 font-bold py-3 px-4 rounded-lg mb-4 text-center">
                  ⚠️ Please switch to Ethereum mainnet to continue
                </div>
              )}

              {/* Extension Connection Button */}
              {isConnected && isOnEthereum && !isExtensionConnected && (
                <button
                  onClick={handleConnectToExtension}
                  className="w-full bg-[#00e5ff] hover:bg-[#00b8cc] text-[#1a1b26] font-bold py-3 px-4 rounded-lg transition duration-300 text-lg shadow-lg mb-4"
                >
                  Connect to Extension
                </button>
              )}

              {/* Connected to Extension */}
              {isExtensionConnected && (
                <div className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg transition duration-300 text-lg shadow-lg flex items-center justify-center mb-4">
                  <FiCheck className="mr-2" /> Connected to Extension
                </div>
              )}

              {/* Status Information */}
              <div className="mt-4 text-sm space-y-2">
                <StatusItem
                  label="Wallet status"
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
                  label="Extension status"
                  value={connectionStatus}
                  isConnected={isExtensionConnected}
                />
              </div>

              {/* Disconnect Button */}
              {isConnected && (
                <button
                  onClick={handleDisconnect}
                  className="w-full mt-4 bg-red-600/20 border border-red-600 text-red-400 hover:bg-red-600 hover:text-white font-bold py-2 px-4 rounded-lg transition duration-300"
                >
                  Disconnect Wallet
                </button>
              )}

              {/* Error Message */}
              {error && (
                <p className="text-red-500 mt-4 text-center bg-red-500/10 p-2 rounded-lg">
                  Error: {error}
                </p>
              )}
            </motion.div>
          </div>

          {/* Right Section: Video Preview */}
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
                className="relative inset-0 w-full h-full object-cover"
                loop
                muted
                playsInline
                autoPlay
              >
                <source
                  src="https://gateway.pinata.cloud/ipfs/QmPfCXii7NjwzChkLZeD6g4BJkFb2cyF1xAvQrQ8m1ZVS5"
                  type="video/mp4"
                />
                <track kind="captions" label="English" />
                Your browser does not support the video tag.
              </video>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default WalletConnectInner;
