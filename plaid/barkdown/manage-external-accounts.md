# Manage External Accounts — Integration Touchpoints (New Plaid Flow)

**Purpose:** This is an *integration-focused* decomposition, not a full screen decomposition. The Manage External Accounts page is **already built and in production**. The goal here is to identify every surface on the existing page where the new Plaid flow touches it — entry points, status displays, callbacks from the flow back into the page state.

**Audience:** Me (during build); shared with the engineer who maintains this page; linked from the risk register.

**Source design:** [Figma — Manage External Accounts (existing)] + [Figma — New Plaid Flow integration spec]

**API status:** Mixed. The existing page has working APIs (`GET /external-accounts`, `DELETE /external-accounts/{id}`). The new Plaid integration adds at least two new endpoints (link-token create, exchange), both 🔧 assumed.

**Conventions:**

- 🟢 **Existing** — element/behavior already on the page; we may *read* its state but should not alter its implementation without coordination.
- 🟡 **Modifying** — element/behavior that exists today but needs changes to support the new flow.
- 🔵 **New** — element/behavior introduced by the new Plaid flow.
- `❓` open questions; `🔧` assumed API contracts. Consolidated in the tracker.

-----

## Integration scope

This decomposition covers only what the **new Plaid flow** changes about Manage External Accounts. Concerns that are purely about the existing page (its layout, its account list rendering, the existing remove flow) are out of scope — they were decomposed (or not) when the page was originally built.

What is in scope:

- The entry point that launches the new Plaid flow
- Any account-list state that changes meaning under the new flow (e.g., new statuses like “awaiting verification”)
- How the page reacts when the Plaid flow returns (success, error, duplicate, etc.)
- Anything about the existing page that needs to be *modified* to accommodate the new flow

-----

## Displayed fields — integration touchpoints only

|ID      |Marker|Element                                     |Source / derivation                                            |Notes                                                                                                                                                                                                                                                |
|--------|------|--------------------------------------------|---------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
|MEA-D-01|🟢     |Account list — existing                     |API: `GET /external-accounts`                                  |Existing behavior. The list will now potentially include accounts in new intermediate states (see MEA-D-04). ❓ Confirm API will surface those states correctly to this existing endpoint, or whether a separate query is needed.                     |
|MEA-D-02|🟡     |Account row — status badge                  |API: `accounts[].status`                                       |Existing badge supports `active`, `disconnected`. New flow introduces `awaiting_verification` and `verification_in_progress` (per design for duplicate flows). ❓ Confirm full enum. Existing component may need a new variant.                       |
|MEA-D-03|🔵     |“Add external account” button               |Static                                                         |New CTA introduced by this work — or existing CTA repurposed? ❓ **Confirm with engineer who built the page.** If existing, behavior changes; if new, may displace existing UI.                                                                       |
|MEA-D-04|🔵     |Per-row “Awaiting verification” affordance  |Derived from `accounts[].status === 'awaiting_verification'`   |New row state; design shows a “Verify now” CTA or similar. ❓ Confirm exact affordance and copy.                                                                                                                                                      |
|MEA-D-05|🔵     |Per-row “Verification in progress” indicator|Derived from `accounts[].status === 'verification_in_progress'`|Read-only indicator. No action affordance. ❓ Confirm copy and styling.                                                                                                                                                                               |
|MEA-D-06|🔵     |Post-flow result banner / toast             |Derived from flow outcome                                      |When the Plaid flow returns to this page (success, error, duplicate), the page surfaces the outcome. ❓ Confirm: banner, toast, modal? Per-outcome variation? Most likely Roxbury `Toast` for success, inline banner for errors — confirm with design.|
|MEA-D-07|🟡     |Empty state                                 |Static                                                         |Existing empty state probably says “No external accounts linked.” If the new “Add external account” CTA is now the primary action, the empty state copy/CTA may need updating to point at it.                                                        |

-----

## Actions — integration touchpoints only

|ID      |Marker|Action                                       |Trigger                                                                                         |Preconditions                                                                                          |Result                                                                                                                                                             |
|--------|------|---------------------------------------------|------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------|
|MEA-A-01|🔵     |Launch Add External Account flow             |Tap MEA-D-03                                                                                    |User has permission to add external accounts (🔧 assumed: permission gating handled upstream or via API)|Hand off to Plaid Link integration layer (see separate decomposition). Page state preserved; user returns to this page after flow completes (success, error, exit).|
|MEA-A-02|🔵     |Tap “Verify now” on awaiting-verification row|Tap MEA-D-04 affordance                                                                         |Account in `awaiting_verification` status                                                              |❓ What does this do? Re-launch Plaid in a specific mode? Take user to a verification screen? Not clear from current design.                                        |
|MEA-A-03|🟢     |Existing remove flow                         |(existing trigger)                                                                              |(existing preconditions)                                                                               |Out of scope for this decomposition unless modified — see MEA-A-04.                                                                                                |
|MEA-A-04|🟡     |Remove an account in a new intermediate state|Existing remove control on a row in `awaiting_verification` or `verification_in_progress` status|❓ Is removal allowed in these states? Existing API may not have considered them.                       |❓ Confirm with backend whether `DELETE /external-accounts/{id}` accepts these statuses. If not, the existing remove button needs conditional disabling.            |

-----

## States — how the page changes under the new flow

|ID      |Marker|State                                                        |Entry condition                                                    |UI representation                                                                                                                                       |
|--------|------|-------------------------------------------------------------|-------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------|
|MEA-S-01|🟢     |Existing states (list loaded, loading, error, empty, etc.)   |(existing)                                                         |Out of scope unless modified.                                                                                                                           |
|MEA-S-02|🔵     |Flow-in-progress (Plaid Link launched, awaiting return)      |User tapped MEA-A-01 and the flow is open                          |❓ Is the Manage External Accounts page visible underneath the Plaid iframe/modal, or fully covered? Likely covered. On return, page may need to refetch.|
|MEA-S-03|🔵     |Just-returned-from-flow — success                            |Plaid flow resolved successfully and routed back here              |Show success surface (MEA-D-06); refetch account list so new account appears; ❓ scroll to or highlight the new account?                                 |
|MEA-S-04|🔵     |Just-returned-from-flow — Plaid error                        |Plaid SDK reported an error and user landed back here              |Show error surface mapped from Plaid error code (see Plaid errors decomposition).                                                                       |
|MEA-S-05|🔵     |Just-returned-from-flow — CNB error                          |CNB rejected the new account (e.g., identity mismatch)             |Show error surface specific to CNB error. ❓ Confirm copy/affordance.                                                                                    |
|MEA-S-06|🔵     |Just-returned-from-flow — duplicate                          |Account already exists in some form (linked / awaiting / verifying)|Show duplicate surface; ❓ may highlight or scroll to the existing account in the list.                                                                  |
|MEA-S-07|🔵     |Just-returned-from-flow — user exited Plaid without finishing|User dismissed Plaid Link before completing                        |❓ Show anything? Probably silent return is fine — confirm with design.                                                                                  |

-----

## Transitions — flow boundaries with this page

|ID      |From                                |To                         |Trigger                                                           |
|--------|------------------------------------|---------------------------|------------------------------------------------------------------|
|MEA-T-01|Any existing state                  |MEA-S-02                   |MEA-A-01 (user launches flow)                                     |
|MEA-T-02|MEA-S-02                            |MEA-S-03                   |Plaid Link decomposition’s `onSuccess` → CNB exchange success     |
|MEA-T-03|MEA-S-02                            |MEA-S-04                   |Plaid Link decomposition’s `onExit` with Plaid error              |
|MEA-T-04|MEA-S-02                            |MEA-S-05                   |CNB exchange responds with CNB-specific error (identity mismatch) |
|MEA-T-05|MEA-S-02                            |MEA-S-06                   |CNB exchange responds with duplicate-account error                |
|MEA-T-06|MEA-S-02                            |MEA-S-07                   |Plaid Link decomposition’s `onExit` without error (user dismissed)|
|MEA-T-07|MEA-S-03 / S-04 / S-05 / S-06 / S-07|(back to base loaded state)|User dismisses the result surface, or after a timeout (for toasts)|

-----

## Open Questions & Assumptions — Working Tracker

|ID   |Type|Question / assumption                                                                                                                            |Related IDs                        |Owner                               |Priority |Status|Answer|Becomes                      |
|-----|----|-------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------|------------------------------------|---------|------|------|-----------------------------|
|Q-ME1|🔧   |Does `GET /external-accounts` surface the new `awaiting_verification` and `verification_in_progress` statuses, or is a different endpoint needed?|MEA-D-01, MEA-D-02                 |Backend                             |Critical |Open  |      |Parity matrix + risk register|
|Q-ME2|🔧   |Full account status enum after the new flow lands. Existing was `active`, `disconnected`. New likely adds two. Confirm exact values.             |MEA-D-02                           |Backend                             |Critical |Open  |      |Parity matrix                |
|Q-ME3|❓   |“Add external account” CTA — is this the existing button or a new one? Affects the existing UI’s footprint.                                      |MEA-D-03                           |Engineer who built the page + Design|Critical |Open  |      |Risk register                |
|Q-ME4|❓   |“Verify now” affordance on awaiting-verification rows — what does it do? Re-launch Plaid in a specific mode? Different screen?                   |MEA-D-04, MEA-A-02                 |Design + Backend                    |Important|Open  |      |Risk register                |
|Q-ME5|❓   |Post-flow result surface — toast, banner, modal? Per-outcome variation?                                                                          |MEA-D-06, MEA-S-03 through MEA-S-07|Design                              |Important|Open  |      |Risk register                |
|Q-ME6|🔧   |Does `DELETE /external-accounts/{id}` accept the new intermediate statuses? If not, remove button needs conditional disabling.                   |MEA-A-04                           |Backend                             |Important|Open  |      |Parity matrix                |
|Q-ME7|❓   |After success return, scroll to or highlight the new account?                                                                                    |MEA-S-03                           |Design                              |Low      |Open  |      |Risk register                |
|Q-ME8|❓   |After exit-without-action return, surface anything or stay silent?                                                                               |MEA-S-07                           |Design                              |Low      |Open  |      |Risk register                |
|Q-ME9|🟡   |Existing empty state copy — does it need updating to reflect the new CTA prominently?                                                            |MEA-D-07                           |Design                              |Low      |Open  |      |Risk register                |

### How this tracker feeds the next artifacts

- The **🟡 modifying rows** are the politically sensitive ones — they touch code someone else built and may invalidate existing assumptions in that code. Each modifying row should be confirmed with the original engineer or owner before changes are made.
- The **🔵 new rows** are standard build work — they introduce behavior that didn’t exist.
- The **🟢 existing rows** are documented only as boundary markers. They are not in scope.
- Q-ME1 and Q-ME2 are the highest-leverage questions. If the existing endpoint doesn’t surface the new statuses, the entire integration model for this page changes — possibly requiring a separate query or polling for in-progress accounts. Worth asking backend first.

### Notes on this style of decomposition

This document is shorter than a from-scratch screen decomposition would be, by design. Most of Manage External Accounts is out of scope — it’s already built and working. The decomposition’s job here is to identify the *seams* where new work touches existing work, surface modifications to existing behavior, and document new behavior introduced by the integration.

The three-color marker system (🟢 / 🟡 / 🔵) is doing real work here. Without it, a reader couldn’t tell whether `MEA-D-02` is something we’re building or something we’re modifying — and that distinction determines who owns the change, what the rollback story is, and whether there’s a regression risk to existing functionality.
