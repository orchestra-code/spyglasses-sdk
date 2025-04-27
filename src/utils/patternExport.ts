import crawlerPatterns from '../patterns/crawler-user-agents.json';
import agents from '../patterns/agents.json';
import { detectDetailed } from './detector';
import type { AgentCategory } from '../types/agentCategory';

/**
 * Interface for standardized pattern format used by integrations
 */
export interface ExportedPattern {
  pattern: string;
  url: string | null;
  type: string;
  category: string;
  subcategory: string;
  company: string | null;
  isCompliant?: boolean;
  intent?: string;
  instances?: string[];
}

/**
 * Maps SDK pattern categories to more specific subcategories
 */
const categoryToSubcategoryMap: Record<AgentCategory, string> = {
  'AI Agent': 'AI Assistants',
  'AI Assistant': 'AI Assistants',
  'Search Crawler': 'Search Engines',
  'Scraper': 'Data Collection Tools',
  'Other Bot': 'Unclassified',
  'Unknown': 'Unclassified'
};

/**
 * Maps agent names to specific intents
 */
const agentToIntentMap: Record<string, string> = {
  'chatgpt': 'UserQuery',
  'claude': 'UserQuery', 
  'claude-user': 'UserQuery',
  'perplexity': 'UserQuery',
  'perplexity-user': 'UserQuery',
  'googlebot': 'Search',
  'bingbot': 'Search',
  'claude-searchbot': 'Search',
  'generic-scraper': 'DataCollection'
};

/**
 * Gets the likely intent for a bot based on its category and name
 */
function getIntentForBot(category: string, name: string): string {
  // Check for exact match in the map
  const lowerName = name.toLowerCase();
  if (agentToIntentMap[lowerName]) {
    return agentToIntentMap[lowerName];
  }
  
  // Category-based fallbacks
  if (category === 'AI Agent' || category === 'AI Assistant') {
    return 'UserQuery';
  }
  
  if (category === 'Search Crawler') {
    return 'Search';
  }
  
  if (category === 'Scraper') {
    return 'DataCollection';
  }
  
  return 'unknown';
}

/**
 * Gets a categorized, standardized list of all patterns from the SDK 
 * for use in integrations and APIs
 */
export function getAllPatterns(): { version: string; patterns: ExportedPattern[] } {
  const exportedPatterns: ExportedPattern[] = [];
  const processedPatterns = new Set<string>();
  
  // Process agents.json patterns
  agents.patterns.forEach(agent => {
    const patternStr = agent.pattern;
    if (processedPatterns.has(patternStr)) {
      return; // Skip duplicates
    }
    
    // Get details from detector
    const mockUserAgent = `Mozilla/5.0 (compatible; ${patternStr.replace('\\/[0-9]', '/1.0')}; +https://example.com)`;
    const details = detectDetailed(mockUserAgent);
    
    const type = agent.pattern.split("\\/")[0].toLowerCase();
    const category = details.category || 'Unknown';
    const subcategory = categoryToSubcategoryMap[category as AgentCategory] || 'Unclassified';
    const intent = getIntentForBot(category, type);
    
    exportedPatterns.push({
      pattern: patternStr,
      url: agent.url || null,
      type,
      category,
      subcategory,
      company: details.company || null,
      isCompliant: true,
      intent,
      instances: agent.instances || []
    });
    
    processedPatterns.add(patternStr);
  });

  // Process crawler-user-agents.json patterns
  // Type definition for crawler patterns
  interface CrawlerPattern {
    pattern: string;
    company?: string;
    addition_date?: string;
    depends_on?: string[];
    description?: string;
  }
  
  const crawlerArray = Array.isArray(crawlerPatterns) ? crawlerPatterns : [];
  
  crawlerArray.forEach((crawler: CrawlerPattern) => {
    const patternStr = crawler.pattern;
    if (processedPatterns.has(patternStr)) {
      return; // Skip duplicates
    }
    
    // Get details from detector
    const mockUserAgent = `Mozilla/5.0 (compatible; ${patternStr}; +https://example.com)`;
    const details = detectDetailed(mockUserAgent);
    
    const type = patternStr.toLowerCase();
    const category = details.category || 'Crawler';
    const subcategory = categoryToSubcategoryMap[category as AgentCategory] || 'Unclassified';
    const intent = getIntentForBot(category, details.name || type);
  
    exportedPatterns.push({
      pattern: patternStr,
      url: null,
      type,
      category,
      subcategory,
      company: crawler.company || (details.company as string) || null,
      isCompliant: type.includes('bot') || type.includes('crawler'),
      intent
    });
    
    processedPatterns.add(patternStr);
  });
  
  return {
    version: agents.version || '1.0.0',
    patterns: exportedPatterns
  };
}