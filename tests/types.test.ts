/**
 * Tests for types module
 */

import {
  isAPIGatewayV1,
  isAPIGatewayV2,
  APIGatewayEvent,
  APIGatewayProxyEvent,
  APIGatewayProxyEventV2
} from '../src/types';

import { apiGatewayV1Event, apiGatewayV2Event } from './fixtures/events';

describe('Type Guards', () => {
  describe('isAPIGatewayV1', () => {
    it('should return true for API Gateway v1 events', () => {
      expect(isAPIGatewayV1(apiGatewayV1Event)).toBe(true);
    });

    it('should return false for API Gateway v2 events', () => {
      expect(isAPIGatewayV1(apiGatewayV2Event)).toBe(false);
    });

    it('should return false for null/undefined', () => {
      expect(isAPIGatewayV1(null as any)).toBe(false);
      expect(isAPIGatewayV1(undefined as any)).toBe(false);
    });
  });

  describe('isAPIGatewayV2', () => {
    it('should return true for API Gateway v2 events', () => {
      expect(isAPIGatewayV2(apiGatewayV2Event)).toBe(true);
    });

    it('should return false for API Gateway v1 events', () => {
      expect(isAPIGatewayV2(apiGatewayV1Event)).toBe(false);
    });

    it('should return false for null/undefined', () => {
      expect(isAPIGatewayV2(null as any)).toBe(false);
      expect(isAPIGatewayV2(undefined as any)).toBe(false);
    });
  });
});

describe('Union Types', () => {
  it('should accept both v1 and v2 events', () => {
    const events: APIGatewayEvent[] = [apiGatewayV1Event, apiGatewayV2Event];
    
    expect(events).toHaveLength(2);
    expect(isAPIGatewayV1(events[0])).toBe(true);
    expect(isAPIGatewayV2(events[1])).toBe(true);
  });

  it('should properly type narrow after type guards', () => {
    const event: APIGatewayEvent = apiGatewayV1Event;
    
    if (isAPIGatewayV1(event)) {
      // TypeScript should know this is APIGatewayProxyEvent
      expect(event.httpMethod).toBe('GET');
      expect(event.path).toBe('/hello');
    }
    
    if (isAPIGatewayV2(event)) {
      // This should not execute for v1 events
      expect(event.version).toBe('2.0');
    }
  });
}); 