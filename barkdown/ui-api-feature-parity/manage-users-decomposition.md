# Manage Users — Screen Decomposition

**Purpose:** Pre-matrix inventory of every UI element, action, state, and transition on the Manage Users screen. Feeds the parity matrix / risk register and serves as a reference during build.

**Audience:** Me (during build); linked from the risk register for auditability.

**Source design:** [Figma frame link — Manage Users v1]

**Conventions:**

- IDs follow `MU-<TYPE>-NN`: `D` displayed, `A` action, `S` state, `T` transition. `MU` prefix for Manage Users.
- Visibility conditions noted inline where elements are conditional.
- `❓` flags open questions to chase down with PM, designer, or backend.
- Roxbury components named explicitly so future engineers know what’s reusable vs. custom.

-----

## Adjacent screens (not in scope, captured for context)

**Account Summary** — Out of scope. Primary entry point to Manage Users. Provides selected business context — confirm whether via route param, store, or freshly chosen on this page. ❓ Confirm entry contract.

**Add User flow** — In scope as separate decomposition. Reached via “Add User” actions on this screen. Returns to Manage Users on success or cancel.

**User detail / edit** — ❓ Does tapping a user row navigate to a detail page? Not specified in current design; flag for designer.

-----

## Screen: Manage Users

### Displayed fields

|ID     |Element                                                       |Source / derivation                                                                                                                                                                      |Notes                                                                                                                                                                                                                                 |
|-------|--------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
|MU-D-01|Page title                                                    |Static copy                                                                                                                                                                              |“Manage Users” per design.                                                                                                                                                                                                            |
|MU-D-02|Page subtitle                                                 |Static copy                                                                                                                                                                              |Per design. ❓ Confirm final copy.                                                                                                                                                                                                     |
|MU-D-03|Business selector dropdown                                    |Option list: API (TBD, likely `GET /businesses` scoped to current user’s accessible businesses). Selected value: local UI state, persisted to [URL param? store?] for use by users fetch.|Roxbury `Dropdown`. Always visible. Placeholder: “Select a business”. ❓ Auto-select if user has access to only one business? ❓ Persist selection across navigation?                                                                   |
|MU-D-04|Filters button                                                |Static label + icon                                                                                                                                                                      |Roxbury `Button` with icon. Always visible adjacent to dropdown. ❓ **No dialog/popup defined in design.** Assumed: opens a panel or modal with filter options (status, last activity range?). Logged as risk register item.           |
|MU-D-05|“Add User” button                                             |Static label                                                                                                                                                                             |Roxbury `Button` primary variant. ❓ Always visible, or only when business selected? Design shows it always but disabled when no selection — confirm.                                                                                  |
|MU-D-06|Active users table — section header                           |Static copy                                                                                                                                                                              |“Active users” or similar — ❓ confirm copy. Visible: MU-S-04, MU-S-05, MU-S-06, MU-S-07.                                                                                                                                              |
|MU-D-07|Active users table — column headers                           |Static labels                                                                                                                                                                            |“User”, “User ID”, “Status”, “Last activity”, and unlabeled final column. ❓ Are columns sortable? If yes, which ones?                                                                                                                 |
|MU-D-08|Active users table — User column cell                         |API: `users[].fullName` (mapped from DTO). Optional chip: `users[].isPrimaryContact` and/or `users[].isOwner`.                                                                           |Roxbury table cell with `Chip` for “Primary contact” or “Owner”. ❓ Are these mutually exclusive or can a user be both? ❓ Confirm chip variants/colors from design.                                                                    |
|MU-D-09|Active users table — User ID cell                             |API: `users[].userId`                                                                                                                                                                    |Display format TBD. ❓ Is this a system ID, an external ID, or both? ❓ Truncated with copy-to-clipboard, or full inline?                                                                                                               |
|MU-D-10|Active users table — Status cell                              |API: `users[].status` (enum: `active`, `locked`, `pending_setup`)                                                                                                                        |Roxbury `Chip` or `Badge` with semantic color. ❓ Confirm color mapping per status.                                                                                                                                                    |
|MU-D-11|Active users table — Last activity cell                       |API: `users[].lastActivityAt` (timestamp)                                                                                                                                                |Rendered as relative time (“2 hours ago”). ❓ What if user has never logged in (e.g., `pending_setup`)? Display “Never”, “—”, or hide?                                                                                                 |
|MU-D-12|Active users table — Lock/unlock action cell                  |API: `users[].status` drives button label and action.                                                                                                                                    |Roxbury `IconButton` or `Button`. Locks active users, unlocks locked users. ❓ What does the button show for `pending_setup` — disabled? Different action? ❓ Permission gating: can every admin perform this, or is it role-restricted?|
|MU-D-13|Active users table — pagination controls                      |API: response pagination metadata                                                                                                                                                        |Visible: MU-S-06, conditional on result count exceeding page size. ❓ Pagination strategy — offset or cursor? ❓ Page size?                                                                                                             |
|MU-D-14|Active users table — empty state (no selection)               |Static illustration + copy                                                                                                                                                               |Visible: MU-S-02. Shown when no business is selected. ❓ Confirm copy and illustration. ❓ Includes a CTA, or just informational?                                                                                                       |
|MU-D-15|Active users table — empty state (business selected, no users)|**Not designed.** ❓ Open question for designer.                                                                                                                                          |Visible: MU-S-05 (potential state). Currently no design coverage. Assumed fallback: reuse MU-D-14 with adjusted copy, or generic Roxbury empty state. Logged as risk register item.                                                   |
|MU-D-16|Active users table — loading skeleton                         |Roxbury `Skeleton` rows                                                                                                                                                                  |Visible: MU-S-03. Row count matches expected page size.                                                                                                                                                                               |
|MU-D-17|Active users table — error state                              |Static copy + retry CTA                                                                                                                                                                  |Visible: MU-S-08. ❓ Inline error replacing table, or banner above table? Confirm with design.                                                                                                                                         |
|MU-D-18|Deactivated users table — section                             |Same as MU-D-06 through MU-D-13, applied to deactivated users                                                                                                                            |Entire section conditional. Visible only when MU-S-09 is true (deactivated users exist). ❓ Confirm: same column set exactly? Same actions? Probably “Reactivate” instead of “Lock/Unlock” — confirm.                                  |
|MU-D-19|Deactivated users table — section header                      |Static copy                                                                                                                                                                              |“Deactivated users” or similar. ❓ Confirm copy.                                                                                                                                                                                       |
|MU-D-20|Deactivated users table — action cell                         |❓ Per-row action — likely “Reactivate” given the section context                                                                                                                         |❓ Confirm action(s) in design.                                                                                                                                                                                                        |

### Actions

|ID     |Action                  |Trigger                                                    |Preconditions                                                                 |Result                                                                                                                                                        |
|-------|------------------------|-----------------------------------------------------------|------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------|
|MU-A-01|Select business         |Choose option in business dropdown                         |Businesses loaded; dropdown enabled                                           |Persist selection (URL or store — see Q4); trigger users fetch for selected business                                                                          |
|MU-A-02|Change business mid-flow|Choose different option in business dropdown               |Business already selected                                                     |❓ Is there any pending in-flight action that should block or confirm? Defaulting to: cancel in-flight fetch, refetch for new business. No confirmation prompt.|
|MU-A-03|Open filters panel      |Tap Filters button                                         |Business selected (assumption — filters without a business may not make sense)|Open filters surface (MU-S-13). ❓ Modal or panel?                                                                                                             |
|MU-A-04|Apply filters           |Confirm in filters panel                                   |Panel open, at least one filter set                                           |Close panel; re-fetch users with filter params merged into query                                                                                              |
|MU-A-05|Clear / dismiss filters |Dismiss panel without applying, or tap a “clear all”       |Panel open                                                                    |Close panel; if any filters were active before opening, ❓ clear them or preserve them on dismiss?                                                             |
|MU-A-06|Initiate Add User       |Tap Add User button                                        |Business selected; current user has create-user permission                    |Navigate to Add User flow (separate decomposition). Preserve selected business so flow can submit against it.                                                 |
|MU-A-07|Lock user               |Tap lock action on active user row                         |Target user status is `active`; current user has lock permission              |Row enters in-progress state (MU-S-11); API call to lock endpoint; on success, refetch list OR update row in place (❓ choose one); on failure, MU-S-12.       |
|MU-A-08|Unlock user             |Tap unlock action on locked user row                       |Target user status is `locked`; current user has unlock permission            |Same pattern as MU-A-07 with unlock endpoint.                                                                                                                 |
|MU-A-09|Reactivate user         |Tap reactivate action on deactivated user row              |User appears in deactivated table; current user has reactivate permission     |Same pattern; on success, user moves from deactivated table to active table — implies refetch of both tables (or coordinated update).                         |
|MU-A-10|Sort column             |Tap a sortable column header                               |Column is sortable (❓ which columns?)                                         |Update sort param; re-fetch users (assuming server-side sort — confirm Q6)                                                                                    |
|MU-A-11|Paginate                |Tap next/previous, or page number, on pagination control   |More results exist beyond current page                                        |Update offset/cursor; re-fetch users for new page                                                                                                             |
|MU-A-12|Retry failed users fetch|Tap retry CTA in error state                               |Currently in MU-S-08                                                          |Re-trigger users fetch; transition to MU-S-03                                                                                                                 |
|MU-A-13|Retry failed row action |❓ Trigger TBD — inline retry on row, or toast action button|Currently in MU-S-12 for a specific row                                       |Re-attempt the previous lock/unlock/reactivate call; same outcomes as original                                                                                |
|MU-A-14|Copy User ID            |❓ Tap on User ID cell (if interactive)                     |User ID column is interactive                                                 |❓ Confirm with design — is this a copy-to-clipboard interaction?                                                                                              |

### States

|ID     |State                                          |Entry condition                                                                    |UI representation                                                                                                                                                           |
|-------|-----------------------------------------------|-----------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
|MU-S-01|Initial mount, business selector loading       |Page mounts, businesses fetch in flight                                            |Dropdown in loading state. Filters button visible but disabled. Add User button visible but disabled. Empty state placeholder where table would render.                     |
|MU-S-02|No business selected                           |Businesses loaded, user has not yet chosen one                                     |Dropdown shows placeholder. Empty state (MU-D-14) in table area. Add User disabled. ❓ Filters button enabled or disabled? Probably disabled — no business to filter against.|
|MU-S-03|Business selected, users loading               |User selected a business; users fetch in flight                                    |Table skeleton (MU-D-16). Dropdown shows selected business. Add User enabled.                                                                                               |
|MU-S-04|Business selected, users loaded — base         |Fetch resolved successfully                                                        |Table renders. Variants below describe specific contents.                                                                                                                   |
|MU-S-05|Business selected, zero active users           |Fetch resolved with empty active list                                              |❓ Empty state not designed — see MU-D-15. Assumed: reuse generic empty state with copy like “No active users in this business.”                                             |
|MU-S-06|Business selected, active users present        |Fetch resolved with active results                                                 |Full active users table rendered. Pagination shown if result count exceeds page size.                                                                                       |
|MU-S-07|Business selected, users loaded but refreshing |User changed business while showing previous data, or pull-to-refresh              |❓ Show skeleton again, or show stale data with refresh indicator? Design decision. Defaulting to skeleton until clarified.                                                  |
|MU-S-08|Business selected, users load error            |Fetch rejected                                                                     |Error state (MU-D-17) replacing or above table. Retry CTA. ❓ Does dropdown remain functional during error? Probably yes.                                                    |
|MU-S-09|Deactivated users present                      |Separate fetch (or part of same response?) resolved with non-empty deactivated list|Deactivated users table section rendered below active users. ❓ Confirm: separate endpoint, separate query param, or filter on same response?                                |
|MU-S-10|Deactivated users absent                       |Resolved with empty deactivated list, or fetch not run                             |Deactivated section completely hidden — no section header, no empty state.                                                                                                  |
|MU-S-11|Row action in progress (lock/unlock/reactivate)|User tapped row action button                                                      |Row shows inline loading indicator. Button on that row temporarily disabled. Other rows remain interactive.                                                                 |
|MU-S-12|Row action error                               |Row action rejected                                                                |❓ Inline row error or toast? Design unclear. Defaulting to toast pattern per Roxbury convention.                                                                            |
|MU-S-13|Filters open                                   |User tapped Filters button                                                         |❓ Behavior not designed. Assumed: panel/modal opens with filter controls. Captured as open work item.                                                                       |
|MU-S-14|Add User flow active                           |User tapped Add User button                                                        |Navigation away from this screen (Add User is separate flow). State preserved for return.                                                                                   |

### Transitions

|ID     |From                                         |To                                 |Trigger                                                                                                                                                                               |
|-------|---------------------------------------------|-----------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
|MU-T-01|(external)                                   |MU-S-01                            |User navigates to Manage Users from any entry point                                                                                                                                   |
|MU-T-02|MU-S-01                                      |MU-S-02                            |Businesses fetch resolves; no pre-selection from entry context                                                                                                                        |
|MU-T-03|MU-S-01                                      |MU-S-03                            |Businesses fetch resolves; business pre-selected from entry context                                                                                                                   |
|MU-T-04|MU-S-02                                      |MU-S-03                            |MU-A-01 (select business)                                                                                                                                                             |
|MU-T-05|MU-S-03                                      |MU-S-05                            |Active users fetch resolves with empty list                                                                                                                                           |
|MU-T-06|MU-S-03                                      |MU-S-06                            |Active users fetch resolves with results                                                                                                                                              |
|MU-T-07|MU-S-03                                      |MU-S-08                            |Active users fetch rejects                                                                                                                                                            |
|MU-T-08|MU-S-08                                      |MU-S-03                            |MU-A-12 (retry failed fetch)                                                                                                                                                          |
|MU-T-09|MU-S-06 (or MU-S-05)                         |MU-S-07                            |MU-A-02 (change business mid-flow)                                                                                                                                                    |
|MU-T-10|MU-S-07                                      |MU-S-05 or MU-S-06                 |New fetch resolves                                                                                                                                                                    |
|MU-T-11|MU-S-07                                      |MU-S-08                            |New fetch rejects                                                                                                                                                                     |
|MU-T-12|MU-S-03 (or after)                           |MU-S-09 or MU-S-10                 |Deactivated users fetch resolves (see open question on whether this is a separate fetch)                                                                                              |
|MU-T-13|MU-S-06 (or MU-S-09)                         |MU-S-11                            |MU-A-07 / MU-A-08 / MU-A-09 (any row action)                                                                                                                                          |
|MU-T-14|MU-S-11                                      |MU-S-06 (with row state updated)   |Row action resolves successfully                                                                                                                                                      |
|MU-T-15|MU-S-11                                      |MU-S-12                            |Row action rejects                                                                                                                                                                    |
|MU-T-16|MU-S-12                                      |MU-S-06                            |User dismisses error, or MU-A-13 retry succeeds                                                                                                                                       |
|MU-T-17|MU-S-04 or later                             |MU-S-13                            |MU-A-03 (open filters)                                                                                                                                                                |
|MU-T-18|MU-S-13                                      |Previous state, with filtered fetch|MU-A-04 (apply filters)                                                                                                                                                               |
|MU-T-19|MU-S-13                                      |Previous state                     |MU-A-05 (dismiss filters without applying)                                                                                                                                            |
|MU-T-20|MU-S-06 (or any with Add User enabled)       |MU-S-14                            |MU-A-06 (initiate Add User)                                                                                                                                                           |
|MU-T-21|MU-S-14                                      |MU-S-03                            |Add User flow returns successfully — refetch list                                                                                                                                     |
|MU-T-22|MU-S-14                                      |Previous state                     |Add User flow cancelled                                                                                                                                                               |
|MU-T-23|Lock action on row → user becomes deactivated|MU-S-09 may activate               |If locking a user effectively deactivates them. ❓ Confirm relationship between “locked” status and “deactivated” — are these the same concept or distinct? **High-priority question.**|

### Open questions consolidated (chase before or during build)

**Critical (blocks design or build):**

- ❓ Q1: **Locked vs. deactivated** — are these the same status or distinct concepts? If a user is “locked” do they appear in the active table with locked status, or move to the deactivated table? This fundamentally changes the data model and the meaning of the lock/unlock button. (MU-T-23, MU-D-10, MU-D-12, MU-D-18, MU-A-07.)
- ❓ Q2: **No-users empty state** — design doesn’t cover the case where a business is selected but has no active users. Need designer to specify copy + illustration + whether Add User CTA is more prominent. (MU-D-15, MU-S-05.)
- ❓ Q3: **Filters dialog** — entire interaction is undesigned. What fields are filterable? Modal or panel? Multi-select or single? (MU-D-04, MU-A-03, MU-A-04, MU-A-05, MU-S-13.)

**Important (resolvable in working sessions):**

- ❓ Q4: Business selector persistence across navigation. (MU-D-03, MU-A-01)
- ❓ Q5: Pagination strategy (offset vs. cursor) and page size. (MU-D-13, MU-A-11)
- ❓ Q6: Sort behavior — which columns, server-side or client-side. (MU-D-07, MU-A-10)
- ❓ Q7: Deactivated users — separate endpoint, separate query, or filtered on the same response? (MU-S-09, MU-T-12)
- ❓ Q8: Permission gating on lock/unlock/reactivate — role-restricted or universally available? Where do permissions come from (current user object, per-row in response)? (MU-D-12, MU-A-07, MU-A-08, MU-A-09)
- ❓ Q9: Primary contact / owner chips — mutually exclusive or stackable? Source field naming. (MU-D-08)
- ❓ Q10: User ID — system ID, external ID, both? Display format, copyability. (MU-D-09, MU-A-14)
- ❓ Q11: Last activity for users who have never logged in — display “Never”, “—”, or hide? (MU-D-11)
- ❓ Q12: Lock/unlock button behavior for `pending_setup` status. (MU-D-12, MU-A-07)
- ❓ Q13: Loading-during-refresh UX — skeleton or stale-with-indicator. (MU-S-07)
- ❓ Q14: Row action error UX — inline or toast; retry affordance. (MU-S-12, MU-A-13)
- ❓ Q15: Error state placement — inline replacing table, or banner above. (MU-D-17)
- ❓ Q16: Refetch vs. update-in-place after row actions. (MU-A-07, MU-A-08, MU-A-09)
- ❓ Q17: Behavior when business is changed mid-action — confirmation prompt, or silent cancel? (MU-A-02)

**Low priority (defaults are fine, confirm later):**

- ❓ Q18: Final copy for all static labels (title, subtitle, section headers, empty state).
- ❓ Q19: Whether tapping a user row navigates to a detail view.
- ❓ Q20: Chip color mapping for status values.

### Notes for matrix and risk register population

Each `❓` above maps to either a parity-matrix row (if it’s an API question) or a risk-register row (if it’s a design question we’re assuming our way past). Mapping:

- **Q1 (locked vs. deactivated)** → both. Parity row for the API contract (one status field or two?); risk row because we’re assuming an answer to start building.
- **Q2 (no-users empty state)** → risk row only. Design gap, no API implication.
- **Q3 (filters dialog)** → risk row. Major design gap — assumption is that filters are out of MVP for this engagement unless explicitly added; this needs PO confirmation.
- **Q4–Q17** → matrix rows for the API-dependent ones (Q5, Q6, Q7, Q8, Q9, Q10), risk rows for the design-dependent ones (Q11, Q12, Q13, Q14, Q15, Q16, Q17).
- **Q18–Q20** → notes only; resolve in design review.

**New findings produced by this decomposition** (items not already on my radar):

- The “locked vs. deactivated” ambiguity. Most consequential finding. The design uses both terms and it’s unclear if they’re the same state or distinct.
- The missing no-users empty state. Easy to miss because the table just doesn’t render anything obvious.
- The undefined filter dialog. Surfaced because it’s drawn in the design as a button with no follow-through.
- The unclear relationship between the lock/unlock button and the user’s “deactivated” status — i.e., does locking a user move them to the deactivated table, or just change their badge?
- The refetch-vs.-update-in-place decision after row actions — surfaced by writing out the Action result, not visible from displayed fields alone.
- The “change business mid-action” edge case — surfaced by writing out MU-A-02 with explicit preconditions.

These findings alone justify the time spent on this decomposition.
