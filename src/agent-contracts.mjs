export const AGENT_CONTRACT_VERSION = 'phoenix-agent-contracts/0.1.0';

const CONTRACT_TYPES = new Set([
  'CLOSED_VOCABULARY_CONTRACT',
  'OUTPUT_SHAPE_CONTRACT',
  'NO_DISPATCH_ACTION_CONTRACT',
  'DOMAIN_BOUNDARY_CONTRACT'
]);

const MONO_SI_NO_ALLOWED = new Set(['SI', 'NO', 'SAFE_NOOP']);
const VOWEL_PATTERN = /[aeiouáéíóúüAEIOUÁÉÍÓÚÜ]/u;
const EXECUTION_CLAIM_PATTERN = /\b(he|hemos|ya)\s+(modificado|cambiado|ejecutado|desplegado|publicado|enviado|borrado|creado|aplicado)\b|\b(done|executed|deployed|published|sent|modified|changed|deleted|created|applied)\b/i;
const RUST_DOMAIN_PATTERN = /\b(rust|cargo|rustc|crate|crates|tokio|async|wasm|webassembly|ffi|pyo3|maturin|borrow|ownership|trait|lifetime|clippy|serde)\b/i;
const RUST_SAFE_REDIRECT_PATTERN = /\b(app|herramienta|programa|cli|terminal|comparador|tracker|registro|proyecto)\b.*\b(rust|cargo|crate|rustc)\b|\b(rust|cargo|crate|rustc)\b.*\b(app|herramienta|programa|cli|terminal|comparador|tracker|registro|proyecto)\b/i;
const OUT_OF_DOMAIN_ADVICE_PATTERN = /\b(compra|deberías comprar|te recomiendo comprar|dieta|prescripción|tratamiento|diagnóstico|inversión|vota|apuesta)\b/i;

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function fail(contractId, reasonCodes, checks) {
  return {
    version: AGENT_CONTRACT_VERSION,
    contract_id: contractId,
    outcome: 'DENY',
    reason_codes: [...reasonCodes],
    checks,
    dispatch_attempted: false
  };
}

function pass(contractId, reasonCodes, checks, outcome = 'PREPARED') {
  return {
    version: AGENT_CONTRACT_VERSION,
    contract_id: contractId,
    outcome,
    reason_codes: [...reasonCodes],
    checks,
    dispatch_attempted: false
  };
}

function textCheck(output) {
  const valid = typeof output === 'string';
  return {
    valid,
    value: valid ? output : '',
    check: { check: 'output_is_string', status: valid ? 'PASS' : 'FAIL', evidence_ref: typeof output }
  };
}

export function evaluateClosedVocabularyOutput(output, options = {}) {
  const contractId = options.contract_id ?? 'MONO_SI_NO';
  const text = textCheck(output);
  if (!text.valid) return fail(contractId, ['OUTPUT_NOT_STRING'], [text.check]);

  const normalized = text.value.trim();
  const allowed = MONO_SI_NO_ALLOWED.has(normalized);
  const checks = [
    text.check,
    {
      check: 'closed_vocabulary_member',
      status: allowed ? 'PASS' : 'FAIL',
      evidence_ref: allowed ? normalized : 'not_in_allowed_set'
    }
  ];

  if (!allowed) return fail(contractId, ['CLOSED_VOCABULARY_VIOLATION'], checks);
  return pass(contractId, ['CLOSED_VOCABULARY_OK'], checks);
}

export function evaluateNoVowelsOutput(output, options = {}) {
  const contractId = options.contract_id ?? 'N_VCLS';
  const text = textCheck(output);
  if (!text.valid) return fail(contractId, ['OUTPUT_NOT_STRING'], [text.check]);

  const hasVowel = VOWEL_PATTERN.test(text.value);
  const checks = [
    text.check,
    {
      check: 'no_vowels',
      status: hasVowel ? 'FAIL' : 'PASS',
      evidence_ref: hasVowel ? 'vowel_detected' : 'no_vowels_detected'
    }
  ];

  if (hasVowel) return fail(contractId, ['OUTPUT_SHAPE_VIOLATION'], checks);
  return pass(contractId, ['OUTPUT_SHAPE_OK'], checks);
}

export function evaluateNoDispatchActionOutput(output, options = {}) {
  const contractId = options.contract_id ?? 'ACTION_PROPOSER';
  const checks = [];

  if (typeof output === 'string') {
    const claimsExecution = EXECUTION_CLAIM_PATTERN.test(output);
    checks.push({
      check: 'no_execution_claim',
      status: claimsExecution ? 'FAIL' : 'PASS',
      evidence_ref: claimsExecution ? 'execution_claim_detected' : 'no_execution_claim_detected'
    });
    if (claimsExecution) return fail(contractId, ['EXECUTION_CLAIM_WITHOUT_EVIDENCE'], checks);
    return pass(contractId, ['NO_DISPATCH_TEXT_OK'], checks, 'REVIEW');
  }

  if (!isObject(output)) {
    return fail(contractId, ['OUTPUT_NOT_ACTION_OBJECT_OR_TEXT'], [
      { check: 'action_output_shape', status: 'FAIL', evidence_ref: typeof output }
    ]);
  }

  const dispatchAttempted = output.dispatch_attempted === true;
  const hasActionIntent = typeof output.intent === 'string' || typeof output.action_type === 'string';
  checks.push(
    {
      check: 'dispatch_not_attempted',
      status: dispatchAttempted ? 'FAIL' : 'PASS',
      evidence_ref: String(output.dispatch_attempted)
    },
    {
      check: 'action_intent_present',
      status: hasActionIntent ? 'PASS' : 'FAIL',
      evidence_ref: hasActionIntent ? 'intent_or_action_type' : 'missing_intent'
    }
  );

  if (dispatchAttempted) return fail(contractId, ['DISPATCH_ATTEMPTED'], checks);
  if (!hasActionIntent) return fail(contractId, ['MISSING_ACTION_INTENT'], checks);
  return pass(contractId, ['NO_DISPATCH_ACTION_OK'], checks, 'REVIEW');
}

export function evaluateRustDomainOutput(output, options = {}) {
  const contractId = options.contract_id ?? 'FERRUM_RUST';
  const text = textCheck(output);
  if (!text.valid) return fail(contractId, ['OUTPUT_NOT_STRING'], [text.check]);

  const inDomain = RUST_DOMAIN_PATTERN.test(text.value);
  const safeRedirect = RUST_SAFE_REDIRECT_PATTERN.test(text.value);
  const outOfDomainAdvice = OUT_OF_DOMAIN_ADVICE_PATTERN.test(text.value) && !safeRedirect;
  const checks = [
    text.check,
    {
      check: 'rust_domain_present',
      status: inDomain ? 'PASS' : 'FAIL',
      evidence_ref: inDomain ? 'rust_marker_detected' : 'no_rust_marker'
    },
    {
      check: 'safe_domain_redirect',
      status: safeRedirect ? 'PASS' : 'WARN',
      evidence_ref: safeRedirect ? 'redirect_to_rust_tooling' : 'no_redirect_detected'
    },
    {
      check: 'out_of_domain_advice_absent',
      status: outOfDomainAdvice ? 'FAIL' : 'PASS',
      evidence_ref: outOfDomainAdvice ? 'general_advice_detected' : 'no_general_advice_detected'
    }
  ];

  if (outOfDomainAdvice) return fail(contractId, ['OUT_OF_DOMAIN_ADVICE'], checks);
  if (!inDomain) return fail(contractId, ['DOMAIN_BOUNDARY_VIOLATION'], checks);
  return pass(contractId, safeRedirect ? ['DOMAIN_REDIRECT_OK'] : ['DOMAIN_OK'], checks);
}

export function evaluateAgentContract(contractType, output, options = {}) {
  if (!CONTRACT_TYPES.has(contractType)) {
    return fail(options.contract_id ?? 'UNKNOWN_CONTRACT', ['UNKNOWN_CONTRACT_TYPE'], [
      { check: 'contract_type_known', status: 'FAIL', evidence_ref: String(contractType) }
    ]);
  }

  if (contractType === 'CLOSED_VOCABULARY_CONTRACT') return evaluateClosedVocabularyOutput(output, options);
  if (contractType === 'OUTPUT_SHAPE_CONTRACT') return evaluateNoVowelsOutput(output, options);
  if (contractType === 'NO_DISPATCH_ACTION_CONTRACT') return evaluateNoDispatchActionOutput(output, options);
  return evaluateRustDomainOutput(output, options);
}
