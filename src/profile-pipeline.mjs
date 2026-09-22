import { DEFAULT_MODEL, NebiusProposalError } from './nebius.mjs';
import { buildProfileResponse } from './profile-gate.mjs';
import { requireProfile } from './profiles.mjs';

const DEFAULT_ENDPOINT = 'https://api.tokenfactory.nebius.com/v1/chat/completions';
const MAX_HISTORY_ITEMS = 8;
const MAX_HISTORY_CHARS = 6000;

function normalizeHistory(history) {
  if (!Array.isArray(history)) return [];
  const normalized = [];
  let totalChars = 0;

  for (const item of history.slice(-MAX_HISTORY_ITEMS)) {
    if (!item || !['user', 'assistant'].includes(item.role) || typeof item.content !== 'string') continue;
    const content = item.content.trim().slice(0, 1500);
    if (!content) continue;
    if (totalChars + content.length > MAX_HISTORY_CHARS) break;
    normalized.push({ role: item.role, content });
    totalChars += content.length;
  }

  return normalized;
}

function providerEvidence(provider) {
  return {
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

function failClosedProfileResult({ profileId, userMessage, error, provider = null }) {
  return {
    ok: false,
    state: 'PROFILE_PROVIDER_FAIL_CLOSED',
    source: 'LIVE_NEBIUS_NEMOTRON_PROFILE',
    profile_id: profileId ?? null,
    user_message: typeof userMessage === 'string' ? userMessage : null,
    assistant_message: null,
    rejected_model_output_preview: null,
    profile_decision: {
      version: 'phoenix-profile-gate/0.1.0',
      profile_id: profileId ?? null,
      outcome: 'DENY',
      reason_codes: [error?.code ?? 'PROFILE_PROVIDER_FAILURE'],
      checks: [
        { check: 'provider_response_available', status: 'FAIL', evidence_ref: error?.code ?? error?.name ?? 'UnknownError' }
      ],
      rejected_output_preview: null,
      accepted_output: null,
      dispatch_attempted: false
    },
    provider,
    provider_error: {
      code: error?.code ?? 'PROFILE_PROVIDER_FAILURE',
      name: error?.name ?? 'UnknownError'
    },
    dispatch_attempted: false,
    secret_exposed: false
  };
}

export async function requestProfiledNemotronResponse(userMessage, profile, {
  apiKey = process.env.NEBIUS_API_KEY,
  model = process.env.NEBIUS_MODEL || DEFAULT_MODEL,
  endpoint = DEFAULT_ENDPOINT,
  timeoutMs = 30_000,
  fetchImpl = fetch,
  history = []
} = {}) {
  if (typeof userMessage !== 'string' || userMessage.trim().length === 0) {
    throw new NebiusProposalError('USER_MESSAGE_INVALID', 'A non-empty user message is required');
  }
  if (!profile || typeof profile.system_prompt !== 'string') {
    throw new NebiusProposalError('PROFILE_INVALID', 'A valid profile is required');
  }
  if (!apiKey) {
    throw new NebiusProposalError('NEBIUS_API_KEY_MISSING', 'NEBIUS_API_KEY is required');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = new Date().toISOString();
  const t0 = performance.now();

  try {
    const cleanMessage = userMessage.trim().slice(0, 2000);
    const messages = [
      {
        role: 'system',
        content: [
          'You are Nemotron operating inside Phoenix Action Gate.',
          'You are not a general assistant in this turn.',
          'You must obey the active specialized profile exactly.',
          'Phoenix will independently verify your output after generation.',
          'Do not claim that Phoenix accepted, denied, executed, modified, sent, deployed, tested or dispatched anything.',
          'Return only the answer required by the active profile. Do not include metadata.'
        ].join(' ')
      },
      { role: 'system', content: profile.system_prompt },
      ...normalizeHistory(history),
      { role: 'user', content: cleanMessage }
    ];

    const response = await fetchImpl(endpoint, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0,
        max_tokens: profile.id === 'MONO_SI_NO' || profile.id === 'SAFE_NOOP' ? 24 : 600
      }),
      signal: controller.signal
    });

    const latencyMs = Math.round(performance.now() - t0);
    const raw = await response.text();
    let body = null;
    try { body = raw ? JSON.parse(raw) : null; } catch {
      throw new NebiusProposalError('TOKEN_FACTORY_INVALID_RESPONSE', 'Token Factory returned non-JSON', { http_status: response.status, latency_ms: latencyMs });
    }

    const provider = {
      model,
      endpoint,
      http_status: response.status,
      latency_ms: latencyMs,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      provider_response_id: body?.id ?? null,
      finish_reason: body?.choices?.[0]?.finish_reason ?? null,
      usage: body?.usage ?? null,
      profile_id: profile.id
    };

    if (!response.ok) {
      throw new NebiusProposalError('TOKEN_FACTORY_HTTP_ERROR', 'Token Factory request failed', {
        provider: providerEvidence(provider),
        response_shape: body && typeof body === 'object' ? Object.keys(body).sort() : []
      });
    }

    const message = body?.choices?.[0]?.message;
    if (message?.refusal) {
      throw new NebiusProposalError('MODEL_REFUSAL', 'Model refused profiled response generation', { provider: providerEvidence(provider) });
    }

    const modelOutput = typeof message?.content === 'string' ? message.content.trim() : '';
    if (!modelOutput) {
      throw new NebiusProposalError('MODEL_OUTPUT_EMPTY', 'Model returned an empty profiled response', { provider: providerEvidence(provider) });
    }

    return { modelOutput, provider };
  } catch (error) {
    if (error instanceof NebiusProposalError) throw error;
    if (error?.name === 'AbortError') {
      throw new NebiusProposalError('TOKEN_FACTORY_TIMEOUT', 'Token Factory request timed out', {
        latency_ms: Math.round(performance.now() - t0)
      });
    }
    throw new NebiusProposalError('TOKEN_FACTORY_REQUEST_FAILED', 'Token Factory request failed before a valid response', {
      error_name: error?.name ?? 'UnknownError',
      latency_ms: Math.round(performance.now() - t0)
    });
  } finally {
    clearTimeout(timeout);
  }
}

export async function runProfilePipeline(profileId, userMessage, options = {}) {
  let profile;
  try {
    profile = requireProfile(profileId);
  } catch (error) {
    return failClosedProfileResult({ profileId, userMessage, error });
  }

  try {
    const { modelOutput, provider } = await requestProfiledNemotronResponse(userMessage, profile, options);
    return buildProfileResponse({
      profileId: profile.id,
      userMessage,
      modelOutput,
      provider
    });
  } catch (error) {
    return failClosedProfileResult({ profileId: profile.id, userMessage, error, provider: error?.details?.provider ?? null });
  }
}
