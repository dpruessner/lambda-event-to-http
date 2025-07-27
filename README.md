# Expressify Lambda

Lightweight AWS Lambda compatibility layer for ExpressJS. This library provides a translation layer from AWS Lambda API Gateway Proxy events into ExpressJS request and response objects, allowing existing ExpressJS middleware to be used with AWS Lambda functions.

## Project Status

✅ **Ready for Use** ✅

This library is now fully functional and ready for production use. It successfully translates Lambda events to Express requests and responses, supporting both API Gateway v1 and v2.

## Features

- **Full Express Compatibility** - Works with all Express middleware and features
- **Automatic API Gateway Detection** - Automatically detects v1 vs v2 API Gateway events
- **TypeScript Support** - Full TypeScript definitions included
- **Error Handling** - Comprehensive error handling with customizable error responses
- **Performance Optimized** - Efficient request/response processing
- **Local Development** - Easy local development with standard Express server

## Supported API Gateway Versions

- **API Gateway v1 (REST API)** - Full support for REST API Gateway events
- **API Gateway v2 (HTTP API)** - Full support for HTTP API Gateway events

The library automatically detects the API Gateway version and handles the appropriate event format.

## Quick Start

### Basic Usage

```typescript
import express from 'express';
import { createHandler } from 'expressify-lambda';

const app = express();

app.get('/hello', (req, res) => {
  res.json({ message: 'Hello from Lambda!' });
});

app.post('/users', (req, res) => {
  res.json({ users: [] });
});

// Create Lambda handler
export const handler = createHandler(app);
```

### Advanced Usage with Options

```typescript
import express from 'express';
import { createHandlerWithOptions } from 'expressify-lambda';

const app = express();

// Add your routes and middleware
app.use(express.json());
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Create handler with custom options
export const handler = createHandlerWithOptions(app, {
  debug: true,
  timeout: 30000, // 30 seconds
  errorHandler: async (error, event, context) => {
    console.error('Custom error handler:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Custom error message' }),
      headers: { 'Content-Type': 'application/json' }
    };
  }
});
```

## Migration Guide

### From Existing Express App

If you have an existing Express application, migration is straightforward:

```typescript
// Original Express app
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/api/users', (req, res) => {
  res.json({ users: [] });
});

app.post('/api/users', (req, res) => {
  // Your existing logic
  res.json({ success: true });
});

// For Lambda deployment - just add this line
export const handler = createHandler(app);

// For local development (optional)
if (process.env.NODE_ENV !== 'production') {
  app.listen(3000, () => {
    console.log('Server running on port 3000');
  });
}
```

### From Lambda to Express

If you want to run your Lambda function locally as an Express server:

```typescript
import express from 'express';
import { createLocalServer } from 'expressify-lambda';

const app = express();

// Your routes
app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello World' });
});

// Run locally
createLocalServer(app, 3000);
```

## API Reference

### `createHandler(app: Application)`

Creates a Lambda handler function from an Express application.

**Parameters:**
- `app` - Express application instance

**Returns:** Lambda handler function

### `createHandlerWithOptions(app: Application, options: HandlerOptions)`

Creates a Lambda handler with custom options.

**Parameters:**
- `app` - Express application instance
- `options` - Handler options object

**Options:**
- `debug?: boolean` - Enable debug logging
- `timeout?: number` - Request timeout in milliseconds
- `errorHandler?: Function` - Custom error handler function

### `expressify(app: Application, event: APIGatewayEvent, context: Context, options?: HandlerOptions)`

Core function that processes Lambda events through Express.

### `createLocalServer(app: Application, port?: number)`

Creates a local development server.

## Middleware Compatibility

All Express middleware works seamlessly:

```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

const app = express();

// All middleware works as expected
app.use(cors());
app.use(helmet());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Your routes
app.get('/api/data', (req, res) => {
  res.json({ data: 'Hello World' });
});

export const handler = createHandler(app);
```

## Error Handling

The library provides comprehensive error handling:

```typescript
import express from 'express';
import { createHandlerWithOptions } from 'expressify-lambda';

const app = express();

// Express error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something broke!' });
});

// Custom error handler for Lambda
export const handler = createHandlerWithOptions(app, {
  errorHandler: async (error, event, context) => {
    console.error('Lambda error:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Internal Server Error',
        requestId: context.awsRequestId
      }),
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': context.awsRequestId
      }
    };
  }
});
```

## Performance Considerations

- **Cold Starts**: The library is optimized for Lambda cold starts
- **Memory Usage**: Minimal memory overhead for request/response translation
- **Response Time**: Fast translation layer with minimal latency
- **Middleware**: All Express middleware runs at full performance

## Development

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Lint code
npm run lint
```

## Testing

The library includes comprehensive tests:

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test files
npm test -- socket-wrapper.test.ts
```

## Dependencies

- ExpressJS 5.1.0+
- TypeScript 5.0+
- Node.js 18+

## License

MIT 