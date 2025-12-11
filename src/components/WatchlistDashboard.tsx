import React, { useState } from "react";
import { Circle, Star, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAppKitAccount } from "@reown/appkit/react";
import { useWatchlist } from "@/hooks/useWatchlist";
import { WatchlistToken } from "@/api/watchlist";

function formatNumber(num: number | null): string {
  if (num === null) return "N/A";
  if (num >= 1e9) return parseFloat((num / 1e9).toFixed(2)) + "B";
  if (num >= 1e6) return parseFloat((num / 1e6).toFixed(2)) + "M";
  if (num >= 1e3) return parseFloat((num / 1e3).toFixed(2)) + "K";
  return parseFloat(num.toFixed(2)) + "";
}

function formatTokenAge(timestamp: string | undefined): string {
  if (!timestamp) return "N/A";

  const deploymentTime = new Date(timestamp).getTime();
  const now = Date.now();
  const ageInMs = now - deploymentTime;

  const days = Math.floor(ageInMs / (1000 * 60 * 60 * 24));
  const remainingMsAfterDays = ageInMs % (1000 * 60 * 60 * 24);
  const hours = Math.floor(remainingMsAfterDays / (1000 * 60 * 60));
  const remainingMsAfterHours = remainingMsAfterDays % (1000 * 60 * 60);
  const minutes = Math.floor(remainingMsAfterHours / (1000 * 60));

  if (days > 0) {
    return `${days}d ago`;
  } else if (hours > 0) {
    return `${hours}h ago`;
  } else if (minutes > 0) {
    return `${minutes}m ago`;
  } else {
    return "<1m ago";
  }
}

export function WatchlistDashboard() {
  const navigate = useNavigate();
  const { address, isConnected } = useAppKitAccount({ namespace: "eip155" });
  const { watchlist, isLoading, removeFromWatchlist } = useWatchlist(address);
  const [sortColumn, setSortColumn] = useState<keyof WatchlistToken | null>(
    null
  );
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const handleTokenClick = (token: WatchlistToken) => {
    navigate(`/token/${token.chain}/${token.tokenAddress}`);
  };

  const handleRemoveFromWatchlist = async (
    e: React.MouseEvent,
    tokenAddress: string,
    chain: string
  ) => {
    e.stopPropagation();
    await removeFromWatchlist(tokenAddress, chain);
  };

  const handleSort = (column: keyof WatchlistToken) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("desc");
    }
  };

  const sortedWatchlist = React.useMemo(() => {
    if (!sortColumn) return watchlist;

    return [...watchlist].sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];

      if (aVal === null && bVal === null) return 0;
      if (aVal === null) return 1;
      if (bVal === null) return -1;

      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
      }

      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDirection === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      return 0;
    });
  }, [watchlist, sortColumn, sortDirection]);

  if (!isConnected) {
    return (
      <div className="h-screen overflow-auto bg-black text-gray-100 text-xs font-mono flex items-center justify-center">
        <div className="text-center p-8 bg-gray-900 border border-gray-700 rounded max-w-md">
          <AlertCircle className="w-12 h-12 text-orange-400 mx-auto mb-4" />
          <h2 className="text-lg text-white mb-2">Connect Your Wallet</h2>
          <p className="text-gray-400">
            Please connect your wallet to view your watchlist
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-auto bg-black text-gray-100 text-xs font-mono">
      <div className="p-4">
        <div className="bg-gray-900 border border-gray-700">
          <div className="text-orange-400 text-sm p-2 border-b border-gray-700 flex items-center justify-between">
            <span>MY WATCHLIST</span>
            <span className="text-gray-400">
              {watchlist.length} {watchlist.length === 1 ? "token" : "tokens"}
            </span>
          </div>

          {isLoading ? (
            <div className="text-center p-8 text-gray-400">
              Loading watchlist...
            </div>
          ) : watchlist.length === 0 ? (
            <div className="text-center p-8">
              <Star className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 mb-2">Your watchlist is empty</p>
              <p className="text-gray-500 text-xs">
                Click the star icon on any token to add it to your watchlist
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-800 sticky top-0">
                  <tr className="text-gray-400">
                    <th className="text-center p-2 w-8"></th>
                    <th
                      className="text-left p-2 cursor-pointer hover:text-white"
                      onClick={() => handleSort("tokenSymbol")}
                    >
                      Symbol{" "}
                      {sortColumn === "tokenSymbol" &&
                        (sortDirection === "asc" ? "↑" : "↓")}
                    </th>
                    <th
                      className="text-left p-2 hidden md:table-cell cursor-pointer hover:text-white"
                      onClick={() => handleSort("tokenName")}
                    >
                      Name{" "}
                      {sortColumn === "tokenName" &&
                        (sortDirection === "asc" ? "↑" : "↓")}
                    </th>
                    <th
                      className="text-right p-2 cursor-pointer hover:text-white"
                      onClick={() => handleSort("currentPrice")}
                    >
                      PRICE{" "}
                      {sortColumn === "currentPrice" &&
                        (sortDirection === "asc" ? "↑" : "↓")}
                    </th>
                    <th
                      className="text-right p-2 cursor-pointer hover:text-white"
                      onClick={() => handleSort("marketCap")}
                    >
                      MCAP{" "}
                      {sortColumn === "marketCap" &&
                        (sortDirection === "asc" ? "↑" : "↓")}
                    </th>
                    <th
                      className="text-right p-2 cursor-pointer hover:text-white"
                      onClick={() => handleSort("priceChange24h")}
                    >
                      24H{" "}
                      {sortColumn === "priceChange24h" &&
                        (sortDirection === "asc" ? "↑" : "↓")}
                    </th>
                    <th
                      className="text-right p-2 cursor-pointer hover:text-white"
                      onClick={() => handleSort("priceChange6h")}
                    >
                      6H{" "}
                      {sortColumn === "priceChange6h" &&
                        (sortDirection === "asc" ? "↑" : "↓")}
                    </th>
                    <th
                      className="text-right p-2 cursor-pointer hover:text-white"
                      onClick={() => handleSort("priceChange1h")}
                    >
                      1H{" "}
                      {sortColumn === "priceChange1h" &&
                        (sortDirection === "asc" ? "↑" : "↓")}
                    </th>
                    <th
                      className="text-right p-2 cursor-pointer hover:text-white"
                      onClick={() => handleSort("priceChange5m")}
                    >
                      5M{" "}
                      {sortColumn === "priceChange5m" &&
                        (sortDirection === "asc" ? "↑" : "↓")}
                    </th>
                    <th
                      className="text-right p-2 cursor-pointer hover:text-white"
                      onClick={() => handleSort("totalVolume")}
                    >
                      VOL{" "}
                      {sortColumn === "totalVolume" &&
                        (sortDirection === "asc" ? "↑" : "↓")}
                    </th>
                    <th className="text-right p-2 hidden md:table-cell">
                      AGE
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedWatchlist.map((token) => (
                    <tr
                      key={token.tokenAddress}
                      className="border-b border-gray-800 hover:bg-gray-800/30 transition-colors cursor-pointer"
                      onClick={() => handleTokenClick(token)}
                    >
                      <td className="p-2 text-center">
                        <button
                          onClick={(e) =>
                            handleRemoveFromWatchlist(
                              e,
                              token.tokenAddress,
                              token.chain
                            )
                          }
                          className="hover:scale-110 transition-transform"
                          title="Remove from watchlist"
                        >
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        </button>
                      </td>
                      <td className="p-2">
                        <div className="flex items-center space-x-2">
                          {token.logoUrl ? (
                            <img
                              src={token.logoUrl}
                              alt={`${token.tokenSymbol} logo`}
                              className="w-4 h-4 rounded-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                                e.currentTarget.nextElementSibling?.classList.remove(
                                  "hidden"
                                );
                              }}
                            />
                          ) : null}
                          <Circle
                            className={`w-4 h-4 text-blue-400 ${
                              token.logoUrl ? "hidden" : ""
                            }`}
                          />
                          <span className="text-white font-bold">
                            {token.tokenSymbol}
                          </span>
                          <span className="text-gray-400 text-xs">
                            {token.chain}
                          </span>
                          {token.graduated && (
                            <span className="bg-green-600 text-white px-1 py-0.5 rounded text-xs">
                              GRAD
                            </span>
                          )}
                          {!token.graduated && (
                            <span className="bg-purple-600 text-white px-1 py-0.5 rounded text-xs">
                              BOND
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-2 text-gray-400 text-xs hidden md:table-cell">
                        {token.tokenName}
                      </td>
                      <td className="p-2 text-right text-white font-mono">
                        ${formatNumber(token.currentPrice)}
                      </td>
                      <td className="p-2 text-right text-gray-400">
                        $
                        {token.marketCap
                          ? formatNumber(Number(token.marketCap))
                          : "N/A"}
                      </td>
                      <td
                        className={`p-2 text-right ${
                          token.priceChange24h && token.priceChange24h > 0
                            ? "text-green-400"
                            : "text-red-400"
                        }`}
                      >
                        {token.priceChange24h !== null
                          ? `${token.priceChange24h > 0 ? "+" : ""}${token.priceChange24h.toFixed(2)}%`
                          : "N/A"}
                      </td>
                      <td
                        className={`p-2 text-right ${
                          token.priceChange6h && token.priceChange6h > 0
                            ? "text-green-400"
                            : "text-red-400"
                        }`}
                      >
                        {token.priceChange6h !== null
                          ? `${token.priceChange6h > 0 ? "+" : ""}${token.priceChange6h.toFixed(2)}%`
                          : "N/A"}
                      </td>
                      <td
                        className={`p-2 text-right ${
                          token.priceChange1h && token.priceChange1h > 0
                            ? "text-green-400"
                            : "text-red-400"
                        }`}
                      >
                        {token.priceChange1h !== null
                          ? `${token.priceChange1h > 0 ? "+" : ""}${token.priceChange1h.toFixed(2)}%`
                          : "N/A"}
                      </td>
                      <td
                        className={`p-2 text-right ${
                          token.priceChange5m && token.priceChange5m > 0
                            ? "text-green-400"
                            : "text-red-400"
                        }`}
                      >
                        {token.priceChange5m !== null
                          ? `${token.priceChange5m > 0 ? "+" : ""}${token.priceChange5m.toFixed(2)}%`
                          : "N/A"}
                      </td>
                      <td className="p-2 text-right text-gray-400">
                        {formatNumber(token.totalVolume)}
                      </td>
                      <td className="p-2 text-right text-gray-400 hidden md:table-cell">
                        {formatTokenAge(token.deploymentTimestamp)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
