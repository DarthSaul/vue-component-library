# Manage Users — Frontend Risk Register

**Project:** [Product Team] — Manage Users feature
**Author:** [Frontend Lead]
**Engagement window:** [Start Monday] through [4 weeks later], 40 hours total
**Date issued:** [Date]
**Status:** ⚠️ **Approval requested** — see §1 for the specific acknowledgments being sought.
**Document version:** 1.0

-----

## 1. Executive Summary

This document records the assumptions, risks, and mitigations associated with building the Manage Users frontend **in advance of the backend API** for that feature. It is the artifact that supports the broader pre-engagement acknowledgment already provided by product stakeholders on [date]; this is the detailed register.

**Verdict: Build can proceed**, with three caveats that require explicit decisions before development begins:

- **R-01 (Locked vs. deactivated)** — A fundamental data-model ambiguity in the design. Resolving this changes how the UI is structured. Needs designer + PM decision before build.
- **R-03 (Filters dialog)** — Entire interaction is undesigned. Recommended for explicit MVP descope.
- **R-08 (Auth and permissions source of truth)** — Unknown today. Build can begin assuming a pattern, but a wrong assumption forces broad rework.

The remaining 14 items in this register are accepted risks with documented mitigations and rework estimates. Total estimated rework exposure if all assumptions are wrong: ~12–18 hours, against the 40-hour engagement budget. This is the cost of building without a backend contract; it is acceptable given the alternative (no progress until API is ready).

-----

## 2. Scope and Inputs

**Pages in scope, with working API:** None at time of writing.

**Pages in scope, without working API:**

- Manage Users (this register’s focus)
- Add User flow (separate register if/when decomposition completes)

**Pages out of scope:**

- Login, Account Summary, all other navigation destinations

**Inputs reviewed:**

- Figma frame “Manage Users v1” (last updated [date])
- Screen decomposition document (linked, version 1.0)
- Roxbury component library docs (current)
- No backend artifacts available (no OpenAPI spec, no Postman collection, no written contract)

-----

## 3. Working Principles (Mitigation Strategy)

The architecture used during this engagement is deliberately designed to absorb later API changes. These principles aren’t just nice-to-have — they’re what make the rework estimates in §5 tractable rather than open-ended.

**3.1 Mapper layer at every API boundary.** Each feature exposes API client functions that return *domain types*, not wire types. A `mappers.ts` file translates between the two. When the eventual API differs from our assumption, edits are concentrated in mappers and types files; components and stores remain stable.

**3.2 Runtime validation with Zod.** All inbound API payloads validated at the boundary against a Zod schema. When the real API ships data that violates our assumed shape, we get a clear runtime error pointing at the specific field — not silent breakage three layers up.

**3.3 Mocking infrastructure with MSW.** All assumed endpoints mocked via MSW handlers. Mock handlers organized by feature; fixtures defined as factories (not constants) so edge cases are easy to produce. Toggle-able per-endpoint so we can swap mocks for real endpoints incrementally as the backend lands.

**3.4 Feature-based folder structure.** All Manage Users code lives in `features/manage-users/`, with strict internal boundaries (presentation → orchestration → service → infrastructure → domain). Cross-feature imports flow only through each feature’s public `index.ts`. Limits the blast radius of any single assumption being wrong.

**3.5 Storybook coverage of all states.** Every state from the decomposition gets a Storybook story with appropriate MSW handler. This gives stakeholders a live, demoable surface during build — not just at integration time — and serves as visual regression coverage.

**3.6 Domain naming, not wire naming.** Components and stores reference `user.fullName`, never `user.first_name + ' ' + user.last_name`. Wire-shape names never appear outside the API client + mappers + types files.

-----

## 4. Pending Decisions (Blockers)

These are not assumptions we can build past — they need an answer before specific work can start.

|ID  |Decision needed                                         |Why blocking                                                                                                                                                                                     |Owner        |Target date    |
|----|--------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-------------|---------------|
|D-01|Locked vs. deactivated status: same concept or distinct?|Determines whether we have one users table with status filtering, or two genuinely separate tables. Changes the data model, the meaning of the lock/unlock button, and several state transitions.|Designer + PM|Before kickoff |
|D-02|Filters dialog: in MVP or descoped?                     |If in MVP, design work must complete before build. If descoped, the Filters button is hidden for now.                                                                                            |PM           |Before kickoff |
|D-03|Auth and session pattern (cookie? bearer token? OIDC?)  |Determines the shape of the API client, the 401 handling pattern, and the security model for stored tokens.                                                                                      |Backend lead |Before sprint 1|

-----

## 5. Assumptions and Risks

The core register. Each row is an assumption we are making in the absence of a backend contract, the risk of it being wrong, the mitigation built into the architecture, and the estimated rework cost if the assumption turns out to be incorrect.

**Rework size key:** S = under 2 hours, M = 2–6 hours, L = 6–16 hours, XL = more than 16 hours (would require timeline conversation).

|ID  |Assumption                                                                                                                                                                                   |Basis                                                                                                   |Risk if wrong                                                                                                                                                                                          |Mitigation                                                                                                                                                                                                  |Rework size                  |Disposition                                                                                             |
|----|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------|--------------------------------------------------------------------------------------------------------|
|R-01|Locked and deactivated are **distinct** statuses; locked users appear in the active table with a “locked” badge, deactivated users appear in the deactivated table.                          |Design shows separate tables and a “locked” badge; pending D-01.                                        |If they’re the same concept, the deactivated table doesn’t exist and we’ve built a UI surface that doesn’t match the data model.                                                                       |Architecture isolates the two tables behind feature-internal components; both consume the same `users` query keyed by status filter. Restructuring to one table is a mapper + component edit, not a rewrite.|M                            |**Pending D-01.** Build defers the deactivated table until decision lands.                              |
|R-02|No-users-in-business empty state will be designed with copy + illustration matching the no-business-selected empty state pattern.                                                            |Inferred from existing empty state design.                                                              |If design is significantly different, the empty state component needs new variants and copy.                                                                                                           |Single `EmptyState` component used for both, with content passed as props.                                                                                                                                  |S                            |**Accepted.** Confirm with designer; placeholder copy used during build.                                |
|R-03|Filters interaction is **descoped from MVP**. Button is hidden until designed.                                                                                                               |Design has button with no dialog; building speculatively is unsafe.                                     |If filters are needed in MVP, ~4–8 hours of additional work and a design dependency.                                                                                                                   |Button is rendered but feature-flagged off. Adding it later is straightforward.                                                                                                                             |M                            |**Pending D-02.** Recommendation: descope until designed.                                               |
|R-04|Pagination is **offset-based** with a page size of 25.                                                                                                                                       |Most common pattern; no signal otherwise from design.                                                   |If cursor-based, the pagination UI must change (no jump-to-page) and the data layer changes shape.                                                                                                     |Pagination logic is encapsulated in a single composable. Switching strategies is a 1–2 file edit.                                                                                                           |S                            |**Accepted.** Document in matrix when API spec arrives.                                                 |
|R-05|Sortable columns are **server-side**, with `sortBy` and `sortDir` query params.                                                                                                              |Standard pattern; lists at this scale typically can’t be reliably client-sorted.                        |If client-side, server param logic is removed (simplification). If sort isn’t supported at all, sort UI must be hidden.                                                                                |Sort logic lives in the same composable as pagination. Server-side → client-side is simplification, not rework.                                                                                             |S                            |**Accepted.**                                                                                           |
|R-06|Deactivated users come from a **separate endpoint** (`GET /users?status=deactivated`) using the same query params as active users.                                                           |Cleanest architectural assumption; matches REST conventions.                                            |If served by a single endpoint with a status flag, mapper handles the split. If served by a different endpoint shape entirely, more rework.                                                            |Two API client functions wrap the assumption; both go through the same mapper. Different shape → mapper edit.                                                                                               |S–M                          |**Accepted.**                                                                                           |
|R-07|User data model: assumed shape documented in `features/manage-users/types.ts`. Includes `id`, `fullName`, `userId`, `status`, `lastActivityAt`, `isPrimaryContact`, `isOwner`, `permissions`.|Inferred from design (every visible field) + reasonable defaults.                                       |Field renames, missing fields, restructured nesting all addressable in the mapper layer.                                                                                                               |Mapper layer absorbs differences; components reference domain types only.                                                                                                                                   |M                            |**Accepted.** Highest-volume rework risk, but each individual change is small.                          |
|R-08|Permission gating data is included on the **current user object** (e.g., `currentUser.permissions: ['lock_users', 'create_users', ...]`), fetched once on auth.                              |Most common pattern; per-row permissions would be unusual.                                              |If permissions are per-row, lock/unlock button visibility logic changes from “check current user once” to “check each row.” Also has security implications — never trust client-side gating regardless.|Permission checks isolated in a single composable (`usePermissions`). Per-row case is a parameter change.                                                                                                   |M                            |**Accepted, with caveat.** Pending D-03 on auth pattern. Logged for parity review when API spec arrives.|
|R-09|API error responses are **inline / field-level** with stable error codes (e.g., `{ errors: [{ field: 'name', code: 'REQUIRED' }] }`).                                                        |Modern best practice; design assumes inline error display.                                              |If only top-level errors are returned, inline form validation UX is degraded to banner-style errors. Bigger rework.                                                                                    |Error normalizer at the API client maps server response to a standard internal error shape. Top-level → inline is the harder migration; we’d absorb it in the normalizer.                                   |M–L                          |**Accepted.** Most likely place for unpleasant surprise.                                                |
|R-10|API supports `Idempotency-Key` header on all mutations (lock, unlock, reactivate).                                                                                                           |Best practice for any state-changing operation; cost of not having it for these actions is low but real.|If unsupported, retries on flaky network could double-fire. We’d switch to a “submit once, confirm before retry” UX.                                                                                   |All mutations sent through a single API client function that adds the header. If server ignores it, no harm. If we need to remove it, single file.                                                          |S                            |**Accepted.**                                                                                           |
|R-11|Last activity timestamp returned as **ISO 8601 string**.                                                                                                                                     |Standard.                                                                                               |If returned as epoch ms or another format, mapper converts.                                                                                                                                            |Mapper handles all timestamp parsing.                                                                                                                                                                       |S                            |**Accepted.**                                                                                           |
|R-12|Users-never-logged-in have `lastActivityAt: null`. UI renders “Never”.                                                                                                                       |Common pattern.                                                                                         |If returned as zero-value timestamp (“1970-01-01”) or empty string, mapper must detect and normalize.                                                                                                  |Single null-handling utility in the mapper.                                                                                                                                                                 |S                            |**Accepted.**                                                                                           |
|R-13|Status enum values are exactly `active`, `locked`, `pending_setup`.                                                                                                                          |From design.                                                                                            |If actual values differ (e.g., `ACTIVE`, `LOCKED_OUT`), mapper translates. If there are additional values we don’t handle, UI shows an “unknown” state and we add cases.                               |Mapper has a `toStatus` function with explicit handling per case. Unknown values produce a logged warning.                                                                                                  |S                            |**Accepted.**                                                                                           |
|R-14|Refresh-while-showing-stale-data UX: show a skeleton on business change.                                                                                                                     |Conservative choice; less user-confusing than stale data with subtle indicator.                         |If product prefers stale-with-indicator, change is component-internal.                                                                                                                                 |Skeleton behavior is a one-line conditional.                                                                                                                                                                |S                            |**Accepted.** Confirm with designer before MVP review.                                                  |
|R-15|Row action error UX: surfaced via Roxbury Toast pattern, not inline.                                                                                                                         |Roxbury convention.                                                                                     |If product prefers inline row errors, the error display logic moves from a service to a component.                                                                                                     |Error handler is centralized; UI surface is a swap.                                                                                                                                                         |S                            |**Accepted.**                                                                                           |
|R-16|After a row action (lock/unlock/reactivate), the FE will **refetch the list** rather than update in place.                                                                                   |Simpler initial implementation; preserves data consistency.                                             |Slightly worse UX (lost scroll position, brief loading flash). If product surfaces complaints, switch to optimistic updates.                                                                           |Refetch behavior in a single mutation handler. Optimistic update is an upgrade path, not a rebuild.                                                                                                         |S                            |**Accepted.** Consider upgrading post-MVP.                                                              |
|R-17|No real-time updates — if another admin locks a user concurrently, this UI won’t reflect it until manual refresh.                                                                            |No SSE / WebSocket assumed. Design shows no indicator for live updates.                                 |Concurrent-admin edits could cause user confusion. Low probability for MVP.                                                                                                                            |Refetch on tab refocus and on row action completion narrows the window.                                                                                                                                     |None (accepted UX limitation)|**Accepted.**                                                                                           |

-----

## 6. Deferred / Out of Scope

Items explicitly **not** being addressed in this engagement, with sign-off acknowledged.

|Item                                             |Reason                                                                                           |Sign-off   |
|-------------------------------------------------|-------------------------------------------------------------------------------------------------|-----------|
|Real-time / WebSocket updates                    |Not in MVP scope; no design coverage                                                             |PM ✅ [date]|
|User detail / edit pages                         |Not in MVP scope; flagged in decomposition                                                       |PM ✅ [date]|
|Bulk row selection and actions                   |No design coverage                                                                               |PM ✅ [date]|
|Search field on users table                      |No design coverage                                                                               |PM ✅ [date]|
|Filters dialog (pending D-02)                    |See R-03                                                                                         |Pending    |
|Internationalization (copy in multiple languages)|Not in scope per kickoff scope                                                                   |PM ✅ [date]|
|Accessibility audit beyond Roxbury defaults      |Roxbury components are audited; bespoke UI in this feature gets baseline a11y but no formal audit|PM ✅ [date]|

-----

## 7. Estimated Rework Exposure

If every assumption in §5 turns out to be wrong (worst case), and the three pending decisions resolve in the most disruptive way, the rework cost is estimated at:

|Category                                                                  |Rework hours (estimate)|
|--------------------------------------------------------------------------|-----------------------|
|Data model corrections via mapper layer (R-07, R-11, R-12, R-13)          |2–4                    |
|Error response shape corrections (R-09)                                   |4–8                    |
|Pagination / sort strategy changes (R-04, R-05)                           |1–2                    |
|Permissions model change (R-08)                                           |2–4                    |
|Locked-vs-deactivated restructure (R-01, if D-01 lands the disruptive way)|3–4                    |
|Filters dialog implementation (R-03, if D-02 keeps it in MVP)             |4–8                    |
|**Total**                                                                 |**~16–30 hours**       |

In practice, *all* assumptions being wrong is extraordinarily unlikely. Realistic exposure based on typical hit rate: **~6–10 hours** of integration-phase rework once the API arrives.

This rework is owned by the product team’s ongoing engineering resources, per the pre-engagement acknowledgment.

-----

## 8. Re-Review Triggers

This document is re-evaluated when any of the following occur:

- The backend publishes an OpenAPI spec (or first endpoint implementation) for Manage Users.
- Any of the three pending decisions (D-01, D-02, D-03) resolves.
- Design materially changes the screen (new states, removed states, restructured interaction).
- More than 30% of completed FE work is found to require rework when the API arrives — this triggers a pause-and-replan conversation, per the kickoff acknowledgment.

-----

## 9. Sign-Off

This document does not request sign-off on every individual row in §5 — those are accepted risks with documented mitigations and rework estimates. Sign-off is requested on:

1. The **three pending decisions** in §4. Each decision-maker should confirm their item or request a working session.
1. The **deferred / out-of-scope list** in §6. Acknowledgment that these are not being built in this engagement.
1. The **re-review trigger** in §8 — particularly the 30% pause condition.

|Role           |Name  |Decision             |Date  |Acknowledgment|
|---------------|------|---------------------|------|--------------|
|Product Manager|[Name]|⏳ Pending            |—     |—             |
|Designer       |[Name]|⏳ Pending            |—     |—             |
|Backend Lead   |[Name]|⏳ Pending (D-03 only)|—     |—             |
|Frontend Lead  |[Self]|✅ Approved           |[Date]|This document |

**Method:** Email reply to the document distribution thread is sufficient acknowledgment.

-----

## 10. Appendix: How This Document Was Produced

For future reference and for anyone reviewing the methodology:

1. **Screen decomposition** produced the inventory of every displayed element, action, state, and transition on Manage Users. Each `❓` in that document became a candidate row in this register.
1. **Triage** classified each open question as either a pending decision (blocking), an assumption-with-risk (this register’s §5), or a design-only question resolvable in working sessions (not tracked here).
1. **Architectural mitigations** in §3 were not invented for this document — they are the established patterns used in the build itself. The register’s rework estimates depend on these patterns being followed; they’re documented here so reviewers can assess the realism of the estimates.
1. **Rework size estimates** are based on the assumption that the architectural mitigations in §3 are intact at the time of integration. If those patterns degrade during build, rework estimates increase.

This document is intended to be **revisited as work progresses** — not signed once and forgotten. Updates are appended as a changelog at the top once a v1.1 is needed.
