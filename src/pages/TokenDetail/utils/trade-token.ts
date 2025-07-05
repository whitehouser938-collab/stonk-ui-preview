import { TokenTradeData } from "../components/TradingForm";
import { ethers } from "ethers";
import Router from "@/abi/evm/Router.json";
import { Contract, EventLog } from "ethers";

export interface TradeTokenResponse {
  transactionHash: string;
  tokenAddress: string;
  bondingCurveAddress: string;
  deployerAddress: string;
  success: boolean;
}

export const buyTokenETH = async (
  tradeData: TokenTradeData,
  signer: ethers.Signer
) => {
  if (tradeData.chain === "sepolia") {
    try {
      const routerAddress = import.meta.env.VITE_EVM_ROUTER_ADDRESS;
      const router = new Contract(
        routerAddress,
        Router.abi,
        signer // Use Reown's signer
      );

      let tokenAmount = ethers.parseEther(tradeData.amount);
      let assetAmount: bigint;

      // Use the pre-calculated maxAssetAmount from the frontend instead of recalculating
      let maxAssetAmount = tradeData.maxAssetAmount
        ? BigInt(tradeData.maxAssetAmount)
        : null;

      // Only recalculate if not provided (fallback)
      if (!maxAssetAmount) {
        assetAmount = await router.calculateBuyPrice(
          tradeData.tokenAddress,
          tokenAmount
        );
        const slippageBps = Math.floor(tradeData.slippage * 10000);
        maxAssetAmount =
          (assetAmount * BigInt(10000 + slippageBps)) / BigInt(10000);
      } else {
        // Still need assetAmount for event parsing, so calculate it
        assetAmount = await router.calculateBuyPrice(
          tradeData.tokenAddress,
          tokenAmount
        );
      }

      //handle buy
      let tx;
      if (tradeData.isBuy) {
        console.log("Buying tokens");
        console.log("Token address:", tradeData.tokenAddress);
        console.log("Token amount:", tokenAmount);
        console.log("Max asset amount:", maxAssetAmount);
        console.log("Deadline:", tradeData.deadline);
        tx = await router.buyTokens(
          tradeData.tokenAddress,
          tokenAmount,
          maxAssetAmount,
          tradeData.deadline
        );
        console.log("Transaction sent:", tx);
      }

      const receipt = await tx.wait(); // Wait for the transaction to be mined
      console.log("Transaction mined:", tx);

      if (!receipt) throw new Error("Transaction receipt is null");
      const eventLog = receipt.logs.find(
        (log): log is EventLog =>
          log instanceof EventLog && log.fragment?.name === "TokensPurchased"
      );

      let tokenAddress: string;

      if (eventLog) {
        [tokenAddress, tokenAmount, assetAmount] = eventLog.args;
      } else {
        throw new Error("TokensPurchased event not found");
      }

      const response = {
        transactionHash: tx.hash,
        tokenAddress: tokenAddress,
        tokenAmount: tokenAmount,
        assetAmount: assetAmount,
        success: true,
      };
      return response;
    } catch (error) {
      console.error(
        `Error purchasing ${tradeData.symbol} on ${tradeData.chain}`,
        error
      );
      return {
        success: false,
        error: error?.message || JSON.stringify(error),
      };
    }
  }
};

export const sellTokenETH = async (
  tradeData: TokenTradeData,
  signer: ethers.Signer
) => {
  if (tradeData.chain === "sepolia") {
    try {
      const routerAddress = import.meta.env.VITE_EVM_ROUTER_ADDRESS;
      const router = new Contract(
        routerAddress,
        Router.abi,
        signer // Use Reown's signer
      );

      let tokenAmount = ethers.parseEther(tradeData.amount);
      let assetAmount = await router.calculateBuyPrice(
        tradeData.tokenAddress,
        tokenAmount
      );
      // Fix BigInt math for slippage
      const slippageBps = Math.floor(tradeData.slippage * 10000); // e.g., 500 for 5%
      const minAssetAmount =
        (assetAmount * BigInt(10000 - slippageBps)) / BigInt(10000);

      //handle sell
      let tx;
      if (!tradeData.isBuy) {
        tx = await router.sellTokens(
          tradeData.tokenAddress,
          tokenAmount,
          minAssetAmount,
          tradeData.deadline
        );
      }

      const receipt = await tx.wait(); // Wait for the transaction to be mined
      console.log("Transaction mined:", tx);

      if (!receipt) throw new Error("Transaction receipt is null");
      const eventLog = receipt.logs.find(
        (log): log is EventLog =>
          log instanceof EventLog && log.fragment?.name === "TokensSold"
      );

      let tokenAddress: string;
      if (eventLog) {
        [tokenAddress, tokenAmount, assetAmount] = eventLog.args;
      } else {
        throw new Error("TokensSold event not found");
      }

      const response = {
        transactionHash: tx.hash,
        tokenAddress: tokenAddress,
        tokenAmount: tokenAmount,
        assetAmount: assetAmount,
        success: true,
      };
      return response;
    } catch (error) {
      console.error(
        `Error selling ${tradeData.symbol} on ${tradeData.chain}`,
        error
      );
      return {
        success: false,
        error: error?.message || JSON.stringify(error),
      };
    }
  }
};
