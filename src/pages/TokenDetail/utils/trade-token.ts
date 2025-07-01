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

      let tokenAmount = ethers.parseEther(tradeData.amount);
      let assetAmount = await router.calculateBuyPrice(
        tradeData.tokenAddress,
        tokenAmount
      );
      const maxAssetAmount = assetAmount * (1 + tradeData.slippage); // Allow 5% slippage;

      //handle buy
      let tx;
      if (tradeData.isBuy) {
        tx = await router.buyTokens(
          tradeData.tokenAddress,
          tokenAmount,
          maxAssetAmount,
          tradeData.deadline
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

      let tokenAmount = ethers.parseEther(tradeData.amount);
      let assetAmount = await router.calculateBuyPrice(
        tradeData.tokenAddress,
        tokenAmount
      );
      const minAssetAmount = assetAmount * (1 - tradeData.slippage); // Allow 5% slippage;

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
      };
    }
  }
};
