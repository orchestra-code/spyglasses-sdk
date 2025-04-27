import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAllPatterns, ExportedPattern } from '../patternExport';
import agents from '../../patterns/agents.json';
import * as detector from '../detector';

// Mock the detectDetailed function
vi.mock('../detector', () => ({
  detectDetailed: vi.fn((userAgent: string) => {
    if (userAgent.includes('Claude')) {
      return {
        isBot: true,
        category: 'AI Agent',
        name: 'claude',
        company: 'Anthropic',
        confidence: 0.9
      };
    } else if (userAgent.includes('ChatGPT') || userAgent.includes('GPT')) {
      return {
        isBot: true,
        category: 'AI Agent',
        name: 'chatgpt',
        company: 'OpenAI',
        confidence: 0.9
      };
    } else if (userAgent.includes('Perplexity')) {
      return {
        isBot: true,
        category: 'AI Assistant',
        name: 'perplexity',
        company: 'Perplexity',
        confidence: 0.9
      };
    } else if (userAgent.includes('Googlebot')) {
      return {
        isBot: true,
        category: 'Search Crawler',
        name: 'googlebot',
        company: 'Google',
        confidence: 0.9
      };
    } else if (userAgent.includes('bingbot')) {
      return {
        isBot: true,
        category: 'Search Crawler',
        name: 'bingbot',
        company: 'Microsoft',
        confidence: 0.9
      };
    } else if (userAgent.includes('crawler') || userAgent.includes('Crawler')) {
      return {
        isBot: true,
        category: 'Scraper',
        name: 'generic-scraper',
        confidence: 0.7
      };
    }
    return {
      isBot: false,
      category: 'Unknown',
      confidence: 1.0
    };
  })
}));

describe('getAllPatterns', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return an object with version and patterns array', () => {
    const result = getAllPatterns();
    expect(result).toHaveProperty('version');
    expect(result).toHaveProperty('patterns');
    expect(Array.isArray(result.patterns)).toBe(true);
  });

  it('should use version from agents.json if available', () => {
    const result = getAllPatterns();
    expect(result.version).toBe(agents.version);
  });

  it('should process all agent patterns', () => {
    const result = getAllPatterns();
    
    // At minimum, should have all agent patterns
    expect(result.patterns.length).toBeGreaterThanOrEqual(agents.patterns.length);
    
    // Check if all agent patterns are present in the result
    const resultPatterns = result.patterns.map(p => p.pattern);
    for (const agent of agents.patterns) {
      expect(resultPatterns).toContain(agent.pattern);
    }
  });

  it('should deduplicate patterns', () => {
    // Get the patterns and check for duplicates
    const result = getAllPatterns();
    const patterns = result.patterns.map(p => p.pattern);
    const uniquePatterns = [...new Set(patterns)];
    
    expect(patterns.length).toBe(uniquePatterns.length);
  });

  it('should correctly transform agent patterns', () => {
    const result = getAllPatterns();
    
    // Find an agent we know exists (Claude user agent)
    const claudePattern = result.patterns.find(
      p => p.pattern.includes('Claude-User')
    );
    
    expect(claudePattern).toBeDefined();
    if (claudePattern) {
      expect(claudePattern.category).toBe('AI Agent');
      expect(claudePattern.subcategory).toBe('AI Assistants');
      expect(claudePattern.company).toBe('Anthropic');
      expect(claudePattern.isCompliant).toBe(true);
      expect(claudePattern.intent).toBe('UserQuery');
    }
  });

  it('should correctly assign intents based on category and type', () => {
    const result = getAllPatterns();
    
    // Check for different pattern types and their expected intents
    const aiAgentPattern = result.patterns.find(p => p.category === 'AI Agent');
    expect(aiAgentPattern?.intent).toBe('UserQuery');
    
    const searchCrawlerPattern = result.patterns.find(p => p.category === 'Search Crawler');
    expect(searchCrawlerPattern?.intent).toBe('Search');
    
    const scraperPattern = result.patterns.find(p => p.category === 'Scraper');
    expect(scraperPattern?.intent).toBe('DataCollection');
  });

  it('should use the detector module to categorize patterns', () => {
    // Call getAllPatterns to trigger the detector
    getAllPatterns();
    
    // Verify detectDetailed was called at least once
    expect(detector.detectDetailed).toHaveBeenCalled();
  });

  it('should preserve instance examples from agent patterns', () => {
    const result = getAllPatterns();
    
    // Find a pattern that should have instances
    const patternWithInstances = agents.patterns.find(p => p.instances && p.instances.length > 0);
    if (patternWithInstances) {
      const exportedPattern = result.patterns.find(p => p.pattern === patternWithInstances.pattern);
      expect(exportedPattern).toBeDefined();
      expect(exportedPattern?.instances).toEqual(patternWithInstances.instances);
    }
  });

  it('should assign "unknown" intent when no specific match is found', () => {
    // Mock detectDetailed to return a category without a specific intent mapping
    vi.mocked(detector.detectDetailed).mockImplementationOnce(() => ({
      isBot: true,
      category: 'Unknown',
      name: 'unknown-bot',
      confidence: 0.5
    }));
    
    const result = getAllPatterns();
    const unknownPattern = result.patterns.find(p => p.intent === 'unknown');
    
    expect(unknownPattern).toBeDefined();
  });

  it('should handle crawler patterns with missing properties gracefully', () => {
    // This is more of an integration test to ensure no errors occur
    // when processing crawler patterns that might have incomplete data
    const result = getAllPatterns();
    expect(() => getAllPatterns()).not.toThrow();
  });
}); 