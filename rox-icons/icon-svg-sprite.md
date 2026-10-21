# CnbIcon & SVG Sprite Architecture — User Stories

**Parent Epic:** CnbIcon Refactoring & SVG Sprite Architecture

-----

## Story 1: Icon Library Audit & Deduplication

**Summary:** Flatten the nested SVG directory structure into a single canonical directory, resolve all filename collisions, normalize filenames to kebab-case, and produce a documented icon registry.

**Context:**
The current icon library has hundreds of raw `.svg` files scattered across nested folders within `icons/Icons/`. Duplicate filenames exist across folders — some are true duplicates (identical files), others are visually different icons that share a name. This must be resolved before any sprite generation can happen.

**Approach:**

- Run the `flatten-icons.js` script against `icons/Icons/` with the `--kebab` flag to flatten all SVGs into a single output directory, routing collisions to `duplicates/`.
- Manually review every file in `duplicates/`:
  - **True duplicates** (visually identical) — discard the duplicate, keep the canonical copy.
  - **False duplicates** (different icons sharing a name) — rename to disambiguate, promote into the canonical directory.
- Verify the final canonical set has no filename collisions.
- Document the full icon list (name, visual category, original source folder) in a manifest or spreadsheet for team reference.

**Acceptance Criteria:**

- [ ] All SVGs consolidated into a single flat directory with no subdirectories.
- [ ] Zero filename collisions remain.
- [ ] All filenames follow kebab-case convention (e.g., `check-circle.svg`, `arrow-left.svg`).
- [ ] Duplicates folder reviewed and emptied — every collision resolved.
- [ ] Canonical icon list documented (icon name + count of total icons).
- [ ] Original nested directory preserved as a backup until migration is complete.

**Dependencies:** None — this is the first story in the sequence.

**Story Points:** [Team to estimate]

-----

## Story 2: currentColor Audit & Conversion

**Summary:** Categorize each icon in the canonical set as mono-color (consumer-colorable) or multi-color (retains hardcoded fills), then convert mono-color icons to use `currentColor`.

**Context:**
For the sprite-based `<use>` pattern to support CSS color overrides, mono-color icons need `fill="currentColor"` (or `stroke="currentColor"`) instead of hardcoded values like `fill="#000000"`. Multi-color icons with intentional per-path colors must be left alone. This is a per-icon design decision.

**Approach:**

- Walk through the canonical icon set. For each icon:
  - Open in the preview HTML or an SVG viewer.
  - Determine if it's mono-color or multi-color.
  - Tag it in the manifest from Story 1.
- For the mono-color batch, use SVGO's `convertColors` plugin (or a targeted script) to replace hardcoded fills/strokes with `currentColor`.
- Manually verify a sample of converted icons render correctly (respond to CSS `color` changes).
- For multi-color icons, document that they are non-colorable via CSS and retain their original fills.

**Acceptance Criteria:**

- [ ] Every icon in the canonical set categorized as `mono` or `multi` in the manifest.
- [ ] All mono-color icons converted to use `currentColor` for fill/stroke values.
- [ ] Multi-color icons unchanged — hardcoded fills preserved.
- [ ] Sample of converted mono icons verified: respond to CSS `color` property correctly.
- [ ] No visual regressions in the preview HTML for any icon.

**Dependencies:** Story 1 (canonical flat directory must exist).

**Story Points:** [Team to estimate]

**Notes:**

- Icons with `fill="#000"` or `fill="black"` on `<path>` elements will not respond to CSS color through the `<use>` boundary. The `currentColor` conversion is what makes them colorable.
- Some icons may have a mix (e.g., one path is decorative black, another is a colored accent). These need case-by-case decisions.

-----

## Story 3: SVG Sprite Build Pipeline

**Summary:** Integrate `svg-sprite` into the Roxbury build process to generate a `<symbol>`-based SVG sprite sheet from the canonical icon directory.

**Context:**
The sprite sheet is the core artifact that enables string-based icon references. It contains every icon as a `<symbol>` element with a unique ID. The file is published as part of the Roxbury package and consumed at runtime via `<use>` references.

**Approach:**

- Use the existing `build-sprite.js` Node script (programmatic `svg-sprite` usage) as the foundation.
- Configure the `id.generator` to produce IDs in the format `icon-{kebab-name}` (e.g., `icon-check-circle`).
- Enable SVGO optimization in the shape transform.
- Generate the sprite as `dist/icons-sprite.svg`.
- Generate the HTML preview page as `dist/icons-preview.html` for visual QA.
- Wire into the package build: `npm run build:icons` runs before `vite build`.
- Add the sprite file to the package's `exports` map so consuming apps can import it.

**Acceptance Criteria:**

- [ ] `npm run build:icons` generates `dist/icons-sprite.svg` containing a `<symbol>` for every icon in the canonical set.
- [ ] Each symbol has an `id` in the format `icon-{kebab-name}` and a correct `viewBox`.
- [ ] `dist/icons-preview.html` generated alongside the sprite for visual QA.
- [ ] Sprite file included in the published package (present in `dist/` after `npm run build`).
- [ ] Sprite accessible to consumers via the package's `exports` map (e.g., `@cnodigital/roxbury/icons-sprite.svg`).
- [ ] Sprite file size measured and documented (expected: well under the current FontAwesome CSS + font payload).

**Dependencies:** Story 1 (canonical flat directory). Can run in parallel with Story 2 — the sprite build is a structural concern, not dependent on `currentColor` conversion. However, the final production sprite should be generated after Story 2 is complete.

**Story Points:** [Team to estimate]

-----

## Story 4: RoxburyIcons Vue Plugin

**Summary:** Build and publish a Vue plugin that injects the SVG sprite into the DOM, giving consuming apps a one-line setup for icon support.

**Context:**
For `<use href="#icon-name">` to work, the sprite's `<symbol>` definitions must be present in the DOM. Rather than requiring consuming apps to manually inject the sprite via `v-html`, a Vue plugin provides a cleaner, more maintainable integration point. Shipping it as a separate plugin (not baked into CnbIcon) keeps the icon system decoupled and ensures backward compatibility — existing apps that don't use the new icon system are unaffected.

**Approach:**

- Create `RoxburyIcons` plugin that:
  - Imports the sprite as a raw string.
  - On `install()`, creates a hidden `<div>` container, sets `innerHTML` to the sprite content, and prepends it to `document.body`.
  - Includes a `typeof document` guard for SSR safety.
- Export the plugin from a dedicated entry point (e.g., `@cnodigital/roxbury/icons`).
- Consuming apps add `app.use(RoxburyIcons)` in their setup and all sprite icons become available throughout the app.

**Acceptance Criteria:**

- [ ] `RoxburyIcons` plugin exported from a dedicated package entry point.
- [ ] `app.use(RoxburyIcons)` injects the full sprite into the DOM as a hidden, `aria-hidden="true"` container.
- [ ] `<use href="#icon-check-circle" />` resolves correctly after plugin installation.
- [ ] Plugin is SSR-safe (no `document` access during server-side rendering).
- [ ] Plugin does not inject the sprite more than once if `app.use()` is called multiple times.
- [ ] Entry point documented in the package README.

**Dependencies:** Story 3 (sprite must exist and be published in the package).

**Story Points:** [Team to estimate]

-----

## Story 5: CnbIcon Refactor — Dual-Mode API

**Summary:** Refactor CnbIcon to support a string-based `icon` prop (new sprite API) alongside the existing raw SVG import pattern, with dev-mode deprecation warnings for the legacy paths.

**Context:**
This is the core consumer-facing change. The new API is `<CnbIcon icon="check-circle" />`. The legacy API (`<CnbIcon :icon="ImportedSvg" :font-awesome="false" />`) must continue working for two releases to give consuming teams time to migrate.

**Approach:**

- Modify the `icon` prop to accept `[String, Object]`.
- When `icon` is a `String`: render `<svg><use :href="#icon-${icon}" /></svg>` with existing wrapping styles applied.
- When `icon` is an `Object` (raw SVG import): render using existing legacy logic.
- When `fontAwesome` is `true`: render using existing FontAwesome logic.
- Emit `console.warn` in development mode for:
  - Raw SVG import usage (object `icon` prop).
  - `font-awesome` prop being set to `true`.
- Deprecation warnings should include a clear message pointing to the new API and migration guide.

**Acceptance Criteria:**

- [ ] `<CnbIcon icon="check-circle" />` renders the correct sprite icon via `<use>`.
- [ ] `<CnbIcon :icon="ImportedSvg" :font-awesome="false" />` continues to work (legacy path).
- [ ] `<CnbIcon :icon="faCheck" :font-awesome="true" />` continues to work (FontAwesome path).
- [ ] Dev-mode `console.warn` fires for raw SVG import usage.
- [ ] Dev-mode `console.warn` fires for `font-awesome="true"` usage.
- [ ] Warnings do not fire in production builds.
- [ ] Existing wrapping styles (size classes, color overrides) work with the new sprite path.
- [ ] Unit tests cover all three code paths (string, object, FontAwesome).
- [ ] Storybook stories updated to demonstrate the new string-based API.

**Dependencies:** Story 3 (sprite must exist). Story 4 is a runtime dependency (plugin must be installed for `<use>` to resolve), but the component refactor itself doesn't depend on the plugin code.

**Story Points:** [Team to estimate]

**Notes:**

- The type check `typeof props.icon === 'string'` is the branch point between new and legacy rendering.
- CSS color behavior: icons using `currentColor` will respond to `color` set on the `<svg>` or its parent. Icons with hardcoded fills will not. This is expected and documented behavior, not a bug.

-----

## Story 6: Remove Internal FontAwesome Usage

**Summary:** Find and replace all remaining FontAwesome icon references within Roxbury's own components with sprite-based icon references.

**Context:**
There are approximately 12 or fewer places within the Roxbury component library where FontAwesome icons are used directly (e.g., `<CnbIcon :icon="faChevronDown" :font-awesome="true" />`). These need to be migrated to the new string-based API before FontAwesome can be removed from the bundle.

**Approach:**

- Search the Roxbury codebase for all FontAwesome import patterns (`from '@fortawesome'`, `:font-awesome="true"`, `font-awesome`).
- For each usage:
  - Identify the equivalent icon in the canonical SVG set.
  - Replace with `<CnbIcon icon="{icon-name}" />`.
  - If no equivalent SVG exists, flag it — the icon may need to be added to the canonical set.
- Run existing tests to verify no visual or functional regressions.

**Acceptance Criteria:**

- [ ] Zero FontAwesome imports remain in the Roxbury component source code.
- [ ] Zero `:font-awesome="true"` prop usages remain in Roxbury templates.
- [ ] All replacements use the new string-based CnbIcon API.
- [ ] Any missing icons identified and added to the canonical set (with sprite rebuild).
- [ ] All existing component tests pass.
- [ ] Visual QA in Storybook confirms no regressions.

**Dependencies:** Story 3 (sprite exists), Story 5 (CnbIcon supports string API).

**Story Points:** [Team to estimate]

-----

## Story 7: Remove FontAwesome from Core.scss

**Summary:** Remove the FontAwesome CSS and font file imports from Core.scss, eliminating the FontAwesome payload from the bundle.

**Context:**
FontAwesome's CSS and font files are currently imported in Core.scss, which means every consuming app that imports Roxbury's styles pays the cost of FontAwesome in their bundle — whether they use it or not. With all internal usages migrated (Story 6), the import can be safely removed.

**Approach:**

- Remove the FontAwesome `@import` or `@use` statements from Core.scss.
- Remove any FontAwesome-related SCSS variables, mixins, or helper classes that are no longer referenced.
- Remove `@fortawesome` packages from `dependencies` in `package.json` (move to `devDependencies` if still needed for testing, or remove entirely).
- Measure the before/after bundle size to quantify the improvement.

**Acceptance Criteria:**

- [ ] No FontAwesome imports remain in Core.scss or any other Roxbury stylesheet.
- [ ] `@fortawesome` packages removed from `dependencies`.
- [ ] Bundle size measured: before vs. after documented.
- [ ] All existing tests pass.
- [ ] No visual regressions in Storybook.
- [ ] Consuming apps that import Core.scss no longer receive FontAwesome in their bundle.

**Dependencies:** Story 6 (all internal FontAwesome usages migrated).

**Story Points:** [Team to estimate]

**Notes:**

- This is expected to be a meaningful bundle size reduction. Document the exact numbers — this is a key data point for justifying the epic to stakeholders.

-----

## Story 8: Migration Guide

**Summary:** Write a comprehensive migration guide for consuming teams to transition from the legacy CnbIcon API to the new sprite-based API.

**Context:**
Approximately 10 consuming applications use CnbIcon with the raw SVG import pattern. Each team needs clear, step-by-step instructions to migrate. The guide should minimize questions and support tickets during the transition.

**Approach:**

- Write the guide covering:
  - **What changed and why** — brief context on the architectural shift.
  - **Setup** — installing the `RoxburyIcons` plugin (`app.use(RoxburyIcons)` in their app entry).
  - **Updating CnbIcon usage** — find/replace patterns:
    - `import { SomeIcon } from '@cnodigital/roxbury/icons/...'` → remove the import.
    - `<CnbIcon :icon="SomeIcon" :font-awesome="false" />` → `<CnbIcon icon="some-icon" />`.
  - **Icon name registry** — full list of available icon string names (generated from the canonical set).
  - **Deprecation timeline** — what still works now, when it will stop working (two releases).
  - **FAQ / Troubleshooting** — common issues like "icon not rendering" (forgot plugin), "icon is black instead of themed" (`currentColor` not set on that icon).
- Publish to the Roxbury docs site and/or Confluence.
- Include a codemod or regex cheat sheet that consuming teams can use to find all legacy usages in their codebase.

**Acceptance Criteria:**

- [ ] Guide covers setup, migration steps, icon name list, deprecation timeline, and troubleshooting.
- [ ] Guide published to the docs site and/or Confluence.
- [ ] Icon name registry is complete and accurate (matches the canonical icon set).
- [ ] At least one consuming team has reviewed the guide for clarity (feedback incorporated).
- [ ] Regex or search patterns provided for finding legacy usages.

**Dependencies:** Story 4 (plugin exists), Story 5 (dual-mode CnbIcon shipped).

**Story Points:** [Team to estimate]

-----

## Story 9: Drop Legacy CnbIcon API (Major Version)

**Summary:** Remove the raw SVG import code path, the `font-awesome` prop, and all deprecation warnings from CnbIcon. Ship as a major version bump.

**Context:**
After two releases of the dual-mode API, consuming teams have had time to migrate. This story removes all legacy code paths, simplifying CnbIcon to only support the string-based sprite API. This is a breaking change and ships as a major version.

**Approach:**

- Remove the `Object` type from the `icon` prop — `String` only.
- Remove the `fontAwesome` prop entirely.
- Remove the legacy rendering code paths (raw SVG, FontAwesome).
- Remove all `console.warn` deprecation notices.
- Remove any FontAwesome-related imports or utilities that were retained for backward compatibility.
- Update unit tests to remove legacy test cases.
- Update Storybook stories to remove legacy examples.
- Bump package version to the next major.
- Update the migration guide to note the legacy API has been removed.

**Acceptance Criteria:**

- [ ] CnbIcon `icon` prop accepts `String` only.
- [ ] `fontAwesome` prop does not exist on CnbIcon.
- [ ] No legacy rendering code paths remain in CnbIcon.
- [ ] No deprecation warnings remain.
- [ ] All tests updated and passing.
- [ ] Storybook updated — only string-based examples.
- [ ] Package version bumped to next major.
- [ ] CHANGELOG documents the breaking change clearly.
- [ ] Migration guide updated to reflect the removal.

**Dependencies:** All previous stories complete. Consuming teams have been on the dual-mode API for at least two releases.

**Story Points:** [Team to estimate]

**Notes:**

- Coordinate with consuming teams before shipping. Confirm via the usage scanner (from the Component Adoption Tracking epic) that legacy import patterns are at zero or near-zero across the org.
- The usage scanner can serve as a quality gate: don't ship the major version until the scanner confirms no consuming app is still using the legacy API.

-----

## Dependency Map

```
Story 1: Icon Audit & Dedup
  ├── Story 2: currentColor Audit (depends on 1)
  ├── Story 3: Sprite Build Pipeline (depends on 1)
  │     ├── Story 4: RoxburyIcons Plugin (depends on 3)
  │     ├── Story 5: CnbIcon Dual-Mode (depends on 3)
  │     │     ├── Story 6: Remove Internal FA (depends on 3, 5)
  │     │     │     └── Story 7: Remove FA from Core.scss (depends on 6)
  │     │     └── Story 8: Migration Guide (depends on 4, 5)
  │     └────────── Story 9: Drop Legacy API (depends on all above)
```

**Parallelization opportunities:**

- Stories 2 and 3 can run in parallel (both depend only on Story 1).
- Stories 4 and 5 can run in parallel (both depend only on Story 3).
- Story 8 can start as soon as Stories 4 and 5 are in progress (draft early, finalize after they ship).
