import { describe, it, expect } from 'vitest';
import { detect } from '../detector';

describe('detect', () => {
  // OpenAI agents
  describe('OpenAI agents', () => {
    it('should detect GPTBot', () => {
      const result = detect('Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; GPTBot/1.1; +https://openai.com/gptbot');
      expect(result.isBot).toBe(true);
    });

    it('should detect ChatGPT-User', () => {
      const result = detect('Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; ChatGPT-User/1.0; +https://openai.com/bot');
      expect(result.isBot).toBe(true);
    });

    it('should detect OAI-SearchBot', () => {
      const result = detect('Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); OAI-SearchBot/1.0; +https://openai.com/searchbot');
      expect(result.isBot).toBe(true);
    });
  });

  // Anthropic agents
  describe('Anthropic agents', () => {
    it('should detect ClaudeBot', () => {
      const result = detect('Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; ClaudeBot/1.0; +https://anthropic.com/claude');
      expect(result.isBot).toBe(true);
    });

    it('should detect Claude-User', () => {
      const result = detect('Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; Claude-User/1.0; +https://anthropic.com/claude');
      expect(result.isBot).toBe(true);
    });

    it('should detect Claude-SearchBot', () => {
      const result = detect('Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; Claude-SearchBot/1.0; +https://anthropic.com/claude');
      expect(result.isBot).toBe(true);
    });
  });

  // Perplexity agents
  describe('Perplexity agents', () => {
    it('should detect PerplexityBot', () => {
      const result = detect('Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)');
      expect(result.isBot).toBe(true);
    });

    it('should detect Perplexity-User', () => {
      const result = detect('Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Perplexity-User/1.0; +https://perplexity.ai/perplexity-user)');
      expect(result.isBot).toBe(true);
    });
  });

  // Known web crawlers
  describe('Web crawlers', () => {
    it('should detect Googlebot', () => {
      const result = detect('Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)');
      expect(result.isBot).toBe(true);
    });

    it('should detect Bingbot', () => {
      const result = detect('Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)');
      expect(result.isBot).toBe(true);
    });
  });

  // Regular browsers
  describe('Regular browsers', () => {
    it('should not detect Chrome as a bot', () => {
      const result = detect('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      expect(result.isBot).toBe(false);
    });

    it('should not detect Firefox as a bot', () => {
      const result = detect('Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0');
      expect(result.isBot).toBe(false);
    });
  });

  // Edge cases
  describe('Edge cases', () => {
    it('should handle empty user agent', () => {
      const result = detect('');
      expect(result.isBot).toBe(false);
    });

    it('should handle undefined user agent', () => {
      const result = detect(undefined as unknown as string);
      expect(result.isBot).toBe(false);
    });
  });

  // Performance
  describe('Performance', () => {
    it('should handle a large number of checks efficiently', () => {
      const start = performance.now();
      for (let i = 0; i < 1000; i++) {
        detect('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      }
      const end = performance.now();
      const duration = end - start;
      
      // Should process 1000 checks in under 100ms
      expect(duration).toBeLessThan(100);
    });
  });
}); 