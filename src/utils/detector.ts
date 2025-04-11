import type { DetectionPattern, DetectionResult } from '../types';

export class Detector {
  private patterns: DetectionPattern[];
  
  constructor(patterns: DetectionPattern[]) {
    this.patterns = patterns;
  }

  detect(userAgent: string): DetectionResult {
    for (const pattern of this.patterns) {
      for (const p of pattern.patterns) {
        const regex = new RegExp(p);
        if (regex.test(userAgent)) {
          return {
            isBot: true,
            agentName: pattern.name,
            confidence: pattern.confidence,
            timestamp: Date.now()
          };
        }
      }
    }

    return {
      isBot: false,
      confidence: 1.0,
      timestamp: Date.now()
    };
  }
} 