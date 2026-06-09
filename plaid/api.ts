// All calls here hit CNB — never Plaid directly. The Plaid client_secret
// lives on CNB's backend; the SPA never sees it.
import type {
  LinkTokenResponse,
  ExchangeRequest,
  ExchangeResponse,
} from './types';

const BASE = '/api/connect-bank'; // adjust to your CNB API base

// CNB API — proxies to Plaid /link/token/create with the user's identity.
// Backend must pass `redirect_uri` so OAuth institutions work.
export async function createLinkToken(): Promise<LinkTokenResponse> {
  const res = await fetch(`${BASE}/link-token`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(`CNB link-token failed: ${res.status}`);
  return res.json();
}

// CNB API — exchanges public_token server-side, runs verification,
// returns linked account OR a typed rejection. Idempotent on backend.
export async function exchangePublicToken(
  body: ExchangeRequest,
  idempotencyKey: string,
): Promise<ExchangeResponse> {
  const res = await fetch(`${BASE}/exchange`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`CNB exchange failed: ${res.status}`);
  return res.json();
}
