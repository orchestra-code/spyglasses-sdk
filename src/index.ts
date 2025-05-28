import { Spyglasses } from './core/spyglasses';
import type { 
  DetectionResult, 
  SpyglassesConfig, 
  BotPattern, 
  AiReferrerInfo,
  BotInfo,
  ApiPatternResponse,
  CollectorPayload
} from './types';

// Create a default instance for the simplified API
let defaultInstance: Spyglasses | null = null;

/**
 * Get or create the default Spyglasses instance
 * @param config Optional configuration to use when creating the instance
 * @returns The default Spyglasses instance
 */
function getDefaultInstance(config?: SpyglassesConfig): Spyglasses {
  if (!defaultInstance) {
    defaultInstance = new Spyglasses(config);
  } else if (config) {
    defaultInstance.updateConfig(config);
  }
  return defaultInstance;
}

/**
 * Initialize the Spyglasses SDK with configuration
 * @param config Configuration options
 * @returns The Spyglasses instance
 */
export function init(config: SpyglassesConfig): Spyglasses {
  defaultInstance = new Spyglasses(config);
  return defaultInstance;
}

/**
 * Detect if a user agent is a bot
 * @param userAgent The user agent string to check
 * @returns A detection result
 */
export function detectBot(userAgent: string, config?: SpyglassesConfig): DetectionResult {
  return getDefaultInstance(config).detectBot(userAgent);
}

/**
 * Detect if a referrer is from an AI platform
 * @param referrer The referrer URL to check
 * @returns A detection result
 */
export function detectAiReferrer(referrer: string, config?: SpyglassesConfig): DetectionResult {
  return getDefaultInstance(config).detectAiReferrer(referrer);
}

/**
 * Detect both bot user agent and AI referrer
 * @param userAgent The user agent string
 * @param referrer The referrer URL (optional)
 * @returns A detection result
 */
export function detect(userAgent: string, referrer?: string, config?: SpyglassesConfig): DetectionResult {
  return getDefaultInstance(config).detect(userAgent, referrer);
}

/**
 * Sync patterns from the API
 * @param config Optional configuration with API key
 * @returns A promise that resolves with the API response
 */
export async function syncPatterns(config?: SpyglassesConfig): Promise<ApiPatternResponse | string> {
  return getDefaultInstance(config).syncPatterns();
}

/**
 * Get all bot patterns
 * @returns The current bot patterns
 */
export function getPatterns(config?: SpyglassesConfig): BotPattern[] {
  return getDefaultInstance(config).getPatterns();
}

/**
 * Get all AI referrer patterns
 * @returns The current AI referrer patterns
 */
export function getAiReferrers(config?: SpyglassesConfig): AiReferrerInfo[] {
  return getDefaultInstance(config).getAiReferrers();
}

// Export types and class
export type { 
  DetectionResult, 
  SpyglassesConfig, 
  BotPattern, 
  AiReferrerInfo,
  BotInfo,
  ApiPatternResponse,
  CollectorPayload
};
export { Spyglasses };