/**
 * Utility functions for Expressify Lambda
 * Provides common operations and metaprogramming utilities
 */

import { type APIGatewayEvent, isAPIGatewayV1, isAPIGatewayV2 } from './types';
import debug from 'debug';

export function createDebugger(namespace: string) {
    return debug(`event-http:${namespace}`);
}

// Buffer is available in Node.js runtime
declare const Buffer: {
  from(data: string, encoding: string): { toString(encoding: string): string };
};

/**
 * Metaprogramming utilities for Express function proxying
 */
export class ExpressProxy {
  /**
   * Create a proxy that delegates to Express's request prototype
   */
  static createRequestProxy(expressReq: any, transportLayer: any): any {
    return new Proxy(expressReq, {
      get(target, prop) {
        // Delegate transport methods to our transport layer
        if (typeof prop === 'string' && transportLayer[prop] !== undefined) {
          return transportLayer[prop];
        }
        
        // Delegate everything else to Express's implementation
        return target[prop];
      },
      set(target, prop, value) {
        // Allow setting properties on the transport layer
        if (typeof prop === 'string' && transportLayer[prop] !== undefined) {
          transportLayer[prop] = value;
          return true;
        }
        
        // Delegate to Express's implementation
        target[prop] = value;
        return true;
      }
    });
  }

  /**
   * Create a proxy that delegates to Express's response prototype
   */
  static createResponseProxy(expressRes: any, transportLayer: any): any {
    return new Proxy(expressRes, {
      get(target, prop) {
        // Delegate transport methods to our transport layer
        if (typeof prop === 'string' && transportLayer[prop] !== undefined) {
          return transportLayer[prop];
        }
        
        // Delegate everything else to Express's implementation
        return target[prop];
      },
      set(target, prop, value) {
        // Allow setting properties on the transport layer
        if (typeof prop === 'string' && transportLayer[prop] !== undefined) {
          transportLayer[prop] = value;
          return true;
        }
        
        // Delegate to Express's implementation
        target[prop] = value;
        return true;
      }
    });
  }

  /**
   * Get Express's request prototype
   */
  static getExpressRequestPrototype(): any {
    try {
      // Try to get Express's request prototype
      const express = require('express');
      const app = express();
      return app.request;
    } catch (error) {
      // Fallback to a minimal prototype if Express isn't available
      return {};
    }
  }

  /**
   * Get Express's response prototype
   */
  static getExpressResponsePrototype(): any {
    try {
      // Try to get Express's response prototype
      const express = require('express');
      const app = express();
      return app.response;
    } catch (error) {
      // Fallback to a minimal prototype if Express isn't available
      return {};
    }
  }
}

/**
 * Transport layer for request handling
 */
export class RequestTransport {
  private _headers: { [key: string]: string | string[] | undefined } = {};
  private _body: any = null;
  private _timeout?: NodeJS.Timeout;
  private _destroyed: boolean = false;
  private _eventEmitter: any;

  constructor(eventEmitter: any) {
    this._eventEmitter = eventEmitter;
  }

  // Transport-specific properties
  get headers(): { [key: string]: string | string[] | undefined } {
    return this._headers;
  }

  set headers(value: { [key: string]: string | string[] | undefined }) {
    this._headers = value;
  }

  get body(): any {
    return this._body;
  }

  set body(value: any) {
    this._body = value;
  }

  // Transport methods that Express doesn't handle
  setTimeout(msecs: number, callback?: () => void): any {
    if (this._timeout) {
      clearTimeout(this._timeout);
    }
    this._timeout = setTimeout(() => {
      if (callback) callback();
      this._eventEmitter.emit('timeout');
    }, msecs);
    return this._eventEmitter;
  }

  destroy(error?: Error): any {
    if (this._destroyed) return this._eventEmitter;
    this._destroyed = true;
    
    if (this._timeout) {
      clearTimeout(this._timeout);
    }
    
    if (error) {
      this._eventEmitter.emit('error', error);
    }
    this._eventEmitter.emit('close');
    return this._eventEmitter;
  }

  _destroy(error: Error | null, callback: (error: Error | null) => void): void {
    this.destroy(error || undefined);
    callback(error);
  }
}

/**
 * Transport layer for response handling
 */
export class ResponseTransport {
  private _headers: { [key: string]: string | number | (string | number)[] } = {};
  private _body: any = null;
  private _statusCode: number = 200;
  private _headersSent: boolean = false;
  private _timeout?: NodeJS.Timeout;
  private _destroyed: boolean = false;
  private _eventEmitter: any;

  constructor(eventEmitter: any) {
    this._eventEmitter = eventEmitter;
  }

  // Transport-specific properties
  get headersSent(): boolean {
    return this._headersSent;
  }

  set headersSent(value: boolean) {
    this._headersSent = value;
  }

  get statusCode(): number {
    return this._statusCode;
  }

  set statusCode(value: number) {
    this._statusCode = value;
  }

  // Transport methods that Express doesn't handle
  writeHead(statusCode: number, statusMessage?: string, headers?: any): any;
  writeHead(statusCode: number, headers?: any): any;
  writeHead(statusCode: number, statusMessageOrHeaders?: string | any, headers?: any): any {
    this._statusCode = statusCode;
    
    if (typeof statusMessageOrHeaders === 'string') {
      if (headers) {
        this.setHeaders(headers);
      }
    } else if (statusMessageOrHeaders) {
      this.setHeaders(statusMessageOrHeaders);
    }
    
    this._headersSent = true;
    return this._eventEmitter;
  }

  setHeader(name: string, value: string | number | (string | number)[]): any {
    this._headers[name.toLowerCase()] = value;
    return this._eventEmitter;
  }

  setHeaders(headers: { [key: string]: string | number | (string | number)[] }): any {
    for (const [name, value] of Object.entries(headers)) {
      this.setHeader(name, value);
    }
    return this._eventEmitter;
  }

  getHeader(name: string): string | number | (string | number)[] | undefined {
    return this._headers[name.toLowerCase()];
  }

  getHeaders(): { [key: string]: string | number | (string | number)[] } {
    return { ...this._headers };
  }

  hasHeader(name: string): boolean {
    return name.toLowerCase() in this._headers;
  }

    removeHeader(name: string): void {
    delete this._headers[name.toLowerCase()];
  }
  
  getHeaderNames(): string[] {
    return Object.keys(this._headers);
  }
  
  getRawHeaderNames(): string[] {
    return Object.keys(this._headers);
  }
  
  addTrailers(headers: { [key: string]: string }): any {
    // No-op for Lambda shim
    return this._eventEmitter;
  }
  
  appendHeader(name: string, value: string | number | (string | number)[]): any {
    const existing = this.getHeader(name);
    if (existing) {
      if (Array.isArray(existing)) {
        const newValue = Array.isArray(value) ? value : [value];
        this.setHeader(name, [...existing, ...newValue]);
      } else {
        const newValue = Array.isArray(value) ? value : [value];
        this.setHeader(name, [existing, ...newValue]);
      }
    } else {
      this.setHeader(name, value);
    }
    return this._eventEmitter;
  }
  
  cork(): void {
    // No-op for Lambda shim
  }
  
  uncork(): void {
    // No-op for Lambda shim
  }
  
  setDefaultEncoding(encoding: string): any {
    // No-op for Lambda shim
    return this._eventEmitter;
  }
  
  _write(chunk: any, encoding: string, callback: (error?: Error | null) => void): void {
    this.write(chunk, encoding, callback);
  }
  
  _writev(chunks: Array<{ chunk: any; encoding: string }>, callback: (error?: Error | null) => void): void {
    for (const { chunk, encoding } of chunks) {
      this.write(chunk, encoding);
    }
    callback(null);
  }
  
  _final(callback: (error?: Error | null) => void): void {
    this.end();
    callback(null);
  }
  
  setTimeout(msecs: number, callback?: () => void): any {
    if (this._timeout) {
      clearTimeout(this._timeout);
    }
    this._timeout = setTimeout(() => {
      if (callback) callback();
      this._eventEmitter.emit('timeout');
    }, msecs);
    return this._eventEmitter;
  }

  flushHeaders(): void {
    this._headersSent = true;
  }

  write(chunk: any, encoding?: string, callback?: (error?: Error | null) => void): boolean;
  write(chunk: any, callback?: (error?: Error | null) => void): boolean;
  write(chunk: any, encodingOrCallback?: string | ((error?: Error | null) => void), callback?: (error?: Error | null) => void): boolean {
    if (this._destroyed) {
      if (typeof encodingOrCallback === 'function') {
        encodingOrCallback(new Error('Cannot write to destroyed stream'));
      } else if (callback) {
        callback(new Error('Cannot write to destroyed stream'));
      }
      return false;
    }
    
    // Append to body
    if (this._body === null) {
      this._body = chunk;
    } else if (typeof this._body === 'string' && typeof chunk === 'string') {
      this._body += chunk;
    } else {
      if (!Array.isArray(this._body)) {
        this._body = [this._body];
      }
      this._body.push(chunk);
    }
    
    if (typeof encodingOrCallback === 'function') {
      encodingOrCallback(null);
    } else if (callback) {
      callback(null);
    }
    
    return true;
  }

  end(cb?: () => void): any;
  end(chunk: any, cb?: () => void): any;
  end(chunk: any, encoding: string, cb?: () => void): any;
  end(chunk?: any, encodingOrCallback?: string | (() => void), callback?: () => void): any {
    if (chunk !== undefined) {
      this.write(chunk, typeof encodingOrCallback === 'string' ? encodingOrCallback : undefined);
    }
    
    this._headersSent = true;
    
    const cb = typeof encodingOrCallback === 'function' ? encodingOrCallback : callback;
    if (cb) cb();
    
    this._eventEmitter.emit('finish');
    this._eventEmitter.emit('close');
    
    return this._eventEmitter;
  }

  destroy(error?: Error): any {
    if (this._destroyed) return this._eventEmitter;
    this._destroyed = true;
    
    if (this._timeout) {
      clearTimeout(this._timeout);
    }
    
    if (error) {
      this._eventEmitter.emit('error', error);
    }
    this._eventEmitter.emit('close');
    return this._eventEmitter;
  }

  _destroy(error: Error | null, callback: (error: Error | null) => void): void {
    this.destroy(error || undefined);
    callback(error);
  }

  toAPIGatewayResult(): any {
    const headers: { [header: string]: string | number | boolean } = {};
    for (const [key, value] of Object.entries(this._headers)) {
      if (Array.isArray(value)) {
        headers[key] = value.join(', ');
      } else {
        headers[key] = value;
      }
    }
    
    return {
      statusCode: this._statusCode,
      headers,
      body: this._body ? String(this._body) : '',
      isBase64Encoded: false
    };
  }
}

let AppSubdomainLength = 2;
export function setAppSubdomainLength(length: number) {
  AppSubdomainLength = length;
}

/**
 * Determine if the request is secure (HTTPS)
 */
export function isSecure(event: APIGatewayEvent): boolean {
  const headers = event.headers || {};
  const forwardedProto = headers['x-forwarded-proto'] || headers['X-Forwarded-Proto'];
  return forwardedProto === 'https';
}

/**
 * Extract the client IP address
 */
export function getClientIP(event: APIGatewayEvent): string {
  const headers = event.headers || {};
  
  if (isAPIGatewayV1(event)) {
    return headers['x-forwarded-for'] || 
           headers['X-Forwarded-For'] || 
           event.requestContext?.identity?.sourceIp || 
           '127.0.0.1';
  } else if (isAPIGatewayV2(event)) {
    return headers['x-forwarded-for'] || 
           headers['X-Forwarded-For'] || 
           event.requestContext?.http?.sourceIp || 
           '127.0.0.1';
  }
  
  return '127.0.0.1';
}

/**
 * Get the hostname from headers
 */
export function getHostname(event: APIGatewayEvent): string {
  const headers = event.headers || {};
  const host = headers.host || headers.Host;
  
  if (host) {
    // Remove port if present
    return host.split(':')[0];
  }
  
  return 'localhost';
}

/**
 * Parse URL and extract path
 */
export function parsePath(event: APIGatewayEvent): string {
  if (isAPIGatewayV1(event)) {
    return event.path || '/';
  } else if (isAPIGatewayV2(event)) {
    return event.rawPath || '/';
  }
  return '/';
}

/**
 * Determine if request is an XHR request
 */
export function isXHR(event: APIGatewayEvent): boolean {
  const headers = event.headers || {};
  const xRequestedWith = headers['x-requested-with'] || headers['X-Requested-With'];
  return xRequestedWith === 'XMLHttpRequest';
}

/**
 * Get subdomains from hostname
 */
export function getSubdomains(hostname: string, offset: number = 0): string[] {
  if (AppSubdomainLength > 0) {
    offset += AppSubdomainLength;
  }
  const parts = hostname.split('.');
  if (parts.length <= offset) {
    return [];
  }
  return parts.slice(0, parts.length - offset);
}

/**
 * Normalize headers to lowercase keys
 */
export function normalizeHeaders(headers: { [key: string]: string } | null): { [key: string]: string } {
  if (!headers) return {};
  
  const normalized: { [key: string]: string } = {};
  for (const [key, value] of Object.entries(headers)) {
    normalized[key.toLowerCase()] = value;
  }
  return normalized;
} 

export function prettyPrintBuffer(buffer: Buffer | string): string {
  // Print out all the characters, replacing unprintable characters with '.' 
  let result = '';
  if (typeof buffer === 'string') {
    return 'String[' + buffer + ']';
  }
  for (let i = 0; i < buffer.length; i++) {
    const char = buffer[i];
    if (char < 32 || char > 126) {
      result += '.';
    } else {
      result += String.fromCharCode(char);
    }
  }
  return 'Buffer[' + result + ']';
}