import type { AgentCategory } from './agentCategory';
import type { Pattern } from './index';

export interface DetectionResult {
  isBot: boolean;
  category?: AgentCategory;
  name?: string;     // Specific name of the agent (e.g., "ChatGPT", "Googlebot")
  company?: string;  // Organization behind the agent
  confidence?: number;
}

export interface CompiledPattern {
  regexp: RegExp;
  name: string;
  category: AgentCategory;
  company?: string;
  specificity: number;
  originalPattern: string;
}

export interface PatternGroup {
  category: AgentCategory;
  company?: string;
  patterns: Pattern[];
} 