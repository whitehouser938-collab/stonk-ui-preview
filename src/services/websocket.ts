import { BarUpdateMessage, TradeUpdateMessage } from "@/types";

class WebSocketManager {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private subscriptions = new Set<string>();
  private messageHandlers = new Map<string, (data: any) => void>();

  connect(): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        resolve(this.ws);
        return;
      }

      try {
        this.ws = new WebSocket(
          import.meta.env.VITE_WEBSOCKET_URL || "ws://localhost:3003"
        );

        this.ws.onopen = () => {
          console.log("WebSocket connected");
          this.reconnectAttempts = 0;

          // Resubscribe to existing subscriptions
          this.subscriptions.forEach((channel) => {
            this.resubscribe(channel);
          });

          resolve(this.ws!);
        };

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error("Failed to parse WebSocket message:", error);
          }
        };

        this.ws.onclose = (event) => {
          console.log("WebSocket disconnected:", event.code, event.reason);
          this.handleReconnection();
        };

        this.ws.onerror = (error) => {
          console.error("WebSocket error:", error);
          reject(error);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  private handleMessage(message: any) {
    const handler = this.messageHandlers.get(message.channel);
    if (handler) {
      handler(message);
    }
  }

  private handleReconnection() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay =
        this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

      console.log(
        `Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`
      );

      setTimeout(() => {
        this.connect().catch(console.error);
      }, delay);
    } else {
      console.error("Max reconnection attempts reached");
    }
  }

  private resubscribe(channel: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const [type] = channel.split(":");
      switch (type) {
        case "token_trades":
          this.ws.send(
            JSON.stringify({
              type: "subscribeTrades",
              channel,
            })
          );
          break;
        case "token_bars":
          this.ws.send(
            JSON.stringify({
              type: "subscribeBars",
              channel,
            })
          );
          break;
        default:
          break;
      }
    }
  }

  subscribeBars(
    channel: string,
    onUpdate: (data: BarUpdateMessage) => void
  ): () => void {
    this.connect()
      .then((ws) => {
        const subRequest = {
          type: "subscribeBars",
          channel: channel,
        };
        ws.send(JSON.stringify(subRequest));

        this.subscriptions.add(channel);
        this.messageHandlers.set(channel, onUpdate);

        console.log(`Subscribed to bars on channel ${channel}`);
      })
      .catch(console.error);

    return () => this.unsubscribeBars(channel);
  }

  unsubscribeBars(channel: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: "unsubscribeBars",
          channel,
        })
      );
    }

    this.subscriptions.delete(channel);
    this.messageHandlers.delete(channel);

    console.log(`Unsubscribed from bars on channel: ${channel}`);
  }

  subscribeTrades(
    address: string,
    chain: string,
    onUpdate: (data: TradeUpdateMessage) => void
  ): () => void {
    const channel = `token_trades:${chain}:${address}`;

    this.connect()
      .then((ws) => {
        ws.send(
          JSON.stringify({
            type: "subscribeTrades",
            channel,
          })
        );

        this.subscriptions.add(channel);
        this.messageHandlers.set(channel, onUpdate);

        console.log(`Subscribed to trades on channel: ${channel}`);
      })
      .catch(console.error);

    return () => this.unsubscribeTrades(address, chain);
  }

  unsubscribeTrades(address: string, chain: string) {
    const channel = `token_trades:${chain}:${address}`; 

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: "unsubscribeTrades",
          channel,
        })
      );
    }

    this.subscriptions.delete(channel);
    this.messageHandlers.delete(channel);

    console.log(`Unsubscribed from trades on channel: ${channel}`);
  }

  disconnect() {
    this.subscriptions.clear();
    this.messageHandlers.clear();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const wsManager = new WebSocketManager();
