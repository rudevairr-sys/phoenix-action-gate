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

function conversationalSchema(model) {
  return {
    name: 'phoenix_conversation_turn',
    strict: true,
    schema: {
      type: 'object',
      properties: {
        assistant_message: {
          type: 'string',
          minLength: 1,
          description: 'A concise Spanish explanation of the single action being proposed. Never claim it was executed.'
        },
        proposal: {
          type: 'object',
          properties: {
            schema_version: { type: 'string', const: '0.1' },
            proposal_id: { type: 'string', minLength: 1 },
            intent: { type: 'string', minLength: 1 },
            action_type: { type: 'string', enum: ['READ_CONTEXT', 'WRITE_PATCH', 'RUN_COMMAND'] },
            target: {
              type: 'object',
              properties: {
                workspace_id: { type: 'string', const: 'demo-workspace' },
                relative_path: { type: ['string', 'null'] }
              },
              required: ['workspace_id', 'relative_path'],
              additionalProperties: false
            },
            operation: {
              type: 'object',
              properties: {
                kind: { type: 'string', enum: ['read_file', 'write_patch', 'run_command'] },
                diff: { type: ['string', 'null'] },
                base_version: { type: ['string', 'null'] },
                program: { type: ['string', 'null'] },
                args: { type: 'array', items: { type: 'string' } },
                cwd: { type: ['string', 'null'] },
                timeout_ms: { type: ['integer', 'null'] }
              },
              required: ['kind', 'diff', 'base_version', 'program', 'args', 'cwd', 'timeout_ms'],
              additionalProperties: false
            },
            requested_capabilities: {
              type: 'array',
              items: { type: 'string', enum: ['READ_CONTEXT', 'WRITE_PATCH', 'RUN_COMMAND'] },
              minItems: 1
            },
            preconditions: { type: 'array', items: { type: 'string' } },
            reversibility: {
              type: 'object',
              properties: {
                kind: { type: 'string', enum: ['NONE', 'INHERENT', 'ROLLBACK_PLAN'] },
                rollback_plan: {
                  anyOf: [
                    { type: 'null' },
                    {
                      type: 'object',
                      properties: { kind: { type: 'string', minLength: 1 } },
                      required: ['kind'],
                      additionalProperties: false
                    }
                  ]
                }
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
      },
      required: ['assistant_message', 'proposal'],
      additionalProperties: false
    }
  };
}

async function structuredRequest({ apiKey, model, endpoint, timeoutMs, fetchImpl, messages, jsonSchema, maxTokens }) {
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
        messages,
        response_format: { type: 'json_schema', json_schema: jsonSchema },
        temperature: 0,
        max_tokens: maxTokens
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

    let parsed = null;
    try {
      parsed = typeof message?.content === 'string' ? JSON.parse(message.content) : null;
    } catch {
      parsed = null;
    }

    if (!parsed) {
      throw new NebiusProposalError('MODEL_OUTPUT_INVALID_JSON', 'Model output was not valid JSON', {
        http_status: response.status,
        latency_ms: latencyMs,
        provider_response_id: body?.id ?? null
      });
    }

    return {
      parsed,
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

export async function requestReadContextProposal({
  apiKey = process.env.NEBIUS_API_KEY,
  model = process.env.NEBIUS_MODEL || DEFAULT_MODEL,
  endpoint = DEFAULT_ENDPOINT,
  timeoutMs = 30_000,
  fetchImpl = fetch
} = {}) {
  const { parsed: proposal, provider } = await structuredRequest({
    apiKey,
    model,
    endpoint,
    timeoutMs,
    fetchImpl,
    maxTokens: 1200,
    jsonSchema: proposalSchema(model),
    messages: [
      {
        role: 'system',
        content: 'You are the proposal component of Phoenix Action Gate. You propose actions but never authorize or execute them. Return only the ActionProposal required by the JSON schema.'
      },
      {
        role: 'user',
        content: 'Prepare a non-mutating READ_CONTEXT proposal to inspect README.md inside the logical workspace demo-workspace. Do not execute anything.'
      }
    ]
  });

  proposal.model_context = {
    ...(proposal.model_context ?? {}),
    model_id: model,
    provider_request_id: provider.provider_response_id
  };

  return { proposal, provider };
}

export async function requestConversationalProposal(userMessage, {
  apiKey = process.env.NEBIUS_API_KEY,
  model = process.env.NEBIUS_MODEL || DEFAULT_MODEL,
  endpoint = DEFAULT_ENDPOINT,
  timeoutMs = 30_000,
  fetchImpl = fetch
} = {}) {
  if (typeof userMessage !== 'string' || userMessage.trim().length === 0) {
    throw new NebiusProposalError('USER_MESSAGE_INVALID', 'A non-empty user message is required');
  }

  const cleanMessage = userMessage.trim().slice(0, 2000);
  const { parsed, provider } = await structuredRequest({
    apiKey,
    model,
    endpoint,
    timeoutMs,
    fetchImpl,
    maxTokens: 1800,
    jsonSchema: conversationalSchema(model),
    messages: [
      {
        role: 'system',
        content: [
          'You are Nemotron acting only as the proposal component of Phoenix Action Gate.',
          'Speak to the user briefly in Spanish through assistant_message, then propose exactly one next action in the structured proposal.',
          'You never authorize, execute, dispatch, or claim to have inspected files.',
          'The only logical workspace is demo-workspace.',
          'If the request needs many steps, propose only the safest useful next action.',
          'The proposal.intent field must describe the user goal in natural language, never merely repeat an operation name such as read_file or write_patch.',
          'For READ_CONTEXT use operation.kind=read_file, reversibility.kind=INHERENT and rollback_plan=null; use null for operation fields that do not apply.',
          'For WRITE_PATCH use operation.kind=write_patch, include a concise illustrative diff and base_version, and use reversibility.kind=ROLLBACK_PLAN with rollback_plan.kind=reverse_diff.',
          'For RUN_COMMAND use operation.kind=run_command, reversibility.kind=INHERENT and rollback_plan=null. Only propose bounded developer commands; Phoenix will independently allow or deny them.',
          'Never change your proposal because you expect Phoenix to approve it. Phoenix is a separate authority.'
        ].join(' ')
      },
      { role: 'user', content: cleanMessage }
    ]
  });

  parsed.proposal.model_context = {
    ...(parsed.proposal.model_context ?? {}),
    model_id: model,
    provider_request_id: provider.provider_response_id
  };

  return {
    assistant_message: parsed.assistant_message,
    proposal: parsed.proposal,
    provider
  };
}
