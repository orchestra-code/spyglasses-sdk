export type AgentCategory = 
  | 'AI Agent'      // ChatGPT, Claude, etc. when directly accessing content
  | 'AI Assistant'  // AI tools when used through an approved interface
  | 'Search Crawler' // Google, Bing, etc.
  | 'Scraper'      // Generic scrapers and unauthorized crawlers
  | 'Other Bot'    // Other automated tools (monitoring, security, etc.)
  | 'Unknown';     // Unclassified or human traffic