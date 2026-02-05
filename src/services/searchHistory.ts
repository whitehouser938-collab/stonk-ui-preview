const MAX_HISTORY = 50;
const STORAGE_PREFIX = "search:history:";

export interface SearchHistoryEntry {
  query: string;
  timestamp: number;
  tokenId?: string;
}

export class SearchHistoryManager {
  /**
   * Save a search query to the user's history
   */
  static saveSearch(walletAddress: string, query: string, tokenId?: string): void {
    if (!walletAddress || !query.trim()) return;

    const key = this.getStorageKey(walletAddress);
    const history = this.getHistory(walletAddress);

    // Add to front of array
    const newEntry: SearchHistoryEntry = {
      query: query.trim(),
      timestamp: Date.now(),
      tokenId,
    };

    // Remove duplicates (case-insensitive)
    const filteredHistory = history.filter(
      (entry) => entry.query.toLowerCase() !== query.toLowerCase()
    );

    // Add new entry and limit to MAX_HISTORY
    const updatedHistory = [newEntry, ...filteredHistory].slice(0, MAX_HISTORY);

    try {
      localStorage.setItem(key, JSON.stringify(updatedHistory));
    } catch (error) {
      console.error("Failed to save search history:", error);
    }
  }

  /**
   * Get the search history for a user
   */
  static getHistory(walletAddress: string): SearchHistoryEntry[] {
    if (!walletAddress) return [];

    const key = this.getStorageKey(walletAddress);
    const stored = localStorage.getItem(key);

    if (!stored) return [];

    try {
      return JSON.parse(stored);
    } catch (error) {
      console.error("Failed to parse search history:", error);
      return [];
    }
  }

  /**
   * Clear all search history for a user
   */
  static clearHistory(walletAddress: string): void {
    if (!walletAddress) return;
    const key = this.getStorageKey(walletAddress);
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error("Failed to clear search history:", error);
    }
  }

  /**
   * Remove a specific entry from search history
   */
  static removeEntry(walletAddress: string, query: string): void {
    const history = this.getHistory(walletAddress);
    const filtered = history.filter((entry) => entry.query !== query);
    const key = this.getStorageKey(walletAddress);
    try {
      localStorage.setItem(key, JSON.stringify(filtered));
    } catch (error) {
      console.error("Failed to remove search history entry:", error);
    }
  }

  /**
   * Get the most recent N searches
   */
  static getRecentSearches(walletAddress: string, limit: number = 10): SearchHistoryEntry[] {
    const history = this.getHistory(walletAddress);
    return history.slice(0, limit);
  }

  /**
   * Search within history
   */
  static searchHistory(walletAddress: string, searchTerm: string): SearchHistoryEntry[] {
    const history = this.getHistory(walletAddress);
    const lowerSearchTerm = searchTerm.toLowerCase();
    return history.filter((entry) =>
      entry.query.toLowerCase().includes(lowerSearchTerm)
    );
  }

  private static getStorageKey(walletAddress: string): string {
    return `${STORAGE_PREFIX}${walletAddress.toLowerCase()}`;
  }
}
