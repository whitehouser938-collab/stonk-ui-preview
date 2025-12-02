import { SUBSCRIPTION_TYPES } from "@/types";
import { getWebSocketUrl } from "@/utils/apiConfig";

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
        console.log("[WebSocket] Connecting to:", wsUrl);
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log("WebSocket connected");
          console.log("WebSocket ready state:", this.ws?.readyState);
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
              const message = JSON.parse(event.data);
              console.log("[WebSocket] Received message:", message);
              this.handleMessage(message);
            }
          } catch (error) {
            console.error("Failed to parse WebSocket message:", error);
          }
        };

        this.ws.onclose = (event) => {
          console.log("WebSocket disconnected:", event.code, event.reason);
          console.log("Close was clean:", event.wasClean);
          this.isConnecting = false;
          this.connectionState = "disconnected";
          this.handleReconnection();
        };

        this.ws.onerror = (error) => {
          console.error("WebSocket error:", error);
          this.isConnecting = false;
          this.connectionState = "disconnected";
          reject(error);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  private handleMessage(message: any) {
    // Handle heartbeat acknowledgments
    if (message.type === "heartbeat_ack") {
      console.log("[WebSocket] Received heartbeat acknowledgment from server");
      return;
    }else if (message.type === "subscribed"){
      console.log(`[WebSocket] Subscribed to channel: ${message.channel}`);
      return;
    }

    console.log("[WebSocket] Handling message for channel:", message.channel);
    const handler = this.messageHandlers.get(message.channel);
    if (handler) {
      console.log("[WebSocket] Found handler for channel:", message.channel);
      handler(message);
    } else {
      console.log("[WebSocket] No handler found for channel:", message.channel);
      console.log(
        "[WebSocket] Available handlers:",
        Array.from(this.messageHandlers.keys())
      );
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
          console.log("[WebSocket] Health check: Sent heartbeat");
        } catch (error) {
          console.log(
            "[WebSocket] Health check: Failed to send heartbeat, connection dead"
          );
          this.connectionState = "disconnected";
          this.handleReconnection();
        }
      } else {
        console.log(
          "[WebSocket] Health check: Connection is dead, state:",
          this.ws?.readyState
        );
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

      console.log(
        `Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`
      );

      setTimeout(() => {
        this.connect().catch((error) => {
          console.error("Reconnection failed:", error);
          // Continue trying even if this attempt fails
          this.handleReconnection();
        });
      }, delay);
    } else {
      console.error(
        "Max reconnection attempts reached, will retry in 60 seconds"
      );
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

    console.log(`[WebSocket] Subscribing to ${subscriptionKey} on channel: ${channel}`);

    this.connect()
      .then((ws) => {
        ws.send(JSON.stringify({
          type: config.subscribeType,
          channel,
        }));
        this.subscriptions.add(channel);
        this.messageHandlers.set(channel, onUpdate);
      })
      .catch(console.error);

    return () => this.unsubscribe(subscriptionKey, channel);
  }

  unsubscribe(
    subscriptionKey: keyof typeof SUBSCRIPTION_TYPES,
    channel: string
  ): void {
    const config = SUBSCRIPTION_TYPES[subscriptionKey];

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: config.unsubscribeType,
        channel,
      }));
    }

    this.subscriptions.delete(channel);
    this.messageHandlers.delete(channel);
    console.log(`[WebSocket] Unsubscribed from ${subscriptionKey} on channel: ${channel}`);
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
