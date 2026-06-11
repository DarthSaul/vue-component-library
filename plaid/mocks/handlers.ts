// ─────────────────────────────────────────────────────────────
// MSW handlers — a fake CNB backend for the Plaid Link flow.
// ─────────────────────────────────────────────────────────────
//
// How this works at a glance:
//   - MSW (Mock Service Worker) registers a service worker that
//     intercepts every fetch/XHR call the browser makes BEFORE
//     it leaves the page.
//   - Our app code (Pinia store, components) still calls
//     `fetch('/api/external-accounts')` as if hitting a real
//     backend — no swap-in/swap-out, no conditional branches.
//   - Intercepted calls are routed here. Each `http.<method>(...)`
//     entry below matches one endpoint and returns a synthetic
//     response.
//   - When the real backend exists, flip an env flag (see
//     setup.ts) and the same fetch calls hit the real network.
//
// The key trick: handlers close over a module-scoped array
// (`linkedAccounts` below) that acts as an in-memory "database".
// It persists across requests within a tab, so writes from one
// handler are visible to subsequent reads. That's how a single
// browser session can demonstrate add → list → delete with
// full state continuity.

import { http, HttpResponse } from 'msw';
import type {
  LinkTokenResponse,
  ExchangeRequest,
  ExchangeResponse,
  LinkedAccount,
} from '../types';

// ─────────────────────────────────────────────────────────────
// Persistence — optional sessionStorage mirror
// ─────────────────────────────────────────────────────────────
// Module-scoped state only lives for the lifetime of the tab.
// On a hard refresh, the JS bundle re-evaluates and state resets.
// For most dev demos that's fine — clean slate per refresh.
// If you want continuity across reloads (e.g., "user adds an
// account Monday, comes back Tuesday, account still there"),
// mirror the array into sessionStorage and rehydrate on load.
//
// Why sessionStorage and not localStorage? sessionStorage clears
// when the tab closes, so each demo session starts predictably.
// localStorage persists forever and accumulates demo cruft.
const STORAGE_KEY = 'msw:linkedAccounts';

// Seed data so the table isn't empty on first load. Useful for
// demoing the "list" view without first having to add an account.
const SEED: LinkedAccount[] = [
  {
    id: 'acc_seed_1',
    institutionName: 'Wells Fargo',
    accountMask: '4321',
    accountType: 'checking',
    linkedAt: '2026-04-12T14:22:00Z',
  },
];

// Read from sessionStorage if present, otherwise start from seed.
// Wrapped in try/catch so a corrupted blob can't break the app.
function loadInitial(): LinkedAccount[] {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return [...SEED];
  try {
    return JSON.parse(raw) as LinkedAccount[];
  } catch {
    return [...SEED];
  }
}

// ─────────────────────────────────────────────────────────────
// The in-memory "database"
// ─────────────────────────────────────────────────────────────
// `let` at module scope so handlers can replace it across
// requests. We re-assign (`linkedAccounts = [...]`) rather than
// mutate in place — gives each GET a fresh array reference and
// keeps the pattern clean if you ever surface this elsewhere.
let linkedAccounts: LinkedAccount[] = loadInitial();

// Auto-incrementing id for new accounts created via exchange.
// Starts at 100 so it can't collide with the seeded ids.
let nextId = 100;

// Mirror current state to sessionStorage after every write.
// Drop this call if you want the in-memory-only behavior.
function persist(): void {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(linkedAccounts));
}

// ─────────────────────────────────────────────────────────────
// Dev-time helpers exposed on `window`
// ─────────────────────────────────────────────────────────────
// These let you steer the mock backend from the browser dev
// console mid-demo without restarting or redeploying:
//
//   window.__mockExchangeOutcome = 'rejected'
//     → next exchange returns IDENTITY_MISMATCH
//   window.__mockExchangeOutcome = 'pending'
//     → next exchange returns a pending verification
//   window.__resetMockData()
//     → wipe everything and restore seed (recover from a
//       demo gone sideways without reloading the page)
declare global {
  interface Window {
    __mockExchangeOutcome?: 'linked' | 'rejected' | 'pending';
    __resetMockData?: () => void;
  }
}

window.__resetMockData = () => {
  linkedAccounts = [...SEED];
  sessionStorage.removeItem(STORAGE_KEY);
};

// ─────────────────────────────────────────────────────────────
// Artificial latency
// ─────────────────────────────────────────────────────────────
// Real backends are never instant. Instant mocks make the UI
// feel snappier than it ever will in production, which means
// loading states either never render or render for a single
// frame and your stakeholder never sees them. A small delay
// makes the dev experience match reality.
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// ─────────────────────────────────────────────────────────────
// CNB API — handlers
// ─────────────────────────────────────────────────────────────
// Each entry pairs an HTTP method + path pattern with a handler
// function. First match wins; anything we haven't defined here
// falls through to the real network (see `onUnhandledRequest`
// in setup.ts).
export const handlers = [
  // GET — list linked accounts. Drives the "Manage external
  // accounts" table. Just returns the current array as JSON.
  http.get('/api/external-accounts', () => {
    return HttpResponse.json(linkedAccounts);
  }),

  // POST — issue a Plaid Link token. The real backend would call
  // Plaid's /link/token/create with the user's identity and the
  // OAuth redirect URI. Here we synthesize a fake token shape so
  // the SPA can proceed without a backend dependency.
  http.post('/api/connect-bank/link-token', () => {
    return HttpResponse.json<LinkTokenResponse>({
      linkToken: 'link-sandbox-mock-' + Date.now(),
      // Plaid tokens live ~4 hours by default.
      expiration: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
    });
  }),

  // POST — exchange the public_token from Plaid's onSuccess for
  // a persistent linked-account record. This is the write that
  // mutates the in-memory DB.
  //
  // Outcome is steered by `window.__mockExchangeOutcome` so a
  // single click in the dev console can flip you between the
  // happy path and each error branch during a live demo.
  http.post('/api/connect-bank/exchange', async ({ request }) => {
    // Simulated network latency — makes loading states demo-able.
    await sleep(1500);

    const body = (await request.json()) as ExchangeRequest;
    const outcome = window.__mockExchangeOutcome ?? 'linked';

    // Rejected branch — backend identity check failed, duplicate
    // detection tripped, sanctions screening, etc. Mirrors the
    // discriminated union declared in plaid/types.ts so the
    // store's `switch (result.status)` handles it correctly.
    if (outcome === 'rejected') {
      return HttpResponse.json<ExchangeResponse>({
        status: 'rejected',
        reason: 'IDENTITY_MISMATCH',
        message: "The account holder name doesn't match your CNB profile.",
      });
    }

    // Pending branch — verification is async on the real backend
    // (e.g., microdeposits, manual review). Returns a id the SPA
    // can later poll on or subscribe to via webhook-pushed events.
    if (outcome === 'pending') {
      return HttpResponse.json<ExchangeResponse>({
        status: 'pending',
        verificationId: 'ver_' + Date.now(),
      });
    }

    // Success branch — mutate the in-memory DB and echo the new
    // account back to the SPA. The store can either re-fetch the
    // list (simpler, matches the real backend's eventual shape)
    // or optimistically merge this returned object.
    const newAccount: LinkedAccount = {
      id: `acc_${nextId++}`,
      institutionName: body.institutionName ?? 'Unknown Bank',
      accountMask: body.selectedAccount.mask ?? '0000',
      accountType: body.selectedAccount.subtype ?? body.selectedAccount.type,
      linkedAt: new Date().toISOString(),
    };
    linkedAccounts = [...linkedAccounts, newAccount];
    persist();

    return HttpResponse.json<ExchangeResponse>({
      status: 'linked',
      account: newAccount,
    });
  }),

  // DELETE — disconnect an account. Removes from the in-memory
  // DB. Returns 204 on success, 404 if the id wasn't found —
  // matches typical REST backend behavior so the SPA's error
  // path is exercisable.
  http.delete('/api/external-accounts/:id', ({ params }) => {
    const { id } = params;
    const before = linkedAccounts.length;
    linkedAccounts = linkedAccounts.filter((a) => a.id !== id);

    if (linkedAccounts.length === before) {
      return new HttpResponse(null, { status: 404 });
    }

    persist();
    return new HttpResponse(null, { status: 204 });
  }),
];
