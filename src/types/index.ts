export interface DetectionPattern {
  name: string;
  patterns: string[];
  confidence: number;
}

export interface PatternFile {
  version: string;
  patterns: DetectionPattern[];
}

export interface DetectionResult {
  isBot: boolean;
  agentName?: string;
  confidence: number;
  timestamp: number;
}

export interface CollectorPayload {
  url: string;
  method: string;
  userAgent: string;
  headers: Record<string, string>;
  ip?: string;
  detectionResult: DetectionResult;
} 