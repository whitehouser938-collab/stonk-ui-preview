import React, { useState } from "react";
import { useAppKitAccount } from "@reown/appkit/react";
import { useAppKitBalance } from "@reown/appkit/react";
import LoadingScreen from "@/components/ui/loading";
import { useLoading } from "@/hooks/use-loading";
import { sellTokenETH } from "../utils/trade-token";
import { useETHWalletSigner } from "@/hooks/signers/useWalletSigner";
import { useToast } from "@/hooks/use-toast";
import { ethers } from "ethers";
import { buyTokenETH } from "../utils/trade-token";
import { MaxUint256 } from "ethers";
import Router from "@/abi/evm/Router.json";

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
  maxAssetAmount?: string; // Pre-calculated max asset amount for buy orders
}

const presetAmounts = [0.1, 0.5, 1]; // Preset amounts for quick selection
const slippageOptions = [0.5, 1, 2.5, 5]; // Slippage options in percentage

const EVILUSDC_ADDRESS = import.meta.env.VITE_EVILUSDC_ADDRESS;
const ROUTER_ADDRESS = import.meta.env.VITE_EVM_ROUTER_ADDRESS;

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

const TradingForm = (props: TradingFormProps) => {
  const [isBuy, setIsBuy] = useState(true);
  const [amount, setAmount] = useState("");
  const [slippagePercent, setSlippagePercent] = useState(1);
  const [customSlippage, setCustomSlippage] = useState("");
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
    const provider = new ethers.BrowserProvider(window.ethereum as any);
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
    evilUSDC
      .balanceOf(userAddress)
      .then((bal: ethers.BigNumberish) => setEvilUSDCBalance(bal.toString()));
    token
      .balanceOf(userAddress)
      .then((bal: ethers.BigNumberish) => setTokenBalance(bal.toString()));
    // Log allowance for debugging and set state
    evilUSDC
      .allowance(userAddress, ROUTER_ADDRESS)
      .then((allowance: ethers.BigNumberish) => {
        setAllowance(allowance.toString());
        console.log("EVILUSDC Allowance for router:", allowance.toString());
      });
    // Token allowance for sell
    token
      .allowance(userAddress, ROUTER_ADDRESS)
      .then((allowance: ethers.BigNumberish) => {
        setTokenAllowance(allowance.toString());
        console.log(
          `${props.symbol} Allowance for router:`,
          allowance.toString()
        );
      });
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
      const provider = new ethers.BrowserProvider(window.ethereum as any);
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
      const provider = new ethers.BrowserProvider(window.ethereum as any);
      const signer = await provider.getSigner();
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
      const provider = new ethers.BrowserProvider(window.ethereum as any);
      const signer = await provider.getSigner();
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
        // Calculate parameters for logging
        const tokenAmount = ethers.parseEther(amount);
        const provider = new ethers.BrowserProvider(window.ethereum as any);
        const router = new ethers.Contract(
          ROUTER_ADDRESS,
          [
            "function calculateBuyPrice(address,uint256) view returns (uint256)",
            "function getTokenTradingState(address) view returns (bool,address,address)",
          ],
          provider
        );
        const assetAmount = await router.calculateBuyPrice(
          props.tokenAddress,
          tokenAmount
        );
        const [graduated, bondingCurveAddr, uniswapPair] =
          await router.getTokenTradingState(props.tokenAddress);
        // Use 5% slippage for bonding curve trades, user-selected for graduated
        const slippageBps = graduated
          ? Math.floor((slippagePercent / 100) * 10000)
          : 500; // 5% for bonding curve
        const maxAssetAmount =
          (assetAmount * BigInt(10000 + slippageBps)) / BigInt(10000);

        // Declare bondingCurveEvilUSDCBalance in outer scope for simulation logic
        let bondingCurveEvilUSDCBalance = "0";

        if (!graduated && bondingCurveAddr !== ethers.ZeroAddress) {
          try {
            const bondingCurve = new ethers.Contract(
              bondingCurveAddr,
              [
                "function stonkToken() view returns (address)",
                "function balanceOf(address) view returns (uint256)",
                "function calculatePurchasePrice(uint256) view returns (uint256)",
                "function getCurrentPrice() view returns (uint256)",
              ],
              provider
            );
            const tokenContract = new ethers.Contract(
              props.tokenAddress,
              ["function balanceOf(address) view returns (uint256)"],
              provider
            );
            const evilUSDCContract = new ethers.Contract(
              EVILUSDC_ADDRESS,
              ["function balanceOf(address) view returns (uint256)"],
              provider
            );
            const bondingCurveTokenBalance = await tokenContract.balanceOf(
              bondingCurveAddr
            );
            bondingCurveEvilUSDCBalance = (
              await evilUSDCContract.balanceOf(bondingCurveAddr)
            ).toString();

            // Get price from bonding curve directly
            const bondingCurvePrice = await bondingCurve.calculatePurchasePrice(
              tokenAmount
            );
            const currentPrice = await bondingCurve.getCurrentPrice();

            console.log("[BONDING CURVE BALANCE]", {
              bondingCurveTokenBalance: bondingCurveTokenBalance.toString(),
              bondingCurveEvilUSDCBalance,
              minLiquidity: ethers.parseEther("1").toString(),
              minAssetLiquidity: ethers.parseUnits("1", 6).toString(),
              hasEnoughLiquidity:
                bondingCurveTokenBalance >= ethers.parseEther("1"),
              hasEnoughAssetLiquidity:
                BigInt(bondingCurveEvilUSDCBalance) >=
                ethers.parseUnits("1", 6),
            });

            console.log("[PRICE COMPARISON]", {
              routerCalculatedPrice: assetAmount.toString(),
              bondingCurveCalculatedPrice: bondingCurvePrice.toString(),
              currentPrice: currentPrice.toString(),
              maxAssetAmount: maxAssetAmount.toString(),
              slippagePercent: slippagePercent,
              priceDifference: (
                BigInt(bondingCurvePrice) - BigInt(assetAmount)
              ).toString(),
              slippageExceeded:
                BigInt(bondingCurvePrice) > BigInt(maxAssetAmount),
            });
          } catch (error) {
            console.log("[BONDING CURVE ERROR]", error);
          }
        }

        // Create tradeData with the correct maxAssetAmount for bonding curve trades
        const tradeData = {
          chain: "sepolia",
          symbol: props.symbol,
          tokenAddress: props.tokenAddress!,
          amount: amount,
          currency: isBuy ? "EVILUSDC" : props.symbol,
          isBuy: isBuy,
          deadline: Math.floor(Date.now() / 1000) + 300, // 5 minutes like the script
          slippage: slippagePercent / 100,
          maxAssetAmount: maxAssetAmount.toString(),
        };
        console.log("[BONDING CURVE INFO]", {
          graduated,
          bondingCurveAddr,
          uniswapPair,
        });

        // Try to simulate the transaction first, unless this is the first buy (bonding curve has no EVILUSDC)
        if (
          graduated ||
          (typeof bondingCurveEvilUSDCBalance !== "undefined" &&
            bondingCurveEvilUSDCBalance !== "0")
        ) {
          try {
            const routerContract = new ethers.Contract(
              ROUTER_ADDRESS,
              Router.abi,
              provider
            );
            const simulation = await routerContract.buyTokens.staticCall(
              props.tokenAddress,
              tokenAmount,
              maxAssetAmount,
              tradeData.deadline,
              { from: userAddress }
            );
            console.log("[SIMULATION SUCCESS]", simulation);
          } catch (simError) {
            console.log("[SIMULATION FAILED]", simError);
          }
        } else {
          console.log(
            "[SKIP SIMULATION] First buy, bonding curve has no EVILUSDC"
          );
        }

        // The bonding curve call will fail because it expects EVILUSDC to be transferred first
        // Only the router should call the bonding curve, not the frontend directly
        console.log("[NOTE] Bonding curve calls should go through router only");
        tradeResponse = await buyTokenETH(tradeData, signer);
      } else {
        // Calculate parameters for logging
        const tokenAmount = ethers.parseEther(amount);
        const provider = new ethers.BrowserProvider(window.ethereum as any);
        const router = new ethers.Contract(
          ROUTER_ADDRESS,
          [
            "function calculateBuyPrice(address,uint256) view returns (uint256)",
            "function getTokenTradingState(address) view returns (bool,address,address)",
          ],
          provider
        );
        const assetAmount = await router.calculateBuyPrice(
          props.tokenAddress,
          tokenAmount
        );
        const slippageBps = Math.floor((slippagePercent / 100) * 10000);
        const minAssetAmount =
          (assetAmount * BigInt(10000 - slippageBps)) / BigInt(10000);

        // Create tradeData for sell orders
        const tradeData = {
          chain: "sepolia",
          symbol: props.symbol,
          tokenAddress: props.tokenAddress!,
          amount: amount,
          currency: isBuy ? "EVILUSDC" : props.symbol,
          isBuy: isBuy,
          deadline: Math.floor(Date.now() / 1000) + 300, // 5 minutes like the script
          slippage: slippagePercent / 100,
        };

        console.log("[UI SELL PARAMS]", {
          tokenAddress: props.tokenAddress,
          tokenAmount: tokenAmount.toString(),
          assetAmount: assetAmount.toString(),
          minAssetAmount: minAssetAmount.toString(),
          deadline: tradeData.deadline,
          from: userAddress,
          isBuy,
          slippage: slippagePercent,
          tradeData,
        });
        tradeResponse = await sellTokenETH(tradeData, signer);
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
    } finally {
      stopLoading();
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="p-2 bg-gray-900 border border-gray-700 space-y-6 text-gray-400"
    >
      {isLoading && <LoadingScreen />}
      {/* Balances */}
      <div className="mb-2 text-xs">
        <div>
          EVILUSDC Balance:{" "}
          <span className="text-white">
            {ethers.formatUnits(evilUSDCBalance, 6)}
          </span>
        </div>
        <div>
          {props.symbol} Balance:{" "}
          <span className="text-white">
            {ethers.formatUnits(tokenBalance, 18)}
          </span>
        </div>
      </div>
      {/* Buy and Sell Buttons */}
      <div className="flex space-x-4">
        <button
          type="button"
          onClick={() => setIsBuy(true)}
          className={`w-full p-3 text-sm font-bold transition-all duration-200 ${
            isBuy
              ? "bg-orange-600 text-black"
              : "bg-transparent border border-gray-700 text-gray-400 hover:bg-gray-800"
          }`}
        >
          Buy
        </button>
        <button
          type="button"
          onClick={() => setIsBuy(false)}
          className={`w-full p-3 text-sm font-bold transition-all duration-200 ${
            !isBuy
              ? "bg-orange-600 text-black"
              : "bg-transparent border border-gray-700 text-gray-400 hover:bg-gray-800"
          }`}
        >
          Sell
        </button>
      </div>
      {/* Slippage Tolerance */}
      <div>
        <label htmlFor="slippage" className="block mb-2 text-sm text-gray-500">
          Slippage Tolerance
        </label>
        <div className="space-y-3">
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
      <div>
        <label htmlFor="amount" className="block mb-2 text-sm text-gray-500">
          Amount
        </label>
        <input
          id="amount"
          type="number"
          placeholder="Enter amount"
          value={amount}
          required
          onChange={(e) => setAmount(e.target.value)}
          className="w-full p-3 bg-gray-900 border border-gray-700 text-sm text-gray-300 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-400"
        />
        <div className="flex space-x-2 mt-2">
          <button
            key="reset"
            type="button"
            onClick={() => setAmount("")}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-full text-xsm font-medium transition-all duration-200"
          >
            Reset
          </button>
          <button
            key="max"
            type="button"
            onClick={handleMax}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-full text-xsm font-medium transition-all duration-200"
          >
            Max
          </button>
        </div>
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
          disabled={!isWalletConnected}
          className={`w-full p-3 text-sm font-bold transition-all duration-200 ${
            isBuy
              ? "bg-green-600 hover:bg-green-700 text-black"
              : "bg-red-600 hover:bg-red-700 text-white"
          }`}
        >
          {isBuy ? "Submit Buy Order" : "Submit Sell Order"}
        </button>
      )}
    </form>
  );
};

export default TradingForm;
