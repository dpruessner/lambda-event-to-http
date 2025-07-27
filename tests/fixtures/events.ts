/**
 * Test fixtures for API Gateway events
 */

import { APIGatewayProxyEvent, APIGatewayProxyEventV2 } from 'aws-lambda';

export const apiGatewayV1Event: APIGatewayProxyEvent = {
  resource: '/hello',
  path: '/hello',
  httpMethod: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0',
    'Host': 'api.example.com',
    'X-Forwarded-For': '192.168.1.1',
    'X-Forwarded-Proto': 'https'
  },
  multiValueHeaders: {
    'Content-Type': ['application/json'],
    'User-Agent': ['Mozilla/5.0']
  },
  queryStringParameters: {
    name: 'test',
    id: '123'
  },
  multiValueQueryStringParameters: {
    name: ['test'],
    id: ['123']
  },
  pathParameters: {
    userId: '456'
  },
  stageVariables: {
    stage: 'prod'
  },
  requestContext: {
    accountId: '123456789012',
    apiId: 'abc123',
    authorizer: {},
    protocol: 'HTTP/1.1',
    httpMethod: 'GET',
    identity: {
      accessKey: null,
      accountId: null,
      apiKey: null,
      apiKeyId: null,
      caller: null,
      clientCert: null,
      cognitoAuthenticationProvider: null,
      cognitoAuthenticationType: null,
      cognitoIdentityId: null,
      cognitoIdentityPoolId: null,
      principalOrgId: null,
      sourceIp: '192.168.1.1',
      user: null,
      userAgent: 'Mozilla/5.0',
      userArn: null
    },
    path: '/hello',
    stage: 'prod',
    requestId: 'test-request-id',
    requestTime: '12/Mar/2024:19:03:58 +0000',
    requestTimeEpoch: 1583348638390,
    resourceId: 'abc123',
    resourcePath: '/hello'
  },
  body: null,
  isBase64Encoded: false
};

export const apiGatewayV1EventWithBody: APIGatewayProxyEvent = {
  ...apiGatewayV1Event,
  httpMethod: 'POST',
  body: JSON.stringify({ message: 'Hello World', count: 42 }),
  headers: {
    ...apiGatewayV1Event.headers,
    'Content-Length': '45'
  }
};

export const apiGatewayV2Event: APIGatewayProxyEventV2 = {
  version: '2.0',
  routeKey: 'GET /hello',
  rawPath: '/hello',
  rawQueryString: 'name=test&id=123',
  cookies: ['sessionId=abc123'],
  headers: {
    'content-type': 'application/json',
    'user-agent': 'Mozilla/5.0',
    'host': 'api.example.com',
    'x-forwarded-for': '192.168.1.1',
    'x-forwarded-proto': 'https'
  },
  queryStringParameters: {
    name: 'test',
    id: '123'
  },
  pathParameters: {
    userId: '456'
  },
  stageVariables: {
    stage: 'prod'
  },
  requestContext: {
    accountId: '123456789012',
    apiId: 'abc123',
    domainName: 'api.example.com',
    domainPrefix: 'api',
    http: {
      method: 'GET',
      path: '/hello',
      protocol: 'HTTP/1.1',
      sourceIp: '192.168.1.1',
      userAgent: 'Mozilla/5.0'
    },
    requestId: 'test-request-id',
    routeKey: 'GET /hello',
    stage: 'prod',
    time: '12/Mar/2024:19:03:58 +0000',
    timeEpoch: 1583348638390
  },
  body: undefined,
  isBase64Encoded: false
};

export const apiGatewayV2EventWithBody: APIGatewayProxyEventV2 = {
  ...apiGatewayV2Event,
  routeKey: 'POST /hello',
  requestContext: {
    ...apiGatewayV2Event.requestContext,
    http: {
      ...apiGatewayV2Event.requestContext.http,
      method: 'POST'
    },
    routeKey: 'POST /hello'
  },
  body: "{\"message\":\"Hello World\",\"count\":42}",
  headers: {
    ...apiGatewayV2Event.headers,
    'content-length': "36",
  }
}; 