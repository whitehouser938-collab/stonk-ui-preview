import React, { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { useAtom } from "jotai";
import { searchTermAtom } from "@/state/app";

const SearchBar = () => {
  const [storedSearchTerm, setStoredSearchTerm] = useAtom(searchTermAtom);

  const handleSearch = () => {
    // This function can be extended to handle search logic, e.g., navigating to a results page
    console.log("Searching for:", storedSearchTerm);
    setStoredSearchTerm(""); // Clear the search term after search
  };

  return (
    <div className="bg-gray-900 border-b border-gray-700 p-2">
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3" />
          <input
            placeholder="Search ticker..."
            value={storedSearchTerm}
            onChange={(e) => setStoredSearchTerm(e.target.value)}
            className="pl-7 pr-3 py-1 bg-black border border-gray-700 text-white text-xs w-full font-mono"
          />
        </div>
        <button
          onClick={handleSearch}
          className="px-3 py-1 bg-orange-600 text-black text-xs font-bold hover:bg-orange-500"
        >
          ANALYZE
        </button>
      </div>
    </div>
  );
};

export default SearchBar;
