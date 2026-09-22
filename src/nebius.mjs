const DEFAULT_ENDPOINT = 'https://api.tokenfactory.nebius.com/v1/chat/completions';
export const DEFAULT_MODEL = 'nvidia/Nemotron-3_5-Lightning';

export const DEMO_WORKSPACE_CONTEXT = Object.freeze({
  workspace_id: 'demo-workspace',
  project_root: '.',
  canonical_readme: 'README.md',
  package_json: 'package.json',
  default_test_command: Object.freeze({
    program: 'npm',
    args: Object.freeze(['test']),
    cwd: '.',
    timeout_ms: 60000
  })
});

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

function conversationTools() {
  return [
    {
      type: 'function',
      function: {
        name: 'respond_chat',
        description: 'Use only when the user is conversing, asking a question, requesting a calculation, or when required information for a workspace action is genuinely missing after applying known workspace context and recent history.',
        parameters: {
          type: 'object',
          properties: {
            assistant_message: { type: 'string', minLength: 1 }
          },
          required: ['assistant_message'],
          additionalProperties: false
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'propose_read_context',
        description: 'Propose a non-mutating file read inside demo-workspace. This only proposes; Phoenix decides whether it may advance.',
        parameters: {
          type: 'object',
          properties: {
            proposal_id: { type: 'string', minLength: 1 },
            intent: { type: 'string', minLength: 1 },
            relative_path: { type: 'string', minLength: 1 },
            preconditions: { type: 'array', items: { type: 'string' } },
            estimated_effects: { type: 'array', items: { type: 'string' } }
          },
          required: ['proposal_id', 'intent', 'relative_path', 'preconditions', 'estimated_effects'],
          additionalProperties: false
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'propose_write_patch',
        description: 'Propose a reversible patch to one file inside demo-workspace. This only proposes; Phoenix decides whether it may advance.',
        parameters: {
          type: 'object',
          properties: {
            proposal_id: { type: 'string', minLength: 1 },
            intent: { type: 'string', minLength: 1 },
            relative_path: { type: 'string', minLength: 1 },
            diff: { type: 'string', minLength: 1 },
            base_version: { type: 'string', minLength: 1 },
            preconditions: { type: 'array', items: { type: 'string' } },
            estimated_effects: { type: 'array', items: { type: 'string' } }
          },
          required: ['proposal_id', 'intent', 'relative_path', 'diff', 'base_version', 'preconditions', 'estimated_effects'],
          additionalProperties: false
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'propose_run_command',
        description: 'Propose one bounded developer command inside demo-workspace. This only proposes; Phoenix decides whether it may advance.',
        parameters: {
          type: 'object',
          properties: {
            proposal_id: { type: 'string', minLength: 1 },
            intent: { type: 'string', minLength: 1 },
            program: { type: 'string', minLength: 1 },
            args: { type: 'array', items: { type: 'string' } },
            cwd: { type: 'string', minLength: 1 },
            timeout_ms: { type: 'integer', minimum: 1, maximum: 120000 },
            preconditions: { type: 'array', items: { type: 'string' } },
            estimated_effects: { type: 'array', items: { type: 'string' } }
          },
          required: ['proposal_id', 'intent', 'program', 'args', 'cwd', 'timeout_ms', 'preconditions', 'estimated_effects'],
          additionalProperties: false
        }
      }
    }
  ];
}

function normalizeHistory(history) {
  if (!Array.isArray(history)) return [];
  const normalized = [];
  let totalChars = 0;

  for (const item of history.slice(-8)) {
    if (!item || !['user', 'assistant'].includes(item.role) || typeof item.content !== 'string') continue;
    const content = item.content.trim().slice(0, 1500);
    if (!content) continue;
    if (totalChars + content.length > 6000) break;
    normalized.push({ role: item.role, content });
    totalChars += content.length;
  }

  return normalized;
}

function demoWorkspaceContextMessage() {
  return [
    'Known demo workspace facts for this panel are authoritative and must be used before asking the user for clarification:',
    `workspace_id=${DEMO_WORKSPACE_CONTEXT.workspace_id}`,
    `project_root=${DEMO_WORKSPACE_CONTEXT.project_root}`,
    `canonical_readme=${DEMO_WORKSPACE_CONTEXT.canonical_readme}`,
    `package_json=${DEMO_WORKSPACE_CONTEXT.package_json}`,
    `default_test_command=${DEMO_WORKSPACE_CONTEXT.default_test_command.program} ${DEMO_WORKSPACE_CONTEXT.default_test_command.args.join(' ')}`,
    `default_test_cwd=${DEMO_WORKSPACE_CONTEXT.default_test_command.cwd}`,
    `default_test_timeout_ms=${DEMO_WORKSPACE_CONTEXT.default_test_command.timeout_ms}`
  ].join('; ');
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isStringArray(value) {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function providerEvidence(provider, extra = {}) {
  return {
    model: provider?.model ?? null,
    endpoint: provider?.endpoint ?? null,
    http_status: provider?.http_status ?? null,
    latency_ms: provider?.latency_ms ?? null,
    started_at: provider?.started_at ?? null,
    finished_at: provider?.finished_at ?? null,
    provider_response_id: provider?.provider_response_id ?? null,
    finish_reason: provider?.finish_reason ?? null,
    usage: provider?.usage ?? null,
    ...extra
  };
}

function parseToolArguments(toolCall, provider) {
  const raw = toolCall?.function?.arguments;
  if (typeof raw !== 'string') {
    throw new NebiusProposalError('MODEL_TOOL_ARGUMENTS_INVALID', 'Nemotron returned tool arguments in an invalid format', {
      provider: providerEvidence(provider),
      tool_call_id: toolCall?.id ?? null,
      tool_name: toolCall?.function?.name ?? null
    });
  }

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('NOT_OBJECT');
    return parsed;
  } catch {
    throw new NebiusProposalError('MODEL_TOOL_ARGUMENTS_INVALID_JSON', 'Nemotron returned invalid JSON tool arguments', {
      provider: providerEvidence(provider),
      tool_call_id: toolCall?.id ?? null,
      tool_name: toolCall?.function?.name ?? null,
      argument_chars: raw.length
    });
  }
}

function commonArgsValid(args) {
  return isNonEmptyString(args?.proposal_id) &&
    isNonEmptyString(args?.intent) &&
    isStringArray(args?.preconditions) &&
    isStringArray(args?.estimated_effects);
}

function toolCallToProposal(toolCall, provider, model) {
  const name = toolCall?.function?.name;
  const args = parseToolArguments(toolCall, provider);

  if (!commonArgsValid(args)) {
    throw new NebiusProposalError('MODEL_TOOL_ARGUMENTS_CONTRACT_INVALID', 'Nemotron tool arguments did not satisfy the proposal contract', {
      provider: providerEvidence(provider),
      tool_call_id: toolCall?.id ?? null,
      tool_name: name ?? null
    });
  }

  const modelContext = {
    model_id: model,
    provider_request_id: provider.provider_response_id
  };

  if (name === 'propose_read_context') {
    if (!isNonEmptyString(args.relative_path)) {
      throw new NebiusProposalError('MODEL_TOOL_ARGUMENTS_CONTRACT_INVALID', 'Read proposal is missing a valid relative_path', {
        provider: providerEvidence(provider),
        tool_call_id: toolCall?.id ?? null,
        tool_name: name
      });
    }
    return {
      schema_version: '0.1',
      proposal_id: args.proposal_id,
      intent: args.intent,
      action_type: 'READ_CONTEXT',
      target: { workspace_id: DEMO_WORKSPACE_CONTEXT.workspace_id, relative_path: args.relative_path },
      operation: { kind: 'read_file' },
      requested_capabilities: ['READ_CONTEXT'],
      preconditions: args.preconditions,
      reversibility: { kind: 'INHERENT', rollback_plan: null },
      estimated_effects: args.estimated_effects,
      model_context: modelContext
    };
  }

  if (name === 'propose_write_patch') {
    if (!isNonEmptyString(args.relative_path) || !isNonEmptyString(args.diff) || !isNonEmptyString(args.base_version)) {
      throw new NebiusProposalError('MODEL_TOOL_ARGUMENTS_CONTRACT_INVALID', 'Patch proposal is missing path, diff, or base_version', {
        provider: providerEvidence(provider),
        tool_call_id: toolCall?.id ?? null,
        tool_name: name
      });
    }
    return {
      schema_version: '0.1',
      proposal_id: args.proposal_id,
      intent: args.intent,
      action_type: 'WRITE_PATCH',
      target: { workspace_id: DEMO_WORKSPACE_CONTEXT.workspace_id, relative_path: args.relative_path },
      operation: { kind: 'write_patch', diff: args.diff, base_version: args.base_version },
      requested_capabilities: ['WRITE_PATCH'],
      preconditions: args.preconditions,
      reversibility: { kind: 'ROLLBACK_PLAN', rollback_plan: { kind: 'reverse_diff' } },
      estimated_effects: args.estimated_effects,
      model_context: modelContext
    };
  }

  if (name === 'propose_run_command') {
    if (!isNonEmptyString(args.program) || !isStringArray(args.args) || !isNonEmptyString(args.cwd) ||
        !Number.isInteger(args.timeout_ms) || args.timeout_ms < 1 || args.timeout_ms > 120000) {
      throw new NebiusProposalError('MODEL_TOOL_ARGUMENTS_CONTRACT_INVALID', 'Command proposal is missing valid command bounds', {
        provider: providerEvidence(provider),
        tool_call_id: toolCall?.id ?? null,
        tool_name: name
      });
    }
    return {
      schema_version: '0.1',
      proposal_id: args.proposal_id,
      intent: args.intent,
      action_type: 'RUN_COMMAND',
      target: { workspace_id: DEMO_WORKSPACE_CONTEXT.workspace_id, relative_path: null },
      operation: {
        kind: 'run_command',
        program: args.program,
        args: args.args,
        cwd: args.cwd,
        timeout_ms: args.timeout_ms
      },
      requested_capabilities: ['RUN_COMMAND'],
      preconditions: args.preconditions,
      reversibility: { kind: 'INHERENT', rollback_plan: null },
      estimated_effects: args.estimated_effects,
      model_context: modelContext
    };
  }

  throw new NebiusProposalError('MODEL_TOOL_UNSUPPORTED', 'Nemotron selected an unsupported proposal tool', {
    provider: providerEvidence(provider),
    tool_call_id: toolCall?.id ?? null,
    tool_name: name ?? null
  });
}

function adapterSummary(proposal) {
  if (proposal.action_type === 'READ_CONTEXT') {
    return `Nemotron propone leer ${proposal.target.relative_path}. Phoenix evaluará la propuesta antes de cualquier acción.`;
  }
  if (proposal.action_type === 'WRITE_PATCH') {
    return `Nemotron propone preparar un cambio en ${proposal.target.relative_path}. Phoenix evaluará la propuesta antes de cualquier acción.`;
  }
  const command = `${proposal.operation.program} ${proposal.operation.args.join(' ')}`.trim();
  return `Nemotron propone ${command}. Phoenix evaluará la propuesta antes de cualquier acción.`;
}

function toolSignature(toolCall) {
  return `${toolCall?.function?.name ?? ''}\u0000${toolCall?.function?.arguments ?? ''}`;
}

function uniqueToolCalls(toolCalls) {
  const seen = new Set();
  const unique = [];
  const duplicates = [];
  for (const toolCall of toolCalls) {
    const signature = toolSignature(toolCall);
    if (seen.has(signature)) {
      duplicates.push(toolCall);
      continue;
    }
    seen.add(signature);
    unique.push(toolCall);
  }
  return { unique, duplicates };
}

function selectTurnToolCall(toolCalls, provider) {
  const supported = new Set(['respond_chat', 'propose_read_context', 'propose_write_patch', 'propose_run_command']);
  const unsupported = toolCalls.filter((toolCall) => !supported.has(toolCall?.function?.name));
  if (unsupported.length > 0) {
    throw new NebiusProposalError('MODEL_TOOL_UNSUPPORTED', 'Nemotron selected an unsupported turn function', {
      provider: providerEvidence(provider),
      tool_names: toolCalls.map((toolCall) => toolCall?.function?.name ?? null)
    });
  }

  const proposalRaw = toolCalls.filter((toolCall) => toolCall?.function?.name?.startsWith('propose_'));
  const chatRaw = toolCalls.filter((toolCall) => toolCall?.function?.name === 'respond_chat');
  const { unique: proposalCalls, duplicates: duplicateProposalCalls } = uniqueToolCalls(proposalRaw);
  const { unique: chatCalls, duplicates: duplicateChatCalls } = uniqueToolCalls(chatRaw);

  if (proposalCalls.length > 1) {
    throw new NebiusProposalError('MODEL_MULTIPLE_ACTIONS_UNSUPPORTED', 'Nemotron proposed more than one distinct action in a single turn', {
      provider: providerEvidence(provider),
      tool_call_count: toolCalls.length,
      proposal_tool_names: proposalCalls.map((toolCall) => toolCall.function.name),
      distinct_proposal_count: proposalCalls.length
    });
  }

  if (proposalCalls.length === 1) {
    return {
      kind: 'ACTION_PROPOSAL',
      toolCall: proposalCalls[0],
      ignored_turn_tools: chatCalls.map((toolCall) => toolCall.function.name),
      duplicate_tool_calls_ignored: duplicateProposalCalls.length + duplicateChatCalls.length
    };
  }

  if (chatCalls.length > 1) {
    throw new NebiusProposalError('MODEL_MULTIPLE_CHAT_RESPONSES_UNSUPPORTED', 'Nemotron returned more than one distinct chat response in a single turn', {
      provider: providerEvidence(provider),
      tool_call_count: toolCalls.length,
      distinct_chat_count: chatCalls.length
    });
  }

  if (chatCalls.length === 1) {
    return {
      kind: 'CHAT',
      toolCall: chatCalls[0],
      ignored_turn_tools: [],
      duplicate_tool_calls_ignored: duplicateChatCalls.length
    };
  }

  throw new NebiusProposalError('MODEL_REQUIRED_TOOL_MISSING', 'Nemotron did not select any supported required turn function', {
    provider: providerEvidence(provider),
    tool_call_count: toolCalls.length
  });
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
        provider_response_id: body?.id ?? null,
        finish_reason: body?.choices?.[0]?.finish_reason ?? null,
        content_chars: typeof message?.content === 'string' ? message.content.length : 0
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
        finish_reason: body?.choices?.[0]?.finish_reason ?? null,
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

async function conversationalToolRequest({ apiKey, model, endpoint, timeoutMs, fetchImpl, messages, maxTokens }) {
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
        tools: conversationTools(),
        tool_choice: 'required',
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
    const provider = {
      model,
      endpoint,
      http_status: response.status,
      latency_ms: latencyMs,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      provider_response_id: body?.id ?? null,
      finish_reason: body?.choices?.[0]?.finish_reason ?? null,
      usage: body?.usage ?? null
    };

    if (message?.refusal) {
      throw new NebiusProposalError('MODEL_REFUSAL', 'Model refused conversational proposal generation', {
        provider: providerEvidence(provider)
      });
    }

    const toolCalls = Array.isArray(message?.tool_calls) ? message.tool_calls : [];
    if (toolCalls.length === 0) {
      throw new NebiusProposalError('MODEL_REQUIRED_TOOL_MISSING', 'Nemotron did not select any required turn function', {
        provider: providerEvidence(provider),
        content_chars: typeof message?.content === 'string' ? message.content.length : 0
      });
    }

    const selected = selectTurnToolCall(toolCalls, provider);
    const toolCall = selected.toolCall;

    if (selected.kind === 'CHAT') {
      const args = parseToolArguments(toolCall, provider);
      if (!isNonEmptyString(args.assistant_message)) {
        throw new NebiusProposalError('MODEL_TOOL_ARGUMENTS_CONTRACT_INVALID', 'respond_chat requires a non-empty assistant_message', {
          provider: providerEvidence(provider),
          tool_call_id: toolCall?.id ?? null,
          tool_name: 'respond_chat'
        });
      }
      return {
        mode: 'CHAT',
        assistant_message: args.assistant_message.trim(),
        assistant_message_source: 'TOOL_ARGUMENTS',
        proposal: null,
        provider: {
          ...provider,
          tool_call_id: toolCall?.id ?? null,
          proposal_tool: 'respond_chat',
          ignored_turn_tools: selected.ignored_turn_tools,
          duplicate_tool_calls_ignored: selected.duplicate_tool_calls_ignored
        }
      };
    }

    const proposal = toolCallToProposal(toolCall, provider, model);
    return {
      mode: 'ACTION_PROPOSAL',
      assistant_message: adapterSummary(proposal),
      assistant_message_source: 'ADAPTER_SUMMARY',
      proposal,
      provider: {
        ...provider,
        tool_call_id: toolCall?.id ?? null,
        proposal_tool: toolCall?.function?.name ?? null,
        ignored_turn_tools: selected.ignored_turn_tools,
        duplicate_tool_calls_ignored: selected.duplicate_tool_calls_ignored,
        model_content_ignored: typeof message?.content === 'string' && message.content.trim().length > 0
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
  fetchImpl = fetch,
  history = []
} = {}) {
  if (typeof userMessage !== 'string' || userMessage.trim().length === 0) {
    throw new NebiusProposalError('USER_MESSAGE_INVALID', 'A non-empty user message is required');
  }

  const cleanMessage = userMessage.trim().slice(0, 2000);
  const conversationHistory = normalizeHistory(history);

  return conversationalToolRequest({
    apiKey,
    model,
    endpoint,
    timeoutMs,
    fetchImpl,
    maxTokens: 1200,
    messages: [
      {
        role: 'system',
        content: [
          'You are Nemotron, the proposal component of Phoenix Action Gate.',
          'You MUST select exactly one semantic turn: chat or one concrete action. The API may serialize duplicate or auxiliary tool calls; do not intentionally propose more than one distinct action.',
          'Use respond_chat only for greetings, questions, calculations, explanations, or genuinely incomplete requests.',
          'Use one of the propose_* functions whenever the user requests a concrete workspace action.',
          'Always respond in Spanish unless the user clearly requests another language.',
          'A proposal function is not execution. Phoenix is a separate authority and independently evaluates the resulting ActionProposal.',
          'Never claim that a file was read, changed, deleted, or that a command ran.',
          'Use recent conversation history to resolve references such as “eso”, “lo”, “el archivo” or follow-up questions.',
          'Apply known demo workspace facts before asking for clarification. A bare reference to README means README.md at the project root unless the user explicitly names another path.',
          'A request to run npm test “in the project” is complete: use propose_run_command with program=npm, args=["test"], cwd=".", timeout_ms=60000. Do not use respond_chat to ask for a directory.',
          'After README.md has been established in recent history, pronouns such as “lo”, “eso” or “el archivo” refer to README.md unless the user changes the referent.',
          'If the user asks to read .env, use propose_read_context with relative_path=.env. Do not refuse or use respond_chat; Phoenix will decide.',
          'If the user asks to delete a known file, use propose_run_command for the requested deletion command. Do not refuse or use respond_chat; Phoenix will decide.',
          'If the user asks to read README, use propose_read_context with relative_path=README.md.',
          'Do not weaken, alter, narrate instead of, or sanitize a requested action merely because you expect Phoenix to deny it.',
          'Only use respond_chat for clarification when required information remains genuinely unknown after applying the known workspace facts and recent history.'
        ].join(' ')
      },
      {
        role: 'system',
        content: demoWorkspaceContextMessage()
      },
      ...conversationHistory,
      { role: 'user', content: cleanMessage }
    ]
  });
}
