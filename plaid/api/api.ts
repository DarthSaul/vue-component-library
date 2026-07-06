// All calls here hit our backend — never Plaid directly. The Plaid
// client_secret lives server-side; the SPA never sees it.
//
// api.ts returns DOMAIN models only. Every DTO→domain conversion happens
// here (via mappers.ts); nothing above this layer ever touches a `*Dto`.
import type {
  LinkTokenResponse,
  ExchangeRequest,
  ExchangeResponse,
  ExchangeResult,
  ExternalTransferAccountDto,
  LinkedAccount,
} from '../types';
import {
  fromAccountResultDto,
  fromExternalTransferAccountDtoList,
} from './mappers';

const CONNECT_BASE = '/api/connect-bank';

// Proxies to Plaid /link/token/create with the user's identity. Backend
// passes `redirect_uri` server-side so OAuth institutions work.
export async function createLinkToken(): Promise<LinkTokenResponse> {
  const res = await fetch(`${CONNECT_BASE}/link-token`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(`link-token failed: ${res.status}`);
  return res.json();
}

// Exchanges the public_token server-side, runs per-account verification,
// and returns either an item-level rejection or a completed set of
// per-account results. Idempotent on the backend via the Idempotency-Key
// header (link_session_id) — a retried exchange must not double-link.
//
// Maps `completed` results through fromAccountResultDto; passes a
// `rejected_at_item` response through unchanged (no per-account data to
// map).
export async function exchangePublicToken(
  body: ExchangeRequest,
  idempotencyKey: string,
): Promise<ExchangeResult> {
  const res = await fetch(`${CONNECT_BASE}/exchange`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`exchange failed: ${res.status}`);

  const dto = (await res.json()) as ExchangeResponse;
  if (dto.status === 'rejected_at_item') {
    return { status: 'rejected_at_item', reason: dto.reason, message: dto.message };
  }
  return {
    status: 'completed',
    results: dto.results.map(fromAccountResultDto),
  };
}

// Lists the user's linked external transfer accounts, mapped to domain
// models via the DTO list mapper.
export async function fetchExternalTransferAccounts(): Promise<LinkedAccount[]> {
  const res = await fetch('/api/v2/external-transfer-accounts', {
    credentials: 'include',
  });
  if (!res.ok) throw new Error(`external-transfer-accounts failed: ${res.status}`);

  const dtos = (await res.json()) as ExternalTransferAccountDto[];
  return fromExternalTransferAccountDtoList(dtos);
}
