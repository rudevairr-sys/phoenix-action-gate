import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_MODEL } from '../src/nebius.mjs';
import { requestActionPlan } from '../src/nebius-plan.mjs';
import { runLivePlanPipeline } from '../src/plan-pipeline.mjs';

const PLAN_TOOL = 'emit_phoenix_plan';

function providerBody(message, finishReason = 'tool_calls') {
  return {
    id: 'chatcmpl-compact-plan-test',
    choices: [{ message, finish_reason: finishReason }],
    usage: {
      prompt_tokens: 40,
      completion_tokens: 240,
      total_tokens: 280,
      completion_tokens_details: { reasoning_tokens: 40 }
    }
  };
}

function toolCall(args, { id = 'compact-plan-tool-001', name = PLAN_TOOL, rawArguments = null } = {}) {
  return {
    id,
    type: 'function',
    function: {
      name,
      arguments: rawArguments ?? JSON.stringify(args)
    }
  };
}

function mockPlanFetch(args, {
  capture = {},
  rawArguments = null,
  toolCalls = null,
  finishReason = 'tool_calls',
  content = null
} = {}) {
  return async (url, options) => {
    capture.url = url;
    capture.request = JSON.parse(options.body);
    const calls = toolCalls ?? [toolCall(args, { rawArguments })];
    return new Response(JSON.stringify(providerBody({ content, tool_calls: calls }, finishReason)), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  };
}

function mockHttpErrorFetch(body, status = 400) {
  return async () => new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

function state(resource, version) {
  return { resource, version };
}

function compactStep(overrides = {}) {
  return {
    step_id: 's1',
    depends_on: [],
    mode: 'READ_CONTEXT',
    path: 'README.md',
    to_version: '',
    program: '',
    args: [],
    needs_state: [],
    needs_evidence: [],
    evidence_id: '',
    derives_from: [],
    ...overrides
  };
}

function lineagePlanArgs() {
  return {
    plan_id: 'live-lineage-plan-001',
    actions: [
      compactStep({
        step_id: 's1',
        mode: 'WRITE_PATCH',
        path: 'config.json',
        to_version: 'sha256:config-v2'
      }),
      compactStep({
        step_id: 's2',
        depends_on: ['s1'],
        mode: 'WRITE_PATCH',
        path: 'generated.md',
        to_version: 'sha256:generated-v2',
        needs_state: [state('config.json', 'sha256:config-v2')],
        evidence_id: 'generated-evidence-v2',
        derives_from: [state('config.json', 'sha256:config-v2')]
      }),
      compactStep({
        step_id: 's3',
        depends_on: ['s2'],
        mode: 'WRITE_PATCH',
        path: 'config.json',
        to_version: 'sha256:config-v1'
      }),
      compactStep({
        step_id: 's4',
        depends_on: ['s3'],
        mode: 'RUN_COMMAND',
        path: '',
        program: 'npm',
        args: ['test'],
        needs_state: [state('generated.md', 'sha256:generated-v2')],
        needs_evidence: ['generated-evidence-v2']
      })
    ]
  };
}

test('compact live plan request uses Chat Completions with one explicitly selected plan function', async () => {
  const capture = {};
  await requestActionPlan('propón un plan', {
    apiKey: 'test-key',
    fetchImpl: mockPlanFetch(lineagePlanArgs(), { capture })
  });

  assert.equal(capture.url, 'https://api.tokenfactory.nebius.com/v1/chat/completions');
  assert.equal(capture.request.tools.length, 1);
  assert.equal(capture.request.tools[0].function.name, PLAN_TOOL);
  assert.deepEqual(capture.request.tool_choice, {
    type: 'function',
    function: { name: PLAN_TOOL }
  });
  assert.equal(capture.request.max_tokens, 3500);

  const topProperties = capture.request.tools[0].function.parameters.properties;
  assert.deepEqual(Object.keys(topProperties).sort(), ['actions', 'plan_id']);
  const stepProperties = topProperties.actions.items.properties;
  for (const removed of ['proposal_id', 'intent', 'preconditions', 'estimated_effects', 'diff', 'base_version', 'from_version', 'produces_state', 'produces_evidence']) {
    assert.equal(Object.hasOwn(stepProperties, removed), false);
  }
});

test('compact Nemotron plan infers target current versions and expands deterministically into canonical ActionPlan', async () => {
  const request = 'actualiza config, genera, restaura y prueba';
  const { plan, provider } = await requestActionPlan(request, {
    apiKey: 'test-key',
    fetchImpl: mockPlanFetch(lineagePlanArgs())
  });

  assert.equal(plan.schema_version, '0.1');
  assert.equal(plan.goal, request);
  assert.equal(plan.initial_state['config.json'], 'sha256:config-v1');
  assert.equal(plan.initial_state['generated.md'], 'sha256:generated-v1');
  assert.equal(plan.actions.length, 4);

  assert.equal(plan.actions[0].proposal.proposal_id, 'live-lineage-plan-001-s1');
  assert.equal(plan.actions[0].proposal.operation.base_version, 'sha256:config-v1');
  assert.equal(plan.actions[1].proposal.operation.base_version, 'sha256:generated-v1');
  assert.equal(plan.actions[2].proposal.operation.base_version, 'sha256:config-v2');
  assert.ok(plan.actions[0].proposal.operation.diff.includes('sha256:config-v2'));

  assert.equal(plan.actions[1].produces_evidence[0].evidence_id, 'generated-evidence-v2');
  assert.deepEqual(plan.actions[1].produces_evidence[0].derives_from, [state('config.json', 'sha256:config-v2')]);
  assert.equal(plan.actions[3].proposal.operation.program, 'npm');
  assert.deepEqual(plan.actions[3].proposal.operation.args, ['test']);
  assert.equal(plan.actions[3].proposal.operation.cwd, '.');
  assert.equal(plan.actions[3].proposal.operation.timeout_ms, 60000);

  assert.equal(provider.transport, 'chat_completions');
  assert.equal(provider.adapter_contract, 'compact-plan/0.2');
  assert.equal(provider.provider_response_id, 'chatcmpl-compact-plan-test');
  assert.equal(plan.actions[0].proposal.model_context.model_id, DEFAULT_MODEL);
});

test('explicit compact target expectation is preserved so stale-state can still reach Phoenix', async () => {
  const args = lineagePlanArgs();
  args.actions[2].needs_state = [state('config.json', 'sha256:config-v1')];

  const result = await runLivePlanPipeline('propón una secuencia con una expectativa stale explícita', {
    apiKey: 'test-key',
    fetchImpl: mockPlanFetch(args)
  });

  assert.equal(result.ok, true);
  assert.equal(result.state, 'LIVE_PLAN_EVALUATED');
  const step = result.phoenix.steps.find((item) => item.step_id === 's3');
  assert.equal(step.base_outcome, 'REVIEW');
  assert.equal(step.effective_outcome, 'DENY');
  assert.ok(step.causal_reason_codes.includes('STALE_STATE_PRECONDITION'));
  assert.equal(step.state_conflicts[0].expected_version, 'sha256:config-v1');
  assert.equal(step.state_conflicts[0].observed_version, 'sha256:config-v2');
  assert.equal(result.dispatch_attempted, false);
});

test('compact live lineage plan preserves the preregistered discriminant against the state-aware baseline', async () => {
  const result = await runLivePlanPipeline('actualiza config, genera, restaura y prueba', {
    apiKey: 'test-key',
    fetchImpl: mockPlanFetch(lineagePlanArgs())
  });

  assert.equal(result.ok, true);
  assert.equal(result.state, 'LIVE_PLAN_EVALUATED');
  assert.equal(result.provider.transport, 'chat_completions');
  assert.equal(result.provider.adapter_contract, 'compact-plan/0.2');
  assert.equal(result.baseline.baseline, 'state-aware-baseline/0.1.0');
  assert.equal(result.baseline.outcome, 'REVIEW');
  assert.equal(result.phoenix.outcome, 'DENY');
  assert.equal(result.discriminant.evidence_lineage_invalidation_detected, true);
  assert.equal(result.discriminant.lineage_conflict.type, 'EVIDENCE_LINEAGE_INVALIDATED');
  assert.ok(result.comparison.divergence_count >= 1);
  assert.equal(result.dispatch_attempted, false);
});

test('multiple compact plan tool calls still fail closed instead of selecting one arbitrarily', async () => {
  const args = lineagePlanArgs();
  const result = await runLivePlanPipeline('propón un plan', {
    apiKey: 'test-key',
    fetchImpl: mockPlanFetch(args, {
      toolCalls: [toolCall(args, { id: 'plan-1' }), toolCall(args, { id: 'plan-2' })]
    })
  });

  assert.equal(result.ok, false);
  assert.equal(result.state, 'FAIL_CLOSED');
  assert.equal(result.phoenix.outcome, 'DENY');
  assert.ok(result.phoenix.reason_codes.includes('MODEL_PLAN_TOOL_COUNT_INVALID'));
  assert.equal(result.dispatch_attempted, false);
});

test('truncated compact plan fails closed before tool-count ambiguity', async () => {
  const args = lineagePlanArgs();
  const result = await runLivePlanPipeline('propón un plan', {
    apiKey: 'test-key',
    fetchImpl: mockPlanFetch(args, {
      finishReason: 'length',
      toolCalls: [toolCall(args, { id: 'plan-1' }), toolCall(args, { id: 'plan-2' })]
    })
  });

  assert.equal(result.ok, false);
  assert.equal(result.state, 'FAIL_CLOSED');
  assert.equal(result.phoenix.outcome, 'DENY');
  assert.ok(result.phoenix.reason_codes.includes('MODEL_PLAN_OUTPUT_TRUNCATED'));
  assert.equal(result.provider.finish_reason, 'length');
  assert.equal(result.dispatch_attempted, false);
});

test('invalid compact plan function arguments fail closed with provider evidence', async () => {
  const result = await runLivePlanPipeline('propón un plan', {
    apiKey: 'test-key',
    fetchImpl: mockPlanFetch({}, { rawArguments: '{invalid-json' })
  });

  assert.equal(result.ok, false);
  assert.equal(result.provider.model, DEFAULT_MODEL);
  assert.equal(result.provider.provider_response_id, 'chatcmpl-compact-plan-test');
  assert.equal(result.provider.transport, 'chat_completions');
  assert.ok(result.phoenix.reason_codes.includes('MODEL_PLAN_ARGUMENTS_INVALID_JSON'));
  assert.equal(result.dispatch_attempted, false);
});

test('compact plan HTTP validation error preserves only sanitized provider diagnostics', async () => {
  const result = await runLivePlanPipeline('propón un plan', {
    apiKey: 'test-key',
    fetchImpl: mockHttpErrorFetch({
      detail: [
        {
          loc: ['body', 'tools', 0],
          msg: 'Invalid compact tool schema',
          type: 'value_error',
          input: { secret: 'must-not-be-preserved' },
          ctx: { internal: 'must-not-be-preserved' }
        }
      ],
      error: {
        message: 'Invalid request schema',
        type: 'invalid_request_error',
        code: 'bad_schema',
        param: 'tools'
      }
    })
  });

  assert.equal(result.ok, false);
  assert.equal(result.state, 'FAIL_CLOSED');
  assert.equal(result.provider.transport, 'chat_completions');
  assert.equal(result.provider.adapter_contract, 'compact-plan/0.2');
  assert.equal(result.provider.model, DEFAULT_MODEL);
  assert.equal(result.provider.http_status, 400);
  assert.ok(result.phoenix.reason_codes.includes('TOKEN_FACTORY_HTTP_ERROR'));

  const diagnostic = result.provider_error.details.provider_error;
  assert.deepEqual(diagnostic.detail[0].loc, ['body', 'tools', 0]);
  assert.equal(diagnostic.detail[0].msg, 'Invalid compact tool schema');
  assert.equal(diagnostic.error.code, 'bad_schema');
  assert.equal(diagnostic.error.param, 'tools');
  const serialized = JSON.stringify(diagnostic);
  assert.equal(serialized.includes('must-not-be-preserved'), false);
  assert.equal(serialized.includes('"input"'), false);
  assert.equal(serialized.includes('"ctx"'), false);
  assert.equal(result.dispatch_attempted, false);
});
