# Plaid Link Launch + Result Handling — Integration Seam Decomposition

**Purpose:** Decompose the boundary between the CNB app and the Plaid Link iframe. The UI *inside* the Plaid iframe is owned and rendered by Plaid; we don’t decompose that. What we *do* decompose is everything at the seams: pre-launch state, configuration passed to Link, callback contracts, and how callback data routes to downstream flows.

**Audience:** Me (during build); linked from risk register; shared with backend lead.

**Source design:** [Figma — New Plaid Flow integration spec]. Plaid Link’s iframe UI is Plaid’s own; see Plaid Link Web SDK documentation for its contract.

**Plaid flows used:** Instant Auth, Instant Match.

**API status:** All CNB endpoints in this flow are 🔧 assumed (no backend yet).

**Conventions:**

- This decomposition has slightly different sections than a typical screen decomp. There’s almost nothing in the traditional Displayed Fields sense (the iframe is opaque to us). Instead, the meaty sections are **Configuration**, **Callbacks**, and **Transitions to downstream flows**.
- `❓` open questions; `🔧` assumed API contracts. Consolidated in the tracker.

-----

## What this decomposition is and isn’t

**It is:**

- The contract between our app code and Plaid Link
- Pre-launch state and validation
- Configuration passed to Plaid Link’s `create()` method
- Callback handling (`onSuccess`, `onExit`, `onEvent`)
- The exchange call to our backend after Plaid succeeds
- Routing logic from exchange response to downstream flows

**It isn’t:**

- The UI inside the Plaid iframe (Plaid’s, not ours)
- The Plaid SDK’s internal state machine (documented by Plaid)
- The downstream flow screens themselves (separate decompositions)

-----

## Pre-launch requirements

Before opening Plaid Link, our code must ensure:

|ID       |Requirement                                               |Source                                                    |Notes                                                                                               |
|---------|----------------------------------------------------------|----------------------------------------------------------|----------------------------------------------------------------------------------------------------|
|PL-PRE-01|Authenticated CNB session                                 |Existing auth                                             |If session expired, refresh or redirect to login before launching.                                  |
|PL-PRE-02|Permission to add external accounts                       |🔧 Assumed: `currentUser.permissions` or per-endpoint authz|If lacking, the entry point shouldn’t have been visible — but defensive check at launch is worth it.|
|PL-PRE-03|Fresh `link_token` from CNB backend                       |🔧 `POST /plaid/link-token` (assumed)                      |TTL is 4 hours per Plaid default. Don’t cache aggressively. Generate per-launch is safest.          |
|PL-PRE-04|Plaid SDK loaded                                          |Plaid CDN script or npm SDK                               |If loading async, show launching state until SDK ready.                                             |
|PL-PRE-05|Context: which business/account this user is linking *for*|App state passed in at launch                             |New external account is associated with this context. Must be in scope at exchange time.            |

-----

## Configuration passed to Plaid Link

What we pass when creating a Link handler. 🔧 Most of this is assumed and needs backend confirmation.

|ID       |Config key                                 |Value source                                             |Notes                                                                                                                              |
|---------|-------------------------------------------|---------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------|
|PL-CFG-01|`token`                                    |PL-PRE-03 result                                         |The link token. Required.                                                                                                          |
|PL-CFG-02|`onSuccess`                                |Our handler function                                     |Called when user completes Link successfully. See callbacks below.                                                                 |
|PL-CFG-03|`onExit`                                   |Our handler function                                     |Called when user dismisses Link, with or without an error.                                                                         |
|PL-CFG-04|`onEvent`                                  |Our handler function (optional but recommended)          |Called for analytics-style events throughout the user’s session. Used for telemetry.                                               |
|PL-CFG-05|Products                                   |🔧 Set on the link token at creation, not in client config|Instant Auth + Instant Match. Confirmed in scope. ❓ Are other products (e.g., transactions) intended for v2?                       |
|PL-CFG-06|`receivedRedirectUri` (OAuth resume)       |URL params on return from OAuth institution              |If we’re returning from OAuth redirect, pass this so Plaid can resume the session.                                                 |
|PL-CFG-07|Other config (theme, account filters, etc.)|🔧 Set on link token at creation                          |❓ Confirm with backend whether the token is configured with account-type filters (e.g., depository only), institution filters, etc.|

-----

## Callback contracts

This is the heart of the decomposition. Each callback is a seam where Plaid’s contract meets our code.

### `onSuccess(public_token, metadata)`

Called when the user has successfully linked their institution and selected accounts within Plaid Link.

|ID       |Aspect                    |Detail                                                                                   |Notes                                                                                                                                       |
|---------|--------------------------|-----------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------|
|PL-CB1-01|`public_token`            |String, short-lived                                                                      |Must be exchanged immediately with CNB backend for a permanent reference. Never exposed beyond exchange.                                    |
|PL-CB1-02|`metadata.institution`    |`{ name, institution_id }`                                                               |Useful for logging and for the success surface copy.                                                                                        |
|PL-CB1-03|`metadata.accounts`       |Array of `{ id, name, mask, type, subtype, verification_status }`                        |One entry per account the user selected within Link. `verification_status` is the field that drives Instant Auth vs. Instant Match handling.|
|PL-CB1-04|`metadata.link_session_id`|String                                                                                   |Useful for debugging with Plaid support. Log it.                                                                                            |
|PL-CB1-05|Action                    |Call `POST /plaid/exchange` 🔧 with public_token + metadata + business context (PL-PRE-05)|The exchange is where CNB persists the linked item and runs CNB-side checks (identity match, duplicate detection).                          |

### `onExit(err, metadata)`

Called when the user dismisses Link, with or without completing.

|ID       |Aspect               |Detail                                                                |Notes                                                                                            |
|---------|---------------------|----------------------------------------------------------------------|-------------------------------------------------------------------------------------------------|
|PL-CB2-01|`err`                |Object or `null`                                                      |If `null`, user dismissed without an error (cancelled). If populated, Plaid encountered an error.|
|PL-CB2-02|`err.error_type`     |`'ITEM_ERROR' | 'INSTITUTION_ERROR' | 'API_ERROR' | ...`              |Top-level category.                                                                              |
|PL-CB2-03|`err.error_code`     |E.g., `INVALID_CREDENTIALS`, `ITEM_LOGIN_REQUIRED`, `INSTITUTION_DOWN`|Drives error UX. ❓ Need full mapping table — see Plaid errors decomposition.                     |
|PL-CB2-04|`err.display_message`|Plaid-provided user-facing string                                     |⚠️ Generally do NOT use directly. Map error_code to CNB-controlled copy.                          |
|PL-CB2-05|`metadata`           |Includes `link_session_id`, `status`, `request_id`                    |Status indicates where in the flow the user exited. Log all of this.                             |
|PL-CB2-06|Action (no error)    |Return user silently to Manage External Accounts                      |❓ Confirm: silent return, or “you didn’t link anything” surface?                                 |
|PL-CB2-07|Action (with error)  |Map error_code → Plaid error decomposition’s UX                       |See routing rules below.                                                                         |

### `onEvent(eventName, metadata)`

Called for analytics events. Lower priority but worth wiring.

|ID       |Aspect     |Detail                                                                      |Notes                                                                                                  |
|---------|-----------|----------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------|
|PL-CB3-01|Event names|`OPEN`, `SELECT_INSTITUTION`, `SUBMIT_CREDENTIALS`, `HANDOFF`, `ERROR`, etc.|Plaid emits ~15+ event names.                                                                          |
|PL-CB3-02|Action     |Forward to analytics with CNB session context                               |Useful for funnel analysis (“how many users drop off at institution selection?”). Not required for MVP.|

-----

## States

|ID     |State                                               |Entry condition                                    |UI representation                                                                   |
|-------|----------------------------------------------------|---------------------------------------------------|------------------------------------------------------------------------------------|
|PL-S-01|Pre-launch — fetching link token                    |User triggered launch; PL-PRE-03 in flight         |Roxbury loading indicator or spinner overlay; entry CTA disabled.                   |
|PL-S-02|Pre-launch — token fetch error                      |`POST /plaid/link-token` rejected                  |Inline error with retry; user can re-attempt or cancel.                             |
|PL-S-03|Link iframe open                                    |Plaid Link successfully opened with the token      |Plaid iframe visible; rest of app obscured. We do not control this UI.              |
|PL-S-04|Post-Link — exchanging                              |`onSuccess` fired; `POST /plaid/exchange` in flight|Loading state. ❓ Visible to user as a “Linking your account…” overlay, or invisible?|
|PL-S-05|Post-exchange — success                             |Exchange returned success                          |Route to Manage External Accounts with success surface.                             |
|PL-S-06|Post-exchange — CNB error (identity mismatch)       |Exchange returned a CNB-specific error code        |Route to CNB error decomposition.                                                   |
|PL-S-07|Post-exchange — duplicate                           |Exchange returned a duplicate-account error code   |Route to duplicate account decomposition.                                           |
|PL-S-08|Post-exchange — generic backend error               |Exchange returned 5xx or other server error        |Show retry surface. ❓ Confirm UX — inline retry or full error screen?               |
|PL-S-09|Plaid error                                         |`onExit` fired with a populated `err`              |Route to Plaid errors decomposition.                                                |
|PL-S-10|User cancelled                                      |`onExit` fired with `err === null`                 |Silent return to entry context.                                                     |
|PL-S-11|OAuth-in-progress (institution redirected user away)|User on a partner institution’s OAuth page         |We have no visibility. On return, Plaid Link re-opens via PL-CFG-06.                |

-----

## Transitions — routing from this seam to downstream flows

|ID     |From                                     |To     |Trigger                                                     |Routes to (downstream)                                |
|-------|-----------------------------------------|-------|------------------------------------------------------------|------------------------------------------------------|
|PL-T-01|(caller — e.g., Manage External Accounts)|PL-S-01|User initiates Add External Account                         |—                                                     |
|PL-T-02|PL-S-01                                  |PL-S-03|Link token fetched + Plaid SDK loaded                       |—                                                     |
|PL-T-03|PL-S-01                                  |PL-S-02|Link token fetch rejected                                   |—                                                     |
|PL-T-04|PL-S-02                                  |PL-S-01|User retries                                                |—                                                     |
|PL-T-05|PL-S-03                                  |PL-S-04|`onSuccess` fired                                           |—                                                     |
|PL-T-06|PL-S-03                                  |PL-S-09|`onExit` fired with error                                   |→ Plaid errors decomposition                          |
|PL-T-07|PL-S-03                                  |PL-S-10|`onExit` fired without error                                |→ Silent return to caller                             |
|PL-T-08|PL-S-03                                  |PL-S-11|User selects OAuth institution within Plaid                 |—                                                     |
|PL-T-09|PL-S-11                                  |PL-S-03|OAuth return; Plaid Link re-opens with `receivedRedirectUri`|—                                                     |
|PL-T-10|PL-S-04                                  |PL-S-05|Exchange returned success                                   |→ Caller (Manage External Accounts) with success state|
|PL-T-11|PL-S-04                                  |PL-S-06|Exchange returned CNB identity-mismatch error               |→ CNB error decomposition                             |
|PL-T-12|PL-S-04                                  |PL-S-07|Exchange returned duplicate error                           |→ Duplicate account decomposition                     |
|PL-T-13|PL-S-04                                  |PL-S-08|Exchange returned generic backend error                     |→ Retry or error surface (see Q)                      |

-----

## Open Questions & Assumptions — Working Tracker

|ID    |Type|Question / assumption                                                                                                                                                         |Related IDs                    |Owner                     |Priority |Status                    |Answer              |Becomes                      |
|------|----|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------|--------------------------|---------|--------------------------|--------------------|-----------------------------|
|Q-PL1 |🔧   |`POST /plaid/link-token` shape, options, token TTL. Token configured server-side with products, account filters, redirect URI.                                                |PL-PRE-03, PL-CFG-05, PL-CFG-07|Backend                   |Critical |Open                      |                    |Parity matrix + risk register|
|Q-PL2 |🔧   |`POST /plaid/exchange` request shape — does it accept public_token + metadata + business context? What CNB-side checks run synchronously? Identity match? Duplicate detection?|PL-CB1-05                      |Backend                   |Critical |Open                      |                    |Parity matrix + risk register|
|Q-PL3 |🔧   |`POST /plaid/exchange` response — error codes for CNB-side rejections. Need at minimum: identity mismatch, duplicate-account, generic server error.                           |PL-S-06, PL-S-07, PL-S-08      |Backend                   |Critical |Open                      |                    |Parity matrix + risk register|
|Q-PL4 |🔧   |Access token never exposed to FE. Verify by inspecting exchange response.                                                                                                     |PL-CB1-05                      |Backend                   |Critical |Open (verifiable on probe)|                    |Risk register                |
|Q-PL5 |❓   |Full Plaid error code → UX copy mapping. Plaid documents ~15+ codes; design likely covers 3–4.                                                                                |PL-CB2-03, PL-S-09             |Design + FE               |Critical |Open                      |                    |Risk register                |
|Q-PL6 |🔧   |OAuth flow — for OAuth institutions, what’s the configured `redirectUri`? Whitelist set up in Plaid dashboard + CNB infra?                                                    |PL-CFG-06, PL-S-11             |Backend + Platform        |Important|Open                      |                    |Parity matrix + risk register|
|Q-PL7 |❓   |Post-Link exchange overlay visible or invisible to user? Latency-dependent. If exchange p95 > 1s, visible overlay is warranted.                                               |PL-S-04                        |Design + Backend          |Important|Open                      |                    |Risk register                |
|Q-PL8 |❓   |User cancellation (PL-S-10) — silent return, or a “you didn’t link anything” surface?                                                                                         |PL-S-10, PL-CB2-06             |Design                    |Low      |Open                      |                    |Risk register                |
|Q-PL9 |❓   |Generic backend error on exchange (PL-S-08) — retry surface or full error screen?                                                                                             |PL-S-08                        |Design                    |Important|Open                      |                    |Risk register                |
|Q-PL10|🔧   |Idempotency on `POST /plaid/exchange` — retried exchange shouldn’t create a duplicate item.                                                                                   |PL-CB1-05, PL-S-08             |Backend                   |Important|Open                      |                    |Parity matrix + risk register|
|Q-PL11|❓   |`onEvent` telemetry — wire for MVP, or defer? Analytics value vs. implementation cost.                                                                                        |PL-CB3-01, PL-CB3-02           |PM                        |Low      |Open                      |                    |Risk register                |
|Q-PL12|🔧   |Plaid SDK loading strategy — npm package or CDN script tag? Per page or globally?                                                                                             |PL-PRE-04                      |FE (architecture decision)|Important|Open (own decision)       |Decide and document.|Risk register                |
|Q-PL13|❓   |Plaid environment scoping — Sandbox / Development / Production. Link tokens are environment-scoped at creation, so FE doesn’t need a key — but confirm.                       |PL-CFG-01                      |Backend                   |Low      |Open                      |                    |Risk register                |

### How this tracker feeds the next artifacts

- Q-PL1, Q-PL2, Q-PL3 are the load-bearing assumptions. The entire integration is built on three endpoints: link-token, exchange, and the error codes returned by exchange. All three need backend answers before build can finalize.
- Q-PL5 is the highest-leverage *design* question. Plaid emits many more error codes than the design likely covers. Sit down with the designer and produce the mapping table early — it’s the artifact the Plaid errors decomposition lives or dies by.
- Routing logic from PL-S-04 (post-exchange) to downstream flows is the most complex part of the build. Confirm Q-PL2 and Q-PL3 *before* writing the routing — the error codes determine the branching.

### Notes on this style of decomposition

This document is structured around **contracts, not visible UI**. The Displayed Fields section is essentially absent because we don’t own the iframe’s UI. Instead, the substance is in Configuration (what we pass in), Callbacks (what we get out), and Transitions (where we route to next).

This is the right shape for any third-party integration whose UI is owned by the partner — Stripe Checkout, Auth0 Universal Login, Plaid Link. The decomposition’s value isn’t in inventorying what users see; it’s in inventorying the seams where your code meets theirs.
