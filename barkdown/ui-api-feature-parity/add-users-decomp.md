# Add User — Screen Decomposition

**Purpose:** Pre-matrix inventory of every UI element, action, state, and transition for the Add User flow. Feeds the parity matrix / risk register and serves as a reference during build.

**Audience:** Me (during build); linked from the risk register for auditability.

**Source design:** [Figma frame link — Add User v1]

**API status:** ⚠️ **No backend API available.** All API references in this document are *assumed contracts*. Assumptions are stated inline in the Source/derivation columns and consolidated in the working tracker. The risk register derived from this document will carry these as explicit assumed-contract risks.

**Conventions:**

- IDs follow `AU-<TYPE>-NN`: `D` displayed, `A` action, `S` state, `T` transition. `AU` prefix for Add User. Step is encoded where useful (`AU-D-1-NN` for step 1, etc.) but kept simple where not needed.
- The flow is a three-step Roxbury `Stepper`: Step 1 User Details, Step 2 Access & Permissions, Step 3 Review & Confirm, plus a terminal Success screen.
- `❓` flags open questions; `🔧` flags assumed API contracts (no backend to confirm against); `✅` flags decisions that have been confirmed. All consolidated in the tracker at the end.
- Roxbury components named explicitly.

-----

## Adjacent screens (not in scope, captured for context)

**Manage Users** — In scope, decomposed separately. The entry point to Add User (via “Add User” button) and the return destination on success or cancel. Add User assumes a **selected business** is passed in as context — the new user is created within that business.

**Login / auth** — Out of scope. Add User assumes an authenticated session with a `currentUser` whose permissions include creating users. 🔧 Assumed: permission to reach this flow is enforced upstream; this flow does not re-check.

-----

## Flow-level notes

Before the per-step inventory, a few decisions that span the whole flow and shape everything below:

**✅ Submission model — CONFIRMED.** Form state is managed in a flow-scoped store across all three steps. Nothing is persisted server-side until “Add User” is tapped on Step 3, at which point a **single `POST /users`** submits the combined input from all steps. Progressive per-step persistence is explicitly *not* used. Consequences of this confirmed decision:

- A half-completed flow leaves no server-side trace; no draft entity or draft lifecycle exists.
- All server-side validation happens in one response at the end (see “Validation model” below and Q-A2).
- The single create call is the one operation where retry-safety matters (see Q-A7, idempotency).
- If the user closes the tab or loses their session mid-flow, all input is lost — nothing was persisted. This is an accepted tradeoff of the single-submit model, tracked explicitly as an accepted limitation (Q-A19).

**✅ Flow state ownership — CONFIRMED.** All field values across all three steps live in a single flow-scoped store (Pinia). Per-step components read and write the store; they do not hold their own copies of field state. This is what allows Review & Confirm to display everything and allows backward navigation without data loss.

- 🔧 Store lifecycle: the store is created on flow entry and **must be cleared** on (a) successful submission followed by navigation away, (b) “Add Another User,” and (c) confirmed cancel. All three paths must reset it or the next flow starts with stale data. Build note, not an open question — flagged here so it isn’t missed.

**Validation model.** 🔧 Assumed: client-side validation per step (VeeValidate + Zod schema per step) gates forward navigation. Because submission is single-shot at the end, the server validates only once, at commit — so the per-step client-side schemas are the *primary* defense against bad input and need to be thorough. The server may still reject at submission for things the client cannot check (duplicate email, business at capacity); those errors must route back to the relevant step. Tracked as Q-A2.

**Entry context.** 🔧 Assumed: the selected business ID is passed via route param or flow-launch argument from Manage Users. The new user is scoped to that business. Tracked as Q-A3.

-----

## Screen: Add User — Step 1: User Details

### Displayed fields

|ID       |Element                      |Source / derivation                               |Notes                                                                                                                                     |
|---------|-----------------------------|--------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------|
|AU-D-1-01|Stepper component            |UI state — current step index                     |Roxbury `Stepper`, 3 steps. Step 1 active. ❓ Are completed steps clickable to jump back? Assume yes for completed, no for not-yet-reached.|
|AU-D-1-02|Step heading                 |Static copy                                       |“User Details”                                                                                                                            |
|AU-D-1-03|Step description             |Static copy                                       |❓ Confirm copy.                                                                                                                           |
|AU-D-1-04|First name field             |Flow store (input)                                |Roxbury `TextField`. Required. 🔧 Assumed max length 50.                                                                                   |
|AU-D-1-05|Last name field              |Flow store (input)                                |Roxbury `TextField`. Required. 🔧 Assumed max length 50.                                                                                   |
|AU-D-1-06|Email field                  |Flow store (input)                                |Roxbury `TextField`, email type. Required. Client validates format. 🔧 Server validates uniqueness at submission — see Q-A2.               |
|AU-D-1-07|Phone field                  |Flow store (input)                                |Roxbury `TextField`. ❓ Required or optional? ❓ Format / country handling.                                                                 |
|AU-D-1-08|Job title field              |Flow store (input)                                |Roxbury `TextField`. ❓ Required or optional?                                                                                              |
|AU-D-1-09|Per-field validation messages|Derived from validation state                     |Inline below each field. 🔧 Assumed inline/field-level errors from server too — see Q-A2.                                                  |
|AU-D-1-10|Cancel button                |Static                                            |Roxbury `Button`, secondary.                                                                                                              |
|AU-D-1-11|Next button                  |Static; enabled state derived from step-1 validity|Roxbury `Button`, primary. Disabled until step 1 passes client validation.                                                                |

### Actions

|ID       |Action           |Trigger                  |Preconditions                       |Result                                                                        |
|---------|-----------------|-------------------------|------------------------------------|------------------------------------------------------------------------------|
|AU-A-1-01|Enter field value|Type into any field      |—                                   |Update flow store; run field-level validation                                 |
|AU-A-1-02|Advance to Step 2|Tap Next                 |Step 1 passes client-side validation|Step 1 values already in store; navigate to Step 2 (AU-S-02)                  |
|AU-A-1-03|Cancel flow      |Tap Cancel               |—                                   |See AU-A-X-01 (flow-level cancel)                                             |
|AU-A-1-04|Jump via stepper |Tap a step in the Stepper|Target step is completed or current |Navigate to that step, flow store preserved. ❓ Confirm stepper is interactive.|

### States

|ID      |State                         |Entry condition                                                                       |UI representation                                                   |
|--------|------------------------------|--------------------------------------------------------------------------------------|--------------------------------------------------------------------|
|AU-S-01 |Step 1 — incomplete           |Flow entered, or returned to step 1 with missing/invalid fields                       |Form rendered; Next disabled                                        |
|AU-S-01v|Step 1 — valid                |All required step-1 fields valid                                                      |Next enabled                                                        |
|AU-S-01e|Step 1 — server-rejected field|Returned to step 1 because submission failed on a step-1 field (e.g., duplicate email)|Offending field shows server error; Next re-enabled after correction|

-----

## Screen: Add User — Step 2: Access & Permissions

### Displayed fields

|ID       |Element                      |Source / derivation                                                                                               |Notes                                                                                                   |
|---------|-----------------------------|------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------|
|AU-D-2-01|Stepper component            |UI state                                                                                                          |Step 2 active, step 1 marked complete.                                                                  |
|AU-D-2-02|Step heading                 |Static copy                                                                                                       |“Access & Permissions”                                                                                  |
|AU-D-2-03|Role dropdown                |Options: API. 🔧 Assumed `GET /roles` returns selectable roles, possibly scoped to the business.                   |Roxbury `Dropdown`. Required. ❓ Single role or multiple? Assume single.                                 |
|AU-D-2-04|Permission group dropdown(s) |Options: API. 🔧 Assumed `GET /permission-groups`.                                                                 |Roxbury `Dropdown`. ❓ How many? ❓ Dependent on selected role?                                           |
|AU-D-2-05|Access level dropdown        |Options: API or static enum. 🔧 Assumed static enum (`full`, `limited`, `view_only`) unless backend says otherwise.|Roxbury `Dropdown`. ❓ Confirm values.                                                                   |
|AU-D-2-06|Business assignment          |🔧 Assumed pre-filled from entry context (selected business from Manage Users); read-only here.                    |❓ Confirm — is business shown here at all, or implicit? ❓ Can a user be assigned to multiple businesses?|
|AU-D-2-07|Per-field validation messages|Derived from validation state                                                                                     |Inline below each control.                                                                              |
|AU-D-2-08|Go Back button               |Static                                                                                                            |Roxbury `Button`, secondary.                                                                            |
|AU-D-2-09|Next button                  |Static; enabled derived from step-2 validity                                                                      |Disabled until step 2 passes client validation.                                                         |

### Actions

|ID       |Action               |Trigger                      |Preconditions                       |Result                                                                                                   |
|---------|---------------------|-----------------------------|------------------------------------|---------------------------------------------------------------------------------------------------------|
|AU-A-2-01|Select dropdown value|Choose option in any dropdown|Options loaded                      |Update flow store; re-validate; ❓ if role drives permission options, refetch/refilter dependent dropdowns|
|AU-A-2-02|Advance to Step 3    |Tap Next                     |Step 2 passes client-side validation|Step 2 values already in store; navigate to Step 3 (AU-S-03)                                             |
|AU-A-2-03|Return to Step 1     |Tap Go Back                  |—                                   |Navigate to Step 1; flow store preserved (AU-S-01v)                                                      |
|AU-A-2-04|Jump via stepper     |Tap a step in the Stepper    |Target step completed or current    |Navigate, store preserved                                                                                |

### States

|ID      |State                         |Entry condition                                                |UI representation                                                  |
|--------|------------------------------|---------------------------------------------------------------|-------------------------------------------------------------------|
|AU-S-02 |Step 2 — incomplete           |Advanced from step 1, or returned to step 2                    |Form rendered; Next disabled                                       |
|AU-S-02v|Step 2 — valid                |All required step-2 fields valid                               |Next enabled                                                       |
|AU-S-02L|Step 2 — options loading      |Step 2 entered; role/permission/access option fetches in flight|Dropdowns in loading state; Next disabled                          |
|AU-S-02E|Step 2 — options load error   |One or more option fetches rejected                            |Error message; retry affordance; Next disabled. ❓ Confirm error UX.|
|AU-S-02e|Step 2 — server-rejected field|Returned to step 2 because submission failed on a step-2 field |Offending control shows server error                               |

-----

## Screen: Add User — Step 3: Review & Confirm

### Displayed fields

|ID       |Element                            |Source / derivation                    |Notes                                                                                                                                                                                      |
|---------|-----------------------------------|---------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
|AU-D-3-01|Stepper component                  |UI state                               |Step 3 active, steps 1 and 2 marked complete.                                                                                                                                              |
|AU-D-3-02|Step heading                       |Static copy                            |“Review & Confirm”                                                                                                                                                                         |
|AU-D-3-03|User Details review section        |Flow store (read-back of step 1)       |Displays all step-1 values. Includes an “Edit” affordance — see AU-A-3-03.                                                                                                                 |
|AU-D-3-04|Access & Permissions review section|Flow store (read-back of step 2)       |Displays all step-2 values. Includes an “Edit” affordance.                                                                                                                                 |
|AU-D-3-05|Submission error region            |Derived from failed submission response|Visible only in AU-S-03e. 🔧 Assumed: server returns field-level errors that can be attributed to a step; if it returns only a top-level error, AU-T-13/14 routing is impossible — see Q-A2.|
|AU-D-3-06|Go Back button                     |Static                                 |Roxbury `Button`, secondary. Returns to Step 2.                                                                                                                                            |
|AU-D-3-07|Add User button                    |Static; this is the submit trigger     |Roxbury `Button`, primary. Disabled while submission in flight (AU-S-03L).                                                                                                                 |

### Actions

|ID       |Action           |Trigger                     |Preconditions                  |Result                                                                                                                                                                                                |
|---------|-----------------|----------------------------|-------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
|AU-A-3-01|Submit (Add User)|Tap Add User                |Steps 1 + 2 valid in flow store|Transition to AU-S-03L (submitting); fire single assumed `POST /users` with combined payload; on success → Success screen (AU-S-04); on failure → AU-S-03e                                            |
|AU-A-3-02|Return to Step 2 |Tap Go Back                 |—                              |Navigate to Step 2; flow store preserved                                                                                                                                                              |
|AU-A-3-03|Edit a section   |Tap Edit on a review section|—                              |Navigate to the corresponding step. ❓ Does this enter a distinct “edit mode” with different button labels (e.g., “Return to Review” / “Save Changes”)? Confirm in design — flagged as its own concern.|
|AU-A-3-04|Jump via stepper |Tap a step in the Stepper   |Target completed or current    |Navigate, store preserved                                                                                                                                                                             |

### States

|ID      |State                    |Entry condition                         |UI representation                                                                             |
|--------|-------------------------|----------------------------------------|----------------------------------------------------------------------------------------------|
|AU-S-03 |Step 3 — review          |Advanced from step 2                    |All collected values rendered for review; Add User enabled                                    |
|AU-S-03L|Step 3 — submitting      |Add User tapped, `POST /users` in flight|Add User shows spinner; inputs/buttons disabled                                               |
|AU-S-03e|Step 3 — submission error|`POST /users` rejected                  |Error region (AU-D-3-05) populated. Behavior depends on error type — see Transitions and Q-A2.|

-----

## Screen: Add User — Success

### Displayed fields

|ID       |Element                |Source / derivation                       |Notes                                                                                                                              |
|---------|-----------------------|------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------|
|AU-D-4-01|Success illustration   |Static asset                              |Roxbury illustration.                                                                                                              |
|AU-D-4-02|Success heading        |Static copy                               |❓ Confirm copy. ❓ Does it include the new user’s name?                                                                             |
|AU-D-4-03|Success body           |Static copy, possibly with new user detail|🔧 Assumed `POST /users` response returns the created user (id, name) — used here and potentially for “what happens next” messaging.|
|AU-D-4-04|Manage Users button    |Static                                    |Roxbury `Button`. Returns to Manage Users.                                                                                         |
|AU-D-4-05|Add Another User button|Static                                    |Roxbury `Button`. Resets flow to Step 1.                                                                                           |

### Actions

|ID       |Action            |Trigger             |Preconditions|Result                                                                                                        |
|---------|------------------|--------------------|-------------|--------------------------------------------------------------------------------------------------------------|
|AU-A-4-01|Go to Manage Users|Tap Manage Users    |—            |Clear flow store; navigate to Manage Users. ❓ Should Manage Users refetch so the new user appears? Assume yes.|
|AU-A-4-02|Add another user  |Tap Add Another User|—            |Clear flow store; reset Stepper to Step 1 (AU-S-01)                                                           |

### States

|ID     |State  |Entry condition                    |UI representation                                                                            |
|-------|-------|-----------------------------------|---------------------------------------------------------------------------------------------|
|AU-S-04|Success|`POST /users` resolved successfully|Success screen rendered; flow store retained only until user navigates away or starts another|

-----

## Flow-level actions

|ID       |Action        |Trigger                                 |Preconditions     |Result                                                                                                                                                       |
|---------|--------------|----------------------------------------|------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------|
|AU-A-X-01|Cancel flow   |Tap Cancel (step 1), or browser/nav away|—                 |❓ If any field has been entered, show confirmation prompt before discarding. If flow store is empty, exit silently. Decomposed as its own concern — see Q-A8.|
|AU-A-X-02|Confirm cancel|Confirm in the cancel prompt            |Cancel prompt open|Clear flow store; navigate to Manage Users                                                                                                                   |
|AU-A-X-03|Dismiss cancel|Dismiss the cancel prompt               |Cancel prompt open|Close prompt; remain on current step with store intact                                                                                                       |

-----

## Flow-level transitions

|ID     |From              |To              |Trigger                                                                                                         |
|-------|------------------|----------------|----------------------------------------------------------------------------------------------------------------|
|AU-T-01|(Manage Users)    |AU-S-01         |User taps Add User on Manage Users; selected business passed as context; flow store created                     |
|AU-T-02|AU-S-01v          |AU-S-02         |AU-A-1-02 (Next from step 1)                                                                                    |
|AU-T-03|AU-S-02 entry     |AU-S-02L        |Step 2 mounts; option fetches begin                                                                             |
|AU-T-04|AU-S-02L          |AU-S-02         |Option fetches resolve                                                                                          |
|AU-T-05|AU-S-02L          |AU-S-02E        |Option fetches reject                                                                                           |
|AU-T-06|AU-S-02E          |AU-S-02L        |User retries option fetch                                                                                       |
|AU-T-07|AU-S-02v          |AU-S-03         |AU-A-2-02 (Next from step 2)                                                                                    |
|AU-T-08|AU-S-02           |AU-S-01v        |AU-A-2-03 (Go Back to step 1)                                                                                   |
|AU-T-09|AU-S-03           |AU-S-02v        |AU-A-3-02 (Go Back to step 2)                                                                                   |
|AU-T-10|AU-S-03           |AU-S-03L        |AU-A-3-01 (Add User submit)                                                                                     |
|AU-T-11|AU-S-03L          |AU-S-04         |`POST /users` resolves successfully                                                                             |
|AU-T-12|AU-S-03L          |AU-S-03e        |`POST /users` rejects                                                                                           |
|AU-T-13|AU-S-03e          |AU-S-01e        |Submission error attributed to a step-1 field (e.g., duplicate email) — route user back to step 1 with the error|
|AU-T-14|AU-S-03e          |AU-S-02e        |Submission error attributed to a step-2 field                                                                   |
|AU-T-15|AU-S-03e          |AU-S-03         |Submission error is generic/server-side (5xx, rate limit) — user retries from step 3                            |
|AU-T-16|AU-S-04           |(Manage Users)  |AU-A-4-01 — flow store cleared                                                                                  |
|AU-T-17|AU-S-04           |AU-S-01         |AU-A-4-02 (Add another — flow store cleared and recreated)                                                      |
|AU-T-18|Any step          |(cancel prompt) |AU-A-X-01                                                                                                       |
|AU-T-19|(cancel prompt)   |(Manage Users)  |AU-A-X-02 (confirm cancel — flow store cleared)                                                                 |
|AU-T-20|(cancel prompt)   |Originating step|AU-A-X-03 (dismiss cancel)                                                                                      |
|AU-T-21|Any completed step|That step       |Stepper jump (AU-A-*-04)                                                                                        |

-----

## Open Questions & Assumptions — Working Tracker

Driven to closure with Design and Backend before the risk register is written. Three row types:

- **`❓` design/product questions** — resolved by Design or PM.
- **`🔧` assumed API contracts** — no backend exists to confirm against. These resolve when the backend produces a spec; until then they are *deliberate assumptions* and will populate the risk register directly.
- **`✅` confirmed decisions** — settled; recorded here for traceability, no longer open.

**Status:** `Open` · `Asked` · `Answered` · `Confirmed` · `Blocked`
**Priority:** `Critical` · `Important` · `Low`

|ID   |Type|Question / assumption / decision                                                                                                                                                                                                                                                                                                                                                                                                                             |Related IDs                                     |Owner           |Priority |Status   |Answer / resolution                                                                                  |Becomes                                                |
|-----|----|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------|----------------|---------|---------|-----------------------------------------------------------------------------------------------------|-------------------------------------------------------|
|Q-A1 |✅   |Submission model — **CONFIRMED single `POST /users` at the end**, with form state managed in a flow-scoped store across steps. No progressive per-step persistence.                                                                                                                                                                                                                                                                                          |Flow notes, AU-A-3-01                           |—               |Critical |Confirmed|Single-submit, store-managed. Settled by FE lead + product.                                          |Risk register (as a stated design decision, not a risk)|
|Q-A2 |🔧   |Server validation error shape — assumed field-level errors with codes, attributable to a step. **Heightened by the single-submit decision:** every server-side validation failure (duplicate email, business at capacity, invalid role) arrives in one response at the end, so step-attributable errors are the *only* way to route the user back. If the server returns top-level errors only, AU-T-13/14 routing is impossible and error UX degrades badly.|AU-D-1-09, AU-D-3-05, AU-S-03e, AU-T-13, AU-T-14|Backend         |Critical |Open     |                                                                                                     |Parity matrix + risk register                          |
|Q-A3 |🔧   |Entry context — selected business ID passed from Manage Users. Assumed via route param / launch arg. New user scoped to that business.                                                                                                                                                                                                                                                                                                                       |Flow notes, AU-D-2-06, AU-T-01                  |Backend + PM    |Critical |Open     |                                                                                                     |Parity matrix + risk register                          |
|Q-A4 |🔧   |`POST /users` request shape — assumed single flat body combining all three steps’ fields. Field names, nesting, and which fields are required all assumed.                                                                                                                                                                                                                                                                                                   |AU-A-3-01                                       |Backend         |Critical |Open     |                                                                                                     |Parity matrix + risk register                          |
|Q-A5 |🔧   |`POST /users` response — assumed returns the created user (id, name) for the Success screen.                                                                                                                                                                                                                                                                                                                                                                 |AU-D-4-03, AU-A-3-01                            |Backend         |Important|Open     |                                                                                                     |Parity matrix + risk register                          |
|Q-A6 |🔧   |Role / permission / access options — assumed `GET /roles`, `GET /permission-groups`; access level assumed static enum. Endpoints, shapes, and whether options are business-scoped all assumed.                                                                                                                                                                                                                                                               |AU-D-2-03, AU-D-2-04, AU-D-2-05                 |Backend         |Critical |Open     |                                                                                                     |Parity matrix + risk register                          |
|Q-A7 |🔧   |`POST /users` idempotency — assumed `Idempotency-Key` header is honored, so a retried submission can’t create a duplicate user. Material because single-submit means exactly one create call, and that call is the one a flaky network could double-fire.                                                                                                                                                                                                    |AU-A-3-01, AU-S-03L                             |Backend         |Important|Open     |                                                                                                     |Parity matrix + risk register                          |
|Q-A8 |❓   |Cancel/exit behavior — confirmation prompt when flow has unsaved input; copy; where the user lands. Decomposed as its own concern; likely its own user story.                                                                                                                                                                                                                                                                                                |AU-A-X-01, AU-A-X-02, AU-A-X-03                 |Design + PM     |Important|Open     |                                                                                                     |Risk register                                          |
|Q-A9 |❓   |“Edit from Review” — does tapping Edit on a review section enter a distinct edit mode (different button labels, confirmation on return)? Likely its own user story.                                                                                                                                                                                                                                                                                          |AU-A-3-03                                       |Design          |Important|Open     |                                                                                                     |Risk register                                          |
|Q-A10|❓   |Cross-step invalidation — if a user edits Step 1 after completing Step 2, can a Step 1 change invalidate Step 2 selections (e.g., role no longer valid)?                                                                                                                                                                                                                                                                                                     |AU-A-3-03, AU-T-13                              |Design + Backend|Important|Open     |                                                                                                     |Risk register                                          |
|Q-A11|❓   |Stepper interactivity — are completed steps clickable to jump back? Not-yet-reached steps clickable?                                                                                                                                                                                                                                                                                                                                                         |AU-D-1-01, AU-A-1-04                            |Design          |Important|Open     |                                                                                                     |Risk register                                          |
|Q-A12|❓   |Role → permission dependency — does selecting a role filter or drive the permission/access options?                                                                                                                                                                                                                                                                                                                                                          |AU-D-2-03, AU-D-2-04, AU-A-2-01                 |Design + Backend|Important|Open     |                                                                                                     |Parity matrix + risk register                          |
|Q-A13|❓   |Multiple business assignment — can a new user belong to more than one business, or strictly the one from entry context?                                                                                                                                                                                                                                                                                                                                      |AU-D-2-06                                       |PM + Backend    |Important|Open     |                                                                                                     |Parity matrix                                          |
|Q-A14|❓   |Required vs. optional — phone and job title fields: required or optional?                                                                                                                                                                                                                                                                                                                                                                                    |AU-D-1-07, AU-D-1-08                            |Design + PM     |Important|Open     |                                                                                                     |Risk register                                          |
|Q-A15|❓   |Field constraints — max lengths, phone format/country handling. Assumed 50-char names; phone unconstrained.                                                                                                                                                                                                                                                                                                                                                  |AU-D-1-04, AU-D-1-05, AU-D-1-07                 |Design + Backend|Low      |Open     |                                                                                                     |Risk register                                          |
|Q-A16|❓   |Step 2 options-load error UX — inline, banner, blocking?                                                                                                                                                                                                                                                                                                                                                                                                     |AU-S-02E                                        |Design          |Important|Open     |                                                                                                     |Risk register                                          |
|Q-A17|❓   |Success screen — does the heading/body name the created user? Does navigating to Manage Users trigger a refetch so the new user is visible?                                                                                                                                                                                                                                                                                                                  |AU-D-4-02, AU-D-4-03, AU-A-4-01                 |Design + PM     |Low      |Open     |                                                                                                     |Risk register                                          |
|Q-A18|❓   |Final copy for all static labels — step headings, descriptions, success copy.                                                                                                                                                                                                                                                                                                                                                                                |AU-D-1-02, AU-D-1-03, AU-D-4-02                 |Design          |Low      |Open     |                                                                                                     |Resolve in design review — no further tracking         |
|Q-A19|✅   |Mid-flow data loss — closing the tab or losing the session before final submit discards all input, because nothing is persisted until the single `POST`. This is an accepted consequence of the confirmed single-submit model. If product later wants progress preserved, the answer is client-side draft persistence (localStorage), a separate small piece of work — not progressive submission.                                                           |Flow notes                                      |PM              |Important|Confirmed|Accepted limitation of single-submit model. Flag to PM for awareness; revisit only if users complain.|Risk register (as an accepted limitation)              |

### How this tracker feeds the next artifacts

- **Q-A1 is now confirmed.** It still appears in the risk register, but as a *stated design decision with its rationale*, not as an open risk. Documenting settled decisions is as valuable as documenting open ones — it tells future readers (and integrating engineers) that single-submit was deliberate.
- The **🔧 assumed-contract rows (Q-A2 through Q-A7, Q-A12, Q-A13)** remain the defining feature of this screen’s risk profile. With no backend, the API surface is assumption. Each becomes both a parity matrix row (to verify against the spec when it lands) and a risk register row (documenting the assumption and rework exposure meanwhile).
- **Q-A2 is the sharpest risk on this screen.** The confirmed single-submit model concentrates all server-side validation into one response — so the assumption that the server returns step-attributable, field-level errors is now load-bearing for the entire error-recovery UX. If it proves false, the rework is significant. This should be the first question asked of the backend team.
- **Critical rows** (Q-A2, Q-A3, Q-A4, Q-A6) shape the build structurally. The risk register cannot be finalized until these are answered or consciously accepted as assumptions with stakeholder sign-off.
- **Q-A8 and Q-A9** are flagged as likely their own user stories — cancel/exit and edit-from-review are self-contained concerns with their own UX surfaces, not part of the happy-path story.
- **Q-A19 is a confirmed accepted limitation.** It belongs in the risk register so no stakeholder is surprised later by “why didn’t it save my progress?” — the answer is on record.
- **Becomes** routing: API-contract questions → parity matrix (and risk register while no API exists); design-intent questions → risk register; cosmetic confirmations → design review only.

### New findings produced by this decomposition

- **Submission error routing (AU-T-13/14, Q-A2).** Surfaced by tracing what happens when `POST /users` fails on a field that lives two steps back. A duplicate-email rejection has to navigate the user from Step 3 all the way to Step 1 with the error attached — and the confirmed single-submit model makes this the *only* point at which such errors surface, raising the stakes.
- **Cross-step invalidation (Q-A10).** Editing an earlier step can invalidate a later step’s input. Surfaced by writing out the Edit-from-Review action against the multi-step state model.
- **Idempotency on a create operation (Q-A7).** Surfaced by treating the final submit as a mutation with failure modes. Sharpened by the single-submit decision: exactly one create call, exactly the call you don’t want fired twice.
- **Mid-flow data loss (Q-A19).** A direct consequence of the confirmed single-submit model — surfaced by asking what the model does *not* protect against.
- **Step 2 options loading/error states (AU-S-02L, AU-S-02E).** The design likely shows only the populated form; the loading and error states for the role/permission option fetches are easy to miss without enumerating states explicitly.
- **Flow store lifecycle.** The store must be cleared on three distinct paths (success-and-navigate, add-another, confirmed-cancel). Surfaced by tracing the confirmed store-managed model through every flow exit.

For a screen with no backend yet, the decomposition’s main value is making the *full assumed API surface* explicit and reviewable — every 🔧 row is a place where the build is proceeding on an educated guess, and naming them now is what makes the eventual integration a known quantity rather than a surprise.
