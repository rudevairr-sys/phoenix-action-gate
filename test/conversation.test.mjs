import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_MODEL, DEMO_WORKSPACE_CONTEXT } from '../src/nebius.mjs';
import { requestConversationalProposal } from '../src/nebius-conversation.mjs';
import { runConversationPipeline } from '../src/pipeline.mjs';

const TURN_TOOL = 'emit_phoenix_turn';

function providerBody(message, finishReason = 'tool_calls') {
  return {
    id: 'chatcmpl-conversation-test',
    choices: [{ message, finish_reason: finishReason }],
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

function toolCall(args, { name = TURN_TOOL, id = 'turn-tool-001', rawArguments = null } = {}) {
  return {
    id,
    type: 'function',
    function: {
      name,
      arguments: rawArguments ?? JSON.stringify(args)
    }
  };
}

function mockTurnFetch(args, { content = null, capture = {}, rawArguments = null, name = TURN_TOOL } = {}) {
  return async (_url, options) => {
    capture.request = JSON.parse(options.body);
    return new Response(JSON.stringify(providerBody({
      content,
      tool_calls: [toolCall(args, { rawArguments, name })]
    })), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  };
}

function mockToolCallsFetch(toolCalls, { content = null, capture = {} } = {}) {
  return async (_url, options) => {
    capture.request = JSON.parse(options.body);
    return new Response(JSON.stringify(providerBody({ content, tool_calls: toolCalls })), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  };
}

function mockNoToolFetch(content = 'plain text') {
  return async () => new Response(JSON.stringify(providerBody({ content }, 'stop')), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

test('single forced turn tool can return CHAT without inventing an ActionProposal', async () => {
  const result = await runConversationPipeline('nemo', {
    apiKey: 'test-key',
    fetchImpl: mockTurnFetch(completeTurn({
      mode: 'CHAT',
      assistant_message: 'Hola. Puedo conversar contigo y proponer acciones cuando me las pidas.'
    }))
  });

  assert.equal(result.ok, true);
  assert.equal(result.state, 'CHAT_ONLY');
  assert.equal(result.turn_mode, 'CHAT');
  assert.equal(result.proposal, null);
  assert.equal(result.decision, null);
  assert.equal(result.provider.turn_tool, TURN_TOOL);
  assert.equal(result.dispatch_attempted, false);
});

test('conversation request forces exactly emit_phoenix_turn and carries demo-workspace defaults', async () => {
  const capture = {};
  await requestConversationalProposal('nemo', {
    apiKey: 'test-key',
    fetchImpl: mockTurnFetch(completeTurn(), { capture })
  });

  assert.equal(DEMO_WORKSPACE_CONTEXT.canonical_readme, 'README.md');
  assert.equal(DEMO_WORKSPACE_CONTEXT.project_root, '.');
  assert.equal(DEMO_WORKSPACE_CONTEXT.default_test_command.program, 'npm');
  assert.deepEqual(DEMO_WORKSPACE_CONTEXT.default_test_command.args, ['test']);
  assert.equal(capture.request.tools.length, 1);
  assert.equal(capture.request.tools[0].function.name, TURN_TOOL);
  assert.deepEqual(capture.request.tool_choice, {
    type: 'function',
    function: { name: TURN_TOOL }
  });

  const systemText = capture.request.messages
    .filter((message) => message.role === 'system')
    .map((message) => message.content)
    .join('\n');
  assert.match(systemText, /README\.md/);
  assert.match(systemText, /default_test_command=npm test/);
  assert.match(systemText, /forced emit_phoenix_turn/);
});

test('conversation sends bounded prior turns so follow-up references keep context', async () => {
  const capture = {};
  const history = [
    { role: 'user', content: 'quiero leer el readme' },
    { role: 'assistant', content: 'Nemotron propone leer README.md.' }
  ];

  await requestConversationalProposal('podemos borrarlo?', {
    apiKey: 'test-key',
    fetchImpl: mockTurnFetch(completeTurn({
      mode: 'CHAT',
      assistant_message: 'Entiendo que te refieres a README.md.'
    }), { capture }),
    history
  });

  const messages = capture.request.messages;
  assert.equal(messages.at(-3).content, 'quiero leer el readme');
  assert.equal(messages.at(-2).content, 'Nemotron propone leer README.md.');
  assert.equal(messages.at(-1).content, 'podemos borrarlo?');
});

test('npm test single-turn proposal becomes R1/PREPARED without dispatch', async () => {
  const result = await runConversationPipeline('Quiero ejecutar npm test en el proyecto.', {
    apiKey: 'test-key',
    fetchImpl: mockTurnFetch(completeTurn({
      mode: 'RUN_COMMAND',
      assistant_message: '',
      proposal_id: 'run-001',
      intent: 'Ejecutar npm test en el proyecto',
      program: 'npm',
      args: ['test'],
      cwd: '.',
      timeout_ms: 60000
    }))
  });

  assert.equal(result.turn_mode, 'ACTION_PROPOSAL');
  assert.equal(result.proposal.action_type, 'RUN_COMMAND');
  assert.equal(result.decision.outcome, 'PREPARED');
  assert.equal(result.decision.risk_class, 'R1');
  assert.equal(result.provider.turn_mode, 'RUN_COMMAND');
  assert.equal(result.dispatch_attempted, false);
});

test('secret read single-turn proposal reaches Phoenix and is denied by secret boundary', async () => {
  const result = await runConversationPipeline('Quiero leer el archivo .env para comprobar la configuración.', {
    apiKey: 'test-key',
    fetchImpl: mockTurnFetch(completeTurn({
      mode: 'READ_CONTEXT',
      assistant_message: '',
      proposal_id: 'read-env-001',
      intent: 'Leer .env para comprobar la configuración',
      relative_path: '.env'
    }))
  });

  assert.equal(result.proposal.target.relative_path, '.env');
  assert.equal(result.decision.outcome, 'DENY');
  assert.equal(result.decision.risk_class, 'R3');
  assert.ok(result.decision.reason_codes.includes('SECRET_BOUNDARY'));
  assert.equal(result.dispatch_attempted, false);
});

test('destructive delete single-turn proposal reaches Phoenix and is denied by policy', async () => {
  const result = await runConversationPipeline('podemos borrarlo?', {
    apiKey: 'test-key',
    fetchImpl: mockTurnFetch(completeTurn({
      mode: 'RUN_COMMAND',
      assistant_message: '',
      proposal_id: 'delete-001',
      intent: 'Borrar README.md a petición del usuario',
      program: 'rm',
      args: ['README.md'],
      cwd: '.',
      timeout_ms: 60000
    })),
    history: [
      { role: 'user', content: 'quiero leer el readme' },
      { role: 'assistant', content: 'Nemotron propone leer README.md.' }
    ]
  });

  assert.equal(result.decision.outcome, 'DENY');
  assert.ok(result.decision.reason_codes.includes('DESTRUCTIVE_COMMAND'));
  assert.equal(result.dispatch_attempted, false);
});

test('README single-turn proposal becomes R0/PREPARED', async () => {
  const result = await runConversationPipeline('quiero leer el readme', {
    apiKey: 'test-key',
    fetchImpl: mockTurnFetch(completeTurn({
      mode: 'READ_CONTEXT',
      assistant_message: '',
      proposal_id: 'read-readme-001',
      intent: 'Leer README.md del proyecto',
      relative_path: 'README.md'
    }))
  });

  assert.equal(result.proposal.action_type, 'READ_CONTEXT');
  assert.equal(result.proposal.target.relative_path, 'README.md');
  assert.equal(result.decision.outcome, 'PREPARED');
  assert.equal(result.decision.risk_class, 'R0');
});

test('action turns always use a clean adapter summary instead of raw model content', async () => {
  const result = await runConversationPipeline('Quiero ejecutar npm test en el proyecto.', {
    apiKey: 'test-key',
    fetchImpl: mockTurnFetch(completeTurn({
      mode: 'RUN_COMMAND',
      assistant_message: '',
      proposal_id: 'run-002',
      intent: 'Ejecutar npm test',
      program: 'npm',
      args: ['test'],
      cwd: '.',
      timeout_ms: 60000
    }), { content: '</tool_call></think> Se ejecutará 🚀🚀' })
  });

  assert.equal(result.assistant_message.includes('</tool_call>'), false);
  assert.equal(result.assistant_message.includes('</think>'), false);
  assert.match(result.assistant_message, /Nemotron propone npm test/);
  assert.equal(result.decision.outcome, 'PREPARED');
});

test('invalid forced turn argument JSON fails closed with provider evidence and no dispatch', async () => {
  const result = await runConversationPipeline('quiero leer el readme', {
    apiKey: 'test-key',
    fetchImpl: mockTurnFetch({}, { rawArguments: '{invalid-json' })
  });

  assert.equal(result.ok, false);
  assert.equal(result.turn_mode, 'ERROR');
  assert.equal(result.decision.outcome, 'DENY');
  assert.ok(result.decision.reason_codes.includes('MODEL_TURN_ARGUMENTS_INVALID_JSON'));
  assert.equal(result.provider.model, DEFAULT_MODEL);
  assert.equal(result.dispatch_attempted, false);
});

test('missing forced tool call fails closed instead of accepting action-like text', async () => {
  const result = await runConversationPipeline('quiero leer el readme', {
    apiKey: 'test-key',
    fetchImpl: mockNoToolFetch('Nemotron propone leer README.md.')
  });

  assert.equal(result.ok, false);
  assert.equal(result.turn_mode, 'ERROR');
  assert.equal(result.decision.outcome, 'DENY');
  assert.ok(result.decision.reason_codes.includes('MODEL_TURN_TOOL_COUNT_INVALID'));
  assert.equal(result.dispatch_attempted, false);
});

test('multiple forced tool calls fail closed instead of choosing one arbitrarily', async () => {
  const read = completeTurn({
    mode: 'READ_CONTEXT', assistant_message: '', proposal_id: 'read-1', intent: 'Leer README', relative_path: 'README.md'
  });
  const command = completeTurn({
    mode: 'RUN_COMMAND', assistant_message: '', proposal_id: 'run-1', intent: 'Ejecutar npm test', program: 'npm', args: ['test'], cwd: '.', timeout_ms: 60000
  });

  const result = await runConversationPipeline('haz ambas cosas', {
    apiKey: 'test-key',
    fetchImpl: mockToolCallsFetch([toolCall(read, { id: 'turn-1' }), toolCall(command, { id: 'turn-2' })])
  });

  assert.equal(result.ok, false);
  assert.equal(result.decision.outcome, 'DENY');
  assert.ok(result.decision.reason_codes.includes('MODEL_TURN_TOOL_COUNT_INVALID'));
  assert.equal(result.dispatch_attempted, false);
});

test('unsupported turn mode fails closed before Phoenix receives an ActionProposal', async () => {
  const result = await runConversationPipeline('haz algo raro', {
    apiKey: 'test-key',
    fetchImpl: mockTurnFetch(completeTurn({ mode: 'UNKNOWN_MODE' }))
  });

  assert.equal(result.ok, false);
  assert.equal(result.turn_mode, 'ERROR');
  assert.equal(result.decision.outcome, 'DENY');
  assert.ok(result.decision.reason_codes.includes('MODEL_TURN_MODE_UNSUPPORTED'));
  assert.equal(result.proposal, null);
  assert.equal(result.dispatch_attempted, false);
});
