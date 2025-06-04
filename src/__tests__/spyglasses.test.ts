import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Spyglasses } from '../core/spyglasses';
import { DetectionResult, AiReferrerInfo, BotInfo } from '../types';

// Mock fetch for API calls
global.fetch = vi.fn();

describe('Spyglasses Core', () => {
  let spyglasses: Spyglasses;
  
  beforeEach(() => {
    vi.resetAllMocks();
    
    // Mock successful API responses
    vi.mocked(fetch).mockImplementation(async (url) => {
      if (url.toString().includes('/patterns')) {
        return {
          ok: true,
          json: async () => ({
            version: '1.0.0',
            patterns: [
              {
                pattern: 'GPTBot\\/[0-9]',
                type: 'gptbot',
                category: 'AI Crawler',
                subcategory: 'Search Enhancement Crawlers',
                company: 'OpenAI',
                isCompliant: true,
                intent: 'Search'
              },
              {
                pattern: 'ChatGPT-User\\/[0-9]',
                type: 'chatgpt-user',
                category: 'AI Agent',
                subcategory: 'AI Assistants',
                company: 'OpenAI',
                isCompliant: true,
                intent: 'UserQuery'
              }
            ],
            aiReferrers: [
              {
                id: 'chatgpt',
                name: 'ChatGPT',
                company: 'OpenAI',
                patterns: ['chat.openai.com'],
                url: 'https://chat.openai.com'
              }
            ]
          })
        } as Response;
      }
      
      if (url.toString().includes('/collect')) {
        return {
          ok: true,
          text: async () => 'OK'
        } as Response;
      }
      
      return {
        ok: false,
        status: 404,
        statusText: 'Not Found'
      } as Response;
    });
    
    // Create instance with test config
    spyglasses = new Spyglasses({
      apiKey: 'test-api-key',
      debug: false
    });
  });
  
  describe('Pattern Syncing', () => {
    it('should sync patterns from API', async () => {
      const result = await spyglasses.syncPatterns();
      
      expect(fetch).toHaveBeenCalledWith(
        'https://www.spyglasses.io/api/patterns',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'x-api-key': 'test-api-key'
          })
        })
      );
      
      // Result should be an ApiPatternResponse object, not a string
      expect(typeof result).toBe('object');
      if (typeof result === 'object') {
        expect(result).toHaveProperty('version', '1.0.0');
        expect(result).toHaveProperty('patterns');
        expect(Array.isArray(result.patterns)).toBe(true);
      }
    });
    
    it('should handle API errors gracefully', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));
      
      const result = await spyglasses.syncPatterns();
      
      // Should return an error string when sync fails
      expect(typeof result).toBe('string');
      expect(result).toContain('Error syncing patterns');
    });
    
    it('should handle HTTP errors gracefully', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden'
      } as Response);
      
      const result = await spyglasses.syncPatterns();
      
      // Should return an error string for HTTP errors
      expect(typeof result).toBe('string');
      expect(result).toContain('Pattern sync HTTP error 403: Forbidden');
    });
    
    it('should handle invalid response format gracefully', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ invalid: 'response' })
      } as Response);
      
      const result = await spyglasses.syncPatterns();
      
      // Should return an error string for invalid response format
      expect(typeof result).toBe('string');
      expect(result).toContain('Invalid pattern response format');
    });
    
    it('should handle missing API key gracefully', async () => {
      const spyglassesNoKey = new Spyglasses({
        debug: false
      });
      
      const result = await spyglassesNoKey.syncPatterns();
      
      // Should return an error string when no API key is set
      expect(typeof result).toBe('string');
      expect(result).toContain('No API key set for pattern sync');
    });
    
    it('should include Next.js caching options when in Next.js environment', async () => {
      // Mock process.env to simulate Next.js environment
      const originalEnv = process.env;
      process.env = { ...originalEnv, SPYGLASSES_CACHE_TTL: '3600' };
      
      await spyglasses.syncPatterns();
      
      expect(fetch).toHaveBeenCalledWith(
        'https://www.spyglasses.io/api/patterns',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'x-api-key': 'test-api-key'
          }),
          next: expect.objectContaining({
            revalidate: 3600,
            tags: ['spyglasses-patterns']
          })
        })
      );
      
      // Restore original environment
      process.env = originalEnv;
    });
  });
  
  describe('Bot Detection', () => {
    it('should detect AI bots', () => {
      const result = spyglasses.detectBot('Mozilla/5.0 (compatible; GPTBot/1.0; +https://openai.com/gptbot)');
      
      expect(result.isBot).toBe(true);
      expect(result.sourceType).toBe('bot');
      expect(result.info).toBeDefined();
      expect((result.info as BotInfo).category).toBe('AI Crawler');
      expect((result.info as BotInfo).company).toBe('OpenAI');
    });
    
    it('should not detect regular browsers', () => {
      const result = spyglasses.detectBot('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      expect(result.isBot).toBe(false);
      expect(result.sourceType).toBe('none');
    });
    
    it('should handle empty user agent', () => {
      const result = spyglasses.detectBot('');
      
      expect(result.isBot).toBe(false);
      expect(result.sourceType).toBe('none');
    });
  });
  
  describe('AI Referrer Detection', () => {
    it('should detect AI referrers', () => {
      const result = spyglasses.detectAiReferrer('https://chat.openai.com/c/12345');
      
      expect(result.isBot).toBe(false);
      expect(result.sourceType).toBe('ai_referrer');
      expect(result.info).toBeDefined();
      expect((result.info as AiReferrerInfo).name).toBe('ChatGPT');
      expect((result.info as AiReferrerInfo).company).toBe('OpenAI');
    });
    
    it('should not detect regular referrers', () => {
      const result = spyglasses.detectAiReferrer('https://google.com/search?q=test');
      
      expect(result.isBot).toBe(false);
      expect(result.sourceType).toBe('none');
    });
    
    it('should handle empty referrer', () => {
      const result = spyglasses.detectAiReferrer('');
      
      expect(result.isBot).toBe(false);
      expect(result.sourceType).toBe('none');
    });
  });
  
  describe('Combined Detection', () => {
    it('should prioritize bot detection over AI referrer', () => {
      const result = spyglasses.detect(
        'Mozilla/5.0 (compatible; GPTBot/1.0; +https://openai.com/gptbot)',
        'https://chat.openai.com/c/12345'
      );
      
      expect(result.isBot).toBe(true);
      expect(result.sourceType).toBe('bot');
    });
    
    it('should detect AI referrer if no bot is found', () => {
      const result = spyglasses.detect(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'https://chat.openai.com/c/12345'
      );
      
      expect(result.isBot).toBe(false);
      expect(result.sourceType).toBe('ai_referrer');
    });
  });
  
  describe('Blocking Rules', () => {
    it('should apply customBlocks rules', () => {
      // Create instance with custom blocks
      const customSpyglasses = new Spyglasses({
        apiKey: 'test-api-key',
        customBlocks: ['category:AI Crawler']
      });
      
      const result = customSpyglasses.detectBot('Mozilla/5.0 (compatible; GPTBot/1.0; +https://openai.com/gptbot)');
      
      expect(result.isBot).toBe(true);
      expect(result.shouldBlock).toBe(true);
    });
    
    it('should apply customAllows rules', () => {
      // Create instance with custom allows
      const customSpyglasses = new Spyglasses({
        apiKey: 'test-api-key',
        customBlocks: ['category:AI Crawler'],
        customAllows: ['pattern:GPTBot\\/[0-9]']
      });
      
      const result = customSpyglasses.detectBot('Mozilla/5.0 (compatible; GPTBot/1.0; +https://openai.com/gptbot)');
      
      expect(result.isBot).toBe(true);
      expect(result.shouldBlock).toBe(false);
    });
    
    it('should apply blockAiModelTrainers setting', () => {
      // Create instance with AI model trainer blocking
      const customSpyglasses = new Spyglasses({
        apiKey: 'test-api-key',
        blockAiModelTrainers: true
      });
      
      // Test GPTBot (should be blocked with default patterns)
      const gptBotResult = customSpyglasses.detectBot('Mozilla/5.0 (compatible; GPTBot/1.0; +https://openai.com/gptbot)');
      expect(gptBotResult.isBot).toBe(true);
      expect(gptBotResult.shouldBlock).toBe(true);
      
      // Test ClaudeBot (should be blocked with default patterns)  
      const claudeResult = customSpyglasses.detectBot('Mozilla/5.0 (compatible; ClaudeBot/1.0; +https://anthropic.com)');
      expect(claudeResult.isBot).toBe(true);
      expect(claudeResult.shouldBlock).toBe(true);
      
      // Test ChatGPT-User (should NOT be blocked - it's an AI Assistant, not model trainer)
      const chatgptUserResult = customSpyglasses.detectBot('Mozilla/5.0 (compatible; ChatGPT-User/1.0)');
      expect(chatgptUserResult.isBot).toBe(true);
      expect(chatgptUserResult.shouldBlock).toBe(false);
    });

    it('should block AI model trainers with default patterns before API sync', () => {
      // Create instance with AI model trainer blocking but no API sync
      const customSpyglasses = new Spyglasses({
        blockAiModelTrainers: true,
        autoSync: false // Ensure we're only using default patterns
      });

      // Override pattern with isAiModelTrainer flag
      customSpyglasses['patterns'] = [
        {
          pattern: 'AITrainer\\/[0-9]',
          type: 'ai-trainer',
          category: 'AI Crawler',
          subcategory: 'Data Collection',
          company: 'Example',
          isAiModelTrainer: true
        }
      ];

      const result = customSpyglasses.detectBot('Mozilla/5.0 (compatible; AITrainer/1.0)');

      expect(result.isBot).toBe(true);
      expect(result.shouldBlock).toBe(true);
    });
  });
  
  describe('Request Logging', () => {
    it('should log bot detection to collector', async () => {
      // Create a more robust mock that captures the request body
      let capturedBody: string | undefined;
      
      vi.mocked(fetch).mockImplementationOnce(async (url, options) => {
        // Capture the body for later assertions
        capturedBody = options?.body as string;
        
        return {
          ok: true,
          text: async () => 'OK'
        } as Response;
      });

      const result: DetectionResult = {
        isBot: true,
        shouldBlock: false,
        sourceType: 'bot',
        info: {
          pattern: 'GPTBot\\/[0-9]',
          type: 'gptbot',
          category: 'AI Crawler',
          subcategory: 'Search Enhancement Crawlers',
          company: 'OpenAI',
          isCompliant: true,
          isAiModelTrainer: false,
          intent: 'Search'
        }
      };
      
      // Execute the method under test
      await spyglasses.logRequest(result, {
        url: 'https://example.com/test',
        method: 'GET',
        path: '/test',
        userAgent: 'Mozilla/5.0 (compatible; GPTBot/1.0; +https://openai.com/gptbot)',
        headers: { 'user-agent': 'Mozilla/5.0 (compatible; GPTBot/1.0; +https://openai.com/gptbot)' }
      });
      
      // Verify fetch was called with the correct endpoint
      expect(fetch).toHaveBeenCalledWith(
        'https://www.spyglasses.io/api/collect',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'x-api-key': 'test-api-key'
          })
        })
      );
      
      // Verify that the body was captured and is valid JSON
      expect(capturedBody).toBeDefined();
      
      if (capturedBody) {
        const payload = JSON.parse(capturedBody);
        
        // Verify key properties in the payload
        expect(payload).toHaveProperty('url', 'https://example.com/test');
        expect(payload).toHaveProperty('user_agent', 'Mozilla/5.0 (compatible; GPTBot/1.0; +https://openai.com/gptbot)');
        expect(payload).toHaveProperty('request_method', 'GET');
        expect(payload).toHaveProperty('request_path', '/test');
        
        // Verify metadata
        expect(payload).toHaveProperty('metadata');
        expect(payload.metadata).toHaveProperty('agent_category', 'AI Crawler');
        expect(payload.metadata).toHaveProperty('agent_type', 'gptbot');
        expect(payload.metadata).toHaveProperty('was_blocked', false);
      }
    });
    
    it('should log AI referrer detection to collector', async () => {
      // Create a mock that captures the request body
      let capturedBody: string | undefined;
      
      vi.mocked(fetch).mockImplementationOnce(async (url, options) => {
        // Capture the body for later assertions
        capturedBody = options?.body as string;
        
        return {
          ok: true,
          text: async () => 'OK'
        } as Response;
      });
      
      const result: DetectionResult = {
        isBot: false,
        shouldBlock: false,
        sourceType: 'ai_referrer',
        info: {
          id: 'chatgpt',
          name: 'ChatGPT',
          company: 'OpenAI',
          patterns: ['chat.openai.com'],
          url: 'https://chat.openai.com'
        }
      };
      
      await spyglasses.logRequest(result, {
        url: 'https://example.com/test',
        method: 'GET',
        path: '/test',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        referrer: 'https://chat.openai.com/c/12345',
        headers: { 
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          'referer': 'https://chat.openai.com/c/12345'
        }
      });
      
      // Verify fetch was called
      expect(fetch).toHaveBeenCalledWith(
        'https://www.spyglasses.io/api/collect',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'x-api-key': 'test-api-key'
          })
        })
      );
      
      // Verify that the body was captured and is valid JSON
      expect(capturedBody).toBeDefined();
      
      if (capturedBody) {
        const payload = JSON.parse(capturedBody);
        
        // Check payload properties
        expect(payload).toHaveProperty('url', 'https://example.com/test');
        expect(payload).toHaveProperty('user_agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)');
        expect(payload).toHaveProperty('referrer', 'https://chat.openai.com/c/12345');
        
        // Check metadata
        expect(payload).toHaveProperty('metadata');
        expect(payload.metadata).toHaveProperty('source_type', 'ai_referrer');
        expect(payload.metadata).toHaveProperty('referrer_name', 'ChatGPT');
        expect(payload.metadata).toHaveProperty('company', 'OpenAI');
      }
    });
    
    it('should handle collector errors gracefully', async () => {
      // Mock a network error
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));
      
      const result: DetectionResult = {
        isBot: true,
        shouldBlock: false,
        sourceType: 'bot',
        info: {
          pattern: 'GPTBot\\/[0-9]',
          type: 'gptbot',
          category: 'AI Crawler',
          subcategory: 'Search Enhancement Crawlers',
          company: 'OpenAI',
          isCompliant: true,
          isAiModelTrainer: false,
          intent: 'Search'
        }
      };
      
      // This should not throw an error
      const response = await spyglasses.logRequest(result, {
        url: 'https://example.com/test',
        method: 'GET',
        path: '/test',
        userAgent: 'Mozilla/5.0 (compatible; GPTBot/1.0; +https://openai.com/gptbot)',
        headers: {}
      });
      
      // Verify the function handles errors gracefully
      expect(fetch).toHaveBeenCalled();
      expect(response).toBeUndefined();
    });
  });
}); 