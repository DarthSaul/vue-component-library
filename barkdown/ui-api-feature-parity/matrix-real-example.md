# UI/API Parity Review: "Fund Your Account" (FYA) v1.0

**Author:** Frontend Lead (Roxbury / FYA)
**Reviewers:** M. Chen (Backend Lead, Payments), J. Rivera (PM), S. Patel (Design Lead)
**Date issued:** 2026-04-22
**Status:** ⚠️ **Conditional Go** — proceed to build pending resolution of 4 Red items by sprint 2.
**Artifact version:** 1.1 (incorporates 2026-04-21 working session outcomes)

---

## 1. Executive Summary

The "Fund Your Account" feature is **conditionally ready** for frontend implementation. The Payments API covers ~85% of UX requirements out of the box. **Four Red items** require backend work before we can ship MVP, all committed by M. Chen for delivery in sprints 1–2. **Eleven Amber items** are clarifications or contract tightening, none blocking. **Three items** have been formally deferred to v1.1 with PO sign-off (§6c).

The most material risks are (1) **lack of idempotency support on `POST /v1/transfers`** — unacceptable for a money-movement endpoint, BE committed to fix in sprint 1; (2) **no documented mechanism for the SPA to learn about asynchronous ACH status changes** — current plan is short-interval polling on transfer-detail views, with SSE deferred to v1.1; and (3) **transfer limits and ACH cutoff times are not exposed via the API** — requires client to either hardcode (brittle) or fetch from a new config endpoint (BE committed sprint 2).

Estimated impact on the 40-hour FE budget: **~6 hours of additional work** for polling infrastructure, idempotency-key plumbing, and error-state UI for the deferred items. Net budget remains feasible.

---

## 2. Scope

### In scope (MVP)

- Link an external bank account via Plaid Link
- View linked external accounts; remove a linked account
- Re-authenticate an external account that has entered `ITEM_LOGIN_REQUIRED`
- Initiate a one-time ACH transfer in (external → internal) or out (internal → external)
- View transfer history (last 90 days)
- View transfer detail with current status

### Out of scope (deferred or future)

- Recurring/scheduled transfers (v1.1)
- Multiple external accounts per institution selection mid-flow (v1.1)
- Real-time transfer status via SSE/WebSocket (v1.1; MVP uses polling)
- Wire transfers (separate epic)
- International accounts (separate epic)

---

## 3. Inputs Reviewed

| Input                    | Version / Source                                             | Reviewed      |
| ------------------------ | ------------------------------------------------------------ | ------------- |
| Figma design             | "FYA v1.0 — Dev Handoff" frame, last modified 2026-04-18     | ✅            |
| OpenAPI spec             | `payments-api/openapi.yaml` @ commit `a3f8b21`               | ✅            |
| User stories             | Jira epic `FYA-1` and child stories `FYA-2` through `FYA-47` | ✅            |
| Error catalog            | `payments-api/docs/errors.md` (partial — see §5)             | ⚠️ Incomplete |
| Plaid integration design | Confluence page "Payments-Plaid Integration v2"              | ✅            |
| Webhook documentation    | `payments-api/docs/webhooks.md`                              | ✅            |
| Sandbox environment      | `https://api-sandbox.bank.internal`                          | ✅ Probed     |

---

## 4. Methodology

Followed the standard UI/API Parity Review playbook (v1.2). Decomposed each of the 11 design screens into a data/action inventory; built a parity matrix with one row per binding; ran live integration probes against the sandbox for the 6 highest-risk endpoints; validated NFRs explicitly with M. Chen; ran the Plaid-specific verification checklist end-to-end using Plaid Sandbox credentials.

---

## 5. Parity Matrix

Full matrix lives in [Notion → FYA Parity Matrix](https://example.com/fake). Excerpts below show representative rows from each screen and every Red item.

### 5.1 Linked External Accounts screen

| ID      | UI element               | Data need                                     | Endpoint                                                      | Field                            | Conf.    | Gap                       | Notes                                                                                                                                                                                            | Owner | Status                         |
| ------- | ------------------------ | --------------------------------------------- | ------------------------------------------------------------- | -------------------------------- | -------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----- | ------------------------------ |
| FYA-001 | Institution name         | Display                                       | `GET /v1/external-accounts`                                   | `accounts[].institution.name`    | Verified | None                      | —                                                                                                                                                                                                | —     | ✅ Resolved                    |
| FYA-002 | Institution logo         | Display                                       | `GET /v1/external-accounts`                                   | `accounts[].institution.logoUrl` | Verified | None                      | Returned as base64 data URL; ~3KB each. Fine for now.                                                                                                                                            | —     | ✅ Resolved                    |
| FYA-003 | Last 4 of account number | Display                                       | `GET /v1/external-accounts`                                   | `accounts[].mask`                | Verified | None                      | Plaid returns 4-char string; BE passes through.                                                                                                                                                  | —     | ✅ Resolved                    |
| FYA-004 | Connection status badge  | active / needs_attention / disconnected       | `GET /v1/external-accounts`                                   | `accounts[].status`              | Verified | **State gap**             | API returns `active` / `error` only. Design has 3 states. M. Chen: BE will split `error` → `needs_reauth` (recoverable) and `disconnected` (terminal). Ticket `PAY-812`.                         | BE    | 🟥 Red, in progress sprint 1   |
| FYA-005 | "Update credentials" CTA | Initiate Link in update mode                  | `POST /v1/plaid/link-token` body `{ mode: "update", itemId }` | `linkToken`                      | Inferred | **Missing functionality** | Endpoint exists but ignores `mode` param; always returns initial-link token. M. Chen confirmed bug. Ticket `PAY-813`.                                                                            | BE    | 🟥 Red, in progress sprint 1   |
| FYA-006 | "Remove" action          | Unlink account                                | `DELETE /v1/external-accounts/{id}`                           | 204                              | Verified | None                      | Confirmed BE calls Plaid `/item/remove`.                                                                                                                                                         | —     | ✅ Resolved                    |
| FYA-007 | Last activity timestamp  | Relative time of last successful balance sync | `GET /v1/external-accounts`                                   | `accounts[].lastSyncedAt`        | Unknown  | **Ambiguous**             | Is this last attempt or last success? Different semantics for the "needs attention" badge. M. Chen confirmed: last _successful_ sync. Will add `lastAttemptedAt` separately (deferred, see §6c). | BE    | 🟡 Amber → Resolved + Deferred |

### 5.2 Plaid Link entry & flow

| ID      | UI element                       | Data need                      | Endpoint                                                   | Field                    | Conf.    | Gap                   | Notes                                                                                                                                                                                                                                          | Owner       | Status                |
| ------- | -------------------------------- | ------------------------------ | ---------------------------------------------------------- | ------------------------ | -------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | --------------------- |
| FYA-010 | Launch Plaid Link                | Get link token                 | `POST /v1/plaid/link-token`                                | `linkToken`, `expiresAt` | Verified | None                  | TTL is 4 hours per Plaid default. Confirmed.                                                                                                                                                                                                   | —           | ✅ Resolved           |
| FYA-011 | Plaid Link OAuth return          | Resume Link after redirect     | Frontend SDK + `oauthRedirectUri` config                   | n/a                      | Verified | None                  | Probed with Sandbox `ins_127991` (OAuth-required). Redirect-back works. Whitelist for prod URLs is owned by Platform team — ticket `PLAT-2204` filed.                                                                                          | Platform    | 🟡 Amber, tracking    |
| FYA-012 | Public token exchange            | Exchange + persist item        | `POST /v1/plaid/exchange` body `{ publicToken, metadata }` | `externalAccount`        | Verified | None                  | Exchange returns the newly-created external account record with full details.                                                                                                                                                                  | —           | ✅ Resolved           |
| FYA-013 | Account selection within Link    | Persist user's chosen accounts | Plaid Link `accountSelection: true` config                 | n/a                      | Verified | **Behavior gap**      | Plaid Link supports per-session account selection; once linked, set is immutable. Design assumes user can later add/remove accounts within an institution. M. Chen: requires re-linking institution. Design accepts (S. Patel adjusting copy). | Design      | 🟡 Amber → Resolved   |
| FYA-014 | Link error → user-facing message | Map Plaid error codes          | n/a (frontend SDK)                                         | `error.error_code`       | Inferred | **Error catalog gap** | Plaid SDK surfaces ~15 error codes; UX has copy for 4. Need full mapping. S. Patel + FE will produce mapping doc.                                                                                                                              | Design + FE | 🟡 Amber, in progress |

### 5.3 Initiate Transfer screen

| ID      | UI element                    | Data need                                 | Endpoint                                                                 | Field                                                         | Conf.    | Gap                   | Notes                                                                                                                                                                                                              | Owner | Status           |
| ------- | ----------------------------- | ----------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------- | -------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----- | ---------------- |
| FYA-020 | Source account dropdown       | List internal accounts user can pull from | `GET /v1/internal-accounts?capability=ach_debit`                         | `accounts[]`                                                  | Verified | None                  | Capability filter confirmed working.                                                                                                                                                                               | —     | ✅ Resolved      |
| FYA-021 | Destination account dropdown  | List internal + external accounts         | `GET /v1/internal-accounts` + `GET /v1/external-accounts`                | n/a                                                           | Verified | None                  | FE merges client-side.                                                                                                                                                                                             | —     | ✅ Resolved      |
| FYA-022 | Amount input — max validation | Per-transfer limit                        | (no endpoint)                                                            | n/a                                                           | n/a      | **Missing endpoint**  | Limits exist server-side; not exposed. Currently must hardcode $25k or fail at submit. M. Chen: will add `GET /v1/transfers/limits` returning per-transfer, daily, monthly limits per direction. Ticket `PAY-815`. | BE    | 🟥 Red, sprint 2 |
| FYA-023 | Estimated arrival date        | Show "Arrives by Friday"                  | (no endpoint)                                                            | n/a                                                           | n/a      | **Missing data**      | Depends on submit time vs ACH cutoff (3pm ET same-day; 5pm ET next-day). Cutoff times not exposed. Bundled into `PAY-815` (limits endpoint will also return cutoff schedule).                                      | BE    | 🟥 Red, sprint 2 |
| FYA-024 | Submit button                 | Create transfer                           | `POST /v1/transfers` body `{ sourceId, destId, amountCents, direction }` | `transfer`                                                    | Verified | **NFR — idempotency** | Endpoint does NOT accept or honor `Idempotency-Key`. **Unacceptable for money movement.** M. Chen agreed; ticket `PAY-816` for sprint 1. FE will generate UUID v7 per submit attempt.                              | BE    | 🟥 Red, sprint 1 |
| FYA-025 | Error: insufficient funds     | Show inline error                         | `POST /v1/transfers` 422                                                 | `error.code === "INSUFFICIENT_FUNDS"`                         | Verified | None                  | Probed in sandbox; returns documented shape.                                                                                                                                                                       | —     | ✅ Resolved      |
| FYA-026 | Error: limit exceeded         | Show inline error w/ limit value          | `POST /v1/transfers` 422                                                 | `error.code === "LIMIT_EXCEEDED"`, `error.context.limitCents` | Verified | None                  | Probed; works as documented.                                                                                                                                                                                       | —     | ✅ Resolved      |

### 5.4 Transfer Detail / Status

| ID      | UI element                                                  | Data need                         | Endpoint                 | Field                  | Conf.    | Gap                         | Notes                                                                                                                                                                                                                                                                              | Owner   | Status                                  |
| ------- | ----------------------------------------------------------- | --------------------------------- | ------------------------ | ---------------------- | -------- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | --------------------------------------- |
| FYA-030 | Status timeline (Created → Processing → Settled / Returned) | Status enum                       | `GET /v1/transfers/{id}` | `status`               | Verified | **State gap**               | Enum is `pending / processing / completed / failed`. Design needs distinction between `failed` (rejected at submit) and `returned` (ACH return after processing). M. Chen: will split into `failed` and `returned` with `returnReason`. Ticket `PAY-817`, sprint 2.                | BE      | 🟧 Amber → 🟥 Red after working session |
| FYA-031 | Live status updates                                         | UI updates without manual refresh | (no mechanism)           | n/a                    | n/a      | **NFR — async propagation** | No SSE, WebSocket, or push to FE for status changes. M. Chen confirmed: backend receives ACH webhooks but does not relay. **MVP plan:** poll `GET /v1/transfers/{id}` every 10s while user on detail view, every 30s on history view, stop after 5 min idle. SSE deferred to v1.1. | BE + FE | 🟡 Amber → Deferred (§6c)               |
| FYA-032 | "View in dispute" link                                      | Render only when applicable       | `GET /v1/transfers/{id}` | `disputeId` (nullable) | Verified | None                        | Out of MVP scope; field will exist but link hidden.                                                                                                                                                                                                                                | —       | ✅ Resolved                             |

### 5.5 Transfer History

| ID      | UI element       | Data need              | Endpoint                                 | Field                  | Conf.    | Gap                  | Notes                                                                                                         | Owner | Status              |
| ------- | ---------------- | ---------------------- | ---------------------------------------- | ---------------------- | -------- | -------------------- | ------------------------------------------------------------------------------------------------------------- | ----- | ------------------- |
| FYA-040 | Paginated list   | Last 90 days, sortable | `GET /v1/transfers?limit=&offset=&sort=` | `transfers[]`, `total` | Verified | **NFR — pagination** | Offset-based; not cursor-based. Acceptable for 90-day window (max ~500 records). Flagging for future scaling. | —     | 🟡 Amber → Accepted |
| FYA-041 | Filter by status | Query param            | `GET /v1/transfers?status=`              | n/a                    | Verified | None                 | Single-value filter only; design only needs single.                                                           | —     | ✅ Resolved         |
| FYA-042 | Empty state      | n/a                    | n/a                                      | n/a                    | n/a      | None                 | FE-only concern.                                                                                              | —     | ✅ Resolved         |

---

## 6. Gap Summary

### 6a. 🟥 Red items (blockers — must resolve before MVP ship)

| ID                | Description                                                             | Owner   | Ticket    | Committed sprint |
| ----------------- | ----------------------------------------------------------------------- | ------- | --------- | ---------------- |
| FYA-004           | Split connection status enum into `needs_reauth` and `disconnected`     | M. Chen | `PAY-812` | Sprint 1         |
| FYA-005           | Honor `mode: "update"` on link-token endpoint for re-auth flow          | M. Chen | `PAY-813` | Sprint 1         |
| FYA-024           | Add `Idempotency-Key` header support to `POST /v1/transfers`            | M. Chen | `PAY-816` | Sprint 1         |
| FYA-022 + FYA-023 | New `GET /v1/transfers/limits` endpoint exposing limits and ACH cutoffs | M. Chen | `PAY-815` | Sprint 2         |
| FYA-030           | Split transfer status enum to add `returned` state with reason          | M. Chen | `PAY-817` | Sprint 2         |

**Frontend implication:** No FE work begins on `Initiate Transfer` or `Linked Accounts > Update Credentials` until sprint 1 BE work merges to dev. FE can begin work on Plaid Link integration, internal account picker, and history list immediately.

### 6b. 🟡 Amber items (clarifications or non-blocking)

| ID      | Description                                                                | Disposition                                                                                                                              |
| ------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| FYA-007 | `lastSyncedAt` semantics ambiguity                                         | Documented as "last successful sync"; `lastAttemptedAt` deferred to v1.1                                                                 |
| FYA-011 | OAuth redirect URL whitelist for prod                                      | Tracking with Platform team `PLAT-2204`                                                                                                  |
| FYA-013 | Account selection immutability post-link                                   | Design copy adjustment; no API change                                                                                                    |
| FYA-014 | Plaid SDK error code → UX mapping                                          | FE + Design producing mapping doc by end of sprint 1                                                                                     |
| FYA-040 | Offset-based pagination                                                    | Accepted for MVP; revisit if 90-day record count exceeds 1000                                                                            |
| FYA-051 | Inconsistent casing in API responses (`mask` snake → `lastSyncedAt` camel) | M. Chen confirms migration to camelCase complete except `external_accounts.account_subtype` legacy field; FE will handle in mapper layer |
| FYA-052 | Rate limits undocumented                                                   | M. Chen: 100 req/min/user across Payments API; will add to docs `PAY-820`                                                                |
| FYA-053 | 401 handling                                                               | Confirmed: silent token refresh via session cookie; FE retries once on 401                                                               |
| FYA-054 | Correlation ID echo                                                        | API echoes `X-Request-ID` header; FE will originate one per request, log on error                                                        |
| FYA-055 | Error response shape consistency                                           | 90% consistent; 2 endpoints (`/exchange`, `/internal-accounts`) return legacy shape. M. Chen: low priority cleanup                       |
| FYA-056 | Webhook → audit log visibility                                             | FE doesn't need; BE-only concern noted for ops team                                                                                      |

### 6c. ⏸ Deferred to v1.1 (PO sign-off acquired)

| ID      | Description                                               | Sign-off                                         |
| ------- | --------------------------------------------------------- | ------------------------------------------------ |
| FYA-031 | Real-time async status (SSE/WebSocket) — MVP uses polling | J. Rivera ✅ 2026-04-21                          |
| (new)   | Recurring/scheduled transfers                             | J. Rivera ✅ (already out of MVP per epic scope) |
| (new)   | `lastAttemptedAt` field on external accounts              | J. Rivera ✅ 2026-04-21                          |

---

## 7. NFR Findings

**Caching.** Internal account list: safe to cache for session (rarely changes). External account list: invalidate on any link/unlink/re-auth event. Transfers: never cache the list; cache individual transfer details for 5s while on detail view (poll otherwise). No ETag support on any endpoint — flagged as future improvement.

**Pagination & sorting.** Offset-based across the board (see FYA-040). Default page size 25, max 100. Sort accepts `createdAt` and `amountCents`, both directions. Acceptable for MVP scale.

**Real-time / async.** No push mechanism in v1. **MVP plan:**

- Transfer detail view: poll `GET /v1/transfers/{id}` every 10s while view is mounted and `status ∈ {pending, processing}`. Stop on terminal state or after 5 min.
- Transfer history: poll `GET /v1/transfers?status=processing` every 30s while view mounted; merge results into existing list.
- Linked accounts: no polling; refresh on screen mount and after explicit user actions.
  SSE roadmap committed for v1.1.

**Idempotency.** Currently absent on `POST /v1/transfers` (Red, see FYA-024). All other mutations (`DELETE /v1/external-accounts/{id}`, `POST /v1/external-accounts/{id}/reauth`) are naturally idempotent or low-risk on retry. FE will still send `Idempotency-Key` header on all POSTs to be future-proof.

**Rate limits.** 100 req/min/user across Payments API (per FYA-052). Polling design above stays well under at p95. 429 responses include `Retry-After` header; FE will respect it with exponential backoff capped at 60s.

**Latency budgets.** From sandbox probes (n=20 per endpoint, sandbox not representative of prod but directional):

| Endpoint                    | p50   | p95   |
| --------------------------- | ----- | ----- |
| `GET /v1/external-accounts` | 140ms | 380ms |
| `GET /v1/internal-accounts` | 90ms  | 220ms |
| `POST /v1/plaid/link-token` | 320ms | 780ms |
| `POST /v1/plaid/exchange`   | 1.1s  | 2.4s  |
| `POST /v1/transfers`        | 280ms | 640ms |
| `GET /v1/transfers`         | 180ms | 420ms |

**Submit feedback:** `POST /v1/plaid/exchange` p95 of ~2.4s is high enough that FE will show an extended loading state after 600ms. M. Chen confirms this is dominated by Plaid round-trip; not a backend optimization opportunity.

**Auth.** Session cookie set by SSO at login; same-origin requests carry it automatically. CSRF token in `X-CSRF-Token` header sourced from a meta tag at app boot. Silent refresh on 401 supported; FE retries failed request once after refresh succeeds, propagates error otherwise.

**Security boundary.** Confirmed via response inspection on 12 endpoints: Plaid `access_token` never present in any frontend-bound payload. `link_token` is short-lived (4 hours) and scoped to the user. No long-lived secrets in any response.

---

## 8. Live Probe Results

Hit 6 endpoints with realistic payloads via Postman + sandbox credentials. Findings beyond what's already in the matrix:

- **`GET /v1/external-accounts`** returns `availableBalance` as `null` for credit-type accounts. Documented as nullable but worth noting — FE must guard rendering. Added to FE notes; no matrix row.
- **`POST /v1/plaid/exchange`** returns 201 with `Location` header pointing to the new external account resource. Useful for redirect logic; not documented but BE confirms it's stable.
- **`POST /v1/transfers`** rejects amounts with more than 2 decimal places with a generic 400, not a specific error code. Cosmetic; FE will validate client-side first.
- **`DELETE /v1/external-accounts/{id}`** is fast (~80ms p95) but does NOT block on Plaid `/item/remove` — that's fired async. Means the external account disappears from the FE list, but Plaid-side cleanup may lag. Edge case: if user immediately re-links the same institution, possible duplicate-item state. M. Chen: rare in practice; will flag but not fix for MVP.
- **Sandbox quirk:** the `INSUFFICIENT_FUNDS` error from `POST /v1/transfers` requires using the magic amount `$0.01` to trigger; documented in `payments-api/docs/sandbox-fixtures.md` after I asked.

---

## 9. Plaid-Specific Verification Checklist

| Item                                 | Status | Notes                                                                                                                                                     |
| ------------------------------------ | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Link token lifecycle                 | ✅     | TTL 4h. BE generates per-request; not cached.                                                                                                             |
| Public-token → access-token exchange | ✅     | Server-side only confirmed via response inspection.                                                                                                       |
| OAuth institution flow               | ⚠️     | Works in sandbox. Prod redirect URL whitelist update required (`PLAT-2204`).                                                                              |
| Re-auth flow                         | 🟥     | Update mode broken — FYA-005 / `PAY-813`.                                                                                                                 |
| Account selection persistence        | ✅     | Per-session, immutable post-link. Design adjusted (FYA-013).                                                                                              |
| Consent and disclosure               | ✅     | Legal-approved copy in Figma; final review by Compliance Apr 28.                                                                                          |
| Webhook → UI propagation             | ⚠️     | No mechanism for MVP; polling instead. SSE deferred (FYA-031).                                                                                            |
| Item removal                         | ✅     | BE calls Plaid `/item/remove`; async (see §8 caveat).                                                                                                     |
| Institution status / deprecation     | ⚠️     | No active surfacing; if Plaid deprecates an institution, item enters `disconnected` state via webhook. Minimal UX exists. Acceptable for MVP.             |
| Environment scoping                  | ✅     | Plaid env (`sandbox` / `development` / `production`) is BE-controlled; FE never sees a Plaid public key directly. Link tokens are env-scoped server-side. |

---

## 10. Risks & Mitigations

| Risk                                                                                                  | Likelihood | Impact     | Mitigation                                                                                                         |
| ----------------------------------------------------------------------------------------------------- | ---------- | ---------- | ------------------------------------------------------------------------------------------------------------------ |
| BE doesn't deliver sprint-1 Reds on time (FYA-004, 005, 024)                                          | Low        | High       | FE work on these screens cannot start; reallocate to Plaid Link + history list. Re-evaluate at sprint-1 mid-point. |
| ACH return rate higher than expected → users see `returned` state more often than Design accounts for | Medium     | Medium     | S. Patel to expand `returned` state copy variations covering top 5 NACHA return reasons.                           |
| Polling-based status updates feel sluggish in user testing                                            | Medium     | Low–Medium | Acceptable for MVP per PO. If user complaints exceed threshold, accelerate v1.1 SSE work.                          |
| Plaid sandbox-vs-prod behavior diverges (esp. OAuth, webhooks)                                        | Medium     | Medium     | Conduct a prod smoke test with a real test institution before GA. Owned by FE + BE jointly.                        |
| Idempotency key plumbing introduces FE complexity                                                     | Low        | Low        | Centralize in API client interceptor; one implementation, used by all mutations.                                   |

---

## 11. Sign-Off

| Role               | Name      | Decision                                                                   | Date       | Acknowledgment                             |
| ------------------ | --------- | -------------------------------------------------------------------------- | ---------- | ------------------------------------------ |
| Backend Lead       | M. Chen   | ✅ Approve, with sprint commitments above                                  | 2026-04-21 | Slack thread `#fya-build` 2026-04-21 14:32 |
| PM / Product Owner | J. Rivera | ✅ Approve, including v1.1 deferrals                                       | 2026-04-21 | Slack thread `#fya-build` 2026-04-21 14:48 |
| Design Lead        | S. Patel  | ✅ Approve, copy adjustments owned (FYA-013, 014; returned-state variants) | 2026-04-21 | Slack thread `#fya-build` 2026-04-21 15:01 |
| Frontend Lead      | (self)    | ✅ Approve                                                                 | 2026-04-22 | This document                              |

**Re-review trigger:** Any of the Red items not delivered by end of their committed sprint, or any new Plaid SDK / API contract change.

---

## 12. Appendix: Open Tickets Created From This Review

- `PAY-812` — Split external account status enum (sprint 1)
- `PAY-813` — Honor `mode: "update"` on link-token endpoint (sprint 1)
- `PAY-815` — `GET /v1/transfers/limits` endpoint (sprint 2)
- `PAY-816` — `Idempotency-Key` support on `POST /v1/transfers` (sprint 1)
- `PAY-817` — Add `returned` to transfer status enum (sprint 2)
- `PAY-820` — Document rate limits (low priority)
- `PLAT-2204` — Production OAuth redirect URI whitelist (Platform team)
- `FYA-FE-101` — FE: implement idempotency key generation + interceptor
- `FYA-FE-102` — FE: implement polling strategy for transfer status
- `FYA-FE-103` — FE: produce Plaid Link error code → UX copy mapping (with Design)
