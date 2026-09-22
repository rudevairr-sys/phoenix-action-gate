import { createHash } from 'node:crypto';
import { evaluateActionProposal, POLICY_VERSION } from './gate.mjs';
import { NebiusProposalError, requestReadContextProposal } from './nebius.mjs';
import { requestConversationalProposal } from './nebius-conversation.mjs';

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

function sha256(value) {
  return createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
}

function providerFailureDecision(error) {
  const core = {
    decision_version: '0.1',
    proposal_id: 'provider-failure',
    outcome: 'DENY',
    risk_class: 'R3',
    policy_version: POLICY_VERSION,
    reason_codes: [error.code ?? 'PROVIDER_FAILURE'],
    checks: [
      {
        check: 'provider_response_valid',
        status: 'FAIL',
        evidence_ref: error.code ?? 'PROVIDER_FAILURE'
      }
    ],
    human_review_required: false,
    rollback_status: 'UNKNOWN'
  };
  const decisionHash = sha256(core);
  return {
    ...core,
    decision_id: `decision-${decisionHash.slice(0, 16)}`,
    evidence_bundle_id: `evidence-${decisionHash.slice(0, 16)}`,
    decision_hash: decisionHash,
    dispatch_attempted: false
  };
}

function failClosedResult(error, extra = {}) {
  return {
    ok: false,
    state: 'FAIL_CLOSED',
    turn_mode: 'ERROR',
    provider: error.details?.provider ?? null,
    provider_error: {
      code: error.code,
      details: error.details ?? {}
    },
    proposal: null,
    decision: providerFailureDecision(error),
    dispatch_attempted: false,
    secret_exposed: false,
    ...extra
  };
}

export async function runReadContextPipeline(options = {}) {
  try {
    const { proposal, provider } = await requestReadContextProposal(options);
    const decision = evaluateActionProposal(proposal);
    return {
      ok: decision.outcome !== 'DENY',
      state: 'PIPELINE_OBSERVED',
      provider,
      proposal,
      decision,
      dispatch_attempted: false,
      secret_exposed: false
    };
  } catch (error) {
    if (!(error instanceof NebiusProposalError)) throw error;
    return failClosedResult(error);
  }
}

export async function runConversationPipeline(userMessage, options = {}) {
  try {
    const {
      mode,
      assistant_message: assistantMessage,
      assistant_message_source: assistantMessageSource,
      clarification_reason: clarificationReason,
      proposal,
      provider
    } = await requestConversationalProposal(userMessage, options);

    if (mode === 'CHAT' || mode === 'CLARIFICATION') {
      return {
        ok: true,
        state: mode === 'CHAT' ? 'CHAT_ONLY' : 'CLARIFICATION_REQUIRED',
        turn_mode: mode,
        user_message: userMessage.trim(),
        assistant_message: assistantMessage,
        assistant_message_source: assistantMessageSource,
        clarification_reason: clarificationReason ?? null,
        provider,
        proposal: null,
        decision: null,
        dispatch_attempted: false,
        secret_exposed: false
      };
    }

    const decision = evaluateActionProposal(proposal);
    return {
      ok: decision.outcome !== 'DENY',
      state: 'CONVERSATION_ACTION_EVALUATED',
      turn_mode: 'ACTION_PROPOSAL',
      user_message: userMessage.trim(),
      assistant_message: assistantMessage,
      assistant_message_source: assistantMessageSource,
      provider,
      proposal,
      decision,
      dispatch_attempted: false,
      secret_exposed: false
    };
  } catch (error) {
    if (!(error instanceof NebiusProposalError)) throw error;
    return failClosedResult(error, {
      user_message: typeof userMessage === 'string' ? userMessage.trim().slice(0, 2000) : null,
      assistant_message: null,
      assistant_message_source: null
    });
  }
}
