import { ICOLaunchData } from "../components/ICOLaunchpad";
import { ethers } from "ethers";
import TokenFactory from "@/abi/evm/TokenFactory.json";
import { Contract, EventLog } from "ethers";

export interface DeployTokenResponse {
  transactionHash: string;
  tokenAddress: string;
  bondingCurveAddress: string;
  deployerAddress: string;
  deploymentTimestamp: string;
  deploymentBlock: string;
  success: boolean;
}

export const deployTokenETH = async (
  tokenData: ICOLaunchData,
  signer: ethers.Signer
) => {
  if (tokenData.launchpad === "SEP") {
    try {
      const tokenFactoryAddress = import.meta.env
        .VITE_EVM_TOKEN_FACTORY_ADDRESS;
      const tokenFactory = new Contract(
        tokenFactoryAddress,
        TokenFactory.abi,
        signer
      );

      // Get the fee price and log it
      // const fee = await tokenFactory.feePrice();
      // console.log("Deployment fee:", ethers.formatEther(fee), "ETH");
      // console.log("Fee in wei:", fee.toString());

      let tx;

      // Check if initial buy amount is provided
      if (tokenData.initialBuyAmount && parseFloat(tokenData.initialBuyAmount) > 0) {
        // Convert initial buy amount to Wei
        const initialBuyAmountWei = ethers.parseEther(tokenData.initialBuyAmount);

        // Deploy token with initial buy
        tx = await tokenFactory.deployToken(
          tokenData.name,
          tokenData.symbol,
          initialBuyAmountWei,
          true, // useETH = true
          { value: initialBuyAmountWei } // Send ETH for initial buy
        );

        console.log("Deploying with initial buy of", tokenData.initialBuyAmount, "ETH");
      } else {
        // Deploy token without initial buy (original function)
        tx = await tokenFactory.deployToken(
          tokenData.name,
          tokenData.symbol
          // { value: fee }
        );

        console.log("Deploying without initial buy");
      }

      const receipt = await tx.wait(); // Wait for the transaction to be mined
      console.log("Transaction mined:", tx);

      if (!receipt) throw new Error("Transaction receipt is null");
      const eventLog = receipt.logs.find(
        (log): log is EventLog =>
          log instanceof EventLog && log.fragment?.name === "TokenDeployed"
      );

      let tokenAddress: string;
      let bondingCurveAddress: string;
      if (eventLog) {
        [tokenAddress, bondingCurveAddress] = eventLog.args;
      } else {
        throw new Error("TokenDeployed event not found");
      }

      const response = {
        transactionHash: tx.hash,
        tokenAddress: tokenAddress,
        bondingCurveAddress: bondingCurveAddress,
        deployerAddress: await signer.getAddress(),
        deploymentTimestamp: new Date().toISOString(),
        deploymentBlock: receipt.blockNumber.toString(),
        success: true,
      };
      return response;
    } catch (error) {
      console.error("Error deploying BASE token:", error);
      return {
        transactionHash: "",
        tokenAddress: "",
        bondingCurveAddress: "",
        deployerAddress: "",
        deploymentTimestamp: "",
        deploymentBlock: "",
        success: false,
      };
    }
  }
};
