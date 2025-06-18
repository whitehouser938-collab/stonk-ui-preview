import { ICOLaunchData } from "@/components/ICOLaunchpad";
import { addToken } from "@/api/token";
export const addTokenToDb = async (
  tokenData: ICOLaunchData,
  deployerAddress: string,
  tokenAddress: string,
  bondingCurveAddress: string
) => {
  const tokenDataMap = {
    name: tokenData.name,
    symbol: tokenData.symbol,
    totalSupply: tokenData.totalSupply,
    chain: tokenData.launchpad,
    description: tokenData.description,
    websiteUrl: tokenData.website,
    logoUrl: tokenData.logoUrl,
    twitterUrl: tokenData.twitterUrl,
    telegramUrl: tokenData.telegramUrl,
    deployerAddress,
    tokenAddress,
    bondingCurveAddress,
  };
  const addedToken = await addToken(tokenDataMap);
  if (!addedToken) {
    throw new Error("Failed to add token to database");
  }
  return addedToken;
};
