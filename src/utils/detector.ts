import crawlerPatterns from '../patterns/crawler-user-agents.json';
import agents from '../patterns/agents.json';
import type { Pattern } from '../types';
import type { AgentCategory } from '../types/agentCategory';
import type { DetectionResult, CompiledPattern, PatternGroup } from '../types/detector';

// ============================================================================
// Pattern Specificity Scoring
// ============================================================================

/**
 * Calculate pattern specificity score
 * Higher score = more specific pattern
 * Factors considered:
 * - Number of literal characters vs wildcards
 * - Presence of version numbers
 * - Presence of company/brand names
 */
function getPatternSpecificity(pattern: string): number {
  let score = 0;
  
  // More literal characters = more specific
  score += (pattern.match(/[a-zA-Z0-9]/g) || []).length * 2;
  
  // Fewer wildcards = more specific
  score -= (pattern.match(/[\.\*\+\?]/g) || []).length * 3;
  
  // Version numbers indicate specificity
  if (pattern.includes('\\/[0-9]')) {
    score += 5;
  }
  
  // Exact company/product names indicate specificity
  if (pattern.match(/(?:ChatGPT|Claude|Perplexity|Googlebot|bingbot|GPTBot|OAI-)/)) {
    score += 10;
  }

  // Penalize generic terms
  if (pattern.match(/^(?:bot|crawler|spider)$/i)) {
    score -= 15;
  }
  
  return score;
}

// ============================================================================
// Pattern Groups Configuration
// ============================================================================

const patternGroups: Record<string, PatternGroup> = {
  'chatgpt': {
    category: 'AI Agent',
    company: 'OpenAI',
    patterns: agents.patterns.filter((p: Pattern) => 
      p.pattern.toLowerCase().includes('chatgpt') || 
      p.pattern.toLowerCase().includes('gpt-4') ||
      p.pattern.toLowerCase().includes('gptbot') ||
      p.pattern.toLowerCase().includes('oai-') ||
      p.pattern.toLowerCase().includes('openai')
    )
  },
  'claude': {
    category: 'AI Agent',
    company: 'Anthropic',
    patterns: agents.patterns.filter((p: Pattern) => 
      p.pattern.toLowerCase().includes('claude') || 
      p.pattern.toLowerCase().includes('anthropic')
    )
  },
  'perplexity': {
    category: 'AI Assistant',
    company: 'Perplexity',
    patterns: agents.patterns.filter((p: Pattern) => 
      p.pattern.toLowerCase().includes('perplexity')
    )
  },
  'googlebot': {
    category: 'Search Crawler',
    company: 'Google',
    patterns: agents.patterns.filter((p: Pattern) => 
      p.pattern.toLowerCase().includes('googlebot') || 
      p.pattern.toLowerCase().includes('google-extended')
    )
  },
  'bingbot': {
    category: 'Search Crawler',
    company: 'Microsoft',
    patterns: agents.patterns.filter((p: Pattern) => 
      p.pattern.toLowerCase().includes('bingbot') || 
      p.pattern.toLowerCase().includes('bingpreview')
    )
  },
  'generic-scraper': {
    category: 'Scraper',
    patterns: agents.patterns.filter((p: Pattern) => 
      p.pattern.toLowerCase().includes('scraper') ||
      p.pattern.toLowerCase().includes('crawler') ||
      p.pattern.toLowerCase().includes('spider')
    )
  }
};

// ============================================================================
// Pattern Compilation
// ============================================================================

// Compile our custom patterns
const customPatterns = Object.entries(patternGroups).flatMap(([name, group]) =>
  group.patterns.map(p => ({
    regexp: new RegExp(p.pattern, 'i'),
    name,
    category: group.category,
    company: group.company,
    specificity: getPatternSpecificity(p.pattern),
    originalPattern: p.pattern
  } as CompiledPattern))
);

// Compile patterns from crawler-user-agents package
const crawlerUserAgentPatterns = crawlerPatterns.map(p => {
  // Check if this pattern should be categorized as a specific agent
  let name = 'crawler';
  let category: AgentCategory = 'Other Bot';
  let company: string | undefined = undefined;
  
  // Map specific patterns to their proper categories
  if (p.pattern.toLowerCase().includes('gptbot') || 
      p.pattern.toLowerCase().includes('chatgpt') || 
      p.pattern.toLowerCase().includes('oai-') || 
      p.pattern.toLowerCase().includes('openai')) {
    name = 'chatgpt';
    category = 'AI Agent';
    company = 'OpenAI';
  } else if (p.pattern.toLowerCase().includes('claude') || 
             p.pattern.toLowerCase().includes('anthropic')) {
    name = 'claude';
    category = 'AI Agent';
    company = 'Anthropic';
  } else if (p.pattern.toLowerCase().includes('perplexity')) {
    name = 'perplexity';
    category = 'AI Assistant';
    company = 'Perplexity';
  } else if (p.pattern.toLowerCase().includes('googlebot') || 
             p.pattern.toLowerCase().includes('google-extended')) {
    name = 'googlebot';
    category = 'Search Crawler';
    company = 'Google';
  } else if (p.pattern.toLowerCase().includes('bingbot') || 
             p.pattern.toLowerCase().includes('bingpreview')) {
    name = 'bingbot';
    category = 'Search Crawler';
    company = 'Microsoft';
  } else if (p.pattern.toLowerCase().includes('scraper') || 
             p.pattern.toLowerCase().includes('crawler') || 
             p.pattern.toLowerCase().includes('spider')) {
    name = 'generic-scraper';
    category = 'Scraper';
  }
  
  return {
    regexp: new RegExp(p.pattern, 'i'),
    name,
    category,
    company,
    specificity: getPatternSpecificity(p.pattern),
    originalPattern: p.pattern
  } as CompiledPattern;
});

// Combine all patterns - custom patterns first for priority
const compiledPatterns = [...customPatterns, ...crawlerUserAgentPatterns];

// ============================================================================
// Public API
// ============================================================================

/**
 * Fast detection function that only returns whether the user agent is a bot
 * @param userAgent The user agent string to check
 * @returns boolean indicating if the user agent is a bot
 */
export function detect(userAgent: string): DetectionResult {
  for (const pattern of compiledPatterns) {
    if (pattern.regexp.test(userAgent)) {
      return { isBot: true };
    }
  }
  return { isBot: false };
}

/**
 * Enhanced detection function that provides detailed information about the agent
 * @param userAgent The user agent string to check
 * @returns A detailed result with agent classification information
 */
export function detectDetailed(userAgent: string): DetectionResult {
  // Handle undefined or null user agent
  if (!userAgent) {
    return {
      isBot: false,
      category: 'Unknown',
      confidence: 1.0
    };
  }
  
  // First try to match against our custom patterns
  const customMatches = customPatterns.filter(p => {
    const matches = p.regexp.test(userAgent);
    return matches;
  });
  
  if (customMatches.length > 0) {
    // Sort custom matches by specificity
    customMatches.sort((a, b) => b.specificity - a.specificity);
    const bestMatch = customMatches[0];
    
    return {
      isBot: true,
      category: bestMatch.category,
      name: bestMatch.name,
      company: bestMatch.company,
      confidence: customMatches.length === 1 ? 0.9 : 0.7
    };
  }

  // If no custom patterns match, try crawler-user-agents patterns
  const crawlerMatches = crawlerUserAgentPatterns.filter(p => {
    const matches = p.regexp.test(userAgent);
    if (matches) {
      console.log(`✓ Match: ${p.originalPattern} - Specificity: ${p.specificity}`);
    }
    return matches;
  });

  if (crawlerMatches.length > 0) {
    // Sort crawler matches by specificity
    crawlerMatches.sort((a, b) => b.specificity - a.specificity);
    const bestMatch = crawlerMatches[0];
    
    return {
      isBot: true,
      category: bestMatch.category,
      name: bestMatch.name,
      company: bestMatch.company,
      confidence: crawlerMatches.length === 1 ? 0.9 : 0.7
    };
  }

  // Check for generic scraper/crawler patterns that might not be in our pattern list
  if (userAgent.toLowerCase().includes('scraper') || 
      userAgent.toLowerCase().includes('crawler') || 
      userAgent.toLowerCase().includes('spider')) {
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
}