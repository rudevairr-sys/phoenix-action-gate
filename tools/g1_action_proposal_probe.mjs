#!/usr/bin/env node

const ENDPOINT = 'https://api.tokenfactory.nebius.com/v1/chat/completions';
const MODEL = process.env.NEBIUS_MODEL || 'nvidia/Nemotron-3_5-Lightning';
const TIMEOUT_MS = 30_000;
const startedAt = new Date().toISOString();
const apiKey = process.env.NEBIUS_API_KEY;

function emit(payload, stream = process.stdout) {
  stream.write(`${JSON.stringify(payload, null, 2)}\n`);
}

if (!apiKey) {
  emit({
    probe: 'g1-action-proposal',
    ok: false,
    state: 'BLOCKED',
    code: 'NEBIUS_API_KEY_MISSING',
    model: MODEL,
    endpoint: ENDPOINT,
    secret_exposed: false,
  }, process.stderr);
  process.exit(2);
}

const schema = {
  name: 'action_proposal',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      schema_version: { type: 'string', const: '0.1' },
      proposal_id: { type: 'string', minLength: 1 },
      intent: { type: 'string', minLength: 1 },
      action_type: { type: 'string', enum: ['READ_CONTEXT'] },
      target: {
        type: 'object',
        properties: {
          workspace_id: { type: 'string', const: 'demo-workspace' },
          relative_path: { type: 'string', const: 'README.md' }
        },
        required: ['workspace_id', 'relative_path'],
        additionalProperties: false
      },
      operation: {
        type: 'object',
        properties: {
          kind: { type: 'string', const: 'read_file' }
        },
        required: ['kind'],
        additionalProperties: false
      },
      requested_capabilities: {
        type: 'array',
        items: { type: 'string', enum: ['READ_CONTEXT'] },
        minItems: 1
      },
      preconditions: {
        type: 'array',
        items: { type: 'string' }
      },
      reversibility: {
        type: 'object',
        properties: {
          kind: { type: 'string', const: 'INHERENT' },
          rollback_plan: { type: 'null' }
        },
        required: ['kind', 'rollback_plan'],
        additionalProperties: false
      },
      estimated_effects: {
        type: 'array',
        items: { type: 'string' }
      },
      model_context: {
        type: 'object',
        properties: {
          model_id: { type: 'string', const: MODEL },
          provider_request_id: { type: 'null' }
        },
        required: ['model_id', 'provider_request_id'],
        additionalProperties: false
      }
    },
    required: [
      'schema_version',
      'proposal_id',
      'intent',
      'action_type',
      'target',
      'operation',
      'requested_capabilities',
      'preconditions',
      'reversibility',
      'estimated_effects',
      'model_context'
    ],
    additionalProperties: false
  }
};

const requestBody = {
  model: MODEL,
  messages: [
    {
      role: 'system',
      content: 'You are the proposal component of Phoenix Action Gate. You may propose an action but you never authorize or execute it. Return only the ActionProposal required by the supplied JSON schema.'
    },
    {
      role: 'user',
      content: 'Prepare a non-mutating READ_CONTEXT proposal to inspect README.md inside the logical workspace demo-workspace. Do not execute anything.'
    }
  ],
  response_format: {
    type: 'json_schema',
    json_schema: schema
  },
  temperature: 0,
  max_tokens: 1200
};

const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
const t0 = performance.now();

try {
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(requestBody),
    signal: controller.signal
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
      probe: 'g1-action-proposal',
      ok: false,
      state: 'BLOCKED',
      code: 'TOKEN_FACTORY_HTTP_ERROR',
      model: MODEL,
      endpoint: ENDPOINT,
      http_status: response.status,
      latency_ms: latencyMs,
      response_shape: body && typeof body === 'object' ? Object.keys(body).sort() : [],
      secret_exposed: false
    }, process.stderr);
    process.exit(1);
  }

  const message = body?.choices?.[0]?.message;
  const refusal = message?.refusal ?? null;
  const content = message?.content;

  if (refusal) {
    emit({
      probe: 'g1-action-proposal',
      ok: false,
      state: 'BLOCKED',
      code: 'MODEL_REFUSAL',
      model: MODEL,
      endpoint: ENDPOINT,
      http_status: response.status,
      latency_ms: latencyMs,
      provider_response_id: body?.id ?? null,
      secret_exposed: false
    }, process.stderr);
    process.exit(1);
  }

  let proposal = null;
  try {
    proposal = typeof content === 'string' ? JSON.parse(content) : null;
  } catch {
    proposal = null;
  }

  const invariantPass = Boolean(
    proposal &&
    proposal.schema_version === '0.1' &&
    proposal.action_type === 'READ_CONTEXT' &&
    proposal.target?.workspace_id === 'demo-workspace' &&
    proposal.target?.relative_path === 'README.md' &&
    proposal.operation?.kind === 'read_file' &&
    proposal.reversibility?.kind === 'INHERENT' &&
    proposal.reversibility?.rollback_plan === null &&
    proposal.model_context?.model_id === MODEL
  );

  if (!proposal || !invariantPass) {
    emit({
      probe: 'g1-action-proposal',
      ok: false,
      state: 'BLOCKED',
      code: !proposal ? 'MODEL_OUTPUT_INVALID_JSON' : 'ACTION_PROPOSAL_INVARIANT_FAILED',
      model: MODEL,
      endpoint: ENDPOINT,
      http_status: response.status,
      latency_ms: latencyMs,
      provider_response_id: body?.id ?? null,
      secret_exposed: false
    }, process.stderr);
    process.exit(1);
  }

  emit({
    probe: 'g1-action-proposal',
    ok: true,
    state: 'RUNTIME_OBSERVED',
    model: MODEL,
    endpoint: ENDPOINT,
    http_status: response.status,
    latency_ms: latencyMs,
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    provider_response_id: body?.id ?? null,
    usage: body?.usage ?? null,
    proposal,
    dispatch_attempted: false,
    secret_exposed: false
  });
} catch (error) {
  const latencyMs = Math.round(performance.now() - t0);
  emit({
    probe: 'g1-action-proposal',
    ok: false,
    state: 'BLOCKED',
    code: error?.name === 'AbortError' ? 'TOKEN_FACTORY_TIMEOUT' : 'TOKEN_FACTORY_REQUEST_FAILED',
    model: MODEL,
    endpoint: ENDPOINT,
    latency_ms: latencyMs,
    error_name: error?.name ?? 'UnknownError',
    secret_exposed: false
  }, process.stderr);
  process.exit(1);
} finally {
  clearTimeout(timeout);
}
