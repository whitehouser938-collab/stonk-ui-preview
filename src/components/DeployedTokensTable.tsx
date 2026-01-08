import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Circle, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

interface DeployedToken {
  name: string;
  symbol: string;
  tokenAddress: string;
  marketCap?: string | null;
  currentPrice?: number | null;
  priceChange24h?: number | null;
  isGraduated?: boolean;
  graduationTimestamp?: string | null;
  deploymentTimestamp?: string;
  logo?: string;
}

interface DeployedTokensTableProps {
  tokens: DeployedToken[];
}

type SortField = "symbol" | "price" | "marketCap" | "priceChange24h" | "status" | "deploymentTimestamp";
type SortDirection = "asc" | "desc";

const DeployedTokensTable: React.FC<DeployedTokensTableProps> = ({
  tokens,
}) => {
  const [sortField, setSortField] = useState<SortField>("marketCap");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Debug logging
  console.log("DeployedTokensTable received tokens:", tokens);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-4 h-4" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="w-4 h-4" />
    ) : (
      <ArrowDown className="w-4 h-4" />
    );
  };

  const formatNumber = (num: number): string => {
    if (num >= 1e9) return parseFloat((num / 1e9).toFixed(2)) + "B";
    if (num >= 1e6) return parseFloat((num / 1e6).toFixed(2)) + "M";
    if (num >= 1e3) return parseFloat((num / 1e3).toFixed(2)) + "K";
    return parseFloat(num.toFixed(2)) + "";
  };

  const formatMarketCap = (marketCap?: string | null) => {
    if (!marketCap || marketCap === "0") return "N/A";
    const num = parseFloat(marketCap);
    return formatNumber(num);
  };

  const formatPrice = (price?: number | null) => {
    if (price === null || price === undefined) return "N/A";
    if (price === 0) return "N/A";
    if (price < 0.000001) return price.toExponential(2);
    if (price < 0.01) return price.toFixed(6);
    return "$" + price.toFixed(4);
  };

  const formatPriceChange = (change?: number | null) => {
    if (change === null || change === undefined) return "N/A";
    const sign = change >= 0 ? "+" : "";
    return `${sign}${change.toFixed(2)}%`;
  };

  const getPriceChangeColor = (change?: number | null) => {
    if (change === null || change === undefined) return "text-gray-400";
    if (change > 0) return "text-green-400";
    if (change < 0) return "text-red-400";
    return "text-gray-400";
  };

  const formatDeploymentTime = (timestamp?: string) => {
    if (!timestamp) return "N/A";
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    if (diffMinutes > 0) return `${diffMinutes}m ago`;
    return "<1m ago";
  };

  const sortedTokens = useMemo(() => {
    return [...tokens].sort((a, b) => {
      let aValue: number | string;
      let bValue: number | string;

      switch (sortField) {
        case "symbol":
          aValue = a.symbol.toLowerCase();
          bValue = b.symbol.toLowerCase();
          break;
        case "price":
          aValue = a.currentPrice || 0;
          bValue = b.currentPrice || 0;
          break;
        case "marketCap":
          aValue = parseFloat(a.marketCap || "0");
          bValue = parseFloat(b.marketCap || "0");
          break;
        case "priceChange24h":
          aValue = a.priceChange24h || 0;
          bValue = b.priceChange24h || 0;
          break;
        case "status":
          aValue = a.isGraduated ? "graduated" : "bonding";
          bValue = b.isGraduated ? "graduated" : "bonding";
          break;
        case "deploymentTimestamp":
          aValue = new Date(a.deploymentTimestamp || "").getTime();
          bValue = new Date(b.deploymentTimestamp || "").getTime();
          break;
        default:
          return 0;
      }

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortDirection === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
      }

      return 0;
    });
  }, [tokens, sortField, sortDirection]);

  if (tokens.length === 0) {
    return (
      <div className="bg-gray-900 border border-gray-700 p-1">
        <div className="text-orange-500 text-xs mb-1">DEPLOYED TOKENS</div>
        <div className="text-center py-4 text-gray-400 text-xs">
          No tokens deployed yet
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-700 p-1">
      <div className="text-orange-500 text-xs mb-1">DEPLOYED TOKENS</div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-[500px]">
          <thead className="bg-gray-800 sticky top-0">
            <tr className="text-gray-400">
              <th className="text-left p-1">
                <button
                  onClick={() => handleSort("symbol")}
                  className="flex items-center space-x-1 hover:text-white transition-colors"
                >
                  <span>SYMBOL</span>
                  {getSortIcon("symbol")}
                </button>
              </th>
              <th className="text-right p-1">
                <button
                  onClick={() => handleSort("price")}
                  className="flex items-center space-x-1 hover:text-white transition-colors ml-auto"
                >
                  <span>PRICE</span>
                  {getSortIcon("price")}
                </button>
              </th>
              <th className="text-right p-1">
                <button
                  onClick={() => handleSort("marketCap")}
                  className="flex items-center space-x-1 hover:text-white transition-colors ml-auto"
                >
                  <span>MCAP</span>
                  {getSortIcon("marketCap")}
                </button>
              </th>
              <th className="text-right p-1">
                <button
                  onClick={() => handleSort("priceChange24h")}
                  className="flex items-center space-x-1 hover:text-white transition-colors ml-auto"
                >
                  <span>24H</span>
                  {getSortIcon("priceChange24h")}
                </button>
              </th>
              <th className="text-right p-1">
                <button
                  onClick={() => handleSort("status")}
                  className="flex items-center space-x-1 hover:text-white transition-colors ml-auto"
                >
                  <span>STATUS</span>
                  {getSortIcon("status")}
                </button>
              </th>
              <th className="text-right p-1">
                <button
                  onClick={() => handleSort("deploymentTimestamp")}
                  className="flex items-center space-x-1 hover:text-white transition-colors ml-auto"
                >
                  <span>DEPLOYED</span>
                  {getSortIcon("deploymentTimestamp")}
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedTokens.map((token, index) => (
              <tr
                key={index}
                className="border-b border-gray-800 hover:bg-gray-800/30 transition-colors cursor-pointer"
              >
                <td className="p-1">
                  <Link
                    to={`/token/SEP/${token.tokenAddress}`}
                    className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
                  >
                    {token.logo ? (
                      <img
                        src={token.logo}
                        alt={`${token.symbol} logo`}
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
                        token.logo ? "hidden" : ""
                      }`}
                    />
                    <span className="text-white font-bold">{token.symbol}</span>
                    <span className="text-gray-400 text-xs">SEP</span>
                  </Link>
                </td>
                <td className="p-1 text-right text-gray-400 font-mono">
                  {formatPrice(token.currentPrice)}
                </td>
                <td className="p-1 text-right text-gray-400 font-mono">
                  {formatMarketCap(token.marketCap)}
                </td>
                <td className={`p-1 text-right font-mono ${getPriceChangeColor(token.priceChange24h)}`}>
                  {formatPriceChange(token.priceChange24h)}
                </td>
                <td className="p-1 text-right">
                  {token.isGraduated ? (
                    <span className="bg-green-600 text-black px-1 py-0.5 rounded text-xs font-mono">
                      GRAD
                    </span>
                  ) : (
                    <span className="bg-purple-600 text-black px-1 py-0.5 rounded text-xs font-mono">
                      BOND
                    </span>
                  )}
                </td>
                <td className="p-1 text-right text-gray-400 font-mono">
                  {formatDeploymentTime(token.deploymentTimestamp)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DeployedTokensTable;
