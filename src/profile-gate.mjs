import { evaluateAgentContract } from './agent-contracts.mjs';
import { PROFILE_REGISTRY_VERSION, requireProfile } from './profiles.mjs';

export const PROFILE_GATE_VERSION = 'phoenix-profile-gate/0.1.0';

function sanitizePreview(value, maxChars = 240) {
  if (typeof value !== 'string') return '';
  return value.replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim().slice(0, maxChars);
}

function fail(profile, reasonCodes, checks = [], output = '') {
  return {
    version: PROFILE_GATE_VERSION,
    registry_version: PROFILE_REGISTRY_VERSION,
    profile_id: profile?.id ?? null,
    profile_label: profile?.label ?? null,
    outcome: 'DENY',
    reason_codes: [...reasonCodes],
    checks,
    rejected_output_preview: sanitizePreview(output),
    accepted_output: null,
    dispatch_attempted: false
  };
}

function normalizeProfileDecision(profile, contractDecision, output) {
  const outcome = contractDecision.outcome === 'DENY' ? 'DENY' : 'PREPARED';
  return {
    version: PROFILE_GATE_VERSION,
    registry_version: PROFILE_REGISTRY_VERSION,
    profile_id: profile.id,
    profile_label: profile.label,
    contract_id: contractDecision.contract_id,
    contract_type: profile.contract_type,
    outcome,
    reason_codes: Array.isArray(contractDecision.reason_codes) ? [...contractDecision.reason_codes] : [],
    checks: Array.isArray(contractDecision.checks) ? contractDecision.checks : [],
    rejected_output_preview: outcome === 'DENY' ? sanitizePreview(output) : null,
    accepted_output: outcome === 'DENY' ? null : output.trim(),
    dispatch_attempted: false
  };
}

export function evaluateProfileOutput(profileId, output) {
  let profile;
  try {
    profile = requireProfile(profileId);
  } catch {
    return fail({ id: profileId ?? null, label: null }, ['UNKNOWN_PROFILE'], [
      { check: 'profile_known', status: 'FAIL', evidence_ref: String(profileId ?? 'null') }
    ], typeof output === 'string' ? output : '');
  }

  if (typeof output !== 'string') {
    return fail(profile, ['OUTPUT_NOT_STRING'], [
      { check: 'output_is_string', status: 'FAIL', evidence_ref: typeof output }
    ]);
  }

  const boundedOutput = output.trim();
  if (!boundedOutput || boundedOutput.length > 4000) {
    return fail(profile, ['OUTPUT_EMPTY_OR_TOO_LARGE'], [
      { check: 'output_bounded', status: 'FAIL', evidence_ref: String(boundedOutput.length) }
    ], output);
  }

  const contractDecision = evaluateAgentContract(profile.contract_type, boundedOutput, { contract_id: profile.id });

  if (profile.id === 'SAFE_NOOP' && boundedOutput !== 'SAFE_NOOP') {
    return fail(profile, ['SAFE_NOOP_REQUIRED'], [
      ...contractDecision.checks,
      { check: 'safe_noop_exact', status: 'FAIL', evidence_ref: 'not_exact_SAFE_NOOP' }
    ], output);
  }

  return normalizeProfileDecision(profile, contractDecision, boundedOutput);
}

export function buildProfileResponse({ profileId, userMessage, modelOutput, provider = null }) {
  const decision = evaluateProfileOutput(profileId, modelOutput);
  const accepted = decision.outcome !== 'DENY';

  return {
    ok: accepted,
    state: accepted ? 'PROFILE_RESPONSE_ACCEPTED' : 'PROFILE_CONTRACT_DENIED',
    source: 'LIVE_NEBIUS_NEMOTRON_PROFILE',
    profile_id: decision.profile_id,
    user_message: typeof userMessage === 'string' ? userMessage : null,
    assistant_message: accepted ? decision.accepted_output : null,
    rejected_model_output_preview: accepted ? null : decision.rejected_output_preview,
    profile_decision: decision,
    provider,
    dispatch_attempted: false,
    secret_exposed: false
  };
}
