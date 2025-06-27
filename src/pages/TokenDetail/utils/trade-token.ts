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
  if (tradeData.chain === "BASE") {
    try {
      const routerAddress = import.meta.env.VITE_EVM_ROUTER_ADDRESS;
      const router = new Contract(
        routerAddress,
        Router.abi,
        signer // Use Reown's signer
      );

      // Convert amount to uint256
      const amountAsUint256 = ethers.parseUnits(tradeData.amount, 18);

      const minAmountAsUint256 = ethers.parseUnits(
        tradeData.minAmount?.toString() || "0",
        18
      );

      //handle buy
      let tx;
      if (tradeData.isBuy) {
        tx = await router.buyTokens(
          tradeData.tokenAddress,
          amountAsUint256,
          minAmountAsUint256,
          tradeData.deadline || Math.floor(Date.now() / 1000) + 60 * 20 // Default deadline of 20 minutes
        );
      }

      const receipt = await tx.wait(); // Wait for the transaction to be mined
      console.log("Transaction mined:", tx);

      if (!receipt) throw new Error("Transaction receipt is null");
      const eventLog = receipt.logs.find(
        (log): log is EventLog =>
          log instanceof EventLog && log.fragment?.name === "TokensPurchased"
      );

      let tokenAddress: string;
      let tokensReceived: string;
      if (eventLog) {
        [tokenAddress, tokensReceived] = eventLog.args;
      } else {
        throw new Error("TokensPurchased event not found");
      }

      const response = {
        transactionHash: tx.hash,
        tokenAddress: tokenAddress,
        tokensReceived: tokensReceived,
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
      };
    }
  }
};

export const sellTokenETH = async (
  tradeData: TokenTradeData,
  signer: ethers.Signer
) => {
  if (tradeData.chain === "BASE") {
    try {
      const routerAddress = import.meta.env.VITE_EVM_ROUTER_ADDRESS;
      const router = new Contract(
        routerAddress,
        Router.abi,
        signer // Use Reown's signer
      );

      // Convert amount to uint256
      const amountAsUint256 = ethers.parseUnits(tradeData.amount, 18);

      const minAmountAsUint256 = ethers.parseUnits(
        tradeData.minAmount?.toString() || "0",
        18
      );

      //handle sell
      let tx;
      if (!tradeData.isBuy) {
        tx = await router.sellTokens(
          tradeData.tokenAddress,
          amountAsUint256,
          minAmountAsUint256,
          tradeData.deadline || Math.floor(Date.now() / 1000) + 60 * 20 // Default deadline of 20 minutes
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
      let tokenAmount: string;
      let assetsReceived: string;
      if (eventLog) {
        [tokenAddress, tokenAmount, assetsReceived] = eventLog.args;
      } else {
        throw new Error("TokensSold event not found");
      }

      const response = {
        transactionHash: tx.hash,
        tokenAddress: tokenAddress,
        tokenAmount: tokenAmount,
        assetsReceived: assetsReceived,
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
      };
    }
  }
};
