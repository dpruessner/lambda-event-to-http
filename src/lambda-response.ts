import { ServerResponse } from 'http';
import { Socket } from 'net';
import { type APIGatewayProxyResult, type APIGatewayProxyResultV2, detectApiGatewayVersion } from './types';
import { LambdaIncomingMessage } from './lambda-incoming-message';
import { EventResponseBodyWriter } from './lambda-writable';

import { createDebugger } from './util';
const debug = createDebugger('LambdaResponse');

/**
 * Response for Lambda/Express shimming
 * 
 * There is little translation needed for output.
 * 
 */
export class LambdaResponse extends ServerResponse<LambdaIncomingMessage> {

    private _debug = debug;
    
    
    constructor(request: LambdaIncomingMessage) {
        super(request);
        this._debug('constructor');
        
        let writable = new EventResponseBodyWriter() as unknown as Socket;
        this.assignSocket(writable);
    }

    override _write(chunk: Buffer | string, encoding: string, callback: (error?: Error | null) => void) {
        this._debug('write', chunk, encoding);
        // @ts-ignore
        super._write(chunk, encoding, callback);
    }

    override end(chunk?: any, encoding?: any, cb?: (error?: Error | null) => void): this {
        this._debug('end', chunk || '', 'encoding=', encoding);

        try {
            super.end(chunk, encoding, cb);
            this._debug('end: complete');
            this.socket!.end();
        } catch (e) {
            this._debug('end: error: ', e);
        }
        return this;
    }
    
    private _makeHeaders(): { [key: string]: string | boolean | number } {
        let headers: { [key: string]: string | boolean | number } = {};
        let h = this.getHeaders();
        for (let key in h) {
            if (key === undefined || key === null) {
                continue;
            }

            let value = h[key];
            if (key === 'set-cookie' && value !== undefined) {
                if (Array.isArray(value)) {
                    value = value.join('; ');
                } 
            }
            if (value === undefined) {
                continue;
            }
            if (typeof value === 'string') {
                headers[key] = value;
            } else if (Array.isArray(value)) {
                headers[key] = value.join(',');
            } else {
                headers[key] = value;
            }
        }
        return headers;
    }

    private _makeBodyResponse(): { body: string, isBase64Encoded: boolean } {
        let body = (this.socket! as unknown as EventResponseBodyWriter).body;
        let bodyString: string;
        let isBase64Encoded = false;
        // Check if body has unprintable characters
        if (body.some(c => c < 32 || c > 126)) {
            bodyString = body.toString('base64');
            isBase64Encoded = true;
        } else {
            bodyString = body.toString();
        }
        return { body: bodyString, isBase64Encoded: isBase64Encoded };
    }

    private _lambdaStatusCode(): number | undefined {
        let statusCode: number;
        if (this.statusCode !== undefined) {
            if (typeof this.statusCode === 'string') {
                return parseInt(this.statusCode);
            } else {
                return this.statusCode;
            }
        } 
    }

    lambdaResponse(): APIGatewayProxyResult {
        let headers = this._makeHeaders();
        let { body, isBase64Encoded } = this._makeBodyResponse();
        let statusCode = this._lambdaStatusCode() || 200;

        let response: APIGatewayProxyResult = {
            statusCode,
            body,
            headers,
            isBase64Encoded,
        };
        return response;
    }

    lambdaResponseV2(): APIGatewayProxyResultV2 {
        let headers = this._makeHeaders();
        let { body, isBase64Encoded } = this._makeBodyResponse();
        let statusCode = this._lambdaStatusCode();

        let cookies: string[] = [];
        if (headers['set-cookie'] !== undefined) {
            cookies = (headers['set-cookie'] as string).split('; ');
            delete headers['set-cookie'];
        }

        let response: APIGatewayProxyResultV2 = {
            statusCode,
            body,
            headers,
            isBase64Encoded,
        };
        if (cookies.length > 0) {
            response.cookies = cookies;
        }
        return response;
    }

    toLambdaResponse(): APIGatewayProxyResult | APIGatewayProxyResultV2 {
        let version = detectApiGatewayVersion(this.req.lambdaEvent);
        if (version === 'v1') {
            return this.lambdaResponse();
        } else {
            return this.lambdaResponseV2();
        }
    }
    
    set url(url: string | undefined) {
        this._debug('set url', url);
    }
} 