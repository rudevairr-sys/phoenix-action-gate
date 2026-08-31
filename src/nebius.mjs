const DEFAULT_ENDPOINT = 'https://api.tokenfactory.nebius.com/v1/chat/completions';
export const DEFAULT_MODEL = 'nvidia/Nemotron-3_5-Lightning';

export class NebiusProposalError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'NebiusProposalError';
    this.code = code;
    this.details = details;
  }
}

function proposalSchema(model) {
  return {
    name: 'action_proposal',
    strict: true,
    schema: {
      type: 'object',
      properties: {
        schema_version: { type: 'string', const: '0.1' },
        proposal_id: { type: 'string', minLength: 1 },
        intent: { type: 'string', minLength: 1 },
        action_type: { type: 'string', const: 'READ_CONTEXT' },
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
          properties: { kind: { type: 'string', const: 'read_file' } },
          required: ['kind'],
          additionalProperties: false
        },
        requested_capabilities: {
          type: 'array',
          items: { type: 'string', const: 'READ_CONTEXT' },
          minItems: 1
        },
        preconditions: { type: 'array', items: { type: 'string' } },
        reversibility: {
          type: 'object',
          properties: {
            kind: { type: 'string', const: 'INHERENT' },
            rollback_plan: { type: 'null' }
          },
          required: ['kind', 'rollback_plan'],
          additionalProperties: false
        },
        estimated_effects: { type: 'array', items: { type: 'string' } },
        model_context: {
          type: 'object',
          properties: {
            model_id: { type: 'string', const: model },
            provider_request_id: { type: ['string', 'null'] }
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
}

export async function requestReadContextProposal({
  apiKey = process.env.NEBIUS_API_KEY,
  model = process.env.NEBIUS_MODEL || DEFAULT_MODEL,
  endpoint = DEFAULT_ENDPOINT,
  timeoutMs = 30_000,
  fetchImpl = fetch
} = {}) {
  if (!apiKey) {
    throw new NebiusProposalError('NEBIUS_API_KEY_MISSING', 'NEBIUS_API_KEY is required');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = new Date().toISOString();
  const t0 = performance.now();

  try {
    const response = await fetchImpl(endpoint, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: 'You are the proposal component of Phoenix Action Gate. You propose actions but never authorize or execute them. Return only the ActionProposal required by the JSON schema.'
          },
          {
            role: 'user',
            content: 'Prepare a non-mutating READ_CONTEXT proposal to inspect README.md inside the logical workspace demo-workspace. Do not execute anything.'
          }
        ],
        response_format: {
          type: 'json_schema',
          json_schema: proposalSchema(model)
        },
        temperature: 0,
        max_tokens: 1200
      }),
      signal: controller.signal
    });

    const latencyMs = Math.round(performance.now() - t0);
    const raw = await response.text();
    let body = null;
    try {
      body = raw ? JSON.parse(raw) : null;
    } catch {
      throw new NebiusProposalError('TOKEN_FACTORY_INVALID_RESPONSE', 'Token Factory returned non-JSON', {
        http_status: response.status,
        latency_ms: latencyMs
      });
    }

    if (!response.ok) {
      throw new NebiusProposalError('TOKEN_FACTORY_HTTP_ERROR', 'Token Factory request failed', {
        http_status: response.status,
        latency_ms: latencyMs,
        response_shape: body && typeof body === 'object' ? Object.keys(body).sort() : []
      });
    }

    const message = body?.choices?.[0]?.message;
    if (message?.refusal) {
      throw new NebiusProposalError('MODEL_REFUSAL', 'Model refused proposal generation', {
        http_status: response.status,
        latency_ms: latencyMs,
        provider_response_id: body?.id ?? null
      });
    }

    let proposal = null;
    try {
      proposal = typeof message?.content === 'string' ? JSON.parse(message.content) : null;
    } catch {
      proposal = null;
    }

    if (!proposal) {
      throw new NebiusProposalError('MODEL_OUTPUT_INVALID_JSON', 'Model output was not valid JSON', {
        http_status: response.status,
        latency_ms: latencyMs,
        provider_response_id: body?.id ?? null
      });
    }

    proposal.model_context = {
      ...(proposal.model_context ?? {}),
      model_id: model,
      provider_request_id: body?.id ?? null
    };

    return {
      proposal,
      provider: {
        model,
        endpoint,
        http_status: response.status,
        latency_ms: latencyMs,
        started_at: startedAt,
        finished_at: new Date().toISOString(),
        provider_response_id: body?.id ?? null,
        usage: body?.usage ?? null
      }
    };
  } catch (error) {
    if (error instanceof NebiusProposalError) throw error;
    if (error?.name === 'AbortError') {
      throw new NebiusProposalError('TOKEN_FACTORY_TIMEOUT', 'Token Factory request timed out', {
        latency_ms: Math.round(performance.now() - t0)
      });
    }
    throw new NebiusProposalError('TOKEN_FACTORY_REQUEST_FAILED', 'Token Factory request failed before a valid response', {
      error_name: error?.name ?? 'UnknownError',
      latency_ms: Math.round(performance.now() - t0)
    });
  } finally {
    clearTimeout(timeout);
  }
}
