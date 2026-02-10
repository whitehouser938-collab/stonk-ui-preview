// API Configuration utility
import { env } from "./env";
import { logger } from "./logger";

export const getApiBaseUrl = (): string => {
  return env.VITE_API_URL;
};

export const getWebSocketUrl = (): string => {
  // If explicitly set, use it
  if (env.VITE_WEBSOCKET_URL) {
    return env.VITE_WEBSOCKET_URL;
  }

  // Otherwise, derive from API URL
  const apiUrl = env.VITE_API_URL;

  // Convert HTTP(S) API URL to WS(S) WebSocket URL
  try {
    const url = new URL(apiUrl);
    const wsProtocol = url.protocol === "https:" ? "wss:" : "ws:";
    // Remove /api suffix if present and add /ws
    const wsPath = url.pathname.replace(/\/api\/?$/, "") + "/ws";
    return `${wsProtocol}//${url.host}${wsPath}`;
  } catch (error) {
    logger.error("Failed to derive WebSocket URL from API URL:", apiUrl);
    throw new Error("Invalid API URL configuration");
  }
};

export const validateApiConfig = (): boolean => {
  try {
    new URL(env.VITE_API_URL);
    return true;
  } catch (error) {
    logger.error("VITE_API_URL is not a valid URL:", env.VITE_API_URL);
    return false;
  }
};
