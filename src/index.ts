/**
 * eExpressify Lambda - AWS Lambda compatibility layer for ExpressJS
 * 
 * This library provides a translation layer from AWS Lambda API Gateway Proxy events
 * into ExpressJS request and response objects, allowing existing ExpressJS middleware
 * to be used with AWS Lambda functions.
 */

import { type APIGatewayEvent, type APIGatewayProxyEvent, type APIGatewayProxyEventV2, type APIGatewayProxyResult, type APIGatewayProxyResultV2 } from './types';
import { type Context } from 'aws-lambda';
import { detectApiGatewayVersion, validateApiGatewayEvent } from './types';
import { type IncomingMessage, type ServerResponse } from 'http';

import { LambdaIncomingMessage } from './lambda-incoming-message';
import { LambdaResponse } from './lambda-response';


export * from './types';
export * from './lambda-writable';
export * from './lambda-incoming-message';
export * from './lambda-response';


/**
 * Options for creating a Lambda handler
 */
export interface HandlerOptions {
    /** Enable debug logging */
    debug?: boolean;
    /** Custom error handler */
    errorHandler?: (error: Error, event: any, context: Context) => Promise<APIGatewayProxyResult | APIGatewayProxyResultV2>;
    /** Request timeout in milliseconds */
    timeout?: number;
}

/**
 * Main handler function that converts Lambda events to Express requests
 * and processes them through an Express application
 */
export async function appify(
    event: APIGatewayEvent | APIGatewayProxyEvent | APIGatewayProxyEventV2,
    context: Context,
    options: HandlerOptions = {}
): Promise<{
    result: Promise<APIGatewayProxyResult | APIGatewayProxyResultV2>,
    request: IncomingMessage,
    response: ServerResponse
}> {

    // Validate the event
    if (!validateApiGatewayEvent(event)) {
        throw new Error('Invalid API Gateway event');
    }

    const { request, response } = createRequestResponsePair(event);

    let promise: Promise<APIGatewayProxyResult | APIGatewayProxyResultV2> = new Promise((resolve, reject) => {
        response.on('finish', () => {
            // Return the appropriate response format based on API Gateway version
            const version = detectApiGatewayVersion(event);
            if (version === 'v2') {
                resolve((response as any).lambdaResponseV2());
            } else {
                resolve((response as any).lambdaResponse());
            }
        });
        response.on('error', reject);
    });

    return {
        result: promise,
        request,
        response
    }
}



/** 
 *  Create a request and response pair from an event.
 * 
 *  This is a low-level function that is used to create a request and response pair from an event.
 *  It is not used by the library itself, but it is used by the test suite.
 * 
 *  @param event The Lambda event to create a request and response pair from.
 *  @returns A request and response pair.
 * 
*/
export function createRequestResponsePair(event: APIGatewayEvent | APIGatewayProxyEvent | APIGatewayProxyEventV2): { request: LambdaIncomingMessage, response: LambdaResponse } {
    const request = new LambdaIncomingMessage(event) as any;
    const response = new LambdaResponse(request as unknown as LambdaIncomingMessage) as any;

    response.req = request;
    request.res = response;

    return { request, response };
}
