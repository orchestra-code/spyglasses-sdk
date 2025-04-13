import crawlerPatterns from 'crawler-user-agents';
import aiPatterns from '../patterns/agents.json';

export interface DetectionResult {
  isBot: boolean;
}

// Compile patterns once at module level
const patterns = [
  ...crawlerPatterns,
  ...aiPatterns.agents
].map(p => new RegExp(p.pattern, 'i'));

export function detect(userAgent: string): DetectionResult {
  for (const pattern of patterns) {
    if (pattern.test(userAgent)) {
      return { isBot: true };
    }
  }
  return { isBot: false };
} 