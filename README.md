# Spyglasses SDK

**NOTE: This package is not designed to be used directly. Instead, use the spyglasses package that's built for your environment.**

The Spyglasses core JavaScript SDK enables you to detect AI Agents, bots, crawlers, and referrers in your Python web applications. It provides comprehensive [AI SEO](https://www.spyglasses.io), shows you when your site features in ChatGPT, Claude, Perplexity, and other AI assistant chat platforms. It can also prevent your site's content from being used for training AI by blocking the crawlers that scrape your content for training.

## Features

- **API-driven Pattern Management**: Automatically fetch and update detection patterns from the Spyglasses API
- **Intelligent Bot Detection**: Identify AI agents, crawlers, and other bots with precision
- **AI Referrer Detection**: Track human traffic coming from AI platforms like ChatGPT and Claude
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
  debug: false
});

// Or create a dedicated instance
const spyglasses = new Spyglasses({
  apiKey: 'your-api-key',
  debug: false
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

### Blocking Rules Configuration

Blocking rules are now managed through the Spyglasses platform web interface. You can configure:

- **Global AI Model Trainer Blocking**: Block all AI model training bots (GPTBot, Claude-Bot, etc.)
- **Custom Block Rules**: Block specific categories, subcategories, bot types, or patterns
- **Custom Allow Rules**: Create exceptions to allow specific bots even when they would otherwise be blocked

To configure these settings:

1. Log into your Spyglasses dashboard
2. Navigate to your property settings
3. Go to the "Traffic Control" section
4. Configure your blocking preferences

The SDK will automatically load and apply these settings when it syncs patterns from the API.

## Express.js Integration Example

```javascript
const express = require('express');
const { createSpyglassesMiddleware } = require('@spyglasses/sdk/express');

const app = express();

// Add Spyglasses middleware
app.use(createSpyglassesMiddleware({
  apiKey: 'your-api-key',
  debug: process.env.SPYGLASSES_DEBUG === 'true'
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
