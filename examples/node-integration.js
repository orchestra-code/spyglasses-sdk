/**
 * Example of integrating Spyglasses SDK in a Node.js application
 * 
 * This demonstrates a simple middleware pattern for Express.js
 * that tracks both bot traffic and AI referrers.
 */

const { 
  init, 
  detect, 
  detectBot, 
  detectAiReferrer,
  Spyglasses 
} = require('@spyglasses/sdk');

/**
 * Simple Express.js middleware for Spyglasses
 */
function createSpyglassesMiddleware(options = {}) {
  // Create a dedicated instance for this middleware
  const spyglasses = new Spyglasses({
    apiKey: process.env.SPYGLASSES_API_KEY,
    debug: false,
    blockAiModelTrainers: false,
    ...options
  });

  // Sync patterns on initialization if we have an API key
  if (spyglasses.apiKey) {
    spyglasses.syncPatterns().catch(error => {
      if (options.debug) {
        console.error('Spyglasses pattern sync error:', error);
      }
    });
  }

  return async function spyglassesMiddleware(req, res, next) {
    // Extract headers
    const userAgent = req.headers['user-agent'] || '';
    const referer = req.headers['referer'] || req.headers['referrer'] || '';
    
    // Detect if it's a bot or AI referrer
    const result = spyglasses.detect(userAgent, referer);
    
    // If no detection or no API key, just continue
    if (result.sourceType === 'none' || !spyglasses.apiKey) {
      return next();
    }
    
    // If it should be blocked, send 403 response
    if (result.shouldBlock) {
      // Log the blocked visit before sending the 403 response
      spyglasses.logRequest(result, {
        url: `${req.protocol}://${req.get('host')}${req.originalUrl}`,
        method: req.method,
        path: req.path,
        query: req.query,
        userAgent,
        referrer: referer,
        ip: req.ip || req.connection.remoteAddress,
        headers: req.headers,
        responseStatus: 403
      }).catch(() => {});
      
      // Send 403 Forbidden response
      return res.status(403).send('Access Denied');
    }
    
    // Record start time for response timing
    const startTime = Date.now();
    
    // Patch the res.end method to capture the response status and time
    const originalEnd = res.end;
    res.end = function(chunk, encoding) {
      // Restore original end method
      res.end = originalEnd;
      
      // Call original end method
      res.end(chunk, encoding);
      
      // Log the visit with final status and timing
      spyglasses.logRequest(result, {
        url: `${req.protocol}://${req.get('host')}${req.originalUrl}`,
        method: req.method,
        path: req.path,
        query: req.query,
        userAgent,
        referrer: referer,
        ip: req.ip || req.connection.remoteAddress,
        headers: req.headers,
        responseStatus: res.statusCode,
        responseTime: Date.now() - startTime
      }).catch(() => {});
    };
    
    // Continue with the request
    next();
  };
}

/**
 * Example usage with Express.js
 */
// const express = require('express');
// const app = express();
// 
// // Add Spyglasses middleware
// app.use(createSpyglassesMiddleware({
//   apiKey: 'your-api-key',
//   debug: process.env.NODE_ENV !== 'production',
//   blockAiModelTrainers: true,
//   customBlocks: ['category:Scraper']
// }));
// 
// app.get('/', (req, res) => {
//   res.send('Hello World!');
// });
// 
// app.listen(3000, () => {
//   console.log('Server running on port 3000');
// });

/**
 * Example of manual detection
 */
function exampleManualDetection() {
  // Initialize the SDK with your API key
  init({
    apiKey: process.env.SPYGLASSES_API_KEY,
    debug: true
  });
  
  // Example user agent for ChatGPT
  const userAgent = 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; ChatGPT-User/1.0; +https://openai.com/bot';
  
  // Detect if it's a bot
  const result = detectBot(userAgent);
  
  if (result.isBot) {
    console.log(`Detected bot: ${result.info?.type}`);
    console.log(`Category: ${result.info?.category}`);
    console.log(`Should block: ${result.shouldBlock}`);
  } else {
    console.log('Not a bot');
  }
  
  // Example referrer from Claude
  const referrer = 'https://claude.ai/chat/12345';
  
  // Detect if it's an AI referrer
  const referrerResult = detectAiReferrer(referrer);
  
  if (referrerResult.sourceType === 'ai_referrer') {
    console.log(`Detected AI referrer: ${referrerResult.info?.name}`);
    console.log(`Company: ${referrerResult.info?.company}`);
  } else {
    console.log('Not an AI referrer');
  }
}

module.exports = {
  createSpyglassesMiddleware,
  exampleManualDetection
}; 