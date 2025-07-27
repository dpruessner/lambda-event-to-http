import { type IncomingHttpHeaders, type IncomingMessage } from 'http';
import { Socket } from 'net';

import { type APIGatewayEvent, type APIGatewayProxyEvent, type APIGatewayProxyEventV2 } from './types';
import { EventWrapperSocket } from './event-wrapper-socket';
import { createDebugger } from './util';

const debug = createDebugger('LambdaIncomingMessage');

export class LambdaIncomingMessage extends EventWrapperSocket implements IncomingMessage {
    private _event: APIGatewayEvent | APIGatewayProxyEvent | APIGatewayProxyEventV2;
    private _socket: Socket;
    private _url: string | undefined;


    constructor(event: APIGatewayEvent | APIGatewayProxyEvent | APIGatewayProxyEventV2) {
        let body = event.body || undefined;
        super(body, {});
        
        this._debug = createDebugger('LambdaIncomingMessage');
        this._debug('constructor');
        
        this._event = event;
        this._socket = this;
        this._url = this._parseUrl();
    }

    /**
     * The message.complete property will be true if a complete HTTP message has
     * been received and successfully parsed.
     */
    public complete: boolean = true;

    /**
     * The request/response headers object.
     * Key-value pairs of header names and values. Header names are lower-cased.
     */
    get headers(): IncomingHttpHeaders {
        const headers: IncomingHttpHeaders = {};
        
        if ('headers' in this._event) {
            for (const [key, value] of Object.entries(this._event.headers)) {
                if (value !== undefined) {
                    headers[key.toLowerCase()] = value as string;
                }
            }
        }
        
        return headers;
    }

    /**
     * Similar to message.headers, but there is no join logic and the values are
     * always arrays of strings, even for headers received just once.
     */
    get headersDistinct(): NodeJS.Dict<string[]> {
        const headers: NodeJS.Dict<string[]> = {};
        
        if ('headers' in this._event) {
            for (const [key, value] of Object.entries(this._event.headers)) {
                if (value !== undefined) {
                    headers[key.toLowerCase()] = [value as string];
                }
            }
        }
        
        return headers;
    }

    /**
     * The raw request/response headers list exactly as they were received.
     * The keys and values are in the same list. It is not a list of tuples.
     * So, the even-numbered offsets are key values, and the odd-numbered offsets
     * are the associated values.
     */
    get rawHeaders(): string[] {
        const rawHeaders: string[] = [];
        
        if ('headers' in this._event) {
            for (const [key, value] of Object.entries(this._event.headers)) {
                if (value !== undefined) {
                    rawHeaders.push(key, value as string);
                }
            }
        }
        
        return rawHeaders;
    }

    /**
     * The request/response trailers object. Only populated at the end event.
     */
    get trailers(): NodeJS.Dict<string> {
        return {};
    }

    /**
     * Similar to message.trailers, but there is no join logic and the values are
     * always arrays of strings, even for headers received just once.
     * Only populated at the end event.
     */
    get trailersDistinct(): NodeJS.Dict<string[]> {
        return {};
    }

    /**
     * The raw request/response trailer keys and values exactly as they were
     * received. Only populated at the end event.
     */
    get rawTrailers(): string[] {
        return [];
    }

    /**
     * Calls message.connection.setTimeout(msecs, callback).
     */
    override setTimeout(msecs: number, callback?: () => void): this {
        this._socket.setTimeout(msecs, callback);
        return this;
    }

    /**
     * Only valid for request obtained from http.Server.
     * The request method as a string. Read only. Examples: GET, DELETE.
     */
    get method(): string | undefined {
        if ('httpMethod' in this._event) {
            return this._event.httpMethod;
        } else if ('requestContext' in this._event && 'http' in this._event.requestContext) {
            return this._event.requestContext.http.method;
        }
        return undefined;
    }


    /**
     * Request URL string. This contains only the URL that is present in the
     * actual HTTP request.
     */
    private _parseUrl(): string | undefined {
        let path = '';
        let query = '';
        
        if ('path' in this._event) {
            path = this._event.path;
        } else if ('rawPath' in this._event) {
            path = this._event.rawPath;
        }
        
        if ('queryStringParameters' in this._event && this._event.queryStringParameters) {
            const params = new URLSearchParams();
            for (const [key, value] of Object.entries(this._event.queryStringParameters)) {
                if (value !== null && value !== undefined) {
                    params.append(key, value);
                }
            }
            query = params.toString();
        } else if ('rawQueryString' in this._event && this._event.rawQueryString) {
            query = this._event.rawQueryString;
        }
        
        return query ? `${path}?${query}` : path;
    }

    /**
     * Only valid for response obtained from http.ClientRequest.
     * The 3-digit HTTP response status code. E.G. 404.
     */
    get statusCode(): number | undefined {
        return undefined; // This is a request, not a response
    }

    /**
     * Only valid for response obtained from http.ClientRequest.
     * The HTTP response status message (reason phrase). E.G. OK or Internal Server Error.
     */
    get statusMessage(): string | undefined {
        return undefined; // This is a request, not a response
    }


    /**
     * The message.aborted property will be true if the request has been aborted.
     */
    get aborted(): boolean {
        return false; // Lambda requests are not aborted
    }

    /**
     * The net.Socket object associated with the connection.
     * With HTTPS support, use request.socket.getPeerCertificate() to obtain the
     * client's authentication details.
     * This property is guaranteed to be an instance of the net.Socket class,
     * a subclass of stream.Duplex, unless the user specified a socket
     * type other than net.Socket or internally the connection was not established.
     */
    get socket(): Socket {
        return this._socket;
    }

    /**
     * Alias for message.socket.
     */
    get connection(): Socket {
        return this._socket;
    }

    /**
     * In case of server request, the HTTP version sent by the client. In the case of
     * client response, the HTTP version of the connected-to server.
     * Probably either 1.1 or 1.0.
     * Also message.httpVersionMajor is the first integer and
     * message.httpVersionMinor is the second.
     */
    get httpVersion(): string {
        if ('requestContext' in this._event && 'protocol' in this._event.requestContext) {
            return this._event.requestContext.protocol.replace('HTTP/', '');
        } else if ('requestContext' in this._event && 'http' in this._event.requestContext) {
            return this._event.requestContext.http.protocol.replace('HTTP/', '');
        }
        return '1.1'; // Default to HTTP/1.1
    }

    /**
     * The first integer of the HTTP version. In the case of server request, the HTTP
     * version sent by the client. In the case of client response, the HTTP version of
     * the connected-to server.
     */
    get httpVersionMajor(): number {
        return parseInt(this.httpVersion.split('.')[0]);
    }

    /**
     * The second integer of the HTTP version. In the case of server request, the HTTP
     * version sent by the client. In the case of client response, the HTTP version of
     * the connected-to server.
     */
    get httpVersionMinor(): number {
        return parseInt(this.httpVersion.split('.')[1]);
    }

    /**
     * Calls destroy() on the socket that received the IncomingMessage. If error
     * is provided, an error event is emitted on the socket and error is passed
     * as an argument to any listeners on the event.
     */
    override destroy(error?: Error): this {
        this._socket.destroy(error);
        return this;
    }

    /**
     * Get the original Lambda event that was used to create this request
     */
    get lambdaEvent(): APIGatewayEvent | APIGatewayProxyEvent | APIGatewayProxyEventV2 {
        return this._event;
    }

    get url(): string | undefined {
        this._debug('get url=', this._url);
        return this._url;
    }
    set url(url: string | undefined) {
        this._url = url;
    }
} 