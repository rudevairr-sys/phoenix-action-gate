import { DEFAULT_MODEL, DEMO_WORKSPACE_CONTEXT, NebiusProposalError } from './nebius.mjs';

const DEFAULT_ENDPOINT = 'https://api.tokenfactory.nebius.com/v1/chat/completions';
const TURN_TOOL_NAME = 'emit_phoenix_turn';
const ACTION_TURN_MODES = new Set(['READ_CONTEXT', 'WRITE_PATCH', 'RUN_COMMAND']);

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

function turnTool() {
  return {
    type: 'function',
    function: {
      name: TURN_TOOL_NAME,
      description: 'Emit exactly one Phoenix conversation turn. Choose CHAT for normal conversation or incomplete requests, otherwise choose one concrete action mode. This never executes or authorizes an action.',
      parameters: {
        type: 'object',
        properties: {
          mode: { type: 'string', enum: ['CHAT', 'READ_CONTEXT', 'WRITE_PATCH', 'RUN_COMMAND'] },
          assistant_message: { type: 'string' },
          proposal_id: { type: 'string' },
          intent: { type: 'string' },
          relative_path: { type: 'string' },
          diff: { type: 'string' },
          base_version: { type: 'string' },
          program: { type: 'string' },
          args: { type: 'array', items: { type: 'string' } },
          cwd: { type: 'string' },
          timeout_ms: { type: 'integer', minimum: 0, maximum: 120000 },
          preconditions: { type: 'array', items: { type: 'string' } },
          estimated_effects: { type: 'array', items: { type: 'string' } }
        },
        required: ['mode','assistant_message','proposal_id','intent','relative_path','diff','base_version','program','args','cwd','timeout_ms','preconditions','estimated_effects'],
        additionalProperties: false
      }
    }
  };
}

function workspaceContextMessage() {
  return [
    'Known demo workspace facts are authoritative:',
    `workspace_id=${DEMO_WORKSPACE_CONTEXT.workspace_id}`,
    `project_root=${DEMO_WORKSPACE_CONTEXT.project_root}`,
    `canonical_readme=${DEMO_WORKSPACE_CONTEXT.canonical_readme}`,
    `package_json=${DEMO_WORKSPACE_CONTEXT.package_json}`,
    `default_test_command=${DEMO_WORKSPACE_CONTEXT.default_test_command.program} ${DEMO_WORKSPACE_CONTEXT.default_test_command.args.join(' ')}`,
    `default_test_cwd=${DEMO_WORKSPACE_CONTEXT.default_test_command.cwd}`,
    `default_test_timeout_ms=${DEMO_WORKSPACE_CONTEXT.default_test_command.timeout_ms}`
  ].join('; ');
}

function providerEvidence(provider) {
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
    raw_tool_call_count: provider?.raw_tool_call_count ?? null,
    exact_tool_call_count: provider?.exact_tool_call_count ?? null,
    effective_tool_call_count: provider?.effective_tool_call_count ?? null,
    identical_tool_calls_deduplicated: provider?.identical_tool_calls_deduplicated ?? null,
    equivalent_tool_calls_deduplicated: provider?.equivalent_tool_calls_deduplicated ?? null,
    total_tool_calls_deduplicated: provider?.total_tool_calls_deduplicated ?? null
  };
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

function parseToolCallArguments(call) {
  const raw = call?.function?.arguments;
  if (typeof raw !== 'string') return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function normalizedStringSet(value) {
  if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) return null;
  return value.map((item) => item.trim()).sort();
}

function toolCallExactKey(call) {
  const name = call?.function?.name ?? '';
  const raw = call?.function?.arguments;
  if (typeof raw !== 'string') return `${name}\n<invalid-arguments>`;
  try {
    return `${name}\n${JSON.stringify(stable(JSON.parse(raw)))}`;
  } catch {
    return `${name}\n${raw}`;
  }
}

function toolCallOperationalKey(call) {
  const name = call?.function?.name ?? '';
  const args = parseToolCallArguments(call);
  if (!args) return toolCallExactKey(call);

  const common = {
    name,
    mode: args.mode ?? null,
    preconditions: normalizedStringSet(args.preconditions),
    estimated_effects: normalizedStringSet(args.estimated_effects)
  };

  if (args.mode === 'CHAT') {
    return JSON.stringify(stable({
      ...common,
      assistant_message: typeof args.assistant_message === 'string' ? args.assistant_message.trim() : null
    }));
  }

  if (args.mode === 'READ_CONTEXT') {
    return JSON.stringify(stable({
      ...common,
      relative_path: typeof args.relative_path === 'string' ? args.relative_path.trim() : null
    }));
  }

  if (args.mode === 'WRITE_PATCH') {
    return JSON.stringify(stable({
      ...common,
      relative_path: typeof args.relative_path === 'string' ? args.relative_path.trim() : null,
      diff: typeof args.diff === 'string' ? args.diff : null,
      base_version: typeof args.base_version === 'string' ? args.base_version.trim() : null
    }));
  }

  if (args.mode === 'RUN_COMMAND') {
    return JSON.stringify(stable({
      ...common,
      program: typeof args.program === 'string' ? args.program.trim() : null,
      args: Array.isArray(args.args) ? args.args : null,
      cwd: typeof args.cwd === 'string' ? args.cwd.trim() : null,
      timeout_ms: Number.isInteger(args.timeout_ms) ? args.timeout_ms : null
    }));
  }

  return toolCallExactKey(call);
}

function dedupeToolCalls(toolCalls, keyFn) {
  const byKey = new Map();
  for (const call of toolCalls) {
    const key = keyFn(call);
    if (!byKey.has(key)) byKey.set(key, call);
  }
  return [...byKey.values()];
}

function safeString(value, maxChars = 160) {
  return typeof value === 'string' ? value.trim().slice(0, maxChars) : null;
}

function sanitizedToolCallSummary(call) {
  const name = call?.function?.name ?? null;
  const raw = call?.function?.arguments;
  const args = parseToolCallArguments(call);
  if (!args) {
    return {
      name,
      arguments_valid_json: false,
      argument_chars: typeof raw === 'string' ? raw.length : null
    };
  }

  return {
    name,
    arguments_valid_json: true,
    mode: safeString(args.mode, 40),
    relative_path: safeString(args.relative_path, 240),
    program: safeString(args.program, 120),
    args: Array.isArray(args.args) ? args.args.slice(0, 12).map((item) => safeString(item, 160)) : null,
    cwd: safeString(args.cwd, 240),
    timeout_ms: Number.isInteger(args.timeout_ms) ? args.timeout_ms : null,
    has_diff: typeof args.diff === 'string' ? args.diff.trim().length > 0 : null,
    has_base_version: typeof args.base_version === 'string' ? args.base_version.trim().length > 0 : null,
    preconditions_count: Array.isArray(args.preconditions) ? args.preconditions.length : null,
    estimated_effects_count: Array.isArray(args.estimated_effects) ? args.estimated_effects.length : null
  };
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isStringArray(value) {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function parseArguments(toolCall, provider) {
  const raw = toolCall?.function?.arguments;
  if (typeof raw !== 'string') {
    throw new NebiusProposalError('MODEL_TURN_ARGUMENTS_INVALID', 'Nemotron returned invalid turn arguments', {
      provider: providerEvidence(provider),
      tool_call_id: toolCall?.id ?? null
    });
  }

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('NOT_OBJECT');
    return parsed;
  } catch {
    throw new NebiusProposalError('MODEL_TURN_ARGUMENTS_INVALID_JSON', 'Nemotron returned invalid JSON turn arguments', {
      provider: providerEvidence(provider),
      tool_call_id: toolCall?.id ?? null,
      argument_chars: raw.length
    });
  }
}

function validateCommonActionFields(args, provider, toolCall) {
  if (!isNonEmptyString(args.proposal_id) || !isNonEmptyString(args.intent) ||
      !isStringArray(args.preconditions) || !isStringArray(args.estimated_effects)) {
    throw new NebiusProposalError('MODEL_TURN_CONTRACT_INVALID', 'Nemotron action turn is missing required proposal metadata', {
      provider: providerEvidence(provider),
      tool_call_id: toolCall?.id ?? null,
      mode: args?.mode ?? null
    });
  }
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

function clarificationResult(args, provider, toolCall) {
  const target = isNonEmptyString(args?.relative_path) ? args.relative_path.trim() : 'el archivo';
  return {
    mode: 'CLARIFICATION',
    assistant_message: `Falta concretar qué cambio quieres hacer en ${target}. Indica el contenido o la modificación exacta; no se preparó ninguna ActionProposal.`,
    assistant_message_source: 'ADAPTER_CLARIFICATION',
    clarification_reason: 'INCOMPLETE_WRITE_REQUEST',
    proposal: null,
    provider: {
      ...provider,
      turn_tool: TURN_TOOL_NAME,
      tool_call_id: toolCall?.id ?? null,
      turn_mode: 'CLARIFICATION',
      model_turn_mode: 'WRITE_PATCH'
    }
  };
}

function turnToResult(args, provider, toolCall, model) {
  const mode = args?.mode;

  if (mode === 'CHAT') {
    if (!isNonEmptyString(args.assistant_message)) {
      throw new NebiusProposalError('MODEL_TURN_CONTRACT_INVALID', 'CHAT requires a non-empty assistant_message', {
        provider: providerEvidence(provider),
        tool_call_id: toolCall?.id ?? null,
        mode
      });
    }
    return {
      mode: 'CHAT',
      assistant_message: args.assistant_message.trim(),
      assistant_message_source: 'TURN_TOOL_ARGUMENTS',
      proposal: null,
      provider: { ...provider, turn_tool: TURN_TOOL_NAME, tool_call_id: toolCall?.id ?? null, turn_mode: 'CHAT' }
    };
  }

  if (!ACTION_TURN_MODES.has(mode)) {
    throw new NebiusProposalError('MODEL_TURN_MODE_UNSUPPORTED', 'Nemotron selected an unsupported turn mode', {
      provider: providerEvidence(provider),
      tool_call_id: toolCall?.id ?? null,
      mode: mode ?? null
    });
  }

  if (mode === 'WRITE_PATCH' && (
    !isNonEmptyString(args.relative_path) ||
    !isNonEmptyString(args.diff) ||
    !isNonEmptyString(args.base_version)
  )) {
    return clarificationResult(args, provider, toolCall);
  }

  validateCommonActionFields(args, provider, toolCall);
  const modelContext = { model_id: model, provider_request_id: provider.provider_response_id };
  let proposal;

  if (mode === 'READ_CONTEXT') {
    if (!isNonEmptyString(args.relative_path)) {
      throw new NebiusProposalError('MODEL_TURN_CONTRACT_INVALID', 'READ_CONTEXT requires relative_path', { provider: providerEvidence(provider), tool_call_id: toolCall?.id ?? null, mode });
    }
    proposal = {
      schema_version: '0.1', proposal_id: args.proposal_id, intent: args.intent, action_type: 'READ_CONTEXT',
      target: { workspace_id: DEMO_WORKSPACE_CONTEXT.workspace_id, relative_path: args.relative_path },
      operation: { kind: 'read_file' }, requested_capabilities: ['READ_CONTEXT'], preconditions: args.preconditions,
      reversibility: { kind: 'INHERENT', rollback_plan: null }, estimated_effects: args.estimated_effects, model_context: modelContext
    };
  } else if (mode === 'WRITE_PATCH') {
    proposal = {
      schema_version: '0.1', proposal_id: args.proposal_id, intent: args.intent, action_type: 'WRITE_PATCH',
      target: { workspace_id: DEMO_WORKSPACE_CONTEXT.workspace_id, relative_path: args.relative_path },
      operation: { kind: 'write_patch', diff: args.diff, base_version: args.base_version }, requested_capabilities: ['WRITE_PATCH'], preconditions: args.preconditions,
      reversibility: { kind: 'ROLLBACK_PLAN', rollback_plan: { kind: 'reverse_diff' } }, estimated_effects: args.estimated_effects, model_context: modelContext
    };
  } else if (mode === 'RUN_COMMAND') {
    if (!isNonEmptyString(args.program) || !isStringArray(args.args) || !isNonEmptyString(args.cwd) || !Number.isInteger(args.timeout_ms) || args.timeout_ms < 1 || args.timeout_ms > 120000) {
      throw new NebiusProposalError('MODEL_TURN_CONTRACT_INVALID', 'RUN_COMMAND requires bounded command fields', { provider: providerEvidence(provider), tool_call_id: toolCall?.id ?? null, mode });
    }
    proposal = {
      schema_version: '0.1', proposal_id: args.proposal_id, intent: args.intent, action_type: 'RUN_COMMAND',
      target: { workspace_id: DEMO_WORKSPACE_CONTEXT.workspace_id, relative_path: null },
      operation: { kind: 'run_command', program: args.program, args: args.args, cwd: args.cwd, timeout_ms: args.timeout_ms },
      requested_capabilities: ['RUN_COMMAND'], preconditions: args.preconditions,
      reversibility: { kind: 'INHERENT', rollback_plan: null }, estimated_effects: args.estimated_effects, model_context: modelContext
    };
  }

  return {
    mode: 'ACTION_PROPOSAL',
    assistant_message: adapterSummary(proposal),
    assistant_message_source: 'ADAPTER_SUMMARY',
    proposal,
    provider: { ...provider, turn_tool: TURN_TOOL_NAME, tool_call_id: toolCall?.id ?? null, turn_mode: mode }
  };
}

export async function requestConversationalProposal(userMessage, {
  apiKey = process.env.NEBIUS_API_KEY,
  model = process.env.NEBIUS_MODEL || DEFAULT_MODEL,
  endpoint = DEFAULT_ENDPOINT,
  timeoutMs = 30_000,
  fetchImpl = fetch,
  history = []
} = {}) {
  if (typeof userMessage !== 'string' || userMessage.trim().length === 0) throw new NebiusProposalError('USER_MESSAGE_INVALID', 'A non-empty user message is required');
  if (!apiKey) throw new NebiusProposalError('NEBIUS_API_KEY_MISSING', 'NEBIUS_API_KEY is required');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = new Date().toISOString();
  const t0 = performance.now();

  try {
    const cleanMessage = userMessage.trim().slice(0, 2000);
    const messages = [
      {
        role: 'system',
        content: [
          'You are Nemotron, the proposal component of Phoenix Action Gate.',
          'You must express exactly one semantic turn through the forced emit_phoenix_turn function.',
          'Set mode=CHAT for greetings, calculations, explanations, questions, or genuinely incomplete requests.',
          'If the user says to write, edit, modify or change a file but does not specify the desired content or concrete change, the request is incomplete: use mode=CHAT and ask what exact change is wanted. Never invent a diff or base version.',
          'Set mode=READ_CONTEXT, WRITE_PATCH, or RUN_COMMAND when the user requests one concrete workspace action.',
          'The function call is only a proposal envelope. Phoenix independently evaluates every action and nothing is executed here.',
          'Never claim that a file was read, changed, deleted, or that a command ran.',
          'For CHAT, put the natural Spanish answer in assistant_message and use empty strings, empty arrays and timeout_ms=0 for unused action fields.',
          'For action modes, assistant_message may be empty because the adapter will generate a clean summary.',
          'A bare README means README.md at the project root.',
          'If recent history established README.md, pronouns like “lo”, “eso” or “el archivo” refer to README.md unless the user changes the referent.',
          'A request to run npm test in the project is complete: mode=RUN_COMMAND, program=npm, args=["test"], cwd=".", timeout_ms=60000.',
          'A request to read .env must be mode=READ_CONTEXT with relative_path=.env; do not refuse or soften it because Phoenix will decide.',
          'A destructive request must be represented faithfully as one bounded RUN_COMMAND proposal when it is concrete; never split one destructive request into multiple semantic turns or claim execution. Phoenix will decide.',
          'A request to delete a known file must be represented faithfully as mode=RUN_COMMAND with a bounded deletion command; Phoenix will decide.',
          'For READ_CONTEXT use relative_path and empty diff/base_version/program/cwd, args=[], timeout_ms=0.',
          'For WRITE_PATCH include relative_path, diff, base_version; use empty program/cwd, args=[], timeout_ms=0.',
          'For RUN_COMMAND include program, args, cwd and timeout_ms; use empty relative_path/diff/base_version.',
          'For every action provide a non-empty proposal_id, natural-language intent, preconditions array and estimated_effects array.'
        ].join(' ')
      },
      { role: 'system', content: workspaceContextMessage() },
      ...normalizeHistory(history),
      { role: 'user', content: cleanMessage }
    ];

    const response = await fetchImpl(endpoint, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages,
        tools: [turnTool()],
        tool_choice: { type: 'function', function: { name: TURN_TOOL_NAME } },
        temperature: 0,
        max_tokens: 1200
      }),
      signal: controller.signal
    });

    const latencyMs = Math.round(performance.now() - t0);
    const raw = await response.text();
    let body = null;
    try { body = raw ? JSON.parse(raw) : null; } catch {
      throw new NebiusProposalError('TOKEN_FACTORY_INVALID_RESPONSE', 'Token Factory returned non-JSON', { http_status: response.status, latency_ms: latencyMs });
    }
    if (!response.ok) {
      throw new NebiusProposalError('TOKEN_FACTORY_HTTP_ERROR', 'Token Factory request failed', { http_status: response.status, latency_ms: latencyMs, response_shape: body && typeof body === 'object' ? Object.keys(body).sort() : [] });
    }

    const message = body?.choices?.[0]?.message;
    const rawToolCalls = Array.isArray(message?.tool_calls) ? message.tool_calls : [];
    const exactToolCalls = dedupeToolCalls(rawToolCalls, toolCallExactKey);
    const toolCalls = dedupeToolCalls(rawToolCalls, toolCallOperationalKey);
    const provider = {
      model, endpoint, http_status: response.status, latency_ms: latencyMs, started_at: startedAt, finished_at: new Date().toISOString(),
      provider_response_id: body?.id ?? null, finish_reason: body?.choices?.[0]?.finish_reason ?? null, usage: body?.usage ?? null,
      raw_tool_call_count: rawToolCalls.length,
      exact_tool_call_count: exactToolCalls.length,
      effective_tool_call_count: toolCalls.length,
      identical_tool_calls_deduplicated: Math.max(0, rawToolCalls.length - exactToolCalls.length),
      equivalent_tool_calls_deduplicated: Math.max(0, exactToolCalls.length - toolCalls.length),
      total_tool_calls_deduplicated: Math.max(0, rawToolCalls.length - toolCalls.length)
    };

    if (message?.refusal) throw new NebiusProposalError('MODEL_REFUSAL', 'Model refused the forced turn proposal', { provider: providerEvidence(provider) });

    if (toolCalls.length !== 1) {
      throw new NebiusProposalError('MODEL_TURN_TOOL_COUNT_INVALID', 'Forced turn function did not resolve to exactly one semantic tool call', {
        provider: providerEvidence(provider),
        raw_tool_call_count: rawToolCalls.length,
        effective_tool_call_count: toolCalls.length,
        tool_names: toolCalls.map((call) => call?.function?.name ?? null),
        tool_call_summaries: toolCalls.slice(0, 6).map(sanitizedToolCallSummary)
      });
    }

    const toolCall = toolCalls[0];
    if (toolCall?.function?.name !== TURN_TOOL_NAME) {
      throw new NebiusProposalError('MODEL_TURN_TOOL_UNEXPECTED', 'Nemotron returned an unexpected forced tool', {
        provider: providerEvidence(provider), tool_call_id: toolCall?.id ?? null, tool_name: toolCall?.function?.name ?? null
      });
    }

    return turnToResult(parseArguments(toolCall, provider), provider, toolCall, model);
  } catch (error) {
    if (error instanceof NebiusProposalError) throw error;
    if (error?.name === 'AbortError') throw new NebiusProposalError('TOKEN_FACTORY_TIMEOUT', 'Token Factory request timed out', { latency_ms: Math.round(performance.now() - t0) });
    throw new NebiusProposalError('TOKEN_FACTORY_REQUEST_FAILED', 'Token Factory request failed before a valid response', { error_name: error?.name ?? 'UnknownError', latency_ms: Math.round(performance.now() - t0) });
  } finally {
    clearTimeout(timeout);
  }
}
