# Spyglasses SDK

**NOTE: This package is not designed to be used directly. Instead, use the spyglasses package that's built for your environment.**

This SDK provides bot detection and AI agent identification tools for integration into web frameworks and platforms. It's designed to help you identify, track, and optionally block AI bots, agents, and human visitors coming from AI platforms.

## Features

- **API-driven Pattern Management**: Automatically fetch and update detection patterns from the Spyglasses API
- **Intelligent Bot Detection**: Identify AI agents, crawlers, and other bots with precision
- **AI Referrer Detection**: Track human traffic coming from AI platforms like ChatGPT and Claude
- **Customizable Blocking Rules**: Control which types of bots to allow or block
- **Easy Integration**: Simple APIs for any JavaScript or TypeScript environment

## Installation

```bash
npm install @spyglasses/sdk
# or
yarn add @spyglasses/sdk
# or
pnpm add @spyglasses/sdk
```

## Quick Start

```typescript
import { init, detect, detectBot, detectAiReferrer } from '@spyglasses/sdk';

// Initialize with your API key
init({
  apiKey: 'your-api-key',
  debug: process.env.SPYGLASSES_DEBUG === 'true' // Enable detailed debug logging
});

// Detect bots and AI referrers in one call
const userAgent = request.headers['user-agent'];
const referrer = request.headers['referer'];
const result = detect(userAgent, referrer);

if (result.isBot) {
  console.log(`Bot detected: ${result.info?.type} by ${result.info?.company}`);
  
  if (result.shouldBlock) {
    // Send 403 Forbidden response
    response.status(403).send('Access Denied');
  }
} else if (result.sourceType === 'ai_referrer') {
  console.log(`Visitor from AI platform: ${result.info?.name}`);
}
```

## API Reference

### Initialization

```typescript
// Initialize with configuration
import { init, Spyglasses } from '@spyglasses/sdk';

// Global instance for simple API
init({
  apiKey: 'your-api-key',
  debug: false,
  blockAiModelTrainers: true, // Block AI model training bots
  customBlocks: ['category:Scraper'], // Block all scrapers
  customAllows: ['pattern:Googlebot'] // Always allow Googlebot
});

// Or create a dedicated instance
const spyglasses = new Spyglasses({
  apiKey: 'your-api-key',
  // Same config options as above
});
```

### Detection Methods

```typescript
// Detect bots from user agent
const botResult = detectBot(userAgent);

// Detect AI referrers
const referrerResult = detectAiReferrer(referrer);

// Combined detection
const result = detect(userAgent, referrer);

// Detection result interface
interface DetectionResult {
  isBot: boolean;
  shouldBlock: boolean;
  sourceType: 'bot' | 'ai_referrer' | 'none';
  matchedPattern?: string;
  info?: BotInfo | AiReferrerInfo;
}
```

### Pattern Management

```typescript
// Sync patterns from the API
await syncPatterns();

// Get current patterns
const patterns = getPatterns();
const aiReferrers = getAiReferrers();
```

### Logging and Reporting

```typescript
// Log a detected request to the Spyglasses collector
await spyglasses.logRequest(detectionResult, {
  url: 'https://example.com/path',
  method: 'GET',
  path: '/path',
  userAgent: '...',
  referrer: '...',
  ip: '1.2.3.4',
  headers: { ... },
  responseStatus: 200,
  responseTime: 150 // milliseconds
});
```

### Block Rules

You can configure blocking rules with custom allow and block lists:

```typescript
init({
  apiKey: 'your-api-key',
  blockAiModelTrainers: true, // Block all AI model trainers
  customBlocks: [
    'category:Scraper', // Block all scrapers
    'pattern:SomeSpecificBot', // Block a specific bot pattern
    'subcategory:AI Agent:AI Assistants' // Block a subcategory
  ],
  customAllows: [
    'pattern:Googlebot', // Always allow Googlebot
    'type:Search Crawler:Search Engines:googlebot' // Allow by type
  ]
});
```

## Express.js Integration Example

```javascript
const express = require('express');
const { createSpyglassesMiddleware } = require('@spyglasses/sdk/express');

const app = express();

// Add Spyglasses middleware
app.use(createSpyglassesMiddleware({
  apiKey: 'your-api-key',
  debug: process.env.SPYGLASSES_DEBUG === 'true',
  blockAiModelTrainers: true
}));

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

## Framework Integrations

This SDK is not designed to be used separately. Instead it is designed to be integrated into web frameworks and platforms. See our specific framework integrations:

- [@spyglasses/next](https://www.npmjs.com/package/@spyglasses/next) - Next.js integration

## License

MIT
