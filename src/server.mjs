import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { evaluateActionProposal, POLICY_VERSION } from './gate.mjs';
import { DEFAULT_MODEL } from './nebius.mjs';
import { runConversationPipeline, runReadContextPipeline } from './pipeline.mjs';

const WEB_ROOT = fileURLToPath(new URL('../web/', import.meta.url));
const FIXTURE_ROOT = fileURLToPath(new URL('../fixtures/', import.meta.url));
const MAX_JSON_BODY_BYTES = 8 * 1024;

const MIME_TYPES = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml; charset=utf-8']
]);

const FIXTURE_SCENARIOS = new Map([
  ['prepared', 'prepared-read.json'],
  ['review', 'review-patch.json'],
  ['deny', 'deny-secret.json']
]);

function sendJson(response, statusCode, payload) {
  const body = JSON.stringify(payload, null, 2);
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  response.end(body);
}

function sendText(response, statusCode, body, contentType = 'text/plain; charset=utf-8') {
  response.writeHead(statusCode, {
    'Content-Type': contentType,
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  response.end(body);
}

async function readJsonBody(request) {
  const chunks = [];
  let bytes = 0;

  for await (const chunk of request) {
    bytes += chunk.length;
    if (bytes > MAX_JSON_BODY_BYTES) {
      const error = new Error('REQUEST_BODY_TOO_LARGE');
      error.code = 'REQUEST_BODY_TOO_LARGE';
      throw error;
    }
    chunks.push(chunk);
  }

  if (chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    const error = new Error('INVALID_JSON');
    error.code = 'INVALID_JSON';
    throw error;
  }
}

async function readFixture(name) {
  const filename = FIXTURE_SCENARIOS.get(name);
  if (!filename) return null;
  return JSON.parse(await readFile(join(FIXTURE_ROOT, filename), 'utf8'));
}

async function serveStatic(pathname, response) {
  const requested = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  if (!['index.html', 'app.js', 'styles.css'].includes(requested)) {
    sendText(response, 404, 'Not found');
    return;
  }

  const filepath = join(WEB_ROOT, requested);
  const body = await readFile(filepath);
  response.writeHead(200, {
    'Content-Type': MIME_TYPES.get(extname(filepath)) ?? 'application/octet-stream',
    'Content-Length': body.length,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'self'; style-src 'self'; script-src 'self'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; form-action 'self'"
  });
  response.end(body);
}

export function createPanelServer({ runConversation = runConversationPipeline } = {}) {
  return createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? '/', 'http://127.0.0.1');

      if (request.method === 'GET' && url.pathname === '/api/health') {
        sendJson(response, 200, {
          ok: true,
          product: 'Phoenix Action Gate',
          policy_version: POLICY_VERSION,
          default_model: DEFAULT_MODEL,
          dispatch_available: false
        });
        return;
      }

      if (request.method === 'POST' && url.pathname === '/api/chat') {
        const body = await readJsonBody(request);
        const message = typeof body.message === 'string' ? body.message.trim() : '';
        if (!message || message.length > 2000) {
          sendJson(response, 400, {
            ok: false,
            state: 'FAIL_CLOSED',
            error: 'USER_MESSAGE_INVALID',
            dispatch_attempted: false
          });
          return;
        }

        const result = await runConversation(message);
        sendJson(response, 200, {
          source: 'LIVE_NEBIUS_NEMOTRON',
          ...result
        });
        return;
      }

      if (request.method === 'POST' && url.pathname === '/api/live/read-context') {
        const result = await runReadContextPipeline();
        sendJson(response, 200, {
          source: 'LIVE_NEBIUS_NEMOTRON',
          ...result
        });
        return;
      }

      if (request.method === 'POST' && url.pathname.startsWith('/api/fixture/')) {
        const scenario = url.pathname.slice('/api/fixture/'.length);
        const proposal = await readFixture(scenario);
        if (!proposal) {
          sendJson(response, 404, { ok: false, error: 'UNKNOWN_SCENARIO' });
          return;
        }
        const decision = evaluateActionProposal(proposal);
        sendJson(response, 200, {
          source: 'LOCAL_FIXTURE',
          ok: decision.outcome !== 'DENY',
          state: 'FIXTURE_EVALUATED',
          provider: null,
          proposal,
          decision,
          dispatch_attempted: false,
          secret_exposed: false
        });
        return;
      }

      if (request.method === 'GET') {
        await serveStatic(url.pathname, response);
        return;
      }

      sendJson(response, 405, { ok: false, error: 'METHOD_NOT_ALLOWED' });
    } catch (error) {
      const statusCode = error?.code === 'INVALID_JSON' || error?.code === 'REQUEST_BODY_TOO_LARGE' ? 400 : 500;
      sendJson(response, statusCode, {
        ok: false,
        state: 'FAIL_CLOSED',
        error: error?.code ?? 'PANEL_INTERNAL_ERROR',
        error_name: error?.name ?? 'UnknownError',
        dispatch_attempted: false
      });
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number.parseInt(process.env.PHOENIX_PORT ?? '4173', 10);
  const host = '127.0.0.1';
  const server = createPanelServer();
  server.listen(port, host, () => {
    process.stdout.write(`Phoenix Action Gate panel: http://${host}:${port}\n`);
    process.stdout.write('Dispatch capability: disabled\n');
  });
}
