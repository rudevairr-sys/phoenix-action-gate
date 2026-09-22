const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const VALID_OUTCOMES = new Set(['PREPARED', 'REVIEW', 'DENY']);
const MAX_HISTORY_ITEMS = 8;
const PROFILE_MODE_ACTION_GATE = 'ACTION_GATE';
const conversationHistory = [];
let backendProfileIds = new Set();
let backendProfilesLoaded = false;

const ui = {
  chatForm: $('#chat-form'),
  chatLog: $('#chat-log'),
  userMessage: $('#user-message'),
  sendButton: $('#send-button'),
  planButton: $('#plan-button'),
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
  status: $('#status-line'),
  singleResultGrid: $('#single-result-grid'),
  planResult: $('#plan-result'),
  planId: $('#plan-id'),
  planBaseline: $('#plan-baseline'),
  planPhoenix: $('#plan-phoenix'),
  planDivergence: $('#plan-divergence'),
  planSteps: $('#plan-steps'),
  lineageStatus: $('#lineage-status'),
  lineageEvidence: $('#lineage-evidence'),
  lineageSource: $('#lineage-source'),
  lineageExpected: $('#lineage-expected'),
  lineageObserved: $('#lineage-observed'),
  lineageInvalidatedBy: $('#lineage-invalidated-by'),
  planProvider: $('#plan-provider'),
  planLatency: $('#plan-latency'),
  planTokens: $('#plan-tokens'),
  planDecisionId: $('#plan-decision-id'),
  planBundle: $('#plan-bundle'),
  planHash: $('#plan-hash'),
  planDecisionTitle: $('#plan-decision-title'),
  planDecisionCopy: $('#plan-decision-copy'),
  planReasonCodes: $('#plan-reason-codes'),
  planDispatch: $('#plan-dispatch'),
  planReasonCard: $('.plan-reason-card'),
  
  activeProfile: $('#active-profile'),
  activeProfileChip: $('#active-profile-chip'),
  profileForm: $('#profile-gate-form'),
  profileType: $('#profile-type'),
  profileMessage: $('#profile-message'),
  profileSendButton: $('#profile-send-button'),
  profileResult: $('#profile-result')
};

const decisionMessages = {
  PREPARED: 'La propuesta ha superado los checks acotados. Queda preparada para demostración o una fase posterior de revisión; no se ejecuta.',
  REVIEW: 'La propuesta es válida, pero Phoenix exige revisión humana explícita antes de cualquier paso posterior.',
  DENY: 'Phoenix ha cerrado la propuesta. La política no permite que avance.'
};

const profileDecisionMessages = {
  PREPARED: 'Nemotron respetó el contrato del perfil activo. Phoenix acepta la salida como respuesta gobernada, sin dispatch.',
  REVIEW: 'Nemotron produjo una salida compatible, pero el perfil requiere revisión antes de avanzar. No hubo dispatch.',
  DENY: 'Nemotron se salió del contrato del perfil. Phoenix bloqueó la salida y no la mostró como respuesta aceptada.'
};

function setText(node, value, fallback = '—') {
  if (!node) return;
  node.textContent = value === null || value === undefined || value === '' ? fallback : String(value);
}

function setStatus(message, state = '') {
  ui.status.className = `status-line panel ${state}`.trim();
  ui.status.textContent = message;
}

function showSingleView() {
  ui.singleResultGrid.hidden = false;
  ui.planResult.hidden = true;
}

function showPlanView() {
  ui.singleResultGrid.hidden = true;
  ui.planResult.hidden = false;
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

function isSingleLive(result) {
  return result.source === 'LIVE_NEBIUS_NEMOTRON';
}

function renderProviderEvidence(result) {
  const provider = result.provider ?? null;
  const isLive = isSingleLive(result);
  setText(ui.provider, isLive ? provider?.provider_response_id : 'LOCAL FIXTURE');
  setText(ui.latency, isLive && provider?.latency_ms !== undefined && provider?.latency_ms !== null ? `${provider.latency_ms} ms` : (isLive ? '—' : 'LOCAL'));
  setText(ui.tokens, isLive ? provider?.usage?.total_tokens : '—');
}

function renderProfileEvidence(result) {
  const provider = result.provider ?? null;
  setText(ui.provider, provider?.provider_response_id);
  setText(ui.latency, provider?.latency_ms !== undefined && provider?.latency_ms !== null ? `${provider.latency_ms} ms` : null);
  setText(ui.tokens, provider?.usage?.total_tokens);
  setText(ui.decisionId, 'PROFILE-GATE');
  setText(ui.bundle, 'PROFILE-CONTRACT');
  setText(ui.hash, '—');
}

function resetSingleProposalDetails() {
  setText(ui.intent, '—');
  setText(ui.action, '—');
  setText(ui.workspace, '—');
  setText(ui.target, '—');
  setText(ui.operation, '—');
  setText(ui.rollback, '—');
}

function renderTransportFailureVisual(message) {
  showSingleView();
  ui.decisionMetric.className = 'metric panel decision-metric provider-fail';
  ui.decisionCard.className = 'panel card decision-card provider-fail';
  setText(ui.decision, 'PROVIDER FAIL-CLOSED');
  setText(ui.decisionTitle, 'PROVIDER FAIL-CLOSED');
  setText(ui.risk, 'R3');
  setText(ui.riskPill, 'R3');
  setText(ui.decisionCopy, message);
  setText(ui.dispatch, 'NO');
}

function renderChatOnly(result) {
  showSingleView();
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

function renderClarification(result) {
  showSingleView();
  const provider = result.provider ?? null;

  setText(ui.sourceMetric, 'LIVE');
  setText(ui.model, provider?.model);
  setText(ui.risk, '—');
  setText(ui.decision, 'ACLARAR');
  setText(ui.source, 'LIVE NEMOTRON');
  setText(ui.intent, 'Petición incompleta');
  setText(ui.action, 'SIN ACTIONPROPOSAL');
  setText(ui.workspace, '—');
  setText(ui.target, '—');
  setText(ui.operation, '—');
  setText(ui.rollback, '—');

  renderChecks([], 'La petición necesita una aclaración antes de construir una ActionProposal. Phoenix no evaluó ninguna acción.');
  setText(ui.decisionTitle, 'ACLARACIÓN REQUERIDA');
  setText(ui.riskPill, '—');
  setText(ui.decisionCopy, result.assistant_message ?? 'Falta concretar la modificación solicitada.');
  setText(ui.reasonCodes, result.clarification_reason ?? 'INCOMPLETE_REQUEST');
  setText(ui.dispatch, 'NO');
  setText(ui.decisionId, '—');
  setText(ui.bundle, '—');
  setText(ui.hash, '—');
  renderProviderEvidence(result);

  ui.decisionMetric.className = 'metric panel decision-metric clarification';
  ui.decisionCard.className = 'panel card decision-card clarification';
  setStatus('Falta información para preparar una ActionProposal. No se inventó ningún cambio y no hubo dispatch.', 'running');
}

function renderProviderFailure(result) {
  showSingleView();
  const provider = result.provider ?? null;
  const decision = result.decision ?? {};
  const code = result.provider_error?.code ?? decision.reason_codes?.[0] ?? 'PROVIDER_FAILURE';

  setText(ui.sourceMetric, 'LIVE');
  setText(ui.model, provider?.model);
  setText(ui.risk, decision.risk_class ?? 'R3');
  setText(ui.decision, 'PROVIDER FAIL-CLOSED');
  setText(ui.source, 'LIVE NEMOTRON');

  setText(ui.intent, 'Turno inválido del proveedor');
  setText(ui.action, 'SIN ACTIONPROPOSAL');
  setText(ui.workspace, '—');
  setText(ui.target, '—');
  setText(ui.operation, '—');
  setText(ui.rollback, '—');

  renderChecks(decision.checks, 'El proveedor no produjo un turno evaluable.');
  setText(ui.policy, decision.policy_version);
  setText(ui.decisionTitle, 'PROVIDER FAIL-CLOSED');
  setText(ui.riskPill, decision.risk_class ?? 'R3');
  setText(ui.decisionCopy, 'Nemotron no produjo un turno válido. Phoenix no recibió una ActionProposal; el adaptador cerró el turno sin ejecución.');
  setText(ui.reasonCodes, Array.isArray(decision.reason_codes) ? decision.reason_codes.join(' · ') : code);
  setText(ui.dispatch, 'NO');

  renderProviderEvidence(result);
  setText(ui.decisionId, decision.decision_id);
  setText(ui.bundle, decision.evidence_bundle_id);
  setText(ui.hash, decision.decision_hash);

  ui.decisionMetric.className = 'metric panel decision-metric provider-fail';
  ui.decisionCard.className = 'panel card decision-card provider-fail';
  setStatus(`Provider fail-closed (${code}). No hubo ActionProposal, decisión política sobre una acción ni dispatch.`, 'error');
}

function renderResult(result) {
  showSingleView();
  const proposal = result.proposal ?? {};
  const decision = result.decision ?? {};
  const provider = result.provider ?? null;
  const outcome = decision.outcome;

  if (!VALID_OUTCOMES.has(outcome)) throw new Error('INVALID_DECISION_PAYLOAD');

  const isLive = isSingleLive(result);
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
      ? `Nemotron produjo una ActionProposal y Phoenix decidió ${outcome}. Dispatch continúa deshabilitado.`
      : `Fixture local evaluado por Phoenix → ${outcome}. Nemotron no participó en esta ejecución.`,
    outcome === 'DENY' ? 'error' : 'success'
  );
}

function renderProfileDecision(result) {
  showSingleView();
  const decision = result.profile_decision ?? {};
  const provider = result.provider ?? null;
  const outcome = decision.outcome ?? 'DENY';
  const outcomeClass = outcome === 'DENY' ? 'deny' : 'prepared';

  setText(ui.sourceMetric, 'PROFILE');
  setText(ui.model, provider?.model);
  setText(ui.risk, result.profile_id);
  setText(ui.decision, outcome);
  setText(ui.source, 'PROFILE NEMOTRON');

  setText(ui.intent, `Perfil ${result.profile_id}`);
  setText(ui.action, 'PROFILE_CHAT');
  setText(ui.workspace, '—');
  setText(ui.target, 'Contrato de perfil');
  setText(ui.operation, 'profile_gate');
  setText(ui.rollback, 'NO_DISPATCH');

  renderChecks(decision.checks, 'Phoenix no recibió checks de perfil.');
  setText(ui.policy, decision.version ?? 'phoenix-profile-gate');
  setText(ui.decisionTitle, outcome);
  setText(ui.riskPill, result.profile_id);
  setText(ui.decisionCopy, profileDecisionMessages[outcome] ?? profileDecisionMessages.DENY);
  setText(ui.reasonCodes, Array.isArray(decision.reason_codes) ? decision.reason_codes.join(' · ') : null);
  setText(ui.dispatch, 'NO');
  renderProfileEvidence(result);

  ui.decisionMetric.className = `metric panel decision-metric ${outcomeClass}`;
  ui.decisionCard.className = `panel card decision-card ${outcomeClass}`;

  if (ui.profileResult) {
    ui.profileResult.className = `contract-result ${outcomeClass}`;
    ui.profileResult.replaceChildren();
    const title = document.createElement('strong');
    title.textContent = outcome;
    const detail = document.createElement('span');
    const reasons = Array.isArray(decision.reason_codes) ? decision.reason_codes.join(' · ') : 'NO_REASON_CODES';
    detail.textContent = `${result.profile_id ?? 'PROFILE'} · ${reasons} · dispatch_attempted=false`;
    ui.profileResult.append(title, detail);
  }

  setStatus(
    outcome === 'DENY'
      ? `Profile Gate bloqueó la salida de Nemotron para ${result.profile_id}. No hubo dispatch.`
      : `Profile Gate aceptó la salida de Nemotron para ${result.profile_id}. No hubo dispatch.`,
    outcome === 'DENY' ? 'error' : 'success'
  );
}

function outcomeChip(outcome) {
  const chip = document.createElement('span');
  const normalized = VALID_OUTCOMES.has(outcome) ? outcome : '—';
  chip.className = `outcome-chip ${String(normalized).toLowerCase()}`.trim();
  chip.textContent = normalized;
  return chip;
}

function renderPlanSteps(result) {
  ui.planSteps.replaceChildren();
  const phoenixSteps = Array.isArray(result.phoenix?.steps) ? result.phoenix.steps : [];
  const baselineSteps = Array.isArray(result.baseline?.steps) ? result.baseline.steps : [];

  if (!phoenixSteps.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = 'El plan no produjo pasos evaluables.';
    ui.planSteps.append(empty);
    return;
  }

  for (const step of phoenixSteps) {
    const baselineStep = baselineSteps.find((item) => item.step_id === step.step_id);
    const row = document.createElement('div');
    row.className = 'plan-step';

    const id = document.createElement('span');
    id.className = 'plan-step-id';
    id.textContent = step.step_id ?? '—';

    const action = document.createElement('span');
    action.className = 'plan-step-action';
    action.textContent = step.action_type ?? '—';

    const target = document.createElement('span');
    target.className = 'plan-step-target';
    const targetPath = step.target?.relative_path ?? '(workspace root)';
    const reasons = Array.isArray(step.causal_reason_codes) && step.causal_reason_codes.length
      ? ` · ${step.causal_reason_codes.join(', ')}`
      : '';
    target.textContent = `${targetPath}${reasons}`;

    const baseline = outcomeChip(baselineStep?.outcome ?? baselineStep?.effective_outcome ?? '—');
    baseline.title = 'Baseline';

    const phoenix = outcomeChip(step.effective_outcome ?? step.base_outcome ?? '—');
    phoenix.title = 'Phoenix';

    row.append(id, action, target, baseline, phoenix);
    ui.planSteps.append(row);
  }
}

function renderLineage(result) {
  const conflict = result.discriminant?.lineage_conflict ?? null;
  const invalidated = result.discriminant?.evidence_lineage_invalidation_detected === true;

  ui.lineageStatus.className = `risk-pill ${invalidated ? 'invalid' : 'valid'}`;
  setText(ui.lineageStatus, invalidated ? 'INVALIDATED' : 'NO CONFLICT');
  setText(ui.lineageEvidence, conflict?.evidence_id);
  setText(ui.lineageSource, conflict?.source_resource);
  setText(ui.lineageExpected, conflict?.expected_source_version);
  setText(ui.lineageObserved, conflict?.observed_source_version);
  setText(ui.lineageInvalidatedBy, conflict?.invalidated_by);
}

function renderPlanEvidence(result) {
  const provider = result.provider ?? null;
  const phoenix = result.phoenix ?? {};
  setText(ui.planProvider, provider?.provider_response_id);
  setText(ui.planLatency, provider?.latency_ms !== undefined && provider?.latency_ms !== null ? `${provider.latency_ms} ms` : null);
  setText(ui.planTokens, provider?.usage?.total_tokens);
  setText(ui.planDecisionId, phoenix.plan_decision_id);
  setText(ui.planBundle, phoenix.evidence_bundle_id);
  setText(ui.planHash, phoenix.decision_hash);
}

function renderPlanResult(result) {
  showPlanView();
  const phoenix = result.phoenix ?? {};
  const baseline = result.baseline ?? null;
  const outcome = phoenix.outcome;
  if (!VALID_OUTCOMES.has(outcome)) throw new Error('INVALID_PLAN_DECISION_PAYLOAD');

  setText(ui.sourceMetric, 'LIVE PLAN');
  setText(ui.model, result.provider?.model);
  setText(ui.risk, phoenix.risk_class);
  setText(ui.decision, outcome);
  ui.decisionMetric.className = `metric panel decision-metric ${outcome.toLowerCase()}`;

  setText(ui.planId, result.plan?.plan_id);
  setText(ui.planBaseline, baseline?.outcome ?? 'N/A');
  setText(ui.planPhoenix, outcome);
  setText(ui.planDivergence, result.comparison?.divergence_count ?? 0);

  renderPlanSteps(result);
  renderLineage(result);
  renderPlanEvidence(result);

  setText(ui.planDecisionTitle, outcome);
  setText(ui.planDecisionCopy,
    result.discriminant?.evidence_lineage_invalidation_detected
      ? 'Phoenix detectó que una evidencia downstream dependía de una versión causal que cambió después de producirla.'
      : decisionMessages[outcome]
  );
  setText(ui.planReasonCodes, Array.isArray(phoenix.reason_codes) ? phoenix.reason_codes.join(' · ') : null);
  setText(ui.planDispatch, phoenix.dispatch_attempted === true ? 'YES' : 'NO');
  ui.planReasonCard.className = `panel card plan-reason-card ${outcome.toLowerCase()}`;

  const baselineOutcome = baseline?.outcome ?? 'N/A';
  const divergence = result.comparison?.divergence_count ?? 0;
  setStatus(
    `Plan LIVE evaluado: baseline ${baselineOutcome} → Phoenix ${outcome}. Divergencias: ${divergence}. Dispatch deshabilitado.`,
    outcome === 'DENY' ? 'error' : 'success'
  );
}

function renderPlanFailure(result) {
  showPlanView();
  const code = result.provider_error?.code ?? result.phoenix?.reason_codes?.[0] ?? 'PROVIDER_FAILURE';
  const provider = result.provider ?? null;
  const phoenix = result.phoenix ?? {};

  setText(ui.sourceMetric, 'LIVE PLAN');
  setText(ui.model, provider?.model);
  setText(ui.risk, phoenix.risk_class ?? 'R3');
  setText(ui.decision, 'PROVIDER FAIL-CLOSED');
  ui.decisionMetric.className = 'metric panel decision-metric provider-fail';

  setText(ui.planId, 'NO PLAN');
  setText(ui.planBaseline, 'N/A');
  setText(ui.planPhoenix, 'PROVIDER FAIL-CLOSED');
  setText(ui.planDivergence, 'N/A');
  ui.planSteps.replaceChildren();
  const empty = document.createElement('div');
  empty.className = 'empty-state';
  empty.textContent = 'Nemotron no produjo un plan válido para Phoenix. No hay pasos que evaluar.';
  ui.planSteps.append(empty);

  ui.lineageStatus.className = 'risk-pill';
  setText(ui.lineageStatus, 'N/A');
  setText(ui.lineageEvidence, '—');
  setText(ui.lineageSource, '—');
  setText(ui.lineageExpected, '—');
  setText(ui.lineageObserved, '—');
  setText(ui.lineageInvalidatedBy, '—');

  setText(ui.planProvider, provider?.provider_response_id);
  setText(ui.planLatency, provider?.latency_ms !== undefined && provider?.latency_ms !== null ? `${provider.latency_ms} ms` : null);
  setText(ui.planTokens, provider?.usage?.total_tokens);
  setText(ui.planDecisionId, phoenix.plan_decision_id);
  setText(ui.planBundle, phoenix.evidence_bundle_id);
  setText(ui.planHash, phoenix.decision_hash);
  setText(ui.planDecisionTitle, 'PROVIDER FAIL-CLOSED');
  setText(ui.planDecisionCopy, 'El proveedor no produjo un ActionPlan válido. Phoenix no recibió un plan evaluable y nada fue ejecutado.');
  setText(ui.planReasonCodes, code);
  setText(ui.planDispatch, 'NO');
  ui.planReasonCard.className = 'panel card plan-reason-card deny';
  setStatus(`Plan provider fail-closed (${code}). No hubo ActionPlan evaluable ni dispatch.`, 'error');
}

function setBusy(busy) {
  ui.sendButton.disabled = busy;
  ui.planButton.disabled = busy;
  ui.userMessage.disabled = busy;
  if (ui.activeProfile) ui.activeProfile.disabled = busy || !backendProfilesLoaded;
  $$('.fixture-button').forEach((button) => { button.disabled = busy; });
  if (ui.profileSendButton) ui.profileSendButton.disabled = busy;
  if (ui.profileMessage) ui.profileMessage.disabled = busy;
  if (ui.profileType) ui.profileType.disabled = busy;
}

function isProfileMode(profileId) {
  return typeof profileId === 'string'
    && profileId.length > 0
    && profileId !== PROFILE_MODE_ACTION_GATE
    && backendProfileIds.has(profileId);
}

function renderProfileOptions(profiles = []) {
  if (!ui.activeProfile) return;
  const previous = ui.activeProfile.value || PROFILE_MODE_ACTION_GATE;
  ui.activeProfile.replaceChildren();

  const actionGate = document.createElement('option');
  actionGate.value = PROFILE_MODE_ACTION_GATE;
  actionGate.textContent = 'ACTION_GATE — chat/acciones normales';
  ui.activeProfile.append(actionGate);

  backendProfileIds = new Set();
  for (const profile of profiles) {
    if (!profile || typeof profile.id !== 'string' || !profile.id.trim()) continue;
    const option = document.createElement('option');
    option.value = profile.id;
    option.textContent = `${profile.id} — ${profile.description ?? profile.label ?? 'perfil especializado'}`;
    ui.activeProfile.append(option);
    backendProfileIds.add(profile.id);
  }

  backendProfilesLoaded = backendProfileIds.size > 0;
  ui.activeProfile.disabled = !backendProfilesLoaded;
  if (backendProfilesLoaded && (previous === PROFILE_MODE_ACTION_GATE || backendProfileIds.has(previous))) {
    ui.activeProfile.value = previous;
  } else {
    ui.activeProfile.value = PROFILE_MODE_ACTION_GATE;
  }
  syncActiveProfileSelection(ui.activeProfile.value);
}

function loadBackendProfiles(health) {
  const profiles = Array.isArray(health?.profiles) ? health.profiles : [];
  renderProfileOptions(profiles);
  if (!backendProfilesLoaded) {
    setStatus('PROFILE_OPTIONS_UNAVAILABLE: no se cargaron perfiles desde /api/health. El dashboard queda en ACTION_GATE.', 'error');
  }
}

function getDashboardProfileMode() {
  return ui.activeProfile?.value ?? PROFILE_MODE_ACTION_GATE;
}

function syncActiveProfileSelection(profileId = getDashboardProfileMode()) {
  if (ui.activeProfileChip) setText(ui.activeProfileChip, `Perfil: ${profileId}`);
  if (ui.activeProfile && ui.activeProfile.value !== profileId) ui.activeProfile.value = profileId;
  if (ui.profileType && isProfileMode(profileId) && ui.profileType.value !== profileId) ui.profileType.value = profileId;
}

async function runProfileMessage(profileId, message, { clearNode = null, focusNode = ui.userMessage, label = 'TÚ · PERFIL' } = {}) {
  if (!isProfileMode(profileId)) {
    return runConversation(message);
  }

  appendChat('user', `[${profileId}] ${message}`, label);
  const history = conversationHistory.map((item) => ({ ...item }));
  setBusy(true);
  syncActiveProfileSelection(profileId);
  setStatus(`Dashboard lock: Nemotron opera exactamente como ${profileId}. Phoenix verificará el contrato…`, 'running');

  try {
    const response = await fetch('/api/profile-chat', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile_id: profileId, message, history })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? `HTTP_${response.status}`);

    if (result.assistant_message) {
      appendChat('assistant', result.assistant_message, `NEMOTRON · ${profileId}`);
      remember('user', `[${profileId}] ${message}`);
      remember('assistant', result.assistant_message);
    } else {
      const reasons = Array.isArray(result.profile_decision?.reason_codes) ? result.profile_decision.reason_codes.join(' · ') : 'PROFILE_DENIED';
      appendChat('system', `Phoenix bloqueó la salida del perfil ${profileId}: ${reasons}.`, 'PHOENIX PROFILE GATE');
    }

    renderProfileDecision(result);
    if (clearNode) clearNode.value = '';
  } catch (error) {
    if (ui.profileResult) {
      ui.profileResult.className = 'contract-result deny';
      ui.profileResult.innerHTML = '<strong>FAIL-CLOSED</strong><span>No se pudo evaluar el perfil. No hubo dispatch.</span>';
    }
    appendChat('system', `Profile Gate cerrado: ${error.message}`, 'SISTEMA');
    renderTransportFailureVisual('El Profile Gate no obtuvo un resultado gobernado válido. No hubo dispatch.');
    setStatus(`Profile Gate cerrado: ${error.message}`, 'error');
  } finally {
    setBusy(false);
    focusNode?.focus();
  }
}

async function runProfileGate() {
  const profileId = ui.profileType.value;
  const message = ui.profileMessage.value.trim();
  if (!message) {
    setStatus('Escribe una petición para Nemotron bajo el perfil seleccionado.', 'error');
    ui.profileMessage.focus();
    return;
  }
  return runProfileMessage(profileId, message, { clearNode: ui.profileMessage, focusNode: ui.profileMessage });
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
      const label = result.turn_mode === 'CLARIFICATION' ? 'PHOENIX · ACLARACIÓN' : 'NEMOTRON';
      appendChat('assistant', result.assistant_message, label);
      remember('user', message);
      remember('assistant', result.assistant_message);
    } else if (result.turn_mode === 'ERROR') {
      const code = result.provider_error?.code ?? result.error ?? 'UNKNOWN_MODEL_ERROR';
      appendChat('system', `Provider fail-closed (${code}). No se construyó ninguna ActionProposal.`, 'SISTEMA');
    }

    if (result.turn_mode === 'CHAT') {
      renderChatOnly(result);
    } else if (result.turn_mode === 'CLARIFICATION') {
      renderClarification(result);
    } else if (result.turn_mode === 'ERROR') {
      renderProviderFailure(result);
    } else {
      renderResult(result);
    }
  } catch (error) {
    appendChat('system', `La solicitud no produjo un resultado gobernado válido: ${error.message}`, 'SISTEMA');
    renderTransportFailureVisual('El panel no obtuvo un resultado gobernado válido. No se construyó ninguna ActionProposal y no hubo dispatch.');
    resetSingleProposalDetails();
    setStatus(`Solicitud cerrada: ${error.message}`, 'error');
  } finally {
    setBusy(false);
    ui.userMessage.focus();
  }
}

async function runPlan(message) {
  $$('.fixture-button').forEach((button) => button.classList.remove('active'));
  appendChat('user', message, 'TÚ · PLAN');
  setBusy(true);
  setStatus('Nemotron está proponiendo un plan compacto. Phoenix evaluará dependencias, estado y lineage sin ejecutar nada…', 'running');

  try {
    const response = await fetch('/api/plan', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? `HTTP_${response.status}`);

    if (result.state === 'FAIL_CLOSED' || !result.plan) {
      appendChat('system', `Plan provider fail-closed (${result.provider_error?.code ?? 'NO_PLAN'}). No se ejecutó nada.`, 'SISTEMA');
      renderPlanFailure(result);
      return;
    }

    appendChat('assistant', `Nemotron propuso un plan de ${result.plan.actions?.length ?? 0} pasos. Phoenix lo evaluó sin ejecutar ninguna acción.`, 'NEMOTRON · PLAN');
    renderPlanResult(result);
  } catch (error) {
    showPlanView();
    setText(ui.sourceMetric, 'LIVE PLAN');
    setText(ui.model, '—');
    setText(ui.risk, 'R3');
    setText(ui.decision, 'PROVIDER FAIL-CLOSED');
    ui.decisionMetric.className = 'metric panel decision-metric provider-fail';
    setText(ui.planDecisionTitle, 'PROVIDER FAIL-CLOSED');
    setText(ui.planDecisionCopy, 'El panel no obtuvo un resultado de plan gobernado válido. No hubo ejecución.');
    setText(ui.planReasonCodes, error.message);
    setText(ui.planDispatch, 'NO');
    appendChat('system', `La solicitud de plan se cerró: ${error.message}`, 'SISTEMA');
    setStatus(`Plan cerrado: ${error.message}`, 'error');
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
    renderTransportFailureVisual('El fixture no produjo una decisión válida.');
    setStatus(`Fixture cerrado: ${error.message}`, 'error');
  } finally {
    setBusy(false);
  }
}

ui.chatForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const message = ui.userMessage.value.trim();
  if (!message) return;
  const activeProfile = getDashboardProfileMode();
  ui.userMessage.value = '';
  if (isProfileMode(activeProfile)) {
    runProfileMessage(activeProfile, message, { focusNode: ui.userMessage, label: 'TÚ · DASHBOARD PERFIL' });
  } else {
    runConversation(message);
  }
});

ui.planButton.addEventListener('click', () => {
  const message = ui.userMessage.value.trim();
  if (!message) return;
  ui.userMessage.value = '';
  runPlan(message);
});

for (const button of $$('.quick-prompts button')) {
  button.addEventListener('click', () => {
    ui.userMessage.value = button.dataset.prompt ?? '';
    ui.userMessage.focus();
    setStatus(
      button.dataset.planExample === 'true'
        ? 'Demo multiacción cargada. Pulsa “Evaluar plan” para enviarla por el Plan Gate.'
        : 'Ejemplo cargado. Puedes editarlo antes de enviarlo.',
      ''
    );
  });
}

for (const button of $$('.fixture-button')) {
  button.addEventListener('click', () => runFixture(button));
}

if (ui.activeProfile) {
  ui.activeProfile.addEventListener('change', () => {
    const profileId = getDashboardProfileMode();
    syncActiveProfileSelection(profileId);
    setStatus(
      isProfileMode(profileId)
        ? `Perfil activo fijado en ${profileId}. El siguiente turno irá por Phoenix Profile Gate.`
        : 'Modo ACTION_GATE activo. El siguiente turno irá por el chat/action gate normal.',
      ''
    );
  });
  syncActiveProfileSelection();
}

if (ui.profileType) {
  ui.profileType.addEventListener('change', () => syncActiveProfileSelection(ui.profileType.value));
}

if (ui.profileForm) {
  ui.profileForm.addEventListener('submit', (event) => {
    event.preventDefault();
    runProfileGate();
  });
}

try {
  const health = await fetch('/api/health', { headers: { Accept: 'application/json' } }).then((response) => response.json());
  if (health.ok) {
    setText(ui.policy, health.policy_version);
    if (health.dispatch_available === false) setText(ui.dispatch, 'NO');
    loadBackendProfiles(health);
  }
} catch {
  setStatus('El health check del panel falló. No se intentó ninguna acción.', 'error');
}
