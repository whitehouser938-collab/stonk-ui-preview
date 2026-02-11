// API Configuration utility
import { env } from "./env";
import { logger } from "./logger";

export const getApiBaseUrl = (): string => {
  return env.VITE_API_URL;
};

export const getWebSocketUrl = (): string => {
  let url: string;

  if (env.VITE_WEBSOCKET_URL) {
    url = env.VITE_WEBSOCKET_URL;
  } else {
    // Derive from API URL
    const apiUrl = env.VITE_API_URL;
    try {
      const parsed = new URL(apiUrl);
      const wsProtocol = parsed.protocol === "https:" ? "wss:" : "ws:";
      const wsPath = parsed.pathname.replace(/\/api\/?$/, "") + "/ws";
      url = `${wsProtocol}//${parsed.host}${wsPath}`;
    } catch (error) {
      logger.error("Failed to derive WebSocket URL from API URL:", apiUrl);
      throw new Error("Invalid API URL configuration");
    }
  }

  // Production ingress serves WebSocket at /ws; ensure path is present
  try {
    const parsed = new URL(url);
    if (!parsed.pathname || parsed.pathname === "/") {
      parsed.pathname = "/ws";
      return parsed.toString();
    }
    return url;
  } catch {
    return url;
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
