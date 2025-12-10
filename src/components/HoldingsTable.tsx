import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Circle, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { ethers } from "ethers";
import { Holding } from "@/api/user";

interface HoldingsTableProps {
  holdings: Holding[];
}

type SortField =
  | "symbol"
  | "amount"
  | "value"
  | "price"
  | "marketCap"
  | "priceChange";
type SortDirection = "asc" | "desc";

const HoldingsTable: React.FC<HoldingsTableProps> = ({ holdings }) => {
  const [sortField, setSortField] = useState<SortField>("amount");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const getTokenAmount = (amount: string, decimals: string) => {
    const amountNum = parseFloat(amount);
    const decimalsNum = parseInt(decimals);
    const divisor = Math.pow(10, decimalsNum);
    return amountNum / divisor;
  };

  const formatNumber = (num: number): string => {
    if (num >= 1e9) return parseFloat((num / 1e9).toFixed(2)) + "B";
    if (num >= 1e6) return parseFloat((num / 1e6).toFixed(2)) + "M";
    if (num >= 1e3) return parseFloat((num / 1e3).toFixed(2)) + "K";
    return parseFloat(num.toFixed(2)) + "";
  };

  const formatPrice = (price: number | null | undefined): string => {
    if (price === null || price === undefined) return "N/A";
    if (price === 0) return "N/A";
    if (price < 0.000001) return `$${price.toExponential(2)}`;
    if (price < 0.01) return `$${price.toFixed(6)}`;
    if (price < 1) return `$${price.toFixed(4)}`;
    return `$${price.toFixed(2)}`;
  };

  const formatCurrency = (value: string | number | null | undefined): string => {
    if (value === null || value === undefined) return "N/A";
    const num = typeof value === "string" ? parseFloat(value) : value;
    if (isNaN(num) || num === 0) return "N/A";
    if (num >= 1e9) return `$${parseFloat((num / 1e9).toFixed(2))}B`;
    if (num >= 1e6) return `$${parseFloat((num / 1e6).toFixed(2))}M`;
    if (num >= 1e3) return `$${parseFloat((num / 1e3).toFixed(2))}K`;
    return `$${parseFloat(num.toFixed(2))}`;
  };

  const formatPriceChange = (change: number | null | undefined): string => {
    if (change === null || change === undefined) return "N/A";
    const sign = change >= 0 ? "+" : "";
    return `${sign}${change.toFixed(2)}%`;
  };

  const getPriceChangeColor = (change: number | null | undefined): string => {
    if (change === null || change === undefined) return "text-gray-400";
    if (change >= 0) return "text-green-400";
    return "text-red-400";
  };

  // Convert address to checksum format for proper API calls
  const toChecksumAddress = (address: string): string => {
    try {
      return ethers.getAddress(address);
    } catch (error) {
      // If address is invalid, return as-is
      return address;
    }
  };

  const formatTokenAmount = (amount: string, decimals: string) => {
    const cleanAmount = getTokenAmount(amount, decimals);
    return formatNumber(cleanAmount);
  };

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

  const sortedHoldings = useMemo(() => {
    return [...holdings].sort((a, b) => {
      let aValue: number | string;
      let bValue: number | string;

      switch (sortField) {
        case "symbol":
          aValue = a.symbol.toLowerCase();
          bValue = b.symbol.toLowerCase();
          break;
        case "amount":
          aValue = getTokenAmount(a.amount, a.decimals);
          bValue = getTokenAmount(b.amount, b.decimals);
          break;
        case "value":
          aValue = parseFloat(a.totalValue);
          bValue = parseFloat(b.totalValue);
          break;
        case "price":
          aValue = a.currentPrice ?? 0;
          bValue = b.currentPrice ?? 0;
          break;
        case "marketCap":
          aValue = parseFloat(a.marketCap) || 0;
          bValue = parseFloat(b.marketCap) || 0;
          break;
        case "priceChange":
          aValue = a.priceChange24h ?? 0;
          bValue = b.priceChange24h ?? 0;
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
  }, [holdings, sortField, sortDirection]);

  // Filter holdings with amount >= 1
  const filteredHoldings = sortedHoldings.filter(
    (holding) => getTokenAmount(holding.amount, holding.decimals) >= 1
  );

  if (filteredHoldings.length === 0) {
    return (
      <div className="bg-gray-900 border border-gray-700 p-1">
        <div className="text-orange-400 text-xs mb-1">HOLDINGS</div>
        <div className="text-center py-4 text-gray-400 text-xs">
          No holdings yet
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-700 p-1">
      <div className="text-orange-400 text-xs mb-1">HOLDINGS</div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-[800px]">
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
                  onClick={() => handleSort("amount")}
                  className="flex items-center space-x-1 hover:text-white transition-colors ml-auto"
                >
                  <span>AMOUNT</span>
                  {getSortIcon("amount")}
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
                  onClick={() => handleSort("value")}
                  className="flex items-center space-x-1 hover:text-white transition-colors ml-auto"
                >
                  <span>VALUE</span>
                  {getSortIcon("value")}
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
                  onClick={() => handleSort("priceChange")}
                  className="flex items-center space-x-1 hover:text-white transition-colors ml-auto"
                >
                  <span>24H</span>
                  {getSortIcon("priceChange")}
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredHoldings.map((holding, index) => (
              <tr
                key={index}
                className="border-b border-gray-800 hover:bg-gray-800/30 transition-colors cursor-pointer"
              >
                <td className="p-1">
                  <Link
                    to={`/token/${holding.chain}/${toChecksumAddress(
                      holding.tokenAddress
                    )}`}
                    className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
                  >
                    {holding.logo ? (
                      <img
                        src={holding.logo}
                        alt={`${holding.symbol} logo`}
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
                        holding.logo ? "hidden" : ""
                      }`}
                    />
                    <span className="text-white font-bold">
                      {holding.symbol}
                    </span>
                    <span className="text-gray-400 text-xs">
                      {holding.chain}
                    </span>
                  </Link>
                </td>
                <td className="p-1 text-right text-gray-400 font-mono">
                  {formatTokenAmount(holding.amount, holding.decimals)}
                </td>
                <td className="p-1 text-right text-gray-400 font-mono">
                  {formatPrice(holding.currentPrice)}
                </td>
                <td className="p-1 text-right text-white font-mono">
                  {formatCurrency(holding.totalValue)}
                </td>
                <td className="p-1 text-right text-gray-400 font-mono">
                  {formatCurrency(holding.marketCap)}
                </td>
                <td
                  className={`p-1 text-right font-mono ${getPriceChangeColor(holding.priceChange24h)}`}
                >
                  {formatPriceChange(holding.priceChange24h)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default HoldingsTable;
