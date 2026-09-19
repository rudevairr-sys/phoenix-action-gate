#!/usr/bin/env node

const ENDPOINT = 'https://api.tokenfactory.nebius.com/v1/models';
const TIMEOUT_MS = 15_000;
const startedAt = new Date().toISOString();
const apiKey = process.env.NEBIUS_API_KEY;

function emit(payload, stream = process.stdout) {
  stream.write(`${JSON.stringify(payload, null, 2)}\n`);
}

if (!apiKey) {
  emit({
    probe: 'g1-list-models',
    ok: false,
    state: 'BLOCKED',
    code: 'NEBIUS_API_KEY_MISSING',
    endpoint: ENDPOINT,
    started_at: startedAt,
    secret_exposed: false,
  }, process.stderr);
  process.exit(2);
}

const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
const t0 = performance.now();

try {
  const response = await fetch(ENDPOINT, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    signal: controller.signal,
  });

  const latencyMs = Math.round(performance.now() - t0);
  const raw = await response.text();
  let body = null;
  try {
    body = raw ? JSON.parse(raw) : null;
  } catch {
    body = null;
  }

  if (!response.ok) {
    emit({
      probe: 'g1-list-models',
      ok: false,
      state: 'BLOCKED',
      code: 'TOKEN_FACTORY_HTTP_ERROR',
      endpoint: ENDPOINT,
      http_status: response.status,
      latency_ms: latencyMs,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      response_shape: body && typeof body === 'object' ? Object.keys(body).sort() : [],
      secret_exposed: false,
    }, process.stderr);
    process.exit(1);
  }

  const ids = Array.isArray(body?.data)
    ? body.data.map((model) => model?.id).filter((id) => typeof id === 'string' && id.length > 0)
    : [];

  const nvidiaModels = ids.filter((id) => /(^|\/)nvidia\b|nemotron/i.test(id));

  emit({
    probe: 'g1-list-models',
    ok: true,
    state: 'RUNTIME_OBSERVED',
    endpoint: ENDPOINT,
    http_status: response.status,
    latency_ms: latencyMs,
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    model_count: ids.length,
    nvidia_model_count: nvidiaModels.length,
    nvidia_models: nvidiaModels.sort(),
    secret_exposed: false,
  });
} catch (error) {
  const latencyMs = Math.round(performance.now() - t0);
  emit({
    probe: 'g1-list-models',
    ok: false,
    state: 'BLOCKED',
    code: error?.name === 'AbortError' ? 'TOKEN_FACTORY_TIMEOUT' : 'TOKEN_FACTORY_REQUEST_FAILED',
    endpoint: ENDPOINT,
    latency_ms: latencyMs,
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    error_name: error?.name ?? 'UnknownError',
    secret_exposed: false,
  }, process.stderr);
  process.exit(1);
} finally {
  clearTimeout(timeout);
}
