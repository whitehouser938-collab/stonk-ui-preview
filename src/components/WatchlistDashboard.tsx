import React, { useState } from "react";
import { Circle, Star, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAppKitAccount } from "@reown/appkit/react";
import { useWatchlist } from "@/hooks/useWatchlist";
import { WatchlistToken } from "@/api/watchlist";
import { ViewToggle } from "@/components/ViewToggle";

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
  const [viewMode, setViewMode] = useState<"card" | "list">("list");

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
      <div className="h-screen overflow-auto text-gray-100 text-xs flex items-center justify-center">
        <div className="text-center p-8 bg-bg-card border border-gray-700 rounded max-w-md">
          <AlertCircle className="w-12 h-12 text-orange-400 mx-auto mb-4" />
          <h2 className="text-lg text-white mb-2 font-sans">Connect Your Wallet</h2>
          <p className="text-gray-400 font-sans">
            Please connect your wallet to view your watchlist
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-auto text-gray-100 text-xs">
      <div className="p-3 lg:p-1">
        <div className="bg-bg-card">
          <div className="text-orange-400 text-sm p-3 lg:p-1 border-b border-gray-700 flex items-center justify-between">
            <span className="font-sans">MY WATCHLIST</span>
            <span className="text-gray-400 font-mono">
              {watchlist.length} {watchlist.length === 1 ? "token" : "tokens"}
            </span>
          </div>

          {/* View Toggle Control Bar */}
          <div className="sticky top-0 z-20 bg-bg-card px-3 py-2 lg:px-1 lg:py-1 border-b border-gray-800">
            <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
          </div>

          {isLoading ? (
            <div className="text-center p-8 text-gray-400 font-sans">
              Loading watchlist...
            </div>
          ) : watchlist.length === 0 ? (
            <div className="text-center p-8">
              <Star className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 mb-2 font-sans">Your watchlist is empty</p>
              <p className="text-gray-500 text-xs font-sans">
                Click the star icon on any token to add it to your watchlist
              </p>
            </div>
          ) : viewMode === "card" ? (
            <div className="grid grid-cols-1 gap-3 p-3">
              {sortedWatchlist.map((token) => (
                <div
                  key={token.tokenAddress}
                  onClick={() => handleTokenClick(token)}
                  className="bg-bg-card rounded-lg p-3 cursor-pointer hover:bg-gray-800/30 transition-colors"
                >
                  <div className="flex gap-3">
                    {/* Token Image */}
                    <div className="flex-shrink-0">
                      {token.logoUrl ? (
                        <img
                          src={token.logoUrl}
                          alt={token.tokenSymbol}
                          className="w-16 h-16 rounded object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                            e.currentTarget.nextElementSibling?.classList.remove(
                              "hidden"
                            );
                          }}
                        />
                      ) : null}
                      <Circle
                        className={`w-16 h-16 text-blue-400 ${
                          token.logoUrl ? "hidden" : ""
                        }`}
                      />
                    </div>

                    {/* Token Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-white font-bold text-sm font-sans">
                          {token.tokenSymbol}
                        </span>
                        <span className="text-gray-400 text-xs font-sans">
                          {token.chain}
                        </span>
                        {token.graduated && (
                          <span className="text-green-400 text-xs font-mono">
                            bond
                          </span>
                        )}
                        {!token.graduated && (
                          <span className="bg-purple-600 text-black px-1 py-0.5 rounded text-xs font-mono">
                            BOND
                          </span>
                        )}
                      </div>
                      <div className="text-gray-400 text-xs font-sans mb-2 truncate">
                        {token.tokenName}
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-gray-400 font-sans">Price: </span>
                          <span className="text-white font-mono">
                            ${formatNumber(token.currentPrice)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400 font-sans">MCap: </span>
                          <span className="text-white font-mono">
                            $
                            {token.marketCap
                              ? formatNumber(Number(token.marketCap))
                              : "N/A"}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400 font-sans">24h: </span>
                          <span
                            className={`font-mono ${
                              token.priceChange24h && token.priceChange24h > 0
                                ? "text-green-400"
                                : "text-red-400"
                            }`}
                          >
                            {token.priceChange24h !== null
                              ? `${token.priceChange24h > 0 ? "+" : ""}${token.priceChange24h.toFixed(2)}%`
                              : "N/A"}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400 font-sans">Vol: </span>
                          <span className="text-white font-mono">
                            {formatNumber(token.totalVolume)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Star Button */}
                    <button
                      onClick={(e) =>
                        handleRemoveFromWatchlist(
                          e,
                          token.tokenAddress,
                          token.chain
                        )
                      }
                      className="flex-shrink-0 hover:scale-110 transition-transform"
                      title="Remove from watchlist"
                    >
                      <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-800 sticky top-0">
                  <tr className="text-gray-400">
                    <th className="text-center p-2 w-8"></th>
                    <th
                      className="text-left p-2 cursor-pointer hover:text-white font-sans"
                      onClick={() => handleSort("tokenSymbol")}
                    >
                      Symbol{" "}
                      <span className="font-mono">
                        {sortColumn === "tokenSymbol" &&
                          (sortDirection === "asc" ? "↑" : "↓")}
                      </span>
                    </th>
                    <th
                      className="text-left p-2 hidden md:table-cell cursor-pointer hover:text-white font-sans"
                      onClick={() => handleSort("tokenName")}
                    >
                      Name{" "}
                      <span className="font-mono">
                        {sortColumn === "tokenName" &&
                          (sortDirection === "asc" ? "↑" : "↓")}
                      </span>
                    </th>
                    <th
                      className="text-right p-2 cursor-pointer hover:text-white font-sans"
                      onClick={() => handleSort("currentPrice")}
                    >
                      PRICE{" "}
                      <span className="font-mono">
                        {sortColumn === "currentPrice" &&
                          (sortDirection === "asc" ? "↑" : "↓")}
                      </span>
                    </th>
                    <th
                      className="text-right p-2 cursor-pointer hover:text-white font-sans"
                      onClick={() => handleSort("marketCap")}
                    >
                      MCAP{" "}
                      <span className="font-mono">
                        {sortColumn === "marketCap" &&
                          (sortDirection === "asc" ? "↑" : "↓")}
                      </span>
                    </th>
                    <th
                      className="text-right p-2 cursor-pointer hover:text-white font-sans"
                      onClick={() => handleSort("priceChange24h")}
                    >
                      24H{" "}
                      <span className="font-mono">
                        {sortColumn === "priceChange24h" &&
                          (sortDirection === "asc" ? "↑" : "↓")}
                      </span>
                    </th>
                    <th
                      className="text-right p-2 cursor-pointer hover:text-white font-sans"
                      onClick={() => handleSort("priceChange6h")}
                    >
                      6H{" "}
                      <span className="font-mono">
                        {sortColumn === "priceChange6h" &&
                          (sortDirection === "asc" ? "↑" : "↓")}
                      </span>
                    </th>
                    <th
                      className="text-right p-2 cursor-pointer hover:text-white font-sans"
                      onClick={() => handleSort("priceChange1h")}
                    >
                      1H{" "}
                      <span className="font-mono">
                        {sortColumn === "priceChange1h" &&
                          (sortDirection === "asc" ? "↑" : "↓")}
                      </span>
                    </th>
                    <th
                      className="text-right p-2 cursor-pointer hover:text-white font-sans"
                      onClick={() => handleSort("priceChange5m")}
                    >
                      5M{" "}
                      <span className="font-mono">
                        {sortColumn === "priceChange5m" &&
                          (sortDirection === "asc" ? "↑" : "↓")}
                      </span>
                    </th>
                    <th
                      className="text-right p-2 hidden md:table-cell cursor-pointer hover:text-white font-sans"
                      onClick={() => handleSort("totalVolume")}
                    >
                      VOL{" "}
                      <span className="font-mono">
                        {sortColumn === "totalVolume" &&
                          (sortDirection === "asc" ? "↑" : "↓")}
                      </span>
                    </th>
                    <th className="text-right p-2 hidden md:table-cell font-sans">
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
                              className="w-4 h-4 rounded object-cover"
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
                          <span className="text-white font-bold font-mono">
                            {token.tokenSymbol}
                          </span>
                          <span className="text-gray-400 text-xs font-mono">
                            {token.chain}
                          </span>
                          {token.graduated && (
                            <span className="text-green-400 text-xs font-mono">
                              bond
                            </span>
                          )}
                          {!token.graduated && (
                            <span className="bg-purple-600 text-black px-1 py-0.5 rounded text-xs font-mono">
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
                      <td className="p-2 text-right text-gray-400 font-mono hidden md:table-cell">
                        {formatNumber(token.totalVolume)}
                      </td>
                      <td className="p-2 text-right text-gray-400 font-mono hidden md:table-cell">
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
