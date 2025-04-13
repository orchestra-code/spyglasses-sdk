export interface DetectionResult {
  isBot: boolean;
}

export interface CollectorPayload {
  url: string;
  method: string;
  userAgent: string;
  headers: Record<string, string>;
  ip?: string;
} 