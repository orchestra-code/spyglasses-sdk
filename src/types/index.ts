/**
 * Base detection result interface
 */
export interface DetectionResult {
  isBot: boolean;
  shouldBlock: boolean;
  sourceType: 'bot' | 'ai_referrer' | 'none';
  matchedPattern?: string;
  info?: BotInfo | AiReferrerInfo;
}

/**
 * API response pattern interface
 */
export interface ApiPatternResponse {
  version: string;
  patterns: BotPattern[];
  aiReferrers: AiReferrerInfo[];
}

/**
 * Interface for bot pattern from API
 */
export interface BotPattern {
  pattern: string;
  url?: string | null;
  type: string;
  category: string;
  subcategory: string;
  company: string | null;
  isCompliant?: boolean;
  isAiModelTrainer?: boolean;
  intent?: string;
  instances?: string[];
}

/**
 * Interface for bot info used in detection results
 */
export interface BotInfo {
  pattern?: string;
  type: string;
  category: string;
  subcategory: string;
  company: string | null;
  isCompliant: boolean;
  isAiModelTrainer: boolean;
  intent: string;
  url?: string | null;
}

/**
 * Interface for AI referrer from API
 */
export interface AiReferrerInfo {
  id: string;
  name: string;
  company: string;
  url?: string | null;
  patterns: string[];
  description?: string;
  logoUrl?: string | null;
}

/**
 * Configuration options for Spyglasses
 */
export interface SpyglassesConfig {
  apiKey?: string;
  debug?: boolean;
  blockAiModelTrainers?: boolean;
  customBlocks?: string[];
  customAllows?: string[];
  collectEndpoint?: string;
  patternsEndpoint?: string;
  autoSync?: boolean;
}

/**
 * Interface for the collector payload
 */
export interface CollectorPayload {
  url: string;
  user_agent: string;
  ip_address?: string;
  request_method: string;
  request_path: string;
  request_query?: string;
  request_body?: string;
  referrer?: string;
  response_status: number;
  response_time_ms: number;
  headers: Record<string, string>;
  timestamp: string;
  metadata: {
    was_blocked: boolean;
    agent_type?: string;
    agent_category?: string;
    agent_subcategory?: string;
    company?: string | null;
    is_compliant?: boolean;
    intent?: string;
    confidence?: number;
    detection_method?: string;
    source_type?: string;
    referrer_id?: string;
    referrer_name?: string;
  };
} 