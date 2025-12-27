import React, { useEffect, useState, useRef } from "react";
import { Search, X, ExternalLink, TrendingUp } from "lucide-react";
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

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose }) => {
  const [storedSearchTerm, setStoredSearchTerm] = useAtom(searchTermAtom);
  const [searchResults, setSearchResults] = useState<TokenSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Debounced search function
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (storedSearchTerm.trim().length >= 2) {
        searchTokens(storedSearchTerm.trim());
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [storedSearchTerm]);

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const searchTokens = async (query: string) => {
    setIsLoading(true);
    try {
      const response = await apiSearchTokens({
        q: query,
        limit: 8,
      });

      if (response.success && response.data.tokens) {
        setSearchResults(response.data.tokens);
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
    if (searchResults.length === 0) return;

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
    }
  };

  const selectToken = (token: TokenSearchResult) => {
    navigate(`/token/${token.chain}/${token.tokenAddress}`);
    handleClose();
  };

  const handleClose = () => {
    setStoredSearchTerm("");
    setSearchResults([]);
    setSelectedIndex(-1);
    onClose();
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
        <div className="bg-gray-900 border border-gray-700 rounded-lg w-full max-w-2xl shadow-2xl">
          {/* Search Input Header */}
          <div className="flex items-center gap-3 p-4 border-b border-gray-700">
            <Search className="text-orange-400 w-5 h-5 flex-shrink-0" />
            <input
              ref={inputRef}
              placeholder="Search ticker or name..."
              value={storedSearchTerm}
              onChange={(e) => setStoredSearchTerm(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-transparent border-none text-white text-base font-mono focus:outline-none placeholder-gray-500"
            />
            <button
              onClick={handleClose}
              className="p-1 hover:bg-gray-800 rounded transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Results */}
          <div className="max-h-[60vh] overflow-y-auto">
            {isLoading ? (
              <div className="p-8 text-center text-gray-400">
                Searching...
              </div>
            ) : searchResults.length > 0 ? (
              <div>
                {searchResults.map((token, index) => (
                  <div
                    key={token.id}
                    onClick={() => selectToken(token)}
                    className={`px-4 py-3 cursor-pointer transition-colors border-b border-gray-800 last:border-b-0 ${
                      index === selectedIndex ? "bg-gray-800" : "hover:bg-gray-800/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Token Logo */}
                      {token.logoUrl ? (
                        <img
                          src={token.logoUrl}
                          alt={token.symbol}
                          className="w-10 h-10 rounded-full flex-shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-full text-white text-sm font-bold flex items-center justify-center flex-shrink-0">
                          {token.symbol.slice(0, 2)}
                        </div>
                      )}

                      {/* Token Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-orange-400 font-bold text-sm">
                            {token.symbol}
                          </span>
                          <span className="text-gray-300 text-sm truncate">
                            {token.name}
                          </span>
                          {token.graduated && (
                            <div className="flex items-center gap-1">
                              <TrendingUp className="w-3 h-3 text-green-400" />
                              <span className="text-green-400 text-xs font-bold">
                                GRAD
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
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
                      <ExternalLink className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    </div>
                  </div>
                ))}
              </div>
            ) : storedSearchTerm.trim().length >= 2 ? (
              <div className="p-8 text-center text-gray-400">
                No tokens found for "{storedSearchTerm}"
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500">
                Start typing to search tokens...
              </div>
            )}
          </div>

          {/* Footer */}
          {searchResults.length > 0 && (
            <div className="border-t border-gray-700 px-4 py-3 bg-gray-900/50">
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
      </div>
    </>
  );
};
