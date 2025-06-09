import { 
  ApiPatternResponse, 
  SpyglassesConfig, 
  DetectionResult, 
  BotPattern, 
  AiReferrerInfo,
  BotInfo,
  CollectorPayload,
  NextFetchOptions
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
    // Default minimal patterns to use if API sync fails; Log visits from AI Assistants and AI Crawlers (but default to blocking the crawlers)
    this.patterns = [
      // AI Assistants (user-initiated requests, not model trainers)
      {
        pattern: 'ChatGPT-User\\/[0-9]',
        url: 'https://platform.openai.com/docs/bots',
        type: 'chatgpt-user',
        category: 'AI Agent',
        subcategory: 'AI Assistants',
        company: 'OpenAI',
        isCompliant: true,
        isAiModelTrainer: false,
        intent: 'UserQuery'
      },
      {
        pattern: 'Perplexity-User\\/[0-9]',
        url: 'https://docs.perplexity.ai/guides/bots',
        type: 'perplexity-user',
        category: 'AI Agent',
        subcategory: 'AI Assistants',
        company: 'Perplexity AI',
        isCompliant: true,
        isAiModelTrainer: false,
        intent: 'UserQuery'
      },
      {
        pattern: 'Gemini-User\\/[0-9]',
        url: 'https://ai.google.dev/gemini-api/docs/bots',
        type: 'gemini-user',
        category: 'AI Agent',
        subcategory: 'AI Assistants',
        company: 'Google',
        isCompliant: true,
        isAiModelTrainer: false,
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
        isAiModelTrainer: false,
        intent: 'UserQuery'
      },
      
      // AI Model Training Crawlers (can be blocked with blockAiModelTrainers setting)
      {
        pattern: 'CCBot\\/[0-9]',
        url: 'https://commoncrawl.org/ccbot',
        type: 'ccbot',
        category: 'AI Crawler',
        subcategory: 'Model Training Crawlers',
        company: 'Common Crawl',
        isCompliant: true,
        isAiModelTrainer: true,
        intent: 'DataCollection'
      },
      {
        pattern: 'ClaudeBot\\/[0-9]',
        url: 'https://support.anthropic.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler',
        type: 'claude-bot',
        category: 'AI Crawler',
        subcategory: 'Model Training Crawlers',
        company: 'Anthropic',
        isCompliant: true,
        isAiModelTrainer: true,
        intent: 'DataCollection'
      },
      {
        pattern: 'GPTBot\\/[0-9]',
        url: 'https://platform.openai.com/docs/gptbot',
        type: 'gptbot',
        category: 'AI Crawler',
        subcategory: 'Model Training Crawlers',
        company: 'OpenAI',
        isCompliant: true,
        isAiModelTrainer: true,
        intent: 'DataCollection'
      },
      {
        pattern: 'meta-externalagent\\/[0-9]',
        url: 'https://developers.facebook.com/docs/sharing/webmasters/crawler',
        type: 'meta-externalagent',
        category: 'AI Crawler',
        subcategory: 'Model Training Crawlers',
        company: 'Meta',
        isCompliant: true,
        isAiModelTrainer: true,
        intent: 'DataCollection'
      },
      {
        pattern: 'Applebot-Extended\\/[0-9]',
        url: 'https://support.apple.com/en-us/119829',
        type: 'applebot-extended',
        category: 'AI Crawler',
        subcategory: 'Model Training Crawlers',
        company: 'Apple',
        isCompliant: true,
        isAiModelTrainer: true,
        intent: 'DataCollection'
      }
    ];
    
    // Default AI referrers
    this.aiReferrers = [
      {
        id: 'chatgpt',
        name: 'ChatGPT',
        company: 'OpenAI',
        url: 'https://chat.openai.com',
        patterns: ['chat.openai.com', 'chatgpt.com'],
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
        company: 'Perplexity AI',
        url: 'https://perplexity.ai',
        patterns: ['perplexity.ai'],
        description: 'Traffic from Perplexity users clicking on links'
      },
      {
        id: 'gemini',
        name: 'Gemini',
        company: 'Google',
        url: 'https://gemini.google.com',
        patterns: ['gemini.google.com', 'bard.google.com'],
        description: 'Traffic from Gemini users clicking on links'
      },
      {
        id: 'copilot',
        name: 'Microsoft Copilot',
        company: 'Microsoft',
        url: 'https://copilot.microsoft.com/',
        patterns: ['copilot.microsoft.com', 'bing.com/chat'],
        description: 'Traffic from Microsoft Copilot users clicking on links'
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
      const fetchOptions: NextFetchOptions = {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey
        }
      };

      // Add Next.js caching if we're in a Next.js environment
      if (typeof process !== 'undefined' && process.env) {
        const cacheTime = process.env.SPYGLASSES_CACHE_TTL 
          ? parseInt(process.env.SPYGLASSES_CACHE_TTL, 10)
          : 60 * 60 * 24; // 24 hours default

        fetchOptions.next = {
          revalidate: cacheTime,
          tags: ['spyglasses-patterns']
        };
      }

      const response = await fetch(this.patternsEndpoint, fetchOptions);

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
      if (this.debug) {
        console.log('Spyglasses: detectBot() called with empty user agent');
      }
      return {
        isBot: false,
        shouldBlock: false,
        sourceType: 'none'
      };
    }
    
    if (this.debug) {
      console.log(`Spyglasses: detectBot() checking user agent: "${userAgent.substring(0, 150)}${userAgent.length > 150 ? '...' : ''}"`);
      console.log(`Spyglasses: Testing against ${this.patterns.length} bot patterns`);
    }
    
    // Check each pattern
    for (const pattern of this.patterns) {
      try {
        const regex = this.getRegexForPattern(pattern.pattern);
        
        if (this.debug) {
          console.log(`Spyglasses: Testing pattern: "${pattern.pattern}" (${pattern.type || 'unknown'} - ${pattern.company || 'unknown company'})`);
        }
        
        if (regex.test(userAgent)) {
          const shouldBlock = this.shouldBlockPattern(pattern);
          
          if (this.debug) {
            console.log(`Spyglasses: ✅ BOT DETECTED! Pattern matched: "${pattern.pattern}"`);
            console.log(`Spyglasses: Bot details:`, {
              type: pattern.type,
              category: pattern.category,
              subcategory: pattern.subcategory,
              company: pattern.company,
              isAiModelTrainer: pattern.isAiModelTrainer,
              shouldBlock
            });
          }
          
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
    
    if (this.debug) {
      console.log('Spyglasses: No bot patterns matched user agent');
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
      if (this.debug) {
        console.log('Spyglasses: detectAiReferrer() called with empty referrer');
      }
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
      if (this.debug) {
        console.log(`Spyglasses: Extracted hostname: "${hostname}"`);
      }
    } catch (error) {
      // If parsing fails, use the raw string
      hostname = referrer.toLowerCase();
      if (this.debug) {
        console.log(`Spyglasses: URL parsing failed, using raw referrer: "${hostname}"`);
      }
    }
    
    // Check each AI referrer
    for (const aiReferrer of this.aiReferrers) {
      try {
        if (this.debug) {
          console.log(`Spyglasses: Testing AI referrer: "${aiReferrer.name}" (${aiReferrer.company}) with patterns: ${aiReferrer.patterns.join(', ')}`);
        }
        
        for (const pattern of aiReferrer.patterns) {
          if (this.debug) {
            console.log(`Spyglasses: Testing AI referrer pattern: "${pattern}" against hostname: "${hostname}"`);
          }
          
          if (hostname.includes(pattern)) {
            if (this.debug) {
              console.log(`Spyglasses: ✅ AI REFERRER DETECTED! Pattern matched: "${pattern}"`);
              console.log(`Spyglasses: AI referrer details:`, {
                name: aiReferrer.name,
                company: aiReferrer.company,
                id: aiReferrer.id,
                matchedPattern: pattern
              });
            }
            
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
    if (this.debug) {
      console.log('Spyglasses: detect() called with:', {
        userAgent: userAgent ? `"${userAgent.substring(0, 100)}${userAgent.length > 100 ? '...' : ''}"` : 'undefined',
        referrer: referrer || 'undefined'
      });
    }
    
    // Check for bot first
    const botResult = this.detectBot(userAgent);
    if (botResult.isBot) {
      if (this.debug) {
        console.log('Spyglasses: 🤖 Final result: BOT detected, returning bot result');
      }
      return botResult;
    }
    
    // Then check for AI referrer if referrer is provided
    if (referrer) {
      if (this.debug) {
        console.log('Spyglasses: No bot detected, starting AI referrer detection...');
      }
      const referrerResult = this.detectAiReferrer(referrer);
      if (referrerResult.sourceType === 'ai_referrer') {
        if (this.debug) {
          console.log('Spyglasses: 🧠 Final result: AI REFERRER detected, returning referrer result');
        }
        return referrerResult;
      }
    } else if (this.debug) {
      console.log('Spyglasses: No referrer provided, skipping AI referrer detection');
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
    if (this.debug) {
      console.log(`Spyglasses: logRequest() called for sourceType: ${detectionResult.sourceType}`);
    }
    
    if (!this.apiKey || detectionResult.sourceType === 'none') {
      if (this.debug) {
        if (!this.apiKey) {
          console.log('Spyglasses: logRequest() skipped - no API key');
        } else {
          console.log('Spyglasses: logRequest() skipped - sourceType is none');
        }
      }
      return;
    }
    
    if (this.debug) {
      console.log(`Spyglasses: Preparing to log ${detectionResult.sourceType} event to collector`);
      console.log(`Spyglasses: Collector endpoint: ${this.collectEndpoint}`);
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
      
      if (this.debug) {
        console.log('Spyglasses: Prepared bot metadata:', metadata);
      }
    } else if (detectionResult.sourceType === 'ai_referrer' && detectionResult.info) {
      const referrerInfo = detectionResult.info as AiReferrerInfo;
      Object.assign(metadata, {
        source_type: 'ai_referrer',
        referrer_id: referrerInfo.id,
        referrer_name: referrerInfo.name,
        company: referrerInfo.company
      });
      
      if (this.debug) {
        console.log('Spyglasses: Prepared AI referrer metadata:', metadata);
      }
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
    
    if (this.debug) {
      console.log('Spyglasses: Complete payload to be sent:', JSON.stringify(payload, null, 2));
    }
    
    try {
      // Stringify the payload first to ensure it's valid JSON
      const jsonPayload = JSON.stringify(payload);
      
      if (this.debug) {
        console.log(`Spyglasses: Making POST request to ${this.collectEndpoint}`);
        console.log(`Spyglasses: Request headers:`, {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey ? `${this.apiKey.substring(0, 8)}...` : 'undefined'
        });
        console.log(`Spyglasses: Payload size: ${jsonPayload.length} bytes`);
      }
      
      const response = await fetch(this.collectEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey
        },
        body: jsonPayload
      });
      
      if (this.debug) {
        console.log(`Spyglasses: Collector response status: ${response.status} ${response.statusText}`);
        
        // Try to read response body for debugging
        try {
          const responseClone = response.clone();
          const responseText = await responseClone.text();
          console.log(`Spyglasses: Collector response body: ${responseText}`);
        } catch (readError) {
          console.log(`Spyglasses: Could not read response body: ${readError}`);
        }
        
        if (response.ok) {
          console.log(`Spyglasses: ✅ Successfully logged ${detectionResult.sourceType} event`);
        } else {
          console.error(`Spyglasses: ❌ Failed to log ${detectionResult.sourceType} event`);
        }
      }
      
      return response;
    } catch (error) {
      if (this.debug) {
        console.error(`Spyglasses: ❌ Exception during collector request for ${detectionResult.sourceType}:`, error);
        if (error instanceof TypeError && error.message.includes('fetch')) {
          console.error('Spyglasses: This appears to be a network/fetch error - check network connectivity');
        }
      }
      
      // In production/non-debug mode, handle errors gracefully
      // In debug mode, you can choose to re-throw for debugging purposes
      // For now, we'll always handle gracefully to maintain backward compatibility
      return undefined;
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
   * Check if an API key is set
   * @returns True if an API key is set, false otherwise
   */
  public hasApiKey(): boolean {
    return !!this.apiKey;
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