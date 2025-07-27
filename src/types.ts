/**
 * Expressify Lambda Types
 * 
 * This file imports AWS Lambda types from @types/aws-lambda and defines
 * Express-compatible interfaces for our shim implementation.
 */

// Import official AWS Lambda types
import type {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
  APIGatewayProxyStructuredResultV2,
  Context
} from 'aws-lambda';

// Re-export AWS Lambda types for convenience
export type {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
  APIGatewayProxyStructuredResultV2,
  Context
};

import { EventEmitter } from 'events';
import { Readable, Writable } from 'stream';

/**
 * Union type for both API Gateway event types
 */
export type APIGatewayEvent = APIGatewayProxyEvent | APIGatewayProxyEventV2;

/**
 * Union type for both API Gateway result types
 */
export type APIGatewayResult = APIGatewayProxyResult | APIGatewayProxyResultV2;

/**
 * Type guard to check if event is API Gateway v1 (REST)
 */
export function isAPIGatewayV1(event: APIGatewayEvent): event is APIGatewayProxyEvent {
  return !!event && 'httpMethod' in event;
}

/**
 * Type guard to check if event is API Gateway v2 (HTTP)
 */
export function isAPIGatewayV2(event: APIGatewayEvent): event is APIGatewayProxyEventV2 {
  return !!event && 'requestContext' in event && 'http' in event.requestContext;
}

/**
 * Extended Express Request interface that includes Lambda-specific properties
 */
export interface ExpressifyRequest extends Request {
  // Lambda-specific properties
  lambdaEvent: APIGatewayEvent;
  lambdaContext: Context;
}

/**
 * Extended Express Response interface
 */
export interface ExpressifyResponse extends Response {
  // No additional properties needed for now
}


/**
 * Detect the API Gateway version from a Lambda event
 */
export function detectApiGatewayVersion(event: any): 'v1' | 'v2' {
    // API Gateway v2 has a 'version' field set to '2.0'
    if (event.version === '2.0') {
        return 'v2';
    }
    
    // API Gateway v1 has 'httpMethod' field
    if (event.httpMethod) {
        return 'v1';
    }
    
    // Default to v1 for backward compatibility
    return 'v1';
}

/**
 * Type guard to check if event is API Gateway v1
 */
export function isApiGatewayV1(event: any): event is APIGatewayEvent | APIGatewayProxyEvent {
    return detectApiGatewayVersion(event) === 'v1';
}

/**
 * Type guard to check if event is API Gateway v2
 */
export function isApiGatewayV2(event: any): event is APIGatewayProxyEventV2 {
    return detectApiGatewayVersion(event) === 'v2';
}

/**
 * Validate that the event is a valid API Gateway event
 */
export function validateApiGatewayEvent(event: any): boolean {
    if (!event || typeof event !== 'object') {
        return false;
    }
    
    const version = detectApiGatewayVersion(event);
    
    if (version === 'v1') {
        return !!(event.httpMethod && event.path);
    } else {
        return !!(event.routeKey && event.rawPath);
    }
} 
