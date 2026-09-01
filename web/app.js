const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const VALID_OUTCOMES = new Set(['PREPARED', 'REVIEW', 'DENY']);

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

function renderChecks(checks = []) {
  ui.checks.replaceChildren();
  if (!checks.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = 'No se devolvieron checks.';
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

  setText(ui.provider, isLive ? provider?.provider_response_id : 'LOCAL FIXTURE');
  setText(ui.latency, isLive && provider?.latency_ms !== undefined ? `${provider.latency_ms} ms` : 'LOCAL');
  setText(ui.decisionId, decision.decision_id);
  setText(ui.bundle, decision.evidence_bundle_id);
  setText(ui.hash, decision.decision_hash);
  setText(ui.tokens, isLive ? provider?.usage?.total_tokens : '—');

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
  setBusy(true);
  setStatus('Nemotron está preparando una propuesta estructurada…', 'running');

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? `HTTP_${response.status}`);

    if (result.assistant_message) {
      appendChat('assistant', result.assistant_message, 'NEMOTRON');
    } else {
      appendChat('system', 'Nemotron no devolvió una respuesta conversacional válida. Phoenix cerró el turno.', 'SISTEMA');
    }

    renderResult(result);
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
