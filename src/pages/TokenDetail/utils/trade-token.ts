import { TokenTradeData } from "../components/TradingForm";
import { ethers } from "ethers";
import Router from "@/abi/evm/Router.json";
import Token from "@/abi/evm/Token.json";
import { Contract, EventLog } from "ethers";
import {
  calculateBuyPrice,
  getTokenDecimals,
  calculateSellProceeds,
  getTokenAllowance,
} from "@/api/rpc";

export interface TradeTokenResponse {
  transactionHash: string;
  tokenAddress: string;
  tokenAmount: string;
  assetAmount: string;
  success: boolean;
  error?: string;
}

/**
 * Unified function to buy tokens with either ETH or WETH
 */
export const buyTokens = async (
  tradeData: TokenTradeData,
  signer: ethers.Signer
): Promise<TradeTokenResponse> => {
  if (tradeData.chain !== "sepolia") {
    return {
      success: false,
      error: "Unsupported chain",
      transactionHash: "",
      tokenAddress: "",
      tokenAmount: "0",
      assetAmount: "0",
    };
  }

  try {
    const routerAddress = import.meta.env.VITE_EVM_ROUTER_ADDRESS;
    const router = new Contract(routerAddress, Router.abi, signer);

    // Validate amount before parsing
    const numAmount = parseFloat(tradeData.amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return {
        success: false,
        error: `Invalid amount: ${tradeData.amount}. Please enter a valid positive number.`,
        transactionHash: "",
        tokenAddress: "",
        tokenAmount: "0",
        assetAmount: "0",
      };
    }

    // Check for very small amounts that might cause issues
    if (numAmount < 0.000001) {
      return {
        success: false,
        error: `Amount too small: ${tradeData.amount}. Minimum amount is 0.000001 ${tradeData.currency}.`,
        transactionHash: "",
        tokenAddress: "",
        tokenAmount: "0",
        assetAmount: "0",
      };
    }

    // Parse the input amount (ETH or WETH amount)
    const assetAmount = ethers.parseEther(tradeData.amount);

    // Calculate expected token amount for the asset amount using user's provider
    const provider = signer.provider;
    const priceData = await calculateBuyPrice(
      tradeData.tokenAddress,
      tradeData.amount,
      "SEP",
      provider
    );

    if (!priceData.success) {
      return {
        success: false,
        error: "Failed to calculate buy price from API",
        transactionHash: "",
        tokenAddress: "",
        tokenAmount: "0",
        assetAmount: "0",
      };
    }

    const expectedTokenAmount = BigInt(priceData.data.tokenAmount);

    if (expectedTokenAmount === 0n) {
      return {
        success: false,
        error: `Input ${tradeData.currency} amount is too low to buy any tokens.`,
        transactionHash: "",
        tokenAddress: "",
        tokenAmount: "0",
        assetAmount: "0",
      };
    }

    // Calculate slippage-adjusted amounts
    const slippageBps = Math.floor((tradeData.slippage || 0.05) * 10000);
    const minTokenAmount =
      (expectedTokenAmount * BigInt(10000 - slippageBps)) / BigInt(10000);

    console.log("[BUY PARAMS]", {
      tokenAddress: tradeData.tokenAddress,
      paymentMethod: tradeData.currency,
      assetAmount: assetAmount.toString(),
      expectedTokenAmount: expectedTokenAmount.toString(),
      minTokenAmount: minTokenAmount.toString(),
      slippage: tradeData.slippage,
      slippageBps,
      deadline: tradeData.deadline,
    });

    let tx;

    if (tradeData.currency === "ETH") {
      // Use buyTokensWithETH for ETH payments (payable function)
      // Parameters: tokenAddress, minTokenAmount, deadline, {value: ethAmount}
      tx = await router.buyTokensWithETH(
        tradeData.tokenAddress,
        minTokenAmount,
        tradeData.deadline,
        { value: assetAmount } // Send ETH with the transaction
      );
    } else {
      // Use buyTokens for WETH payments (nonpayable function)
      // Parameters: tokenAddress, maxAssetAmount, minTokenAmount, deadline
      // For WETH, we use the exact asset amount as maxAssetAmount (user specifies exact WETH to spend)
      tx = await router.buyTokens(
        tradeData.tokenAddress,
        assetAmount, // Use exact amount user wants to spend
        minTokenAmount,
        tradeData.deadline
      );
    }

    console.log("Transaction sent:", tx.hash);

    const receipt = await tx.wait();
    console.log("Transaction mined:", receipt);

    if (!receipt) {
      throw new Error("Transaction receipt is null");
    }

    // Find the TokensPurchased event
    const eventLog = receipt.logs.find(
      (log): log is EventLog =>
        log instanceof EventLog && log.fragment?.name === "TokensPurchased"
    );

    if (!eventLog) {
      throw new Error("TokensPurchased event not found");
    }

    const [tokenAddress] = eventLog.args;

    return {
      transactionHash: tx.hash,
      tokenAddress: tokenAddress,
      tokenAmount: expectedTokenAmount.toString(),
      assetAmount: assetAmount.toString(),
      success: true,
    };
  } catch (error) {
    console.error(
      `Error purchasing ${tradeData.symbol} on ${tradeData.chain}`,
      error
    );
    return {
      success: false,
      error: error?.message || JSON.stringify(error),
      transactionHash: "",
      tokenAddress: "",
      tokenAmount: "0",
      assetAmount: "0",
    };
  }
};

/**
 * Unified function to sell tokens for either ETH or WETH
 */
export const sellTokens = async (
  tradeData: TokenTradeData,
  signer: ethers.Signer
): Promise<TradeTokenResponse> => {
  if (tradeData.chain !== "sepolia") {
    return {
      success: false,
      error: "Unsupported chain",
      transactionHash: "",
      tokenAddress: "",
      tokenAmount: "0",
      assetAmount: "0",
    };
  }

  try {
    const routerAddress = import.meta.env.VITE_EVM_ROUTER_ADDRESS;
    const router = new Contract(routerAddress, Router.abi, signer);

    // Validate amount before parsing
    const numAmount = parseFloat(tradeData.amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return {
        success: false,
        error: `Invalid amount: ${tradeData.amount}. Please enter a valid positive number.`,
        transactionHash: "",
        tokenAddress: "",
        tokenAmount: "0",
        assetAmount: "0",
      };
    }

    // Check for very small amounts that might cause issues
    if (numAmount < 0.000001) {
      return {
        success: false,
        error: `Amount too small: ${tradeData.amount}. Minimum amount is 0.000001 tokens.`,
        transactionHash: "",
        tokenAddress: "",
        tokenAmount: "0",
        assetAmount: "0",
      };
    }

    // Parse token amount to sell - use the correct token decimals
    // Get token decimals first using user's provider
    const provider = signer.provider;
    const decimalsData = await getTokenDecimals(tradeData.tokenAddress, "SEP", provider);

    if (!decimalsData.success) {
      return {
        success: false,
        error: "Failed to get token decimals from API",
        transactionHash: "",
        tokenAddress: "",
        tokenAmount: "0",
        assetAmount: "0",
      };
    }

    const tokenDecimals = decimalsData.data.decimals;
    const token = new Contract(tradeData.tokenAddress, Token.abi, signer);

    // Parse with the correct decimals (most tokens are 18, but some might be different)
    const tokenAmount = ethers.parseUnits(tradeData.amount, tokenDecimals);

    // Calculate expected asset amount (ETH or WETH) from selling tokens using user's provider
    const proceedsData = await calculateSellProceeds(
      tradeData.tokenAddress,
      tokenAmount.toString(),
      "SEP",
      provider
    );

    console.log("[SELL PROCEEDS DEBUG]", {
      tokenAddress: tradeData.tokenAddress,
      tokenAmount: tokenAmount.toString(),
      proceedsData,
      rawAssetAmount: proceedsData.data?.assetAmount,
    });

    if (!proceedsData.success) {
      return {
        success: false,
        error: "Failed to calculate sell proceeds from API",
        transactionHash: "",
        tokenAddress: "",
        tokenAmount: "0",
        assetAmount: "0",
      };
    }

    const expectedAssetAmount = BigInt(proceedsData.data.assetAmount);

    console.log("[SELL PROCEEDS CALCULATION]", {
      expectedAssetAmount: expectedAssetAmount.toString(),
      isZero: expectedAssetAmount === 0n,
      tokenAmount: tokenAmount.toString(),
      userInputAmount: tradeData.amount,
    });

    if (expectedAssetAmount === 0n) {
      return {
        success: false,
        error: `Token amount ${tradeData.amount} resulted in 0 proceeds. This could mean insufficient liquidity or the token cannot be sold.`,
        transactionHash: "",
        tokenAddress: "",
        tokenAmount: "0",
        assetAmount: "0",
      };
    }

    // Calculate slippage-adjusted minimum amount - match working script exactly
    // Working script uses: const minAssetAmount = (assetAmount * 95n) / 100n; // 5% slippage tolerance
    // Use exactly the same calculation as the working script
    const minAssetAmount = (expectedAssetAmount * 95n) / 100n; // Fixed 5% slippage like working script

    // Use the same deadline calculation as the working script
    const deadline = Math.floor(Date.now() / 1000) + 300; // 5 minutes

    console.log("[SELL PARAMS]", {
      tokenAddress: tradeData.tokenAddress,
      tokenAmount: tokenAmount.toString(),
      expectedAssetAmount: expectedAssetAmount.toString(),
      minAssetAmount: minAssetAmount.toString(),
      slippage: tradeData.slippage,
      deadline: deadline,
    });

    // Check and handle token approval - this is the missing piece!
    // (token contract already created above for getting decimals)
    const userAddress = await signer.getAddress();

    // Get allowance using user's provider
    const allowanceData = await getTokenAllowance(
      userAddress,
      tradeData.tokenAddress,
      routerAddress,
      "SEP",
      provider
    );

    if (!allowanceData.success) {
      return {
        success: false,
        error: "Failed to get token allowance from API",
        transactionHash: "",
        tokenAddress: "",
        tokenAmount: "0",
        assetAmount: "0",
      };
    }

    const allowance = BigInt(allowanceData.data.allowance);

    console.log("[APPROVAL CHECK]", {
      userAddress,
      routerAddress,
      tokenAmount: tokenAmount.toString(),
      currentAllowance: allowance.toString(),
      needsApproval: allowance < tokenAmount,
    });

    // Approve tokens if needed - EXACTLY like the working hardhat script
    if (allowance < tokenAmount) {
      console.log("🔑 Approving tokens...");
      const approveTx = await token.approve(routerAddress, tokenAmount);
      await approveTx.wait();
      console.log("✅ Approval successful");
    }

    let tx;

    // Always use sellTokens (returns WETH) - consistent with working script
    // The router handles the internal conversion logic
    tx = await router.sellTokens(
      tradeData.tokenAddress,
      tokenAmount,
      minAssetAmount,
      deadline
    );

    console.log("Transaction sent:", tx.hash);

    const receipt = await tx.wait();
    console.log("Transaction mined:", receipt);

    if (!receipt) {
      throw new Error("Transaction receipt is null");
    }

    // Find the TokensSold event
    const eventLog = receipt.logs.find(
      (log): log is EventLog =>
        log instanceof EventLog && log.fragment?.name === "TokensSold"
    );

    let finalTokenAddress = tradeData.tokenAddress;
    let finalTokenAmount = tokenAmount;
    let finalAssetAmount = expectedAssetAmount;

    if (eventLog) {
      [finalTokenAddress, finalTokenAmount, finalAssetAmount] = eventLog.args;
    }

    return {
      transactionHash: tx.hash,
      tokenAddress: finalTokenAddress,
      tokenAmount: finalTokenAmount.toString(),
      assetAmount: finalAssetAmount.toString(),
      success: true,
    };
  } catch (error) {
    console.error(
      `Error selling ${tradeData.symbol} on ${tradeData.chain}`,
      error
    );
    return {
      success: false,
      error: error?.message || JSON.stringify(error),
      transactionHash: "",
      tokenAddress: "",
      tokenAmount: "0",
      assetAmount: "0",
    };
  }
};

// Legacy function names for backward compatibility
export const buyTokenETH = buyTokens;
export const sellTokenETH = sellTokens;
