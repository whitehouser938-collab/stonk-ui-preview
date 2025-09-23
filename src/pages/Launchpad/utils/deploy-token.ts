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

      // Deploy token transaction
      const tx = await tokenFactory.deployToken(
        tokenData.name,
        tokenData.symbol
        // { value: fee }
      );

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
