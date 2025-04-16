declare module "*.json" {
  const value: {
    version: string;
    patterns: Array<{
      pattern: string;
      url?: string;
      instances?: string[];
    }>;
  };
  export default value;
} 