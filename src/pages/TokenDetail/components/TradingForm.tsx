import React, { useState } from "react";
import { useAppKitAccount } from "@reown/appkit/react";
import { useAppKitBalance } from "@reown/appkit/react";
import LoadingScreen from "@/components/ui/loading";
import { useLoading } from "@/hooks/use-loading";
import { sellTokenETH } from "../utils/trade-token";
import { useETHWalletSigner } from "@/hooks/signers/useWalletSigner";
import { useToast } from "@/hooks/use-toast";

interface TradingFormProps {
  chain?: string;
  symbol?: string;
  tokenAddress?: string;
}

export interface TokenTradeData {
  chain: string;
  symbol: string;
  tokenAddress: string;
  amount: string;
  currency: string; // Optional currency for the trade
  isBuy: boolean; // true for buy, false for sell
  deadline?: number; // Optional deadline for the trade
  slippage?: number; // Optional minimum amount for the trade
}

const presetAmounts = [0.1, 0.5, 1]; // Preset amounts for quick selection
const slippageOptions = [0.5, 1, 2.5, 5]; // Slippage options in percentage

const EVILUSDC_ADDRESS = import.meta.env.VITE_EVILUSDC_ADDRESS;
const ROUTER_ADDRESS = import.meta.env.VITE_EVM_ROUTER_ADDRESS;
const RPC_URL = import.meta.env.VITE_RPC_URL;

// Utility function to robustly detect user rejection errors
function isUserRejectedError(error: any): boolean {
  const patterns = [
    "user rejected",
    "User rejected",
    "MetaMask Tx Signature: User denied",
    "User denied",
    "rejected",
    "cancelled",
    "Cancelled",
  ];
  const codeMatches = error?.code === "ACTION_REJECTED" || error?.code === 4001;
  if (codeMatches) return true;
  // Recursively check all string properties
  function check(obj: any): boolean {
    if (!obj) return false;
    if (typeof obj === "string") {
      return patterns.some((p) => obj.includes(p));
    }
    if (typeof obj === "object") {
      return Object.values(obj).some(check);
    }
    return false;
  }
  return check(error);
}

// Create a provider for read operations
const getReadProvider = () => {
  if (!RPC_URL) {
    throw new Error("RPC_URL not configured");
  }
  return new ethers.JsonRpcProvider(RPC_URL);
};

// Add abbreviateTokenAmount utility
function abbreviateTokenAmount(raw: string | number, decimals = 18): string {
  const n = typeof raw === "string" ? parseFloat(raw) : raw;
  const value = n / Math.pow(10, decimals);
  // Round to nearest integer for threshold checks
  const rounded = Math.round(value);
  if (rounded >= 1e9) return (value / 1e9).toFixed(2) + "B";
  if (rounded >= 1e6) return (value / 1e6).toFixed(2) + "M";
  if (rounded >= 1e3) return (value / 1e3).toFixed(2) + "k";
  if (value >= 1) return value.toFixed(2);
  if (value > 0) return value.toPrecision(2);
  return "0";
}

const TradingForm = (props: TradingFormProps) => {
  const [isBuy, setIsBuy] = useState(true); // "buy" or "sell"
  const [selectedCurrency, setSelectedCurrency] = useState(props.symbol); // Default currency
  const [amount, setAmount] = useState("");
  const [slippagePercent, setSlippagePercent] = useState(1); // Default 1% slippage
  const [customSlippage, setCustomSlippage] = useState(""); // For custom slippage input
  const { isLoading, startLoading, stopLoading } = useLoading();
  const { getETHSigner } = useETHWalletSigner();
  const { toast } = useToast();
  const { isConnected: isEthConnected, address: userAddress } =
    useAppKitAccount({ namespace: "eip155" });

  const [evilUSDCBalance, setEvilUSDCBalance] = useState("0");
  const [tokenBalance, setTokenBalance] = useState("0");
  const [isApproving, setIsApproving] = useState(false);
  const [allowance, setAllowance] = useState("0");
  const [tokenAllowance, setTokenAllowance] = useState("0");
  const [isTokenApproving, setIsTokenApproving] = useState(false);

  // Fetch balances
  React.useEffect(() => {
    if (!isEthConnected || !userAddress || !props.tokenAddress) return;

    const fetchBalances = async () => {
      try {
        const provider = getReadProvider();
        const evilUSDC = new ethers.Contract(
          EVILUSDC_ADDRESS,
          [
            "function balanceOf(address) view returns (uint256)",
            "function allowance(address,address) view returns (uint256)",
          ],
          provider
        );
        const token = new ethers.Contract(
          props.tokenAddress,
          [
            "function balanceOf(address) view returns (uint256)",
            "function allowance(address,address) view returns (uint256)",
          ],
          provider
        );

        // Fetch balances
        const [evilUSDCBal, tokenBal, evilUSDCAllowance, tokenAllowance] =
          await Promise.all([
            evilUSDC.balanceOf(userAddress),
            token.balanceOf(userAddress),
            evilUSDC.allowance(userAddress, ROUTER_ADDRESS),
            token.allowance(userAddress, ROUTER_ADDRESS),
          ]);

        setEvilUSDCBalance(evilUSDCBal.toString());
        setTokenBalance(tokenBal.toString());
        setAllowance(evilUSDCAllowance.toString());
        setTokenAllowance(tokenAllowance.toString());

        console.log("EVILUSDC Balance:", evilUSDCBal.toString());
        console.log(`${props.symbol} Balance:`, tokenBal.toString());
        console.log(
          "EVILUSDC Allowance for router:",
          evilUSDCAllowance.toString()
        );
        console.log(
          `${props.symbol} Allowance for router:`,
          tokenAllowance.toString()
        );
      } catch (error) {
        console.error("Error fetching balances:", error);
        // Set default values on error
        setEvilUSDCBalance("0");
        setTokenBalance("0");
        setAllowance("0");
        setTokenAllowance("0");
      }
    };

    fetchBalances();
  }, [
    isEthConnected,
    userAddress,
    props.tokenAddress,
    isApproving,
    isTokenApproving,
  ]);

  // Calculate maxAssetAmount for buy
  const [maxAssetAmount, setMaxAssetAmount] = useState("0");
  React.useEffect(() => {
    const calc = async () => {
      if (!isBuy || !amount || !props.tokenAddress)
        return setMaxAssetAmount("0");

      try {
        const provider = getReadProvider();
        const router = new ethers.Contract(
          ROUTER_ADDRESS,
          [
            "function calculateBuyPrice(address,uint256) view returns (uint256)",
            "function getTokenTradingState(address) view returns (bool,address,address)",
          ],
          provider
        );
        const tokenAmount = ethers.parseEther(amount);
        const assetAmount = await router.calculateBuyPrice(
          props.tokenAddress,
          tokenAmount
        );
        const slippageBps = Math.floor((slippagePercent / 100) * 10000);
        const maxAsset =
          (assetAmount * BigInt(10000 + slippageBps)) / BigInt(10000);
        setMaxAssetAmount(maxAsset.toString());
      } catch (error) {
        console.error("Error calculating max asset amount:", error);
        setMaxAssetAmount("0");
      }
    };
    calc();
  }, [isBuy, amount, props.tokenAddress, slippagePercent]);

  // Calculate sell token amount in wei for allowance check
  const [sellTokenAmount, setSellTokenAmount] = useState("0");
  React.useEffect(() => {
    if (!amount || !props.tokenAddress || isBuy) return setSellTokenAmount("0");
    setSellTokenAmount(ethers.parseEther(amount).toString());
  }, [amount, props.tokenAddress, isBuy]);

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      const signer = await getETHSigner();
      const evilUSDC = new ethers.Contract(
        EVILUSDC_ADDRESS,
        ["function approve(address,uint256) returns (bool)"],
        signer
      );
      const tx = await evilUSDC.approve(ROUTER_ADDRESS, MaxUint256);
      await tx.wait();
      toast({
        title: "Approval Successful",
        description: "You can now buy tokens.",
        variant: "default",
      });
      setIsApproving(false);
    } catch (error) {
      // Check if user rejected the transaction
      if (isUserRejectedError(error)) {
        toast({
          title: "Trade Cancelled",
          description: "You rejected the transaction.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Trade Failed",
          description: error?.message || JSON.stringify(error),
          variant: "destructive",
        });
      }
      setIsApproving(false);
    }
  };

  const handleTokenApprove = async () => {
    setIsTokenApproving(true);
    try {
      const signer = await getETHSigner();
      const token = new ethers.Contract(
        props.tokenAddress!,
        ["function approve(address,uint256) returns (bool)"],
        signer
      );
      const tx = await token.approve(ROUTER_ADDRESS, MaxUint256);
      await tx.wait();
      toast({
        title: `Approval Successful`,
        description: `You can now sell ${props.symbol}.`,
        variant: "default",
      });
      setIsTokenApproving(false);
    } catch (error) {
      // Check if user rejected the transaction
      if (isUserRejectedError(error)) {
        toast({
          title: "Trade Cancelled",
          description: "You rejected the transaction.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Trade Failed",
          description: error?.message || JSON.stringify(error),
          variant: "destructive",
        });
      }
      setIsTokenApproving(false);
    }
  };

  const isWalletConnected = isEthConnected;

  const handleMax = async () => {
    if (isBuy) {
      setAmount(ethers.formatUnits(evilUSDCBalance, 6));
    } else {
      setAmount(ethers.formatUnits(tokenBalance, 18));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      alert("Please enter a valid amount.");
      return;
    }
    if (!isWalletConnected) {
      alert("Please connect your wallet to trade.");
      return;
    }
    startLoading();
    try {
      const signer = await getETHSigner();
      let tradeResponse;
      if (isBuy) {
        // User input is EVILUSDC (asset token) amount, pass directly to util
        const tradeData = {
          chain: "sepolia",
          symbol: props.symbol,
          tokenAddress: props.tokenAddress!,
          amount: amount, // asset amount (EVILUSDC) as string
          currency: "EVILUSDC",
          isBuy: true,
          deadline: Math.floor(Date.now() / 1000) + 300, // 5 minutes
          slippage: slippagePercent / 100,
        };
        tradeResponse = await buyTokenETH(tradeData, signer);
      } else {
        // Create tradeData for sell orders - let the util handle all calculations
        const tradeData = {
          chain: "sepolia",
          symbol: props.symbol,
          tokenAddress: props.tokenAddress!,
          amount: amount, // pass user input string, not parsed wei
          currency: props.symbol,
          isBuy: false,
          deadline: Math.floor(Date.now() / 1000) + 300, // 5 minutes like the script
          slippage: 0.05, // Fixed 5% slippage like the script
        };

        console.log("[UI SELL PARAMS]", {
          tokenAddress: props.tokenAddress,
          amount: amount,
          deadline: tradeData.deadline,
          from: userAddress,
          isBuy: false,
          tradeData,
        });
        try {
          tradeResponse = await sellTokenETH(tradeData, signer);
        } catch (sellError) {
          console.error("[SELL ERROR - FULL OBJECT]", sellError);
          throw sellError;
        }
      }
      console.log("Trade response:", tradeResponse);
      if (tradeResponse && tradeResponse.success) {
        toast({
          title: "Trade Successful",
          description: `Transaction Hash: ${tradeResponse.transactionHash}`,
          variant: "default",
        });
      } else if (
        tradeResponse &&
        tradeResponse.error &&
        isUserRejectedError(tradeResponse.error)
      ) {
        toast({
          title: "Trade Cancelled",
          description: "You rejected the transaction.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Trade Failed",
          description:
            tradeResponse?.error ||
            "An error occurred while processing the trade.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error submitting trade:", error);
      alert("An error occurred while submitting the trade.");
    } finally {
      stopLoading();
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="p-2 bg-gray-900 border border-gray-700 space-y-6 text-gray-400"
    >
      {/* Buy and Sell Buttons */}
      <div className="flex space-x-4">
        {/* Buy Button */}
        <button
          type="button"
          onClick={() => setIsBuy(true)}
          className={`
      w-full p-3 text-sm font-bold transition-all duration-200
      ${
        isBuy
          ? "bg-orange-600 text-black"
          : "bg-transparent border border-gray-700 text-gray-400 hover:bg-gray-800"
      }
    `}
        >
          Buy
        </button>

        {/* Sell Button */}
        <button
          type="button"
          onClick={() => setIsBuy(false)}
          className={`
      w-full p-3  text-sm font-bold transition-all duration-200
      ${
        !isBuy
          ? "bg-orange-600 text-black"
          : "bg-transparent border border-gray-700 text-gray-400 hover:bg-gray-800"
      }
    `}
        >
          Sell
        </button>
      </div>
      {/* Currency Selector */}
      <div>
        <label htmlFor="currency" className="block mb-2 text-sm text-gray-500">
          Select Currency
        </label>
        <select
          id="currency"
          value={selectedCurrency}
          onChange={(e) => setSelectedCurrency(e.target.value)}
          className="w-full p-3 bg-gray-900 border border-gray-700  text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-400"
        >
          <option value={props.symbol}>{props.symbol}</option>
          <option value={props.chain}>{props.chain}</option>
          {/* Add more options as needed */}
        </select>
      </div>

      {/* Slippage Tolerance */}
      <div>
        <label htmlFor="slippage" className="block mb-2 text-sm text-gray-500">
          Slippage Tolerance
        </label>
        <div className="space-y-3">
          {/* Preset Slippage Buttons */}
          <div className="flex space-x-2">
            {slippageOptions.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  setSlippagePercent(preset);
                  setCustomSlippage("");
                }}
                className={`px-3 py-2 text-xs font-medium transition-all duration-200 ${
                  slippagePercent === preset && !customSlippage
                    ? "bg-orange-600 text-black"
                    : "bg-gray-800 hover:bg-gray-700 text-gray-300"
                }`}
              >
                {preset}%
              </button>
            ))}
            <div className="flex items-center space-x-1">
              <input
                type="number"
                placeholder="Custom"
                value={customSlippage}
                onChange={(e) => {
                  const value = e.target.value;
                  setCustomSlippage(value);
                  if (value && !isNaN(Number(value))) {
                    setSlippagePercent(Number(value));
                  }
                }}
                className="w-16 px-2 py-1 bg-gray-800 border border-gray-700 text-xs text-gray-300 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-orange-400"
                min="0"
                max="50"
                step="0.1"
              />
              <span className="text-xs text-gray-400">%</span>
            </div>
          </div>
          {/* Current Slippage Display */}
          <div className="text-xs text-gray-400">
            Current slippage:{" "}
            <span className="text-orange-400">{slippagePercent}%</span>
            {slippagePercent > 5 && (
              <span className="text-yellow-400 ml-2">
                ⚠️ High slippage warning
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Amount Input */}
      <div className="mb-2">
        <label htmlFor="amount" className="block text-xs text-gray-400 mb-1">
          Amount ({isBuy ? "EVILUSDC" : props.symbol})
        </label>
        <input
          id="amount"
          type="number"
          min="0"
          step="any"
          className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
          placeholder={
            isBuy ? "Enter EVILUSDC to spend" : `Enter ${props.symbol} to sell`
          }
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        {!isBuy && (
          <div className="text-xs text-gray-400 mt-1">
            Balance:{" "}
            <span className="font-mono text-white">
              {abbreviateTokenAmount(tokenBalance, 18)}
            </span>{" "}
            {props.symbol}
          </div>
        )}
      </div>
      {/* Submit Button */}
      {!isWalletConnected && (
        <div className="text-red-500 text-sm">
          Please connect your wallet to trade.
        </div>
      )}
      {/* Approve button for buy mode if allowance is insufficient */}
      {isBuy && BigInt(allowance) < BigInt(maxAssetAmount || "0") ? (
        <button
          type="button"
          disabled={isApproving || !isWalletConnected || !amount}
          onClick={handleApprove}
          className="w-full p-3 text-sm font-bold transition-all duration-200 bg-blue-600 hover:bg-blue-700 text-white"
        >
          {isApproving ? "Approving..." : "Approve EVILUSDC"}
        </button>
      ) : !isBuy && BigInt(tokenAllowance) < BigInt(sellTokenAmount || "0") ? (
        <button
          type="button"
          disabled={isTokenApproving || !isWalletConnected || !amount}
          onClick={handleTokenApprove}
          className="w-full p-3 text-sm font-bold transition-all duration-200 bg-blue-600 hover:bg-blue-700 text-white"
        >
          {isTokenApproving ? `Approving...` : `Approve ${props.symbol}`}
        </button>
      ) : (
        <button
          type="submit"
          disabled={!isWalletConnected || isLoading}
          className={`w-full p-3 text-sm font-bold transition-all duration-200 ${
            isBuy
              ? "bg-green-600 hover:bg-green-700 text-black"
              : "bg-red-600 hover:bg-red-700 text-white"
          }`}
        >
          {isLoading
            ? isBuy
              ? "Submitting Buy..."
              : "Submitting Sell..."
            : isBuy
            ? "Submit Buy Order"
            : "Submit Sell Order"}
        </button>
      )}
      <button
        key="max"
        type="button"
        onClick={handleMax}
        className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-full text-xsm font-medium transition-all duration-200"
      >
        Max
      </button>
    </form>
  );
};

export default TradingForm;
