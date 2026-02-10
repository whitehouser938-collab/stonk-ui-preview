/**
 * WebSocket message validation using Zod
 * Validates incoming WebSocket messages to prevent malformed data attacks
 */

import { z } from 'zod';
import { TradeData, TokenMarketOverview } from '@/types';
import { logger } from './logger';

// TradeData schema
const TradeDataSchema = z.object({
  transactionHash: z.string(),
  timestamp: z.string(),
  marketAddress: z.string(),
  marketType: z.string(),
  maker: z.string(),
  tradeType: z.enum(['BUY', 'SELL']),
  tokenAmount: z.string(),
  assetAmount: z.string(),
  price: z.string(),
  usdPrice: z.string(),
  usdVolume: z.string(),
  logIndex: z.number(),
});

// TokenMarketOverview schema (simplified - full validation would be more complex)
const TokenMarketOverviewSchema = z.object({
  tokenSymbol: z.string(),
  tokenName: z.string(),
  tokenAddress: z.string(),
  chain: z.string(),
  currentPrice: z.number(),
  priceChange24h: z.number(),
  totalVolume: z.number(),
  tradeCount24h: z.number(),
}).passthrough(); // Allow additional fields

// WebSocket message schemas
const TradeUpdateMessageSchema = z.object({
  type: z.literal('trades'),
  channel: z.string(),
  trades: z.array(TradeDataSchema),
});

const TokenMarketUpdateMessageSchema = z.object({
  type: z.literal('tokenMarketOverview'),
  channel: z.string(),
  tokenMarketOverview: TokenMarketOverviewSchema,
});

const MarketsUpdateMessageSchema = z.object({
  type: z.literal('marketsOverview'),
  channel: z.string(),
  marketsOverview: z.array(TokenMarketOverviewSchema),
});

const HeartbeatAckSchema = z.object({
  type: z.literal('heartbeat_ack'),
});

const SubscribedSchema = z.object({
  type: z.literal('subscribed'),
  channel: z.string(),
});

// Union of all possible message types
const WebSocketMessageSchema = z.union([
  TradeUpdateMessageSchema,
  TokenMarketUpdateMessageSchema,
  MarketsUpdateMessageSchema,
  HeartbeatAckSchema,
  SubscribedSchema,
]);

export type ValidatedWebSocketMessage = z.infer<typeof WebSocketMessageSchema>;

/**
 * Validates a WebSocket message
 * @param message Raw message from WebSocket
 * @returns Validated message or null if invalid
 */
export function validateWebSocketMessage(message: unknown): ValidatedWebSocketMessage | null {
  try {
    return WebSocketMessageSchema.parse(message);
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error('[WebSocket] Message validation failed:', error.errors);
      return null;
    }
    logger.error('[WebSocket] Unexpected validation error:', error);
    return null;
  }
}

/**
 * Type guard to check if message is a trade update
 */
export function isTradeUpdateMessage(
  message: ValidatedWebSocketMessage
): message is z.infer<typeof TradeUpdateMessageSchema> {
  return message.type === 'trades';
}

/**
 * Type guard to check if message is a token market update
 */
export function isTokenMarketUpdateMessage(
  message: ValidatedWebSocketMessage
): message is z.infer<typeof TokenMarketUpdateMessageSchema> {
  return message.type === 'tokenMarketOverview';
}

/**
 * Type guard to check if message is a markets update
 */
export function isMarketsUpdateMessage(
  message: ValidatedWebSocketMessage
): message is z.infer<typeof MarketsUpdateMessageSchema> {
  return message.type === 'marketsOverview';
}
