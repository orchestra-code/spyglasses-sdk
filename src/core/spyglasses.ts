import { 
  ApiPatternResponse, 
  SpyglassesConfig, 
  DetectionResult, 
  BotPattern, 
  AiReferrerInfo,
  BotInfo,
  CollectorPayload
} from '../types';

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: Required<SpyglassesConfig> = {
  apiKey: '',
  debug: false,
  blockAiModelTrainers: false,
  customBlocks: [],
  customAllows: [],
  collectEndpoint: 'https://www.spyglasses.io/api/collect',
  patternsEndpoint: 'https://www.spyglasses.io/api/patterns',
  autoSync: true
};

/**
 * Core Spyglasses class for pattern management and detection
 */
export class Spyglasses {
  private apiKey: string;
  private debug: boolean;
  private blockAiModelTrainers: boolean;
  private customBlocks: string[];
  private customAllows: string[];
  private collectEndpoint: string;
  private patternsEndpoint: string;
  private autoSync: boolean;
  
  private patterns: BotPattern[] = [];
  private aiReferrers: AiReferrerInfo[] = [];
  private patternRegexCache: Map<string, RegExp> = new Map();
  private lastPatternSync: number = 0;
  private patternVersion: string = '1.0.0';
  
  /**
   * Create a new Spyglasses instance
   * @param config Configuration options
   */
  constructor(config: SpyglassesConfig = {}) {
    // Apply defaults for any missing config
    const fullConfig = { ...DEFAULT_CONFIG, ...config };
    
    this.apiKey = fullConfig.apiKey;
    this.debug = fullConfig.debug;
    this.blockAiModelTrainers = fullConfig.blockAiModelTrainers;
    this.customBlocks = fullConfig.customBlocks;
    this.customAllows = fullConfig.customAllows;
    this.collectEndpoint = fullConfig.collectEndpoint;
    this.patternsEndpoint = fullConfig.patternsEndpoint;
    this.autoSync = fullConfig.autoSync;
    
    // Load initial patterns
    this.loadDefaultPatterns();
    
    // Sync patterns if auto-sync is enabled
    if (this.autoSync && this.apiKey) {
      this.syncPatterns().catch(error => {
        if (this.debug) {
          console.error('Spyglasses: Error syncing patterns', error);
        }
      });
    }
  }
  
  /**
   * Load default patterns that are bundled with the SDK
   */
  private loadDefaultPatterns(): void {
    // Default minimal patterns to use if API sync fails
    this.patterns = [
      {
        pattern: 'Perplexity-User\\/[0-9]',
        url: 'https://docs.perplexity.ai/guides/bots',
        type: 'perplexity-user',
        category: 'AI Agent',
        subcategory: 'AI Assistants',
        company: 'Perplexity AI',
        isCompliant: true,
        intent: 'UserQuery'
      },
      {
        pattern: 'Claude-User\\/[0-9]',
        url: 'https://support.anthropic.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler',
        type: 'claude-user',
        category: 'AI Agent',
        subcategory: 'AI Assistants',
        company: 'Anthropic',
        isCompliant: true,
        intent: 'UserQuery'
      },
      {
        pattern: 'Claude-SearchBot\\/[0-9]',
        url: 'https://support.anthropic.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler',
        type: 'claude-searchbot',
        category: 'AI Crawler',
        subcategory: 'Search Enhancement Crawlers',
        company: 'Anthropic',
        isCompliant: true,
        intent: 'Search'
      },
      {
        pattern: 'GPTBot\\/[0-9]',
        url: 'https://platform.openai.com/docs/gptbot',
        type: 'gptbot',
        category: 'AI Crawler',
        subcategory: 'Search Enhancement Crawlers',
        company: 'OpenAI',
        isCompliant: true,
        intent: 'Search'
      }
    ];
    
    // Default AI referrers
    this.aiReferrers = [
      {
        id: 'chatgpt',
        name: 'ChatGPT',
        company: 'OpenAI',
        url: 'https://chat.openai.com',
        patterns: ['chat.openai.com'],
        description: 'Traffic from ChatGPT users clicking on links'
      },
      {
        id: 'claude',
        name: 'Claude',
        company: 'Anthropic',
        url: 'https://claude.ai',
        patterns: ['claude.ai'],
        description: 'Traffic from Claude users clicking on links'
      },
      {
        id: 'perplexity',
        name: 'Perplexity',
        company: 'Perplexity',
        url: 'https://perplexity.ai',
        patterns: ['perplexity.ai'],
        description: 'Traffic from Perplexity users clicking on links'
      }
    ];
  }
  
  /**
   * Sync patterns from the API
   * @returns A promise that resolves with the API response or a string error message
   */
  public async syncPatterns(): Promise<ApiPatternResponse | string> {
    if (!this.apiKey) {
      const message = 'No API key set for pattern sync';
      if (this.debug) {
        console.error(`Spyglasses: ${message}`);
      }
      return message;
    }

    try {
      const response = await fetch(this.patternsEndpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey
        }
      });

      if (!response.ok) {
        const message = `Pattern sync HTTP error ${response.status}: ${response.statusText}`;
        if (this.debug) {
          console.error(`Spyglasses: ${message}`);
        }
        return message;
      }

      const data = await response.json() as ApiPatternResponse;

      if (!data.patterns || !Array.isArray(data.patterns)) {
        const message = 'Invalid pattern response format';
        if (this.debug) {
          console.error(`Spyglasses: ${message}`);
        }
        return message;
      }

      // Update patterns
      this.patterns = data.patterns;
      this.aiReferrers = data.aiReferrers || [];
      this.patternVersion = data.version || '1.0.0';
      this.lastPatternSync = Date.now();
      
      // Clear regex cache after updating patterns
      this.patternRegexCache.clear();

      if (this.debug) {
        console.log(`Spyglasses: Synced ${this.patterns.length} patterns and ${this.aiReferrers.length} AI referrers`);
      }

      return data;
    } catch (error) {
      const message = `Error syncing patterns: ${error instanceof Error ? error.message : String(error)}`;
      if (this.debug) {
        console.error(`Spyglasses: ${message}`);
      }
      return message;
    }
  }
  
  /**
   * Get or create a regex for a pattern
   * @param pattern The pattern string
   * @returns A RegExp object
   */
  private getRegexForPattern(pattern: string): RegExp {
    // Check cache first
    if (this.patternRegexCache.has(pattern)) {
      return this.patternRegexCache.get(pattern)!;
    }
    
    // Create and cache new regex
    const regex = new RegExp(pattern, 'i');
    this.patternRegexCache.set(pattern, regex);
    return regex;
  }
  
  /**
   * Check if a pattern should be blocked based on rules
   * @param patternData The pattern data
   * @returns Whether the pattern should be blocked
   */
  private shouldBlockPattern(patternData: BotPattern): boolean {
    // Check if pattern is explicitly allowed
    if (this.customAllows.includes(`pattern:${patternData.pattern}`)) {
      return false;
    }
    
    const category = patternData.category || 'Unknown';
    const subcategory = patternData.subcategory || 'Unclassified';
    const type = patternData.type || 'unknown';
    
    // Check if any parent is explicitly allowed
    if (
      this.customAllows.includes(`category:${category}`) ||
      this.customAllows.includes(`subcategory:${category}:${subcategory}`) ||
      this.customAllows.includes(`type:${category}:${subcategory}:${type}`)
    ) {
      return false;
    }
    
    // Check if pattern is explicitly blocked
    if (this.customBlocks.includes(`pattern:${patternData.pattern}`)) {
      return true;
    }
    
    // Check if any parent is explicitly blocked
    if (
      this.customBlocks.includes(`category:${category}`) ||
      this.customBlocks.includes(`subcategory:${category}:${subcategory}`) ||
      this.customBlocks.includes(`type:${category}:${subcategory}:${type}`)
    ) {
      return true;
    }
    
    // Check for AI model trainers global setting
    if (this.blockAiModelTrainers && patternData.isAiModelTrainer) {
      return true;
    }
    
    // Default to not blocking
    return false;
  }
  
  /**
   * Detect if a user agent string is a bot
   * @param userAgent The user agent string to check
   * @returns A DetectionResult object
   */
  public detectBot(userAgent: string): DetectionResult {
    if (!userAgent) {
      return {
        isBot: false,
        shouldBlock: false,
        sourceType: 'none'
      };
    }
    
    // Check each pattern
    for (const pattern of this.patterns) {
      try {
        const regex = this.getRegexForPattern(pattern.pattern);
        if (regex.test(userAgent)) {
          const shouldBlock = this.shouldBlockPattern(pattern);
          
          // Create a BotInfo object
          const botInfo: BotInfo = {
            pattern: pattern.pattern,
            type: pattern.type || 'unknown',
            category: pattern.category || 'Unknown',
            subcategory: pattern.subcategory || 'Unclassified',
            company: pattern.company,
            isCompliant: !!pattern.isCompliant,
            isAiModelTrainer: !!pattern.isAiModelTrainer,
            intent: pattern.intent || 'unknown',
            url: pattern.url
          };
          
          return {
            isBot: true,
            shouldBlock,
            sourceType: 'bot',
            matchedPattern: pattern.pattern,
            info: botInfo
          };
        }
      } catch (error) {
        if (this.debug) {
          console.error(`Spyglasses: Error with pattern ${pattern.pattern}:`, error);
        }
      }
    }
    
    return {
      isBot: false,
      shouldBlock: false,
      sourceType: 'none'
    };
  }
  
  /**
   * Detect if a referrer URL is from an AI platform
   * @param referrer The referrer URL to check
   * @returns A DetectionResult object
   */
  public detectAiReferrer(referrer: string): DetectionResult {
    if (!referrer) {
      return {
        isBot: false,
        shouldBlock: false,
        sourceType: 'none'
      };
    }
    
    // Try to parse as URL first for domain matching
    let hostname = '';
    try {
      const url = new URL(referrer);
      hostname = url.hostname.toLowerCase();
    } catch (error) {
      // If parsing fails, use the raw string
      hostname = referrer.toLowerCase();
    }
    
    // Check each AI referrer
    for (const aiReferrer of this.aiReferrers) {
      try {
        for (const pattern of aiReferrer.patterns) {
          if (hostname.includes(pattern)) {
            // AI referrers are never blocked (they are human visitors)
            return {
              isBot: false,
              shouldBlock: false,
              sourceType: 'ai_referrer',
              matchedPattern: pattern,
              info: aiReferrer
            };
          }
        }
      } catch (error) {
        if (this.debug) {
          console.error(`Spyglasses: Error with AI referrer ${aiReferrer.name}:`, error);
        }
      }
    }
    
    return {
      isBot: false,
      shouldBlock: false,
      sourceType: 'none'
    };
  }
  
  /**
   * Detect a request for both bot user agent and AI referrer
   * @param userAgent The user agent string
   * @param referrer The referrer URL
   * @returns A DetectionResult object
   */
  public detect(userAgent: string, referrer?: string): DetectionResult {
    // Check for bot first
    const botResult = this.detectBot(userAgent);
    if (botResult.isBot) {
      return botResult;
    }
    
    // Then check for AI referrer if referrer is provided
    if (referrer) {
      const referrerResult = this.detectAiReferrer(referrer);
      if (referrerResult.sourceType === 'ai_referrer') {
        return referrerResult;
      }
    }
    
    // Return negative result if neither
    return {
      isBot: false,
      shouldBlock: false,
      sourceType: 'none'
    };
  }
  
  /**
   * Log a request to the Spyglasses collector
   * @param detectionResult The detection result
   * @param requestInfo Additional request information
   * @returns A promise that resolves when the log request completes
   */
  public async logRequest(
    detectionResult: DetectionResult, 
    requestInfo: {
      url: string;
      method: string;
      path: string;
      query?: string;
      userAgent: string;
      referrer?: string;
      ip?: string;
      headers: Record<string, string>;
      responseStatus?: number;
      responseTime?: number;
    }
  ): Promise<Response | void> {
    if (!this.apiKey || detectionResult.sourceType === 'none') {
      return;
    }
    
    // Start timing if not provided
    const startTime = Date.now();
    
    // Prepare metadata
    const metadata: CollectorPayload['metadata'] = {
      was_blocked: detectionResult.shouldBlock
    };
    
    if (detectionResult.sourceType === 'bot' && detectionResult.info) {
      const botInfo = detectionResult.info as BotInfo;
      Object.assign(metadata, {
        agent_type: botInfo.type,
        agent_category: botInfo.category,
        agent_subcategory: botInfo.subcategory,
        company: botInfo.company,
        is_compliant: botInfo.isCompliant,
        intent: botInfo.intent,
        confidence: 0.9, // High confidence for pattern matches
        detection_method: 'pattern_match'
      });
    } else if (detectionResult.sourceType === 'ai_referrer' && detectionResult.info) {
      const referrerInfo = detectionResult.info as AiReferrerInfo;
      Object.assign(metadata, {
        source_type: 'ai_referrer',
        referrer_id: referrerInfo.id,
        referrer_name: referrerInfo.name,
        company: referrerInfo.company
      });
    }
    
    // Calculate response time if not provided
    const responseTime = requestInfo.responseTime || (Date.now() - startTime);
    
    // Prepare payload
    const payload: CollectorPayload = {
      url: requestInfo.url,
      user_agent: requestInfo.userAgent,
      ip_address: requestInfo.ip,
      request_method: requestInfo.method,
      request_path: requestInfo.path,
      request_query: requestInfo.query,
      referrer: requestInfo.referrer,
      response_status: requestInfo.responseStatus || (detectionResult.shouldBlock ? 403 : 200),
      response_time_ms: responseTime,
      headers: requestInfo.headers || {}, // Ensure headers is never undefined
      timestamp: new Date().toISOString(),
      metadata
    };
    
    try {
      // Stringify the payload first to ensure it's valid JSON
      const jsonPayload = JSON.stringify(payload);
      
      const response = await fetch(this.collectEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey
        },
        body: jsonPayload
      });
      
      if (this.debug) {
        if (!response.ok) {
          console.error(`Spyglasses: Collector API error (HTTP ${response.status}): ${await response.text()}`);
        } else if (detectionResult.shouldBlock) {
          console.log(`Spyglasses: Blocked ${detectionResult.sourceType}: ${requestInfo.userAgent || requestInfo.referrer}`);
        }
      }
      
      return response;
    } catch (error) {
      if (this.debug) {
        console.error('Spyglasses collector error:', error);
      }
    }
  }
  
  /**
   * Get all patterns
   * @returns The current patterns
   */
  public getPatterns(): BotPattern[] {
    return [...this.patterns];
  }
  
  /**
   * Get all AI referrers
   * @returns The current AI referrers
   */
  public getAiReferrers(): AiReferrerInfo[] {
    return [...this.aiReferrers];
  }
  
  /**
   * Get the pattern version
   * @returns The current pattern version
   */
  public getPatternVersion(): string {
    return this.patternVersion;
  }
  
  /**
   * Get the timestamp of the last pattern sync
   * @returns The timestamp of the last pattern sync
   */
  public getLastPatternSync(): number {
    return this.lastPatternSync;
  }
  
  /**
   * Update configuration
   * @param config New configuration options
   */
  public updateConfig(config: Partial<SpyglassesConfig>): void {
    if (config.apiKey !== undefined) this.apiKey = config.apiKey;
    if (config.debug !== undefined) this.debug = config.debug;
    if (config.blockAiModelTrainers !== undefined) this.blockAiModelTrainers = config.blockAiModelTrainers;
    if (config.customBlocks !== undefined) this.customBlocks = config.customBlocks;
    if (config.customAllows !== undefined) this.customAllows = config.customAllows;
    if (config.collectEndpoint !== undefined) this.collectEndpoint = config.collectEndpoint;
    if (config.patternsEndpoint !== undefined) this.patternsEndpoint = config.patternsEndpoint;
    if (config.autoSync !== undefined) this.autoSync = config.autoSync;
  }
} 