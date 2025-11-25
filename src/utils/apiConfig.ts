// API Configuration utility
export const getApiBaseUrl = (): string => {
  const apiUrl = import.meta.env.VITE_API_URL;

  if (!apiUrl) {
    console.warn(
      "VITE_API_URL environment variable is not set. Using fallback URL."
    );
    return "http://localhost:3000"; // Fallback URL
  }

  return apiUrl;
};

export const getWebSocketUrl = (): string => {
  const wsUrl = import.meta.env.VITE_WEBSOCKET_URL;

  // If explicitly set, use it
  if (wsUrl) {
    return wsUrl;
  }

  // Otherwise, derive from API URL
  const apiUrl = import.meta.env.VITE_API_URL;

  if (!apiUrl) {
    console.warn(
      "Neither VITE_WEBSOCKET_URL nor VITE_API_URL is set. Using fallback WebSocket URL."
    );
    return "ws://localhost:3003";
  }

  // Convert HTTP(S) API URL to WS(S) WebSocket URL
  try {
    const url = new URL(apiUrl);
    const wsProtocol = url.protocol === "https:" ? "wss:" : "ws:";
    // Remove /api suffix if present and add /ws
    const wsPath = url.pathname.replace(/\/api\/?$/, "") + "/ws";
    return `${wsProtocol}//${url.host}${wsPath}`;
  } catch (error) {
    console.error("Failed to derive WebSocket URL from API URL:", apiUrl);
    return "ws://localhost:3003";
  }
};

export const validateApiConfig = (): boolean => {
  const apiUrl = import.meta.env.VITE_API_URL;

  if (!apiUrl) {
    console.error("VITE_API_URL environment variable is required but not set.");
    return false;
  }

  try {
    new URL(apiUrl);
    return true;
  } catch (error) {
    console.error("VITE_API_URL is not a valid URL:", apiUrl);
    return false;
  }
};
