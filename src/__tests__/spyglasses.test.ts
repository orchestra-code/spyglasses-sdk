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
      
      expect(result).toHaveProperty('version', '1.0.0');
      expect(result).toHaveProperty('patterns');
      expect(Array.isArray((result as any).patterns)).toBe(true);
    });
    
    it('should handle API errors gracefully', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));
      
      const result = await spyglasses.syncPatterns();
      expect(typeof result).toBe('string');
      expect(result).toContain('Error syncing patterns');
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