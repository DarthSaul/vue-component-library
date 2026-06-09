# FYA Screen Decomposition — Working Notes

**Purpose:** Pre-matrix inventory of every UI element, action, state, and transition per screen. Feeds directly into the parity matrix in the final review document.

**Audience:** Me (during review prep and during build). Linked from the final review artifact for auditability but not part of the sign-off package.

**Source design:** Figma "FYA v1.0 — Dev Handoff" frame, last modified 2026-04-18.

**Conventions:**

- Each screen gets its own section.
- Inventory items are tagged with a stable ID (`<SCREEN>-D-NN` for "displayed", `-A-NN` for "actions", `-S-NN` for "states", `-T-NN` for "transitions"). These IDs feed the matrix `Notes` field so I can trace from a matrix row back to which inventory item produced it.
- "?" markers flag open questions to chase down before or during the working session.

---

## Screen: Initiate Transfer

The transfer-creation form. Most complex screen in MVP; surfaced more Red items than any other (`PAY-815`, `PAY-816`, error-code mapping). Decomposing this one in full because it's the highest-risk screen and the best illustration of the technique.

### Displayed fields

| ID      | Element                                              | Source / derivation                                                                                              | Notes                                           |
| ------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| IT-D-01 | Screen title ("Move Money")                          | Static copy                                                                                                      | —                                               |
| IT-D-02 | Direction toggle (Deposit / Withdraw)                | UI state, default = Deposit                                                                                      | Drives source/dest dropdown contents            |
| IT-D-03 | Source account dropdown — selected label             | Selected account `displayName` + masked number                                                                   | Format: "Checking ••1234"                       |
| IT-D-04 | Source account dropdown — selected balance           | Selected account `availableBalance`                                                                              | Shown as helper text below dropdown             |
| IT-D-05 | Source account dropdown — option list                | Filtered: internal accounts (Deposit dest, Withdraw source) or external accounts (Deposit source, Withdraw dest) | Each row: institution logo, name, mask, balance |
| IT-D-06 | Destination account dropdown — same fields as source | mirrored from IT-D-03/04/05                                                                                      | Filtered to opposite side of toggle             |
| IT-D-07 | Amount input                                         | UI state                                                                                                         | Currency-formatted, USD only for MVP            |
| IT-D-08 | Amount input — max hint ("Up to $25,000.00")         | Per-transfer limit from `GET /v1/transfers/limits`                                                               | ❓ Endpoint doesn't exist yet — FYA-022         |
| IT-D-09 | Daily remaining hint ("$8,420.00 remaining today")   | Daily limit minus sum of today's transfers in same direction                                                     | ❓ Same endpoint dependency                     |
| IT-D-10 | Estimated arrival label                              | Submit time + ACH cutoff schedule                                                                                | ❓ Cutoff schedule not exposed — FYA-023        |
| IT-D-11 | Memo field (optional)                                | UI state                                                                                                         | Max 80 chars per design                         |
| IT-D-12 | Submit button label                                  | Static "Review transfer"                                                                                         | Two-step: review → confirm                      |
| IT-D-13 | Inline error region (above submit)                   | Error from POST attempt                                                                                          | Mapped from `error.code` to copy                |
| IT-D-14 | Disclosure footer                                    | Static legal copy                                                                                                | Compliance-approved                             |

### Derived / conditionally visible

| ID      | Element                                                 | Visible when                                                  | Notes                                                                |
| ------- | ------------------------------------------------------- | ------------------------------------------------------------- | -------------------------------------------------------------------- |
| IT-D-15 | "Linked accounts" empty-state CTA                       | User has no external accounts AND direction includes external | Routes to Plaid Link                                                 |
| IT-D-16 | Re-auth prompt banner                                   | Selected external account `status === 'needs_reauth'`         | Inline CTA to launch update-mode Link                                |
| IT-D-17 | Same-account warning                                    | Source.id === Destination.id                                  | Probably unreachable given filter, but design includes it as defense |
| IT-D-18 | Cutoff-passed warning                                   | Submit time after today's ACH cutoff                          | "Will arrive [next business day]"                                    |
| IT-D-19 | Weekend/holiday warning                                 | Submit on non-business day                                    | "Will be processed [next business day]"                              |
| IT-D-20 | Amount-exceeds-balance warning (Withdraw from internal) | Amount > source.availableBalance                              | Soft warning, not blocking; backend still validates                  |

### Actions

| ID      | Action                          | Trigger                                | Preconditions                    | Result                                                                     |
| ------- | ------------------------------- | -------------------------------------- | -------------------------------- | -------------------------------------------------------------------------- |
| IT-A-01 | Toggle direction                | Tap Deposit/Withdraw segmented control | None                             | Reset both account dropdowns; preserve amount and memo                     |
| IT-A-02 | Open source dropdown            | Tap source field                       | Direction selected               | Show filtered account list                                                 |
| IT-A-03 | Select source account           | Tap option in source dropdown          | Dropdown open                    | Close dropdown; populate selected account; validate against current dest   |
| IT-A-04 | Open destination dropdown       | Tap destination field                  | Direction selected               | Show filtered account list                                                 |
| IT-A-05 | Select destination account      | Tap option in destination dropdown     | Dropdown open                    | Close dropdown; populate selected account; validate against current source |
| IT-A-06 | Enter amount                    | Type into amount input                 | None                             | Validate format client-side, show inline format errors                     |
| IT-A-07 | Enter memo                      | Type into memo input                   | None                             | Enforce 80-char limit                                                      |
| IT-A-08 | Submit (Review transfer)        | Tap submit                             | Source + dest + valid amount > 0 | Navigate to Review screen (separate screen, decomposed elsewhere)          |
| IT-A-09 | Tap "Linked accounts" empty CTA | Tap                                    | IT-D-15 visible                  | Launch Plaid Link initial mode                                             |
| IT-A-10 | Tap re-auth banner CTA          | Tap                                    | IT-D-16 visible                  | Launch Plaid Link update mode for selected external account                |
| IT-A-11 | Cancel / Back                   | Tap nav back                           | None                             | Discard form state; return to previous screen                              |

### States

| ID      | State                                       | Entry condition                                                  | UI representation                                         |
| ------- | ------------------------------------------- | ---------------------------------------------------------------- | --------------------------------------------------------- |
| IT-S-01 | Initial                                     | Mount, no prior selections                                       | Empty form with placeholders                              |
| IT-S-02 | Loading accounts                            | Mount → fetching internal + external lists                       | Skeleton dropdowns, submit disabled                       |
| IT-S-03 | Accounts-load error                         | Either fetch fails                                               | Error banner with retry CTA, submit disabled              |
| IT-S-04 | No external accounts                        | Loaded successfully, externals list empty                        | IT-D-15 empty CTA shown in dropdown area                  |
| IT-S-05 | Form-incomplete                             | One or more required fields missing                              | Submit disabled                                           |
| IT-S-06 | Form-valid                                  | All required fields present, client-side validation passing      | Submit enabled                                            |
| IT-S-07 | Submitting                                  | Submit tapped, POST in flight                                    | Submit shows spinner, all inputs disabled                 |
| IT-S-08 | Submit-error: validation                    | 422 from server                                                  | Inline error in IT-D-13, form re-enabled                  |
| IT-S-09 | Submit-error: limit-exceeded                | 422 with `LIMIT_EXCEEDED`                                        | Inline error with limit value from response context       |
| IT-S-10 | Submit-error: insufficient-funds            | 422 with `INSUFFICIENT_FUNDS`                                    | Inline error, suggest different source                    |
| IT-S-11 | Submit-error: external-account-needs-reauth | 422 with `ITEM_LOGIN_REQUIRED`                                   | Switch to re-auth banner state (IT-D-16); submit disabled |
| IT-S-12 | Submit-error: rate-limited                  | 429                                                              | Inline error with `Retry-After` countdown                 |
| IT-S-13 | Submit-error: server                        | 5xx                                                              | Inline generic error, submit re-enabled, allow retry      |
| IT-S-14 | Submit-error: idempotency-conflict          | 409 (if BE returns this for replayed key with different payload) | ❓ Needs BE confirmation of behavior — log as Amber       |
| IT-S-15 | Submit-error: network                       | Network failure / timeout                                        | Inline error, retry uses same idempotency key             |
| IT-S-16 | Re-auth in progress                         | User tapped IT-A-10, Plaid Link open                             | Form unchanged underneath; on return, re-evaluate state   |
| IT-S-17 | Cutoff-passed                               | Now > today's ACH cutoff for selected direction                  | IT-D-18 visible; submit still enabled                     |
| IT-S-18 | Non-business-day                            | Today is weekend or NACHA holiday                                | IT-D-19 visible; submit still enabled                     |

### Transitions

| ID      | From            | To                      | Trigger                                                        |
| ------- | --------------- | ----------------------- | -------------------------------------------------------------- |
| IT-T-01 | (external)      | IT-S-01                 | Tap "Move money" from home, account detail, or deep link       |
| IT-T-02 | IT-S-01         | IT-S-02                 | Mount effect fires fetches                                     |
| IT-T-03 | IT-S-02         | IT-S-04 or IT-S-05      | Both fetches resolve                                           |
| IT-T-04 | IT-S-02         | IT-S-03                 | Either fetch rejects                                           |
| IT-T-05 | IT-S-03         | IT-S-02                 | Tap retry                                                      |
| IT-T-06 | IT-S-05         | IT-S-06                 | All required fields completed                                  |
| IT-T-07 | IT-S-06         | IT-S-05                 | A required field cleared/invalidated                           |
| IT-T-08 | IT-S-06         | IT-S-07                 | Submit tapped                                                  |
| IT-T-09 | IT-S-07         | (next screen)           | 200/201 — navigate to Review                                   |
| IT-T-10 | IT-S-07         | IT-S-08 through IT-S-15 | Various error responses                                        |
| IT-T-11 | Any error state | IT-S-06                 | User edits a field that could resolve the error                |
| IT-T-12 | IT-S-06/05      | IT-S-16                 | User taps re-auth CTA                                          |
| IT-T-13 | IT-S-16         | IT-S-06                 | Plaid Link returns success — refresh accounts, re-evaluate     |
| IT-T-14 | IT-S-16         | IT-S-06/05              | Plaid Link returns error or user dismisses — show inline error |
| IT-T-15 | Any             | (external)              | User taps back / nav-away                                      |

### Open questions (chase before working session)

- ❓ Q1: Does the limits endpoint also return cutoff schedule, or are those two separate endpoints? (Affects how many calls Initiate Transfer has to make on mount.)
- ❓ Q2: What's the exact server behavior on idempotency-key replay with a _different_ body? 409, 422, or silent overwrite? (IT-S-14)
- ❓ Q3: When the user is mid-form and an external account silently transitions to `needs_reauth` (e.g., via webhook arriving while the form is open), do we want to surface that proactively or only on submit?
- ❓ Q4: Memo field — does the API actually accept it? Not in current OpenAPI spec but in design. Probably an oversight; confirm with M. Chen.
- ❓ Q5: Currency — confirm BE rejects non-USD even though API accepts a `currency` param. (Don't want to ship UI that lets user select EUR and fails server-side.)

### Notes for matrix population

Each item above feeds one or more matrix rows. Mapping:

- **D-01, D-12, D-14** → no matrix rows (static copy, FE-only).
- **D-02, A-01, S-01** → no matrix rows (UI state, FE-only).
- **D-03 through D-06** → matrix rows for source/dest dropdown bindings (mostly resolved, see FYA-020/021).
- **D-08, D-09, D-10** → matrix rows FYA-022, FYA-023 (Red items, limits/cutoff endpoint).
- **D-11** → new matrix row needed: "memo field — does API accept it?" Will add as FYA-027.
- **D-13, S-08 through S-15** → matrix rows for error code mapping (see FYA-026 plus a parent row for the error catalog itself; expand into per-code rows).
- **D-16, A-10, S-11, S-16, T-12 through T-14** → matrix rows for re-auth flow (FYA-005, the Red item).
- **S-14, Q2** → new matrix row: idempotency replay semantics. Amber, needs BE clarification.
- **S-17, S-18, D-18, D-19** → cutoff schedule data dependency, already in FYA-023.

This mapping is what catches gaps. **D-11 and the idempotency-replay question were both new findings produced by writing this decomposition** — neither was on my radar before. That's why this step is worth doing.

---

## Other screens (decomposition completed, not shown here)

For brevity, only Initiate Transfer is shown in full. Decompositions for the remaining screens follow the same template and live in this same document:

- Linked External Accounts (list)
- Linked External Account Detail
- Plaid Link entry / launch
- Plaid Link OAuth return handler
- Review Transfer (confirm screen)
- Transfer Submitted (success screen)
- Transfer History (list)
- Transfer Detail
- Empty / first-run state
- Error fallback / generic failure screen

Each section produces its own batch of matrix rows. The complete matrix in the review document is the union of outputs from all eleven decompositions.
