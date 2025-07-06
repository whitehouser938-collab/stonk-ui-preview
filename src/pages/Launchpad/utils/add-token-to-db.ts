import { ICOLaunchData } from "../components/ICOLaunchpad";
import { addToken } from "@/api/token";
export const addTokenToDb = async (
  tokenData: ICOLaunchData,
  deployerAddress: string,
  tokenAddress: string,
  bondingCurveAddress: string,
  deploymentTimestamp: string,
  deploymentBlock: string
) => {
  const tokenDataMap = {
    name: tokenData.name,
    symbol: tokenData.symbol,
    chain: tokenData.launchpad,
    description: tokenData.description,
    websiteUrl: tokenData.website,
    twitterUrl: tokenData.twitterUrl,
    telegramUrl: tokenData.telegramUrl,
    deployerAddress,
    tokenAddress,
    bondingCurveAddress,
    deploymentTimestamp,
    deploymentBlock,
  };
  const addedToken = await addToken(tokenDataMap);
  console.log("Added token to database:", addedToken);
  if (!addedToken) {
    throw new Error("Failed to add token to database");
  }
  return addedToken;
};
