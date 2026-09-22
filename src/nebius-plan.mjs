import { DEFAULT_MODEL, DEMO_WORKSPACE_CONTEXT, NebiusProposalError } from './nebius.mjs';

const DEFAULT_ENDPOINT = 'https://api.tokenfactory.nebius.com/v1/chat/completions';
const PLAN_TOOL_NAME = 'emit_phoenix_plan';
const PLAN_MAX_TOKENS = 3500;
const ACTION_MODES = new Set(['READ_CONTEXT', 'WRITE_PATCH', 'RUN_COMMAND']);
const DEMO_PLAN_INITIAL_STATE = Object.freeze({
  'README.md': 'sha256:readme-v1',
  'config.json': 'sha256:config-v1',
  'generated.md': 'sha256:generated-v1'
});

function statePairSchema() {
  return {
    type: 'object',
    properties: {
      resource: { type: 'string' },
      version: { type: 'string' }
    },
    required: ['resource', 'version'],
    additionalProperties: false
  };
}

function compactStepSchema() {
  return {
    type: 'object',
    properties: {
      step_id: { type: 'string' },
      depends_on: { type: 'array', items: { type: 'string' }, maxItems: 6 },
      mode: { type: 'string', enum: ['READ_CONTEXT', 'WRITE_PATCH', 'RUN_COMMAND'] },
      path: { type: 'string' },
      to_version: { type: 'string' },
      program: { type: 'string' },
      args: { type: 'array', items: { type: 'string' }, maxItems: 8 },
      needs_state: { type: 'array', items: statePairSchema(), maxItems: 8 },
      needs_evidence: { type: 'array', items: { type: 'string' }, maxItems: 8 },
      evidence_id: { type: 'string' },
      derives_from: { type: 'array', items: statePairSchema(), maxItems: 6 }
    },
    required: [
      'step_id', 'depends_on', 'mode', 'path', 'to_version', 'program', 'args',
      'needs_state', 'needs_evidence', 'evidence_id', 'derives_from'
    ],
    additionalProperties: false
  };
}

function planTool() {
  return {
    type: 'function',
    function: {
      name: PLAN_TOOL_NAME,
      description: 'Emit exactly one compact multi-action proposal plan. This never executes or authorizes any step.',
      parameters: {
        type: 'object',
        properties: {
          plan_id: { type: 'string' },
          actions: { type: 'array', items: compactStepSchema(), minItems: 2, maxItems: 6 }
        },
        required: ['plan_id', 'actions'],
        additionalProperties: false
      }
    }
  };
}

function providerEvidence(provider) {
  return {
    transport: provider?.transport ?? null,
    adapter_contract: provider?.adapter_contract ?? null,
    model: provider?.model ?? null,
    endpoint: provider?.endpoint ?? null,
    http_status: provider?.http_status ?? null,
    latency_ms: provider?.latency_ms ?? null,
    started_at: provider?.started_at ?? null,
    finished_at: provider?.finished_at ?? null,
    provider_response_id: provider?.provider_response_id ?? null,
    finish_reason: provider?.finish_reason ?? null,
    usage: provider?.usage ?? null
  };
}

function cleanText(value, maxChars = 600) {
  if (typeof value !== 'string') return null;
  return value.replace(/\s+/g, ' ').trim().slice(0, maxChars);
}

function sanitizedProviderHttpError(body) {
  const sanitized = {};

  if (Array.isArray(body?.detail)) {
    sanitized.detail = body.detail.slice(0, 8).map((item) => ({
      loc: Array.isArray(item?.loc)
        ? item.loc.slice(0, 8).map((part) => {
            if (typeof part === 'string' || typeof part === 'number') return part;
            return String(part).slice(0, 80);
          })
        : [],
      msg: cleanText(item?.msg, 400),
      type: cleanText(item?.type, 160)
    }));
  } else if (typeof body?.detail === 'string') {
    sanitized.detail = cleanText(body.detail, 800);
  }

  if (typeof body?.error === 'string') {
    sanitized.error = { message: cleanText(body.error, 800) };
  } else if (body?.error && typeof body.error === 'object' && !Array.isArray(body.error)) {
    sanitized.error = {
      message: cleanText(body.error.message, 800),
      type: cleanText(body.error.type, 160),
      code: cleanText(body.error.code, 160),
      param: cleanText(body.error.param, 160)
    };
  }

  return sanitized;
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
    throw new NebiusProposalError('MODEL_PLAN_ARGUMENTS_INVALID', 'Nemotron returned invalid compact plan arguments', {
      provider: providerEvidence(provider),
      tool_call_id: toolCall?.id ?? null
    });
  }

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('NOT_OBJECT');
    return parsed;
  } catch {
    throw new NebiusProposalError('MODEL_PLAN_ARGUMENTS_INVALID_JSON', 'Nemotron returned invalid JSON compact plan arguments', {
      provider: providerEvidence(provider),
      tool_call_id: toolCall?.id ?? null,
      argument_chars: raw.length
    });
  }
}

function pairsToStateMap(pairs, label, provider, toolCall, stepId = null) {
  if (!Array.isArray(pairs)) {
    throw new NebiusProposalError('MODEL_PLAN_CONTRACT_INVALID', `${label} must be an array`, {
      provider: providerEvidence(provider),
      tool_call_id: toolCall?.id ?? null,
      step_id: stepId,
      field: label
    });
  }

  const output = {};
  for (const pair of pairs) {
    if (!pair || typeof pair !== 'object' || Array.isArray(pair) || !isNonEmptyString(pair.resource) || !isNonEmptyString(pair.version)) {
      throw new NebiusProposalError('MODEL_PLAN_CONTRACT_INVALID', `${label} contains an invalid state pair`, {
        provider: providerEvidence(provider),
        tool_call_id: toolCall?.id ?? null,
        step_id: stepId,
        field: label
      });
    }
    if (Object.hasOwn(output, pair.resource)) {
      throw new NebiusProposalError('MODEL_PLAN_DUPLICATE_STATE_RESOURCE', `${label} contains a duplicate resource`, {
        provider: providerEvidence(provider),
        tool_call_id: toolCall?.id ?? null,
        step_id: stepId,
        field: label,
        resource: pair.resource
      });
    }
    output[pair.resource] = pair.version;
  }
  return output;
}

function preconditionsFor(requiresState, requiresEvidence) {
  return [
    ...Object.entries(requiresState).map(([resource, version]) => `${resource} is ${version}`),
    ...requiresEvidence.map((evidenceId) => `${evidenceId} remains valid`)
  ];
}

function effectSummary(producesState, producesEvidence, actionType) {
  const effects = [
    ...Object.entries(producesState).map(([resource, version]) => `${resource} projects to ${version} if approved`),
    ...producesEvidence.map((item) => `${item.evidence_id} would record lineage for ${item.resource}@${item.version}`)
  ];
  if (effects.length > 0) return effects;
  if (actionType === 'READ_CONTEXT') return ['Read-only context proposal'];
  if (actionType === 'RUN_COMMAND') return ['Bounded command proposal only; no execution in this pipeline'];
  return [];
}

function proposalIntent(step, baseVersion = null) {
  if (step.mode === 'READ_CONTEXT') return `Read ${step.path}`;
  if (step.mode === 'WRITE_PATCH') return `Prepare ${step.path} from ${baseVersion} to ${step.to_version}`;
  return `Run ${step.program} ${step.args.join(' ')}`.trim();
}

function stepToCanonical(step, planId, modelContext, provider, toolCall, projectedState) {
  if (!step || typeof step !== 'object' || Array.isArray(step) ||
      !isNonEmptyString(step.step_id) || !Array.isArray(step.depends_on) || !step.depends_on.every(isNonEmptyString) ||
      !ACTION_MODES.has(step.mode) || typeof step.path !== 'string' || typeof step.to_version !== 'string' ||
      typeof step.program !== 'string' || !isStringArray(step.args) || !isStringArray(step.needs_evidence) ||
      typeof step.evidence_id !== 'string') {
    throw new NebiusProposalError('MODEL_PLAN_CONTRACT_INVALID', 'Nemotron returned an invalid compact plan step', {
      provider: providerEvidence(provider),
      tool_call_id: toolCall?.id ?? null,
      step_id: step?.step_id ?? null
    });
  }

  const explicitState = pairsToStateMap(step.needs_state, 'needs_state', provider, toolCall, step.step_id);
  const lineageState = pairsToStateMap(step.derives_from, 'derives_from', provider, toolCall, step.step_id);
  let requiresState = { ...explicitState };
  let producesState = {};
  let producesEvidence = [];
  let proposal;

  if (step.mode === 'READ_CONTEXT') {
    if (!isNonEmptyString(step.path)) {
      throw new NebiusProposalError('MODEL_PLAN_CONTRACT_INVALID', 'READ_CONTEXT compact plan step requires path', {
        provider: providerEvidence(provider),
        tool_call_id: toolCall?.id ?? null,
        step_id: step.step_id
      });
    }

    proposal = {
      schema_version: '0.1',
      proposal_id: `${planId}-${step.step_id}`,
      intent: proposalIntent(step),
      action_type: 'READ_CONTEXT',
      target: { workspace_id: DEMO_WORKSPACE_CONTEXT.workspace_id, relative_path: step.path },
      operation: { kind: 'read_file' },
      requested_capabilities: ['READ_CONTEXT'],
      preconditions: preconditionsFor(requiresState, step.needs_evidence),
      reversibility: { kind: 'INHERENT', rollback_plan: null },
      estimated_effects: effectSummary({}, [], 'READ_CONTEXT'),
      model_context: modelContext
    };
  } else if (step.mode === 'WRITE_PATCH') {
    if (!isNonEmptyString(step.path) || !isNonEmptyString(step.to_version)) {
      throw new NebiusProposalError('MODEL_PLAN_CONTRACT_INVALID', 'WRITE_PATCH compact plan step requires path and to_version', {
        provider: providerEvidence(provider),
        tool_call_id: toolCall?.id ?? null,
        step_id: step.step_id
      });
    }

    const explicitTargetVersion = explicitState[step.path] ?? null;
    const projectedTargetVersion = projectedState.get(step.path) ?? null;
    const baseVersion = explicitTargetVersion ?? projectedTargetVersion;
    if (!isNonEmptyString(baseVersion)) {
      throw new NebiusProposalError('MODEL_PLAN_TARGET_STATE_UNKNOWN', 'WRITE_PATCH target has no explicit or projected current version', {
        provider: providerEvidence(provider),
        tool_call_id: toolCall?.id ?? null,
        step_id: step.step_id,
        target_path: step.path
      });
    }

    requiresState = { ...explicitState, [step.path]: baseVersion };
    producesState = { [step.path]: step.to_version };

    if (step.evidence_id.trim()) {
      producesEvidence = [{
        evidence_id: step.evidence_id.trim(),
        resource: step.path,
        version: step.to_version,
        derives_from: Object.entries(lineageState).map(([resource, version]) => ({ resource, version }))
      }];
    } else if (Object.keys(lineageState).length > 0) {
      throw new NebiusProposalError('MODEL_PLAN_CONTRACT_INVALID', 'derives_from requires evidence_id on WRITE_PATCH', {
        provider: providerEvidence(provider),
        tool_call_id: toolCall?.id ?? null,
        step_id: step.step_id
      });
    }

    proposal = {
      schema_version: '0.1',
      proposal_id: `${planId}-${step.step_id}`,
      intent: proposalIntent(step, baseVersion),
      action_type: 'WRITE_PATCH',
      target: { workspace_id: DEMO_WORKSPACE_CONTEXT.workspace_id, relative_path: step.path },
      operation: {
        kind: 'write_patch',
        diff: `@@ ${step.path} @@\n-${baseVersion}\n+${step.to_version}`,
        base_version: baseVersion
      },
      requested_capabilities: ['WRITE_PATCH'],
      preconditions: preconditionsFor(requiresState, step.needs_evidence),
      reversibility: { kind: 'ROLLBACK_PLAN', rollback_plan: { kind: 'reverse_diff' } },
      estimated_effects: effectSummary(producesState, producesEvidence, 'WRITE_PATCH'),
      model_context: modelContext
    };

    projectedState.set(step.path, step.to_version);
  } else {
    if (!isNonEmptyString(step.program) || step.args.length === 0) {
      throw new NebiusProposalError('MODEL_PLAN_CONTRACT_INVALID', 'RUN_COMMAND compact plan step requires program and args', {
        provider: providerEvidence(provider),
        tool_call_id: toolCall?.id ?? null,
        step_id: step.step_id
      });
    }
    if (isNonEmptyString(step.evidence_id) || Object.keys(lineageState).length > 0) {
      throw new NebiusProposalError('MODEL_PLAN_CONTRACT_INVALID', 'RUN_COMMAND cannot produce lineage evidence in compact contract', {
        provider: providerEvidence(provider),
        tool_call_id: toolCall?.id ?? null,
        step_id: step.step_id
      });
    }

    proposal = {
      schema_version: '0.1',
      proposal_id: `${planId}-${step.step_id}`,
      intent: proposalIntent(step),
      action_type: 'RUN_COMMAND',
      target: { workspace_id: DEMO_WORKSPACE_CONTEXT.workspace_id, relative_path: null },
      operation: { kind: 'run_command', program: step.program, args: [...step.args], cwd: '.', timeout_ms: 60000 },
      requested_capabilities: ['RUN_COMMAND'],
      preconditions: preconditionsFor(requiresState, step.needs_evidence),
      reversibility: { kind: 'INHERENT', rollback_plan: null },
      estimated_effects: effectSummary({}, [], 'RUN_COMMAND'),
      model_context: modelContext
    };
  }

  return {
    step_id: step.step_id,
    depends_on: [...step.depends_on],
    requires_state: requiresState,
    produces_state: producesState,
    requires_evidence: [...step.needs_evidence],
    produces_evidence: producesEvidence,
    proposal
  };
}

function canonicalPlan(args, provider, toolCall, model, userMessage) {
  if (!isNonEmptyString(args?.plan_id) || !Array.isArray(args?.actions) || args.actions.length < 2 || args.actions.length > 6) {
    throw new NebiusProposalError('MODEL_PLAN_CONTRACT_INVALID', 'Nemotron returned an invalid compact plan envelope', {
      provider: providerEvidence(provider),
      tool_call_id: toolCall?.id ?? null,
      action_count: Array.isArray(args?.actions) ? args.actions.length : null
    });
  }

  const modelContext = { model_id: model, provider_request_id: provider.provider_response_id };
  const projectedState = new Map(Object.entries(DEMO_PLAN_INITIAL_STATE));
  const actions = [];
  for (const step of args.actions) {
    actions.push(stepToCanonical(step, args.plan_id, modelContext, provider, toolCall, projectedState));
  }

  return {
    schema_version: '0.1',
    plan_id: args.plan_id,
    goal: userMessage.trim().slice(0, 1200),
    initial_state: { ...DEMO_PLAN_INITIAL_STATE },
    actions
  };
}

function demoPlanContext() {
  return [
    `workspace_id=${DEMO_WORKSPACE_CONTEXT.workspace_id}`,
    'declared_state: README.md=sha256:readme-v1, config.json=sha256:config-v1, generated.md=sha256:generated-v1',
    'project_root=.',
    'default command projection: cwd=. timeout_ms=60000'
  ].join('; ');
}

function planInstructions() {
  return [
    'You are Nemotron, the semantic plan proposer for Phoenix Action Gate.',
    'Call emit_phoenix_plan exactly once and put the whole multi-action plan in its actions array.',
    'This is proposal-only. Never execute, authorize, or claim any file was read or changed.',
    'Use 2 to 6 actions and only READ_CONTEXT, WRITE_PATCH, RUN_COMMAND.',
    'Use short IDs such as s1, s2, s3, s4. Dependencies may reference only earlier step IDs.',
    'Do not repeat the declared initial_state; the adapter already owns it.',
    'For WRITE_PATCH set path and to_version. The adapter infers the target current version from projected state and derives patch metadata.',
    'Use needs_state only for extra cross-resource requirements, or to explicitly state a target version when that expectation is semantically important. Explicit expectations are preserved even if they conflict with projected state.',
    'If a WRITE_PATCH produces derived evidence, set evidence_id and derives_from. The adapter derives evidence resource and version from path and to_version.',
    'If a later step relies on evidence, list its ID in needs_evidence.',
    'For RUN_COMMAND set program and args only. For npm test use program=npm and args=["test"].',
    'For READ_CONTEXT set path only.',
    'Unused strings must be empty; unused arrays must be empty.',
    'Do not weaken or omit a requested risky step because Phoenix independently evaluates every canonical ActionProposal.'
  ].join(' ');
}

export async function requestActionPlan(userMessage, {
  apiKey = process.env.NEBIUS_API_KEY,
  model = process.env.NEBIUS_MODEL || DEFAULT_MODEL,
  endpoint = DEFAULT_ENDPOINT,
  timeoutMs = 45_000,
  fetchImpl = fetch
} = {}) {
  if (typeof userMessage !== 'string' || userMessage.trim().length === 0) {
    throw new NebiusProposalError('USER_MESSAGE_INVALID', 'A non-empty plan request is required');
  }
  if (!apiKey) throw new NebiusProposalError('NEBIUS_API_KEY_MISSING', 'NEBIUS_API_KEY is required');

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
          { role: 'system', content: planInstructions() },
          { role: 'system', content: demoPlanContext() },
          { role: 'user', content: userMessage.trim().slice(0, 3000) }
        ],
        tools: [planTool()],
        tool_choice: { type: 'function', function: { name: PLAN_TOOL_NAME } },
        temperature: 0,
        max_tokens: PLAN_MAX_TOKENS
      }),
      signal: controller.signal
    });

    const latencyMs = Math.round(performance.now() - t0);
    const raw = await response.text();
    let body;
    try {
      body = raw ? JSON.parse(raw) : null;
    } catch {
      throw new NebiusProposalError('TOKEN_FACTORY_INVALID_RESPONSE', 'Token Factory returned non-JSON for compact plan request', {
        http_status: response.status,
        latency_ms: latencyMs
      });
    }

    if (!response.ok) {
      const failedProvider = {
        transport: 'chat_completions',
        adapter_contract: 'compact-plan/0.2',
        model,
        endpoint,
        http_status: response.status,
        latency_ms: latencyMs,
        started_at: startedAt,
        finished_at: new Date().toISOString(),
        provider_response_id: body?.id ?? null,
        finish_reason: null,
        usage: null
      };
      throw new NebiusProposalError('TOKEN_FACTORY_HTTP_ERROR', 'Token Factory compact plan request failed', {
        provider: providerEvidence(failedProvider),
        provider_error: sanitizedProviderHttpError(body),
        response_shape: body && typeof body === 'object' ? Object.keys(body).sort() : []
      });
    }

    const message = body?.choices?.[0]?.message;
    const toolCalls = Array.isArray(message?.tool_calls) ? message.tool_calls : [];
    const provider = {
      transport: 'chat_completions',
      adapter_contract: 'compact-plan/0.2',
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
      throw new NebiusProposalError('MODEL_REFUSAL', 'Nemotron refused compact plan generation', {
        provider: providerEvidence(provider)
      });
    }

    if (provider.finish_reason === 'length') {
      throw new NebiusProposalError('MODEL_PLAN_OUTPUT_TRUNCATED', 'Nemotron compact plan generation reached the output token limit', {
        provider: providerEvidence(provider),
        max_tokens: PLAN_MAX_TOKENS,
        tool_call_count: toolCalls.length,
        tool_names: toolCalls.map((call) => call?.function?.name ?? null)
      });
    }

    if (toolCalls.length !== 1) {
      throw new NebiusProposalError('MODEL_PLAN_TOOL_COUNT_INVALID', 'Compact plan request did not return exactly one tool call', {
        provider: providerEvidence(provider),
        tool_call_count: toolCalls.length,
        tool_names: toolCalls.map((call) => call?.function?.name ?? null)
      });
    }

    const toolCall = toolCalls[0];
    if (toolCall?.function?.name !== PLAN_TOOL_NAME) {
      throw new NebiusProposalError('MODEL_PLAN_TOOL_UNEXPECTED', 'Nemotron returned an unexpected compact plan tool', {
        provider: providerEvidence(provider),
        tool_call_id: toolCall?.id ?? null,
        tool_name: toolCall?.function?.name ?? null
      });
    }

    return {
      plan: canonicalPlan(parseArguments(toolCall, provider), provider, toolCall, model, userMessage),
      provider: {
        ...provider,
        plan_tool: PLAN_TOOL_NAME,
        tool_call_id: toolCall?.id ?? null,
        raw_tool_call_count: 1,
        model_content_ignored: typeof message?.content === 'string' && message.content.trim().length > 0
      }
    };
  } catch (error) {
    if (error instanceof NebiusProposalError) throw error;
    if (error?.name === 'AbortError') {
      throw new NebiusProposalError('TOKEN_FACTORY_TIMEOUT', 'Token Factory compact plan request timed out', {
        latency_ms: Math.round(performance.now() - t0),
        timeout_ms: timeoutMs
      });
    }
    throw new NebiusProposalError('TOKEN_FACTORY_REQUEST_FAILED', 'Token Factory compact plan request failed before a valid response', {
      error_name: error?.name ?? 'UnknownError',
      latency_ms: Math.round(performance.now() - t0)
    });
  } finally {
    clearTimeout(timeout);
  }
}
