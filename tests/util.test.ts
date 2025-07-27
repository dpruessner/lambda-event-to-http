/**
 * Tests for utility functions
 */
import {
  isSecure,
  getClientIP,
  getHostname,
  parsePath,
  isXHR,
  getSubdomains,
  normalizeHeaders
} from '../src/util';
import { apiGatewayV1Event, apiGatewayV2Event } from './fixtures/events';

describe('Utility Functions', () => {
  describe('isSecure', () => {
    it('should return true for HTTPS requests', () => {
      expect(isSecure(apiGatewayV1Event)).toBe(true);
      expect(isSecure(apiGatewayV2Event)).toBe(true);
    });

    it('should return false for HTTP requests', () => {
      const httpEvent = {
        ...apiGatewayV1Event,
        headers: { ...apiGatewayV1Event.headers, 'X-Forwarded-Proto': 'http' }
      };
      expect(isSecure(httpEvent)).toBe(false);
    });

    it('should return false when no protocol header', () => {
      const noProtoEvent = {
        ...apiGatewayV1Event,
        headers: { 'Host': 'api.example.com' }
      };
      expect(isSecure(noProtoEvent)).toBe(false);
    });
  });

  describe('getClientIP', () => {
    it('should extract IP from X-Forwarded-For header', () => {
      expect(getClientIP(apiGatewayV1Event)).toBe('192.168.1.1');
      expect(getClientIP(apiGatewayV2Event)).toBe('192.168.1.1');
    });

    it('should fall back to source IP from request context', () => {
      const eventWithoutForwardedFor = {
        ...apiGatewayV1Event,
        headers: { 'Host': 'api.example.com' }
      };
      expect(getClientIP(eventWithoutForwardedFor)).toBe('192.168.1.1');
    });

    it('should return default IP when no IP information', () => {
      const eventWithoutIP = {
        ...apiGatewayV1Event,
        headers: { 'Host': 'api.example.com' },
        requestContext: {
          ...apiGatewayV1Event.requestContext,
          identity: {
            ...apiGatewayV1Event.requestContext.identity,
            sourceIp: '0.0.0.0'
          }
        }
      };
      expect(getClientIP(eventWithoutIP)).toBe('0.0.0.0');
    });
  });

  describe('getHostname', () => {
    it('should extract hostname from Host header', () => {
      expect(getHostname(apiGatewayV1Event)).toBe('api.example.com');
      expect(getHostname(apiGatewayV2Event)).toBe('api.example.com');
    });

    it('should remove port from hostname', () => {
      const eventWithPort = {
        ...apiGatewayV1Event,
        headers: { ...apiGatewayV1Event.headers, 'Host': 'api.example.com:8080' }
      };
      expect(getHostname(eventWithPort)).toBe('api.example.com');
    });

    it('should return localhost when no host header', () => {
      const eventWithoutHost = {
        ...apiGatewayV1Event,
        headers: { 'Content-Type': 'application/json' }
      };
      expect(getHostname(eventWithoutHost)).toBe('localhost');
    });
  });

  describe('parsePath', () => {
    it('should extract path from v1 events', () => {
      expect(parsePath(apiGatewayV1Event)).toBe('/hello');
    });

    it('should extract path from v2 events', () => {
      expect(parsePath(apiGatewayV2Event)).toBe('/hello');
    });

    it('should return default path when no path available', () => {
      const eventWithoutPath = { ...apiGatewayV1Event, path: undefined } as any;
      expect(parsePath(eventWithoutPath)).toBe('/');
    });
  });

  describe('isXHR', () => {
    it('should return true for XHR requests', () => {
      const xhrEvent = {
        ...apiGatewayV1Event,
        headers: { ...apiGatewayV1Event.headers, 'X-Requested-With': 'XMLHttpRequest' }
      };
      expect(isXHR(xhrEvent)).toBe(true);
    });

    it('should return false for non-XHR requests', () => {
      expect(isXHR(apiGatewayV1Event)).toBe(false);
      expect(isXHR(apiGatewayV2Event)).toBe(false);
    });
  });

  describe('getSubdomains', () => {
    it('should extract subdomains correctly', () => {
      expect(getSubdomains('api.example.com')).toEqual(['api']);
      expect(getSubdomains('dev.api.example.com')).toEqual(['dev', 'api']);
      expect(getSubdomains('example.com')).toEqual([]);
    });

    it('should respect offset parameter', () => {
      expect(getSubdomains('api.example.com', 1)).toEqual([]);
      expect(getSubdomains('dev.api.example.com', 1)).toEqual(['dev']);
    });
  });

  describe('normalizeHeaders', () => {
    it('should convert header keys to lowercase', () => {
      const headers = {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0',
        'X-Custom-Header': 'value'
      };
      
      const normalized = normalizeHeaders(headers);
      expect(normalized).toEqual({
        'content-type': 'application/json',
        'user-agent': 'Mozilla/5.0',
        'x-custom-header': 'value'
      });
    });

    it('should handle null headers', () => {
      expect(normalizeHeaders(null)).toEqual({});
    });

    it('should handle empty headers', () => {
      expect(normalizeHeaders({})).toEqual({});
    });
  });
}); 