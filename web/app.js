const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const VALID_OUTCOMES = new Set(['PREPARED', 'REVIEW', 'DENY']);
const MAX_HISTORY_ITEMS = 8;
const conversationHistory = [];

const ui = {
  chatForm: $('#chat-form'),
  chatLog: $('#chat-log'),
  userMessage: $('#user-message'),
  sendButton: $('#send-button'),
  sourceMetric: $('#metric-source'),
  model: $('#metric-model'),
  risk: $('#metric-risk'),
  decision: $('#metric-decision'),
  decisionMetric: $('#decision-metric'),
  source: $('#source-pill'),
  intent: $('#proposal-intent'),
  action: $('#proposal-action'),
  workspace: $('#proposal-workspace'),
  target: $('#proposal-target'),
  operation: $('#proposal-operation'),
  rollback: $('#proposal-rollback'),
  checks: $('#checks-list'),
  policy: $('#policy-pill'),
  decisionCard: $('#decision-card'),
  decisionTitle: $('#decision-title'),
  decisionCopy: $('#decision-copy'),
  riskPill: $('#risk-pill'),
  reasonCodes: $('#reason-codes'),
  dispatch: $('#dispatch-state'),
  provider: $('#evidence-provider'),
  latency: $('#evidence-latency'),
  decisionId: $('#evidence-decision'),
  bundle: $('#evidence-bundle'),
  hash: $('#evidence-hash'),
  tokens: $('#evidence-tokens'),
  status: $('#status-line')
};

const decisionMessages = {
  PREPARED: 'La propuesta ha superado los checks acotados. Queda preparada para demostración o una fase posterior de revisión; no se ejecuta.',
  REVIEW: 'La propuesta es válida, pero Phoenix exige revisión humana explícita antes de cualquier paso posterior.',
  DENY: 'Phoenix ha cerrado la propuesta. La política no permite que avance.'
};

function setText(node, value, fallback = '—') {
  node.textContent = value === null || value === undefined || value === '' ? fallback : String(value);
}

function setStatus(message, state = '') {
  ui.status.className = `status-line panel ${state}`.trim();
  ui.status.textContent = message;
}

function remember(role, content) {
  if (!content) return;
  conversationHistory.push({ role, content: String(content).trim().slice(0, 1500) });
  while (conversationHistory.length > MAX_HISTORY_ITEMS) conversationHistory.shift();
}

function appendChat(role, text, label) {
  if (!text) return;
  const wrapper = document.createElement('div');
  wrapper.className = `chat-message ${role}-message`;

  if (label) {
    const meta = document.createElement('span');
    meta.className = 'chat-role';
    meta.textContent = label;
    wrapper.append(meta);
  }

  const content = document.createElement('p');
  content.textContent = text;
  wrapper.append(content);
  ui.chatLog.append(wrapper);
  ui.chatLog.scrollTop = ui.chatLog.scrollHeight;
}

function renderChecks(checks = [], emptyMessage = 'No se devolvieron checks.') {
  ui.checks.replaceChildren();
  if (!checks.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = emptyMessage;
    ui.checks.append(empty);
    return;
  }

  for (const check of checks) {
    const row = document.createElement('div');
    const status = String(check.status ?? '').toLowerCase();
    row.className = `check-row ${status}`.trim();

    const dot = document.createElement('span');
    dot.className = 'check-dot';

    const name = document.createElement('span');
    name.className = 'check-name';
    name.textContent = check.check ?? 'unknown_check';

    const evidence = document.createElement('span');
    evidence.className = 'check-evidence';
    evidence.textContent = `${check.status ?? '—'} · ${check.evidence_ref ?? '—'}`;

    row.append(dot, name, evidence);
    ui.checks.append(row);
  }
}

function renderProviderEvidence(result) {
  const provider = result.provider ?? null;
  const isLive = result.source === 'LIVE_NEBIUS_NEMOTRON';
  setText(ui.provider, isLive ? provider?.provider_response_id : 'LOCAL FIXTURE');
  setText(ui.latency, isLive && provider?.latency_ms !== undefined && provider?.latency_ms !== null ? `${provider.latency_ms} ms` : (isLive ? '—' : 'LOCAL'));
  setText(ui.tokens, isLive ? provider?.usage?.total_tokens : '—');
}

function renderFailClosedVisual(message) {
  ui.decisionMetric.className = 'metric panel decision-metric deny';
  ui.decisionCard.className = 'panel card decision-card deny';
  setText(ui.decision, 'DENY');
  setText(ui.decisionTitle, 'DENY');
  setText(ui.risk, 'R3');
  setText(ui.riskPill, 'R3');
  setText(ui.decisionCopy, message);
  setText(ui.dispatch, 'NO');
}

function renderChatOnly(result) {
  const provider = result.provider ?? null;

  setText(ui.sourceMetric, 'LIVE');
  setText(ui.model, provider?.model);
  setText(ui.risk, '—');
  setText(ui.decision, 'CHAT');
  setText(ui.source, 'LIVE NEMOTRON');

  setText(ui.intent, 'Sin acción gobernable');
  setText(ui.action, 'CHAT');
  setText(ui.workspace, '—');
  setText(ui.target, '—');
  setText(ui.operation, '—');
  setText(ui.rollback, '—');

  renderChecks([], 'No hay ActionProposal en este turno. Phoenix no tiene ninguna acción que evaluar.');
  setText(ui.decisionTitle, 'SIN ACCIÓN');
  setText(ui.riskPill, '—');
  setText(ui.decisionCopy, 'Nemotron respondió conversacionalmente. No se propuso ninguna acción sobre el workspace.');
  setText(ui.reasonCodes, 'CHAT_ONLY');
  setText(ui.dispatch, 'NO');
  setText(ui.decisionId, '—');
  setText(ui.bundle, '—');
  setText(ui.hash, '—');
  renderProviderEvidence(result);

  ui.decisionMetric.className = 'metric panel decision-metric';
  ui.decisionCard.className = 'panel card decision-card';
  setStatus('Nemotron respondió en modo CHAT. Phoenix no evaluó ninguna acción y dispatch sigue deshabilitado.', 'success');
}

function renderProviderFailure(result) {
  const provider = result.provider ?? null;
  const decision = result.decision ?? {};
  const code = result.provider_error?.code ?? decision.reason_codes?.[0] ?? 'PROVIDER_FAILURE';

  setText(ui.sourceMetric, 'LIVE');
  setText(ui.model, provider?.model);
  setText(ui.risk, decision.risk_class ?? 'R3');
  setText(ui.decision, 'DENY');
  setText(ui.source, 'LIVE NEMOTRON');

  setText(ui.intent, 'Turno inválido del proveedor');
  setText(ui.action, '—');
  setText(ui.workspace, '—');
  setText(ui.target, '—');
  setText(ui.operation, '—');
  setText(ui.rollback, '—');

  renderChecks(decision.checks, 'El proveedor no produjo un turno evaluable.');
  setText(ui.policy, decision.policy_version);
  setText(ui.decisionTitle, 'DENY');
  setText(ui.riskPill, decision.risk_class ?? 'R3');
  setText(ui.decisionCopy, 'Nemotron no produjo un turno válido. Phoenix cerró el turno sin convertirlo en una acción.');
  setText(ui.reasonCodes, Array.isArray(decision.reason_codes) ? decision.reason_codes.join(' · ') : code);
  setText(ui.dispatch, 'NO');

  renderProviderEvidence(result);
  setText(ui.decisionId, decision.decision_id);
  setText(ui.bundle, decision.evidence_bundle_id);
  setText(ui.hash, decision.decision_hash);

  ui.decisionMetric.className = 'metric panel decision-metric deny';
  ui.decisionCard.className = 'panel card decision-card deny';
  setStatus(`Nemotron no produjo un turno válido (${code}). Phoenix cerró el turno; no hubo ActionProposal ni dispatch.`, 'error');
}

function renderResult(result) {
  const proposal = result.proposal ?? {};
  const decision = result.decision ?? {};
  const provider = result.provider ?? null;
  const outcome = decision.outcome;

  if (!VALID_OUTCOMES.has(outcome)) {
    throw new Error('INVALID_DECISION_PAYLOAD');
  }

  const isLive = result.source === 'LIVE_NEBIUS_NEMOTRON';
  const outcomeClass = outcome.toLowerCase();

  setText(ui.sourceMetric, isLive ? 'LIVE' : 'LOCAL');
  setText(ui.model, isLive ? (provider?.model ?? proposal.model_context?.model_id) : 'SIN MODELO');
  setText(ui.risk, decision.risk_class);
  setText(ui.decision, outcome);
  setText(ui.source, isLive ? 'LIVE NEMOTRON' : 'LOCAL FIXTURE');

  setText(ui.intent, proposal.intent);
  setText(ui.action, proposal.action_type);
  setText(ui.workspace, proposal.target?.workspace_id);
  setText(ui.target, proposal.target?.relative_path ?? '(workspace root)');
  setText(ui.operation, proposal.operation?.kind);
  setText(ui.rollback, proposal.reversibility?.kind);

  renderChecks(decision.checks);
  setText(ui.policy, decision.policy_version);
  setText(ui.decisionTitle, outcome);
  setText(ui.riskPill, decision.risk_class);
  setText(ui.decisionCopy, decisionMessages[outcome]);
  setText(ui.reasonCodes, Array.isArray(decision.reason_codes) ? decision.reason_codes.join(' · ') : null);
  setText(ui.dispatch, decision.dispatch_attempted === true ? 'YES' : 'NO');

  renderProviderEvidence(result);
  setText(ui.decisionId, decision.decision_id);
  setText(ui.bundle, decision.evidence_bundle_id);
  setText(ui.hash, decision.decision_hash);

  ui.decisionMetric.className = `metric panel decision-metric ${outcomeClass}`;
  ui.decisionCard.className = `panel card decision-card ${outcomeClass}`;

  setStatus(
    isLive
      ? `Nemotron propuso una acción y Phoenix decidió ${outcome}. Dispatch continúa deshabilitado.`
      : `Fixture local evaluado por Phoenix → ${outcome}. Nemotron no participó en esta ejecución.`,
    outcome === 'DENY' ? 'error' : 'success'
  );
}

function setBusy(busy) {
  ui.sendButton.disabled = busy;
  ui.userMessage.disabled = busy;
  $$('.fixture-button').forEach((button) => { button.disabled = busy; });
}

async function runConversation(message) {
  $$('.fixture-button').forEach((button) => button.classList.remove('active'));
  appendChat('user', message, 'TÚ');
  const history = conversationHistory.map((item) => ({ ...item }));
  setBusy(true);
  setStatus('Nemotron está respondiendo o preparando una propuesta gobernable…', 'running');

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? `HTTP_${response.status}`);

    if (result.assistant_message) {
      appendChat('assistant', result.assistant_message, 'NEMOTRON');
      remember('user', message);
      remember('assistant', result.assistant_message);
    } else {
      const code = result.provider_error?.code ?? result.error ?? 'UNKNOWN_MODEL_ERROR';
      appendChat('system', `Nemotron no produjo un turno válido (${code}). Phoenix cerró el turno.`, 'SISTEMA');
    }

    if (result.turn_mode === 'CHAT') {
      renderChatOnly(result);
    } else if (result.turn_mode === 'ERROR') {
      renderProviderFailure(result);
    } else {
      renderResult(result);
    }
  } catch (error) {
    appendChat('system', `La solicitud no produjo un resultado gobernado válido: ${error.message}`, 'SISTEMA');
    renderFailClosedVisual('El panel no obtuvo una decisión gobernada válida y muestra DENY por defecto.');
    setStatus(`Solicitud cerrada: ${error.message}`, 'error');
  } finally {
    setBusy(false);
    ui.userMessage.focus();
  }
}

async function runFixture(button) {
  $$('.fixture-button').forEach((item) => item.classList.toggle('active', item === button));
  setBusy(true);
  setStatus(`Ejecutando fixture local ${button.textContent.trim()}…`, 'running');

  try {
    const response = await fetch(button.dataset.endpoint, { method: 'POST', headers: { Accept: 'application/json' } });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? `HTTP_${response.status}`);
    renderResult(result);
  } catch (error) {
    renderFailClosedVisual('El fixture no produjo una decisión válida.');
    setStatus(`Fixture cerrado: ${error.message}`, 'error');
  } finally {
    setBusy(false);
  }
}

ui.chatForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const message = ui.userMessage.value.trim();
  if (!message) return;
  ui.userMessage.value = '';
  runConversation(message);
});

for (const button of $$('.quick-prompts button')) {
  button.addEventListener('click', () => {
    ui.userMessage.value = button.dataset.prompt ?? '';
    ui.userMessage.focus();
    setStatus('Ejemplo cargado. Puedes editarlo antes de enviarlo.', '');
  });
}

for (const button of $$('.fixture-button')) {
  button.addEventListener('click', () => runFixture(button));
}

try {
  const health = await fetch('/api/health', { headers: { Accept: 'application/json' } }).then((response) => response.json());
  if (health.ok) {
    setText(ui.policy, health.policy_version);
    if (health.dispatch_available === false) setText(ui.dispatch, 'NO');
  }
} catch {
  setStatus('El health check del panel falló. No se intentó ninguna acción.', 'error');
}
