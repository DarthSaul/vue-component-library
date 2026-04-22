# UI/API Feature Parity Review — Playbook

> A pre-implementation process for verifying that a backend API can support every requirement in a UX design, **before** committing engineering time to the frontend build. Worked example throughout: the bank's new Plaid account-linking experience.

---

## Purpose & Outcome

**Purpose:** Surface every gap, mismatch, and ambiguity between what the design asks for and what the API can deliver, so they get resolved on paper rather than mid-sprint.

**Outcome:** A single reviewed and signed-off document — this one — with:

1. A **parity matrix** listing every UI data-need and action mapped to an API capability.
2. A **gap list** with each gap classified, owned, and tracked as a backend ticket, a design decision, or a deferral.
3. **Sign-off** from the backend lead, the PM/PO, and the frontend lead (you) before a single component gets written.

**Rule of thumb:** If you can't fill in every cell of the matrix with verified information, you don't have enough to start building.

---

## 1. Gather the Authoritative Artifacts

Before analysis, pin down _which_ version of each input is the source of truth. Ambiguity here invalidates everything downstream.

| Artifact          | What "authoritative" means                                                                                                                                           | Plaid example                                                                                                                                             |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Design**        | A final Figma file, stamped "ready for dev," with all states visible — not just happy path.                                                                          | Every Link entry point, institution search, OAuth redirect return, account selection, re-auth, success, every error.                                      |
| **API contract**  | In order of preference: (1) OpenAPI/Swagger spec, (2) Postman collection, (3) written docs with example payloads, (4) backend engineer's verbal description (worst). | Endpoints for link token creation, public-token exchange, account list, account refresh, unlink, re-auth initiation.                                      |
| **User stories**  | Acceptance criteria that define "done" for each flow.                                                                                                                | "Given I've linked Chase, when the backend completes the initial transaction backfill, then I see my transactions populated without manually refreshing." |
| **Error catalog** | A documented list of error codes the API returns and the intended UX for each.                                                                                       | `ITEM_LOGIN_REQUIRED`, `INSTITUTION_DOWN`, `INVALID_CREDENTIALS`, `RATE_LIMIT_EXCEEDED`, etc.                                                             |
| **Event model**   | If webhooks or async events are involved, documentation of which events exist and how the frontend learns about them.                                                | Plaid fires `TRANSACTIONS_UPDATES_AVAILABLE` to your backend — how does the SPA find out? Polling? SSE? WebSocket?                                        |

**If any of these don't exist, that itself is a finding.** Log it as a gap before moving on — don't fill it in from imagination.

---

## 2. Decompose Each Screen Into a Data/Action Inventory

For every screen in the design, enumerate:

- **Displayed fields** — including derived fields (e.g., "masked account number" derived from `account.mask`), and conditionally visible fields.
- **User actions** — every button, link, swipe, long-press, keyboard shortcut. Include preconditions (enabled when? visible when?).
- **States** — loading, empty, partial, error, success, disabled, re-auth-required, rate-limited, offline.
- **Transitions** — what causes entry into this screen, what causes exit, what causes re-render without navigation.

### Worked example — "Linked Accounts" screen

**Displayed fields** (per linked institution):

- Institution name
- Institution logo
- Last synced timestamp (relative: "2 hours ago")
- Connection status (active / needs attention / disconnected)
- List of accounts within institution, each showing:
     - Account name
     - Account type (checking, savings, credit)
     - Last 4 of account number
     - Current balance
     - Available balance (checking/savings only)
     - "Included in budget" toggle state

**Actions:**

- Tap institution → navigate to institution detail
- Tap "Update credentials" (only visible when `status === 'needs_attention'`)
- Tap "Remove" on account → confirmation → unlink
- Tap account → navigate to account detail
- Tap "+ Link another account" → launch Plaid Link
- Pull-to-refresh → re-fetch accounts + trigger backend balance refresh

**States:**

- Initial loading (skeleton)
- Empty (no accounts linked yet — shows onboarding CTA)
- Partial (some institutions need re-auth — banner + per-row indicator)
- Full error (entire list failed to load)
- Refreshing (pull-to-refresh in flight, showing stale data)
- Offline (cached data shown with offline banner)

**Transitions in:** post-link-success redirect, bottom-nav tap, deep link from push notification.
**Transitions out:** any navigation, logout, session expiry.

Doing this exhaustively per screen is tedious and essential. Every missed row is a potential mid-sprint surprise.

---

## 3. Build the Parity Matrix

The core artifact. One row per UI data-need or action. Use a spreadsheet — Google Sheets, Excel, Notion database, whatever — so it's sortable and filterable.

### Recommended columns

| Column             | What goes in it                                                                                             |
| ------------------ | ----------------------------------------------------------------------------------------------------------- |
| ID                 | Stable identifier (e.g., `LINK-001`) for referencing in tickets                                             |
| Screen             | Screen or feature name                                                                                      |
| UI element         | What the user sees or does                                                                                  |
| Data need / action | Plain English: "Display last synced time" or "Unlink account"                                               |
| Source endpoint    | `GET /api/v1/institutions/{id}`                                                                             |
| Request shape      | Params, body, headers (summary)                                                                             |
| Response field(s)  | Exact path into the response: `institution.lastSyncedAt`                                                    |
| Confidence         | Verified / Inferred / Unknown                                                                               |
| Gap                | None / Missing field / Missing endpoint / Shape mismatch / State gap / Action gap / Ambiguous / NFR concern |
| Notes              | Specifics, open questions                                                                                   |
| Owner              | Whose court it's in: BE, FE, Design, PM                                                                     |
| Status             | Open / In discussion / Resolved / Deferred                                                                  |

### Worked example — first several rows

| ID       | Screen          | UI element                  | Data need                               | Endpoint                                       | Response field                | Confidence | Gap              | Notes                                                                                                                                                                                    | Owner | Status        |
| -------- | --------------- | --------------------------- | --------------------------------------- | ---------------------------------------------- | ----------------------------- | ---------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ------------- |
| LINK-001 | Linked Accounts | Institution name            | Display name                            | `GET /accounts`                                | `institutions[].name`         | Verified   | None             | —                                                                                                                                                                                        | —     | Resolved      |
| LINK-002 | Linked Accounts | Institution logo            | Display logo                            | `GET /accounts`                                | `institutions[].logoUrl`      | Inferred   | Missing field    | Response has `institutionId` only; need logo URL or need to call Plaid's `/institutions/get_by_id` through BE                                                                            | BE    | Open          |
| LINK-003 | Linked Accounts | Last synced time            | Relative timestamp                      | `GET /accounts`                                | `institutions[].lastSyncedAt` | Unknown    | Ambiguous        | Is this last successful sync, last attempt, or last webhook received? Affects "needs attention" logic.                                                                                   | BE    | In discussion |
| LINK-004 | Linked Accounts | Connection status badge     | active / needs_attention / disconnected | `GET /accounts`                                | `institutions[].status`       | Verified   | State gap        | API returns only `active` / `error`. Design has three states. Need to split `error` into `needs_attention` (re-auth fixable) vs `disconnected` (user removed or institution deprecated). | BE    | Open          |
| LINK-005 | Linked Accounts | "Update credentials" button | Initiate re-auth flow                   | `POST /plaid/link-token` with `mode: 'update'` | `linkToken`                   | Inferred   | Missing endpoint | Endpoint supports initial link only; no update mode. Required for `ITEM_LOGIN_REQUIRED` recovery.                                                                                        | BE    | Open          |
| LINK-006 | Linked Accounts | Pull-to-refresh             | Trigger backend sync                    | `POST /accounts/refresh`                       | 202 Accepted                  | Verified   | NFR concern      | Endpoint is async; no mechanism for FE to know when complete. Need SSE, polling strategy, or webhook→push.                                                                               | BE    | In discussion |

This is the document that carries the conversation with the backend team. Each open row turns into a ticket or a design adjustment.

---

## 4. Gap Categories to Probe For

Scan the matrix against each category explicitly. You will find more gaps by checking against categories than by just reading your inventory.

**Missing endpoint.** The UI needs to do X; no endpoint supports X. _Example:_ design shows "nickname this account" but the API has no PATCH on accounts.

**Missing field.** An endpoint is the right one, but lacks a field the design shows. _Example:_ LINK-002 above.

**Shape mismatch.** API groups data by one hierarchy, UI needs another. _Example:_ API returns a flat list of accounts each with `institutionId`; design groups accounts by institution. (Minor — FE reshapes. But flag it; confirm institution metadata isn't lost.)

**State gap.** The design has a state the API can't express. _Example:_ LINK-004 above.

**Action gap.** A button in the design with no endpoint to call.

**Error surface gap.** Errors come back as `{ message: "..." }` only, no code. UX needs to branch on error type (e.g., different messaging for `INVALID_CREDENTIALS` vs `INSTITUTION_DOWN`), which is impossible without stable codes. Push for a documented error code catalog.

**Chattiness / N+1.** One screen requires many calls. _Example:_ if the accounts list doesn't include balances and each row fires its own `GET /accounts/{id}/balance`, you've got N+1. Either the list endpoint embeds balances or there's a batch endpoint.

**Authorization semantics.** Can the UI render-gate from response data, or does it have to guess? _Example:_ should the "Remove" button appear on a joint account that a secondary holder didn't add? Either response includes a `permissions` object or you have a guessing game.

**Ambiguity.** Field exists, semantics unclear. Timestamps are the most common offender: created, updated, last_synced, last_attempted — often conflated.

---

## 5. Non-Functional Requirements Probe

Cover these explicitly with the backend lead. Each question deserves a written answer.

### Pagination & sorting

- How does `GET /transactions` paginate — offset? cursor? Plaid uses cursor-based; is that surfaced?
- Can the client specify sort order and direction, or is it fixed?
- What's the max page size?

### Caching

- What's safe to cache and for how long? (TTL per resource.)
- Does the API support ETags or `If-None-Match` for conditional requests?
- Are there endpoints the FE should _never_ cache (balances, critical state)?

### Real-time / async

- Plaid Link returns a public token immediately, but account and transaction data backfills asynchronously over seconds-to-minutes. How does the SPA know when data is ready?
     - Polling? (What interval? Any server-provided hint like `Retry-After`?)
     - SSE stream?
     - WebSocket?
     - Push notification + user-initiated refresh?
- What events trigger what UI updates?

### Idempotency

- Which endpoints are mutations that could be retried?
- Does the API accept an `Idempotency-Key` header?
- If not, what's the recovery strategy when a POST times out?

### Rate limits

- Per-user? Per-IP? Per-endpoint?
- What does rate-limit response look like — 429 with `Retry-After`, custom code, something else?
- How should the UI behave when rate-limited? (Backoff UI? Silent retry?)

### Latency budgets

- Expected p50/p95 for each endpoint you depend on?
- Is there an endpoint where "slow" is the default and you should show an extended loading state?

### Auth

- Token type — session cookie, bearer, OIDC?
- Refresh mechanism?
- What happens on 401 — silent refresh, hard redirect, in-app re-auth modal?

### Security boundary

- Is the Plaid `access_token` ever exposed to the client? (It must not be.)
- Is the `link_token` short-lived? Expiry policy?
- Are there any secrets or long-lived tokens in responses that should be scrubbed?

---

## 6. Live Integration Probes

**Don't stop at paper analysis.** API docs lie routinely. The cheapest bugs to catch are the ones you find before writing UI code.

### Process

1. Get a dev environment API base URL and a test user.
2. Pick the 3–5 most complex or most-integrated endpoints.
3. Hit them with Postman / `curl` / a throwaway script.
4. Compare actual responses against the docs and the matrix.
5. Log every discrepancy as a matrix row.

### What you're looking for

- Fields documented but missing from the response.
- Fields in the response but undocumented.
- Type mismatches (`"123"` vs `123`, ISO strings vs epoch ms, enum casing).
- Null vs missing-key behavior (inconsistent across endpoints is a minefield).
- Actual error shapes vs documented error shapes — trigger real errors (expired token, bad ID, forbidden resource).
- Real-world latency.

### Plaid-specific probes

- Create a link token. Inspect the response shape exactly.
- Use Plaid's Sandbox credentials to complete a link flow end-to-end. Watch network traffic.
- Intentionally trigger `ITEM_LOGIN_REQUIRED` (Sandbox has a fixture for this). Confirm the backend surfaces it in a parseable way.
- Test the re-auth flow end-to-end.
- Test an OAuth institution (some Sandbox institutions support OAuth simulation). Confirm the redirect-back flow works with your backend's session handling.

### Output

Every probe that reveals a discrepancy becomes a matrix row. Every probe that confirms the docs gets the confidence field flipped to "Verified."

---

## 7. Plaid-Specific Verification Checklist

These are the places Plaid implementations most often go wrong. Run the list explicitly.

- [ ] **Link token lifecycle** — who creates it, when, what expiry does the backend set, how is it refreshed if the user takes too long to complete Link.
- [ ] **Public-token → access-token exchange** — confirmed server-side only. Access token never appears in any frontend-bound response body, log, or URL param.
- [ ] **OAuth institution flow** — confirm the backend handles the redirect-back URL, that the frontend can resume Link correctly after return, that deep-link state is preserved.
- [ ] **Re-auth flow** — `ITEM_LOGIN_REQUIRED` has an endpoint to initiate an "update mode" Link session. Confirm UX path from detecting the state → initiating re-auth → returning to the app.
- [ ] **Account selection persistence** — if the user selects specific accounts at link time, who remembers (backend vs frontend) and how is it re-displayed?
- [ ] **Consent and disclosure** — regulatory requirement at a bank. Confirm the required screens exist in the design and that copy is legally approved.
- [ ] **Webhook → UI propagation** — backend receives `TRANSACTIONS_UPDATES_AVAILABLE`, `SYNC_UPDATES_AVAILABLE`, `ITEM_ERROR`, etc. For each, confirm the path by which the SPA learns.
- [ ] **Item removal** — when a user unlinks, confirm backend calls Plaid's `/item/remove` (not just soft-deletes locally). Confirm UX for re-adding a previously-unlinked institution.
- [ ] **Institution status** — Plaid occasionally deprecates institutions. How is the UI informed? What happens to existing items?
- [ ] **Environment handling** — Sandbox vs Development vs Production. Confirm the frontend's Plaid public key / environment is correctly scoped per deployment.

---

## 8. Deliver & Get Sign-Off

### Working session

Schedule a 60–90 minute review with:

- Backend lead (required)
- Product owner / PM (required)
- Designer (recommended)
- Tech lead or architect (recommended)

### Agenda

1. Walk through the matrix, row by row for open items. (Skim resolved rows.)
2. For each open row, land on a disposition: **Green** (no change), **Amber** (clarification only), **Red** (API change required), **Deferred** (out of scope or post-MVP).
3. Every Red item gets a backend ticket created before leaving the meeting.
4. Every Deferred item gets explicit PO acknowledgment — "we're shipping without this."

### After the session

- Update the matrix with dispositions and ticket links.
- Circulate the final matrix for written sign-off from backend lead, PM, and yourself. Email / Slack / Notion acknowledgment is fine; the point is creating a paper trail.
- Link the matrix from the feature's main tracking ticket.

**This is the document you point at when scope drifts.** "We agreed LINK-005 was a Red and backend committed to it by sprint 2. Here's the matrix, here's the sign-off."

---

## 9. Appendix: Deliverable Structure

A suggested structure for the final artifact you circulate:

```
1. Executive summary                  (1 paragraph: readiness verdict)
2. Scope                              (what's in, what's out)
3. Inputs reviewed                    (design version, API version, docs version)
4. Methodology                        (brief: this playbook)
5. Parity matrix                      (the spreadsheet, linked)
6. Gap summary
   6a. Critical gaps (Red)            (with owners + ticket links)
   6b. Open questions (Amber)
   6c. Deferred items                 (with PO sign-off)
7. NFR findings                       (caching, pagination, real-time, etc.)
8. Live probe results                 (what you hit, what surprised you)
9. Plaid-specific checklist status
10. Risks & mitigations               (what could still bite us mid-build)
11. Sign-off block                    (names, dates, Slack/email links)
```

---

## 10. Rules of Thumb

- **If you can't fill in a matrix row, that's a finding, not a blocker to writing the matrix.**
- **Every `Unknown` confidence is either a probe you haven't run or a question you haven't asked.** They are work items, not acceptable states.
- **Favor written over verbal.** "The backend lead said it returns X" is not verification. A Postman response pasted into the matrix notes is.
- **Flag NFRs early.** Functional gaps are easy to see; NFR gaps hide until production.
- **Error catalog is load-bearing.** If the backend can't produce one by the time you start building, flag it loudly — your error UX will be a mess without it.
- **Your 40-hour budget starts ticking when you start building, not when you start reviewing.** Budget the parity review as pre-work; it pays for itself many times over.
