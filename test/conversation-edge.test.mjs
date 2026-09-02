import assert from 'node:assert/strict';
import test from 'node:test';
import { runConversationPipeline } from '../src/pipeline.mjs';

const TURN_TOOL = 'emit_phoenix_turn';

function providerBody(toolCalls) {
  return {
    id: 'chatcmpl-conversation-edge-test',
    choices: [{ message: { content: null, tool_calls: toolCalls }, finish_reason: 'tool_calls' }],
    usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 }
  };
}

function completeTurn(overrides = {}) {
  return {
    mode: 'CHAT',
    assistant_message: 'Hola.',
    proposal_id: '',
    intent: '',
    relative_path: '',
    diff: '',
    base_version: '',
    program: '',
    args: [],
    cwd: '',
    timeout_ms: 0,
    preconditions: [],
    estimated_effects: [],
    ...overrides
  };
}

function toolCall(args, id) {
  return {
    id,
    type: 'function',
    function: {
      name: TURN_TOOL,
      arguments: JSON.stringify(args)
    }
  };
}

function mockFetch(toolCalls) {
  return async () => new Response(JSON.stringify(providerBody(toolCalls)), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

test('incomplete WRITE_PATCH becomes a transparent clarification with no ActionProposal', async () => {
  const incompleteWrite = completeTurn({
    mode: 'WRITE_PATCH',
    assistant_message: '',
    proposal_id: 'write-readme-incomplete',
    intent: 'Escribir README.md',
    relative_path: 'README.md',
    diff: '',
    base_version: ''
  });

  const result = await runConversationPipeline('ESCRIBIR README.MD', {
    apiKey: 'test-key',
    fetchImpl: mockFetch([toolCall(incompleteWrite, 'turn-incomplete-write')])
  });

  assert.equal(result.ok, true);
  assert.equal(result.state, 'CLARIFICATION_REQUIRED');
  assert.equal(result.turn_mode, 'CLARIFICATION');
  assert.equal(result.assistant_message_source, 'ADAPTER_CLARIFICATION');
  assert.equal(result.clarification_reason, 'INCOMPLETE_WRITE_REQUEST');
  assert.match(result.assistant_message, /README\.md/);
  assert.equal(result.proposal, null);
  assert.equal(result.decision, null);
  assert.equal(result.dispatch_attempted, false);
});

test('identical duplicate destructive tool calls are deduplicated before Phoenix denies the action', async () => {
  const destructive = completeTurn({
    mode: 'RUN_COMMAND',
    assistant_message: '',
    proposal_id: 'delete-readme-duplicate',
    intent: 'Eliminar README.md',
    program: 'rm',
    args: ['README.md'],
    cwd: '.',
    timeout_ms: 60000
  });

  const result = await runConversationPipeline('PROPONER ELIMINAR README.MD', {
    apiKey: 'test-key',
    fetchImpl: mockFetch([
      toolCall(destructive, 'duplicate-1'),
      toolCall(destructive, 'duplicate-2')
    ])
  });

  assert.equal(result.turn_mode, 'ACTION_PROPOSAL');
  assert.equal(result.proposal.action_type, 'RUN_COMMAND');
  assert.equal(result.decision.outcome, 'DENY');
  assert.ok(result.decision.reason_codes.includes('DESTRUCTIVE_COMMAND'));
  assert.equal(result.provider.raw_tool_call_count, 2);
  assert.equal(result.provider.exact_tool_call_count, 1);
  assert.equal(result.provider.effective_tool_call_count, 1);
  assert.equal(result.provider.identical_tool_calls_deduplicated, 1);
  assert.equal(result.provider.equivalent_tool_calls_deduplicated, 0);
  assert.equal(result.provider.total_tool_calls_deduplicated, 1);
  assert.equal(result.dispatch_attempted, false);
});

test('operationally equivalent destructive calls may differ in generated metadata but still collapse to one action', async () => {
  const first = completeTurn({
    mode: 'RUN_COMMAND',
    assistant_message: '',
    proposal_id: 'delete-readme-a',
    intent: 'Eliminar README.md solicitado por el usuario',
    program: 'rm',
    args: ['README.md'],
    cwd: '.',
    timeout_ms: 60000,
    preconditions: ['README.md is the requested target'],
    estimated_effects: ['README.md would be removed if execution were ever authorized']
  });
  const second = {
    ...first,
    assistant_message: 'Redacción auxiliar que el adaptador no usa para acciones.',
    proposal_id: 'delete-readme-b',
    intent: 'Proponer la eliminación del archivo README.md'
  };

  const result = await runConversationPipeline('eliminar readme', {
    apiKey: 'test-key',
    fetchImpl: mockFetch([
      toolCall(first, 'semantic-duplicate-1'),
      toolCall(second, 'semantic-duplicate-2')
    ])
  });

  assert.equal(result.turn_mode, 'ACTION_PROPOSAL');
  assert.equal(result.proposal.action_type, 'RUN_COMMAND');
  assert.equal(result.proposal.operation.program, 'rm');
  assert.deepEqual(result.proposal.operation.args, ['README.md']);
  assert.equal(result.decision.outcome, 'DENY');
  assert.ok(result.decision.reason_codes.includes('DESTRUCTIVE_COMMAND'));
  assert.equal(result.provider.raw_tool_call_count, 2);
  assert.equal(result.provider.exact_tool_call_count, 2);
  assert.equal(result.provider.effective_tool_call_count, 1);
  assert.equal(result.provider.identical_tool_calls_deduplicated, 0);
  assert.equal(result.provider.equivalent_tool_calls_deduplicated, 1);
  assert.equal(result.provider.total_tool_calls_deduplicated, 1);
  assert.equal(result.dispatch_attempted, false);
});

test('materially different tool calls remain fail-closed and expose only sanitized summaries', async () => {
  const read = completeTurn({
    mode: 'READ_CONTEXT',
    assistant_message: '',
    proposal_id: 'read-before-delete',
    intent: 'Leer README.md',
    relative_path: 'README.md',
    preconditions: ['workspace exists'],
    estimated_effects: ['read only']
  });
  const destructive = completeTurn({
    mode: 'RUN_COMMAND',
    assistant_message: '',
    proposal_id: 'delete-readme',
    intent: 'Eliminar README.md',
    program: 'rm',
    args: ['README.md'],
    cwd: '.',
    timeout_ms: 60000,
    preconditions: ['workspace exists'],
    estimated_effects: ['README.md removal']
  });

  const result = await runConversationPipeline('eliminar readme', {
    apiKey: 'test-key',
    fetchImpl: mockFetch([
      toolCall(read, 'different-1'),
      toolCall(destructive, 'different-2')
    ])
  });

  assert.equal(result.ok, false);
  assert.equal(result.state, 'FAIL_CLOSED');
  assert.equal(result.turn_mode, 'ERROR');
  assert.equal(result.provider_error.code, 'MODEL_TURN_TOOL_COUNT_INVALID');
  assert.equal(result.provider_error.details.raw_tool_call_count, 2);
  assert.equal(result.provider_error.details.effective_tool_call_count, 2);
  assert.equal(result.provider_error.details.tool_call_summaries.length, 2);
  assert.deepEqual(result.provider_error.details.tool_call_summaries.map((item) => item.mode), ['READ_CONTEXT', 'RUN_COMMAND']);
  assert.equal(result.provider_error.details.tool_call_summaries[0].relative_path, 'README.md');
  assert.equal(result.provider_error.details.tool_call_summaries[1].program, 'rm');
  assert.deepEqual(result.provider_error.details.tool_call_summaries[1].args, ['README.md']);

  const serialized = JSON.stringify(result.provider_error.details.tool_call_summaries);
  assert.equal(serialized.includes('proposal_id'), false);
  assert.equal(serialized.includes('intent'), false);
  assert.equal(serialized.includes('assistant_message'), false);
  assert.equal(serialized.includes('README.md removal'), false);
  assert.equal(result.proposal, null);
  assert.equal(result.dispatch_attempted, false);
});
