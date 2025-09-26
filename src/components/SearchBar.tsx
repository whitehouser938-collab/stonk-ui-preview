import React, { useEffect, useState, useRef } from "react";
import { Search, ExternalLink, TrendingUp, TrendingDown } from "lucide-react";
import { useAtom } from "jotai";
import { searchTermAtom } from "@/state/app";
import { useNavigate } from "react-router-dom";
import { searchTokens as apiSearchTokens } from "@/api/token";

interface TokenSearchResult {
  id: string;
  name: string;
  symbol: string;
  chain: string;
  tokenAddress: string;
  logoUrl?: string;
  graduated: boolean;
  description?: string;
}

const SearchBar = () => {
  const [storedSearchTerm, setStoredSearchTerm] = useAtom(searchTermAtom);
  const [searchResults, setSearchResults] = useState<TokenSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Debounced search function
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (storedSearchTerm.trim().length >= 2) {
        searchTokens(storedSearchTerm.trim());
      } else {
        setSearchResults([]);
        setShowPreview(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [storedSearchTerm]);

  // Close preview when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setShowPreview(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const searchTokens = async (query: string) => {
    setIsLoading(true);
    try {
      const response = await apiSearchTokens({
        q: query,
        limit: 8,
      });

      if (response.success && response.data.tokens) {
        setSearchResults(response.data.tokens);
        setShowPreview(true);
        setSelectedIndex(-1);
      }
    } catch (error) {
      console.error("Search error:", error);
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showPreview || searchResults.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < searchResults.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0) {
          selectToken(searchResults[selectedIndex]);
        } else if (searchResults.length > 0) {
          selectToken(searchResults[0]);
        }
        break;
      case "Escape":
        setShowPreview(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const selectToken = (token: TokenSearchResult) => {
    setStoredSearchTerm(token.symbol);
    setShowPreview(false);
    setSelectedIndex(-1);
    // Navigate to token detail page
    navigate(`/token/${token.chain}/${token.tokenAddress}`);
  };

  const handleSearch = () => {
    if (searchResults.length > 0) {
      selectToken(searchResults[0]);
    } else if (storedSearchTerm.trim()) {
      // If no results but there's a search term, still try to search
      console.log("Searching for:", storedSearchTerm);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="bg-gray-900 border-b border-gray-700 p-2">
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-sm" ref={searchRef}>
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3" />
          <input
            placeholder="Search ticker or name..."
            value={storedSearchTerm}
            onChange={(e) => setStoredSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (searchResults.length > 0) {
                setShowPreview(true);
              }
            }}
            className="pl-7 pr-3 py-1 bg-black border border-gray-700 text-white text-xs w-full font-mono focus:border-orange-500 focus:outline-none"
          />

          {/* Search Preview Dropdown */}
          {showPreview && (
            <div className="absolute top-full left-0 right-0 bg-gray-800 border border-gray-600 border-t-0 max-h-80 overflow-y-auto z-50">
              {isLoading ? (
                <div className="p-3 text-center text-gray-400 text-xs">
                  Searching...
                </div>
              ) : searchResults.length > 0 ? (
                <div className="py-1">
                  {searchResults.map((token, index) => (
                    <div
                      key={token.id}
                      onClick={() => selectToken(token)}
                      className={`px-3 py-2 cursor-pointer hover:bg-gray-700 transition-colors ${
                        index === selectedIndex ? "bg-gray-700" : ""
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        {/* Token Logo */}
                        {token.logoUrl ? (
                          <img
                            src={token.logoUrl}
                            alt={token.symbol}
                            className="w-6 h-6 rounded-full flex-shrink-0"
                          />
                        ) : (
                          <div className="w-6 h-6 bg-gradient-to-br from-orange-500 to-red-600 rounded-full text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                            {token.symbol.slice(0, 2)}
                          </div>
                        )}

                        {/* Token Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="text-orange-400 font-bold text-xs">
                              {token.symbol}
                            </span>
                            <span className="text-gray-300 text-xs truncate">
                              {token.name}
                            </span>
                            {token.graduated && (
                              <div className="flex items-center space-x-1">
                                <TrendingUp className="w-3 h-3 text-green-400" />
                                <span className="text-green-400 text-xs font-bold">
                                  GRAD
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className="text-gray-400 text-xs">
                              {token.chain}
                            </span>
                            <span className="text-gray-500 text-xs">
                              {formatAddress(token.tokenAddress)}
                            </span>
                          </div>
                          {token.description && (
                            <div className="text-gray-400 text-xs mt-1 truncate">
                              {token.description}
                            </div>
                          )}
                        </div>

                        {/* External Link Icon */}
                        <ExternalLink className="w-3 h-3 text-gray-400 flex-shrink-0" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : storedSearchTerm.trim().length >= 2 ? (
                <div className="p-3 text-center text-gray-400 text-xs">
                  No tokens found for "{storedSearchTerm}"
                </div>
              ) : null}

              {/* Search Tip */}
              {searchResults.length > 0 && (
                <div className="border-t border-gray-700 px-3 py-2 bg-gray-900">
                  <div className="text-gray-500 text-xs flex items-center justify-between">
                    <span>↑↓ Navigate • Enter Select • Esc Close</span>
                    <span>
                      {searchResults.length} result
                      {searchResults.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <button
          onClick={handleSearch}
          className="px-3 py-1 bg-orange-600 text-black text-xs font-bold hover:bg-orange-500 transition-colors"
        >
          SEARCH
        </button>
      </div>
    </div>
  );
};

export default SearchBar;
