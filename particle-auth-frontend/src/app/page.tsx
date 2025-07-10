"use client";

import { useEffect, useMemo, useState } from "react";
import type { NextPage } from "next";
import {
  useEthereum,
  useConnect,
  useAuthCore,
} from "@particle-network/authkit";
import { AuthType } from "@particle-network/auth-core";
import { ethers, type Eip1193Provider } from "ethers";
import { GoogleLogin } from "@react-oauth/google";
import { jwtDecode } from "jwt-decode";
import { formatBalance, truncateAddress } from "./utils/utils";
import { useSmartAccount } from "./context/SmartAccountContext";
import { useCallback } from "react";
// AA imports
import {
  AAWrapProvider,
  SendTransactionMode,
  SmartAccount,
} from "@particle-network/aa";

import { sepolia, baseSepolia } from "@particle-network/authkit/chains"; // Chains are imported here

const Home: NextPage = () => {
  const { connect, disconnect, connectionStatus } = useConnect();
  const { provider, chainInfo, signMessage } = useEthereum();
  const { userInfo } = useAuthCore();
  const [jwtData, setJwtData] = useState<any>(null);
  const [balance, setBalance] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [address, setAddress] = useState<string>("");
  const { selectedAccount, setSelectedAccount } = useSmartAccount();
  const [recipientAddress, setRecipientAddress] = useState<string>("");
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  // Set up and configure the smart account
  const smartAccount = useMemo(
    () =>
      new SmartAccount(provider, {
        projectId: process.env.NEXT_PUBLIC_PROJECT_ID!,
        clientKey: process.env.NEXT_PUBLIC_CLIENT_KEY!,
        appId: process.env.NEXT_PUBLIC_APP_ID!,
        aaOptions: {
          accountContracts: {
            BICONOMY: [
              {
                version: "2.0.0",
                chainIds: [sepolia.id, baseSepolia.id],
              },
            ],
            SIMPLE: [
              {
                version: "1.0.0",
                chainIds: [sepolia.id, baseSepolia.id],
              },
            ],
          },
        },
      }),
    [provider]
  );

  // Function to create ethers provider based on selected mode. This is for ethers V6
  // use new ethers.providers.Web3Provider(new AAWrapProvider(smartAccount, mode), "any"); for Ethers V5
  const createEthersProvider = useCallback(() => {
    return new ethers.BrowserProvider(
      new AAWrapProvider(
        smartAccount,
        SendTransactionMode.Gasless
      ) as Eip1193Provider,
      "any"
    );
  }, [smartAccount]);

  // Initialize the ethers provider
  const [ethersProvider, setEthersProvider] = useState(() =>
    createEthersProvider()
  );

  const fetchBalance = useCallback(async () => {
    try {
      // Get the smart account address
      const address = await smartAccount.getAddress();
      const balanceResponse = await ethersProvider.getBalance(address);
      const balanceInEther = ethers.formatEther(balanceResponse); // ethers V5 will need the utils module for those convertion operations

      // Format the balance using the utility function
      const fixedBalance = formatBalance(balanceInEther);

      setAddress(address);
      setBalance(fixedBalance);
    } catch (err) {
      console.error("Error fetching balance:", err);
    }
  }, [ethersProvider, smartAccount]);

  useEffect(() => {
    if (userInfo) {
      console.log(userInfo);
      fetchBalance();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userInfo, chainInfo]);

  const handleAccountChange = async (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    setIsLoading(true);
    const newAccountName = e.target.value;
    setSelectedAccount(newAccountName);

    // Add a delay to allow the context to update before fetching the balance
    await new Promise((resolve) => setTimeout(resolve, 500));

    const version = newAccountName === "BICONOMY" ? "2.0.0" : "1.0.0";

    try {
      smartAccount.setSmartAccountContract({
        name: newAccountName as "BICONOMY" | "SIMPLE",
        version: version,
      });

      await fetchBalance();
    } catch (error) {
      console.error("Error switching smart account:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Update ethers provider when selectedMode changes
  useEffect(() => {
    setEthersProvider(createEthersProvider());
  }, [createEthersProvider]);

  const handleLogin = async (token: string) => {
    setIsLoading(true);
    try {
      const decoded = jwtDecode(token);
      setJwtData(decoded);
      console.log(decoded);
      await connect({
        provider: AuthType.jwt,
        thirdpartyCode: token,
      });
    } catch (err) {
      console.error("Login failed", err);
      alert("Login failed: " + (err as any).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setIsLoading(true);
    try {
      await disconnect();
      setJwtData(null);
    } catch (err) {
      console.error("Disconnect failed", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Execute an Ethereum transaction using Ethers provider
  // Simple transfer in this example
  const executeTxEthers = async () => {
    setIsSending(true);
    const signer = await ethersProvider.getSigner();
    const tx = {
      to: recipientAddress,
      value: ethers.parseEther("0.001"),
      data: "0x", // data is needed only when interacting with smart contracts. 0x equals to zero and it's here for demonstration only
    };

    try {
      const txResponse = await signer.sendTransaction(tx);
      const txReceipt = await txResponse.wait();
      if (txReceipt) {
        setTransactionHash(txReceipt.hash);
        console.log(txReceipt.hash);
      } else {
        console.error("Transaction receipt is null");
      }
    } catch (error) {
      console.error("Error executing EVM transaction:", error);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {!userInfo ? (
          <div className="max-w-md mx-auto mt-20">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-blue-600 rounded-xl mx-auto mb-4 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-white"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">
                Particle Auth
              </h1>
              <p className="text-gray-400">
                Sign in with Google to access your wallet
              </p>
            </div>

            {/* Login Card */}
            <div className="bg-gray-800 rounded-2xl shadow-lg border border-gray-700 p-8">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-white mb-6">
                  Welcome
                </h2>
                <div className="relative">
                  {isLoading && (
                    <div className="absolute inset-0 bg-gray-800/80 rounded-lg flex items-center justify-center z-10">
                      <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                  <GoogleLogin
                    onSuccess={(res) => {
                      const token = res.credential;
                      if (token) handleLogin(token);
                    }}
                    onError={() => console.log("Google login failed")}
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
              <p className="text-gray-400">Manage your wallet and account</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Account Information */}
              <div className="bg-gray-800 rounded-2xl shadow-lg border border-gray-700 p-6">
                <h2 className="text-xl font-semibold text-white mb-6">
                  Account Information
                </h2>

                <div className="space-y-4">
                  <div className="flex justify-between items-center py-3 border-b border-gray-700">
                    <span className="text-gray-400 font-medium">Name</span>
                    <span className="text-white">{jwtData?.name}</span>
                  </div>

                  <div className="flex justify-between items-center py-3 border-b border-gray-700">
                    <span className="text-gray-400 font-medium">Email</span>
                    <span className="text-white">{jwtData?.email}</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-gray-700">
                    <span className="text-gray-400 font-medium">Issuer</span>
                    <span className="text-white">{jwtData?.iss}</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-gray-700">
                    <span className="text-gray-400 font-medium">Status</span>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        connectionStatus === "connected"
                          ? "bg-green-900/50 text-green-400 border border-green-800"
                          : "bg-yellow-900/50 text-yellow-400 border border-yellow-800"
                      }`}
                    >
                      {connectionStatus}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-3 border-b border-gray-700">
                    <span className="text-gray-400 font-medium">Address</span>
                    <code className="text-sm bg-gray-700 px-2 py-1 rounded text-blue-400 border border-gray-600">
                      {truncateAddress(address || "")}
                    </code>
                  </div>

                  <div className="flex justify-between items-center py-3 border-b border-gray-700">
                    <span className="text-gray-400 font-medium">Network</span>
                    <span className="text-white">{chainInfo.name}</span>
                  </div>

                  <div className="flex justify-between items-center py-3">
                    <span className="text-gray-400 font-medium">Balance</span>
                    <span className="text-white font-semibold">
                      {balance} {chainInfo.nativeCurrency.symbol}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="bg-gray-800 rounded-2xl shadow-lg border border-gray-700 p-6">
                <h2 className="text-xl font-semibold text-white mb-6">
                  Actions
                </h2>

                <div className="space-y-4">
                  {/* Recipient Address Input */}
                  <div className="flex flex-col space-y-2">
                    <label
                      htmlFor="recipient-address"
                      className="text-sm font-medium text-gray-300"
                    >
                      Recipient Address
                    </label>
                    <input
                      id="recipient-address"
                      type="text"
                      value={recipientAddress}
                      onChange={(e) => setRecipientAddress(e.target.value)}
                      placeholder="Enter recipient address"
                      className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                    />
                  </div>

                  {/* Smart Account Selector */}
                  <div className="flex flex-col space-y-2 mb-4">
                    <label
                      htmlFor="account-selector"
                      className="text-sm font-medium text-gray-300"
                    >
                      Smart Account
                    </label>
                    <select
                      id="account-selector"
                      value={selectedAccount}
                      onChange={handleAccountChange}
                      disabled={isLoading}
                      className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 disabled:opacity-50"
                    >
                      <option value="BICONOMY">Default Account</option>
                      <option value="SIMPLE">Second Account</option>
                    </select>
                  </div>

                  <button
                    onClick={executeTxEthers}
                    disabled={isSending || !recipientAddress}
                    className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-medium py-3 px-4 rounded-xl transition-colors duration-200 flex items-center justify-center space-x-2 border border-green-500 hover:border-green-400 disabled:border-gray-500"
                  >
                    {isSending ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      <span>Send 0.001 ETH</span>
                    )}
                  </button>

                  {transactionHash && (
                    <div className="text-center text-sm text-green-400 break-all">
                      Success! Tx Hash: {transactionHash}
                    </div>
                  )}

                  <button
                    onClick={handleDisconnect}
                    disabled={isLoading}
                    className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white font-medium py-3 px-4 rounded-xl transition-colors duration-200 flex items-center justify-center space-x-2 border border-red-500 hover:border-red-400 disabled:border-gray-500"
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <svg
                          className="w-5 h-5"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span>Disconnect</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Quick Summary */}
                <div className="mt-8 pt-6 border-t border-gray-700">
                  <h3 className="text-lg font-medium text-white mb-4">
                    Summary
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-700 rounded-lg p-4 text-center border border-gray-600">
                      <div className="text-2xl font-bold text-white">
                        {balance}
                      </div>
                      <div className="text-sm text-gray-400">Balance</div>
                    </div>
                    <div className="bg-gray-700 rounded-lg p-4 text-center border border-gray-600">
                      <div className="text-2xl font-bold text-white">
                        {chainInfo.name}
                      </div>
                      <div className="text-sm text-gray-400">Network</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
