/**
 * Local development server — simulates API Gateway + Lambda for local testing.
 * Translates plain HTTP requests into APIGatewayProxyEvent objects and calls the
 * Lambda handler directly, so local dev never touches AWS API Gateway.
 */
import * as http from 'http';
import * as dotenv from 'dotenv';
import * as path from 'path';
import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';

dotenv.config({ path: path.join(__dirname, '.env.local') });

// Import handler after env is loaded so env vars are available during init
import { handler } from './index';

const PORT = parseInt(process.env.PORT ?? '14099', 10);

function parseQuery(rawUrl: string): Record<string, string> | null {
  const idx = rawUrl.indexOf('?');
  if (idx === -1) return null;
  const result: Record<string, string> = {};
  new URLSearchParams(rawUrl.slice(idx + 1)).forEach((v, k) => {
    result[k] = v;
  });
  return Object.keys(result).length ? result : null;
}

function flattenHeaders(raw: http.IncomingHttpHeaders): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    out[k] = Array.isArray(v) ? v.join(', ') : (v ?? '');
  }
  return out;
}

async function readBody(req: http.IncomingMessage): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c) => chunks.push(Buffer.from(c)));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8') || null));
    req.on('error', reject);
  });
}

const mockContext: Context = {
  callbackWaitsForEmptyEventLoop: false,
  functionName: 'local-dev',
  functionVersion: '0',
  invokedFunctionArn: 'arn:aws:lambda:local:000000000000:function:local-dev',
  memoryLimitInMB: '512',
  awsRequestId: '',
  logGroupName: '/local/dev',
  logStreamName: 'local',
  getRemainingTimeInMillis: () => 30000,
  done: () => {},
  fail: () => {},
  succeed: () => {},
};

const server = http.createServer(async (req, res) => {
  const start = Date.now();
  const rawUrl = req.url ?? '/';
  const urlPath = rawUrl.split('?')[0];
  const headers = flattenHeaders(req.headers);
  const body = await readBody(req);

  // Path is prefixed with /v1 to mirror the deployed API Gateway routes.
  const path = urlPath.startsWith('/v1') ? urlPath : `/v1${urlPath}`;

  const event = {
    httpMethod: (req.method ?? 'GET').toUpperCase(),
    path,
    headers,
    multiValueHeaders: {},
    queryStringParameters: parseQuery(rawUrl),
    multiValueQueryStringParameters: null,
    pathParameters: null,
    stageVariables: null,
    resource: path,
    body,
    isBase64Encoded: false,
    requestContext: {
      requestId: `dev-${Date.now()}`,
      stage: 'local',
      resourcePath: path,
      httpMethod: req.method ?? 'GET',
      identity: {
        sourceIp: req.socket.remoteAddress ?? '127.0.0.1',
        userAgent: headers['user-agent'] ?? '',
      },
    },
  } as unknown as APIGatewayProxyEvent;

  let result: APIGatewayProxyResult;
  try {
    result = await handler(event, { ...mockContext, awsRequestId: `dev-${Date.now()}` });
  } catch (err) {
    console.error('[dev-server] Unhandled handler error:', err);
    result = {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'FAILURE', errors: ['internal server error'] }),
    };
  }

  res.writeHead(result.statusCode, result.headers as http.OutgoingHttpHeaders);
  res.end(result.body ?? '');

  const method = req.method?.padEnd(6);
  console.log(`${method} ${path.padEnd(40)} ${result.statusCode}  ${Date.now() - start}ms`);
});

server.listen(PORT, () => {
  console.log(`\nLyricsRay API (local dev)\n`);
  console.log(`   http://localhost:${PORT}`);
  console.log(`   ENV=${process.env.ENV}`);
  console.log(`   AWS_REGION=${process.env.AWS_REGION}\n`);
});
