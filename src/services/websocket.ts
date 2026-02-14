import { SUBSCRIPTION_TYPES } from "@/types";
import { getWebSocketUrl } from "@/utils/apiConfig";
import { logger } from "@/utils/logger";
import { validateWebSocketMessage } from "@/utils/websocketValidation";

class WebSocketManager {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private subscriptions = new Set<string>();
  private messageHandlers = new Map<string, (data: any) => void>();
  private isConnecting = false;
  private connectionState: "disconnected" | "connecting" | "connected" =
    "disconnected";
  private healthCheckInterval: NodeJS.Timeout | null = null;

  // Authentication is handled via httpOnly cookies – the browser sends
  // them automatically with the WebSocket upgrade request.  No manual
  // token management is needed on the client side.

  connect(): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        resolve(this.ws);
        return;
      }

      if (this.isConnecting) {
        // If already connecting, wait for the current connection attempt
        const checkConnection = () => {
          if (this.connectionState === "connected" && this.ws) {
            resolve(this.ws);
          } else if (this.connectionState === "disconnected") {
            reject(new Error("Connection failed"));
          } else {
            setTimeout(checkConnection, 100);
          }
        };
        checkConnection();
        return;
      }

      this.isConnecting = true;
      this.connectionState = "connecting";

      try {
        const wsUrl = getWebSocketUrl();

        // httpOnly cookies are sent automatically with the upgrade request
        logger.websocket("Connecting to:", wsUrl);
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          logger.websocket("Connected");
          logger.debug("WebSocket ready state:", this.ws?.readyState);
          this.reconnectAttempts = 0;
          this.isConnecting = false;
          this.connectionState = "connected";

          // Resubscribe to existing subscriptions
          this.subscriptions.forEach((channel) => {
            this.resubscribe(channel);
          });

          // Start health check
          this.startHealthCheck();

          resolve(this.ws!);
        };

        // Note: Browser WebSocket API handles ping/pong automatically
        // Manual ping/pong handling is not needed and can interfere with the connection

        this.ws.onmessage = (event) => {
          try {
            // Only handle JSON messages - browser handles ping/pong automatically
            if (typeof event.data === "string") {
              const rawMessage = JSON.parse(event.data);
              
              // Validate message before processing
              const validatedMessage = validateWebSocketMessage(rawMessage);
              if (!validatedMessage) {
                logger.warn("Invalid WebSocket message received, ignoring");
                return;
              }
              
              logger.websocket("Received message:", validatedMessage);
              this.handleMessage(validatedMessage);
            }
          } catch (error) {
            logger.error("Failed to parse WebSocket message:", error);
          }
        };

        this.ws.onclose = (event) => {
          logger.websocket("Disconnected:", event.code, event.reason);
          logger.debug("Close was clean:", event.wasClean);
          this.isConnecting = false;
          this.connectionState = "disconnected";
          this.handleReconnection();
        };

        this.ws.onerror = (error) => {
          logger.error("WebSocket error:", error);
          this.isConnecting = false;
          this.connectionState = "disconnected";
          reject(error);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  private normalizeChannel(channel: string): string {
    // Normalize channel by converting to lowercase
    // This ensures consistent matching between server (lowercase) and client
    // return channel.toLowerCase();
    // Channel formatting is strict, should not be changed as server is expecting the format specified in the channel formater config
    return channel; 
  }

  private handleMessage(message: any) {
    // Handle heartbeat acknowledgments
    if (message.type === "heartbeat_ack") {
      logger.debug("Received heartbeat acknowledgment from server");
      return;
    } else if (message.type === "subscribed") {
      logger.websocket(`Subscribed to channel: ${message.channel}`);
      return;
    }

    // Normalize the channel from the server message
    const normalizedChannel = this.normalizeChannel(message.channel);
    logger.debug("Handling message for channel:", message.channel, "->", normalizedChannel);

    const handler = this.messageHandlers.get(normalizedChannel);
    if (handler) {
      logger.debug("Found handler for channel:", normalizedChannel);
      handler(message);
    } else {
      logger.warn("No handler found for channel:", normalizedChannel);
      logger.debug("Available handlers:", Array.from(this.messageHandlers.keys()));
    }
  }

  private startHealthCheck() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        // Send a simple heartbeat message to verify server responsiveness
        try {
          this.ws.send(JSON.stringify({ type: "heartbeat" }));
          logger.debug("Health check: Sent heartbeat");
        } catch (error) {
          logger.warn("Health check: Failed to send heartbeat, connection dead");
          this.connectionState = "disconnected";
          this.handleReconnection();
        }
      } else {
        logger.debug("Health check: Connection is dead, state:", this.ws?.readyState);
        this.connectionState = "disconnected";
        this.handleReconnection();
      }
    }, 45000); // Check every 45 seconds (longer than server ping interval)
  }

  private stopHealthCheck() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  private handleReconnection() {
    this.stopHealthCheck();

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(
        this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
        30000 // Max 30 second delay
      );

      logger.info(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);

      setTimeout(() => {
        this.connect().catch((error) => {
          logger.error("Reconnection failed:", error);
          // Continue trying even if this attempt fails
          this.handleReconnection();
        });
      }, delay);
    } else {
      logger.warn("Max reconnection attempts reached, will retry in 60 seconds");
      // Reset attempts after 60 seconds to allow for network recovery
      setTimeout(() => {
        this.reconnectAttempts = 0;
        this.handleReconnection();
      }, 60000);
    }
  }

  private resubscribe(channel: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const [channelType] = channel.split(":");
      
      const config = Object.values(SUBSCRIPTION_TYPES).find(
        (cfg) => cfg.prefix === channelType
      );

      if (config) {
        this.ws.send(
          JSON.stringify({
            type: config.subscribeType,
            channel,
          })
        );
      }
    }
  }

  subscribe<T>(
    subscriptionKey: keyof typeof SUBSCRIPTION_TYPES,
    onUpdate: (data: T) => void,
    channel: string
  ): () => void {
    const config = SUBSCRIPTION_TYPES[subscriptionKey];
    const normalizedChannel = this.normalizeChannel(channel);

    logger.websocket(`Subscribing to ${subscriptionKey} on channel: ${channel} -> ${normalizedChannel}`);

    this.connect()
      .then((ws) => {
        ws.send(JSON.stringify({
          type: config.subscribeType,
          channel,  // Send original channel to server (server will normalize)
        }));
        // Store with normalized channel for matching incoming messages
        this.subscriptions.add(normalizedChannel);
        this.messageHandlers.set(normalizedChannel, onUpdate);
      })
      .catch((error) => logger.error("WebSocket subscription error:", error));

    return () => this.unsubscribe(subscriptionKey, channel);
  }

  unsubscribe(
    subscriptionKey: keyof typeof SUBSCRIPTION_TYPES,
    channel: string
  ): void {
    const config = SUBSCRIPTION_TYPES[subscriptionKey];
    const normalizedChannel = this.normalizeChannel(channel);

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: config.unsubscribeType,
        channel,  // Send original channel to server
      }));
    }

    // Delete using normalized channel
    this.subscriptions.delete(normalizedChannel);
    this.messageHandlers.delete(normalizedChannel);
    logger.websocket(`Unsubscribed from ${subscriptionKey} on channel: ${channel} -> ${normalizedChannel}`);
  }

  disconnect() {
    this.stopHealthCheck();
    this.subscriptions.clear();
    this.messageHandlers.clear();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  getConnectionState() {
    return {
      state: this.connectionState,
      readyState: this.ws?.readyState,
      isConnecting: this.isConnecting,
      reconnectAttempts: this.reconnectAttempts,
      subscriptions: this.subscriptions.size,
      handlers: this.messageHandlers.size,
    };
  }
}

export const wsManager = new WebSocketManager();
