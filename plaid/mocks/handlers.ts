// ─────────────────────────────────────────────────────────────
// MSW handlers — a fake backend for the Plaid Link flow.
// ─────────────────────────────────────────────────────────────
//
// How this works at a glance:
//   - MSW registers a service worker that intercepts every fetch/XHR the
//     browser makes BEFORE it leaves the page.
//   - App code (store, composables via api.ts) still calls
//     `fetch('/api/v2/external-transfer-accounts')` as if hitting a real
//     backend — no swap-in/swap-out, no conditional branches.
//   - Intercepted calls route here. Each `http.<method>(...)` entry matches
//     one endpoint and returns a synthetic response.
//   - State lives in db.ts in WIRE (DTO) format, so these handlers are a
//     faithful stand-in for the real backend and the SPA's api.ts does the
//     DTO→domain mapping exactly as it would in production.

import { http, HttpResponse } from 'msw';
import { db } from './db';
import type {
  LinkTokenResponse,
  ExchangeRequest,
  ExchangeResponse,
  AccountResultDto,
  ExternalTransferAccountDto,
} from '../types';

// ─────────────────────────────────────────────────────────────
// Dev-time console flags
// ─────────────────────────────────────────────────────────────
// Steer the mock backend from the dev console mid-demo without reloading:
//
//   window.__mockOutcome = 'rejected_identity'
//     → next exchange short-circuits with an ITEM-LEVEL rejection
//       (IDENTITY_MISMATCH); no per-account processing happens.
//   window.__mockFirstAsDuplicate = true
//     → the FIRST selected account rejects as DUPLICATE_ACCOUNT and the
//       rest link. Index-based (not a fixed plaid_account_id) on purpose:
//       Plaid sandbox randomizes account ids per Link session, so there's
//       no stable id to match against — position is the only reliable
//       handle for "force the first one to duplicate."
//   window.__resetMockData()
//     → wipe everything and restore the seed.
declare global {
  interface Window {
    __mockOutcome?: 'rejected_identity';
    __mockFirstAsDuplicate?: boolean;
    __resetMockData?: () => void;
  }
}

window.__resetMockData = () => db.reset();

// Real backends are never instant. A small delay makes loading states
// actually render so they're demo-able.
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export const handlers = [
  // GET — list linked accounts. Drives the Manage External Accounts table.
  // Returns wire-format DTOs; api.ts maps them to domain models.
  http.get('/api/v2/external-transfer-accounts', () => {
    return HttpResponse.json<ExternalTransferAccountDto[]>(db.list());
  }),

  // POST — issue a Plaid Link token. The real backend calls Plaid's
  // /link/token/create with the user's identity + OAuth redirect URI; here
  // we synthesize a token shape so the SPA can proceed without a backend.
  http.post('/api/connect-bank/link-token', () => {
    return HttpResponse.json<LinkTokenResponse>({
      linkToken: 'link-sandbox-mock-' + Date.now(),
      expiration: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
    });
  }),

  // POST — exchange the public_token for persistent linked-account records.
  // Processes EACH selected account independently, mirroring the
  // ExchangeRequest/ExchangeResponse contract. An item-level rejection
  // short-circuits the whole thing before any per-account work.
  http.post('/api/connect-bank/exchange', async ({ request }) => {
    await sleep(1500); // simulated latency — makes loading states demo-able

    const body = (await request.json()) as ExchangeRequest;

    // Item-level rejection — applies to the person, not one account, so it
    // short-circuits per-account processing entirely (no `results`).
    if (window.__mockOutcome === 'rejected_identity') {
      return HttpResponse.json<ExchangeResponse>({
        status: 'rejected_at_item',
        reason: 'IDENTITY_MISMATCH',
        message: "The account holder name doesn't match your profile.",
      });
    }

    // Per-account processing over selectedAccounts.
    const results: AccountResultDto[] = body.selectedAccounts.map((selected, index) => {
      // Force the first selected account to reject as a duplicate. Index-
      // based because sandbox account ids randomize per Link session (see
      // the flag docs above) — there's no stable id to hardcode.
      if (window.__mockFirstAsDuplicate && index === 0) {
        return {
          plaidAccountId: selected.plaidAccountId,
          outcome: 'rejected',
          reason: 'DUPLICATE_ACCOUNT',
          message: 'This account is already linked to your profile.',
        };
      }

      const account: ExternalTransferAccountDto = {
        id: `acc_${db.nextId()}`,
        institution_id: body.institutionId ?? 'ins_unknown',
        institution_name: body.institutionName ?? 'Unknown Bank',
        plaid_account_id: selected.plaidAccountId,
        account_number_suffix: selected.mask ?? '0000',
        account_type: selected.subtype ?? selected.type,
        current_status: 'active',
        linked_at: new Date().toISOString(),
      };
      db.add(account);

      return {
        plaidAccountId: selected.plaidAccountId,
        outcome: 'linked',
        account,
      };
    });

    return HttpResponse.json<ExchangeResponse>({ status: 'completed', results });
  }),

  // DELETE — disconnect an account. 204 on success, 404 if not found —
  // exercises the SPA's error path like a typical REST backend.
  http.delete('/api/v2/external-transfer-accounts/:id', ({ params }) => {
    const removed = db.remove(String(params.id));
    return new HttpResponse(null, { status: removed ? 204 : 404 });
  }),
];
