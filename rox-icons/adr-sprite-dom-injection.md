# ADR-0001: Icon sprite DOM injection strategy

**Status:** Accepted
**Date:** 2026-09-30
**Deciders:** Roxbury design system team

## Context

`CnbIcon` renders icons as `<svg><use href="#icon-{name}"/></svg>`. A same-document `<use>` reference only resolves if the referenced `<symbol>` exists in the consuming app's DOM, so the sprite sheet has to get there somehow.

Constraints:

- **Zero setup.** The user story requires the sprite to be present without the consuming developer doing anything.
- **Sprite ships inside `@cnodigital/roxbury`.** A separate icons package is ruled out (versioning coupling between sprite and component must be guaranteed).
- **Consumers are client-rendered Vite + Vue 3 SPAs** (e.g. cno-personal-spa, Business SPA). No known SSR/Nuxt consumers.
- **Consumers may serve static assets from an origin other than the document** (CDN), and may enforce a Trusted Types CSP.
- **`currentColor` must flow** from the `CnbIcon` host into symbol paths so icon color is CSS-controlled.

## Decision

**Inline auto-injection, owned by the library.** The sprite is bundled into Roxbury's JS as a string (`?raw` import, resolved at Roxbury's build) and injected into `document.body` **once**, lazily, on the first `CnbIcon` setup. An exported `installIconSprite()` (and a Vue plugin wrapper) lets a consumer inject eagerly from their app entry if they choose. Injection lives in one module, `src/icons/sprite.js`; `CnbIcon` calls `ensureIconSprite()` and knows nothing else about how the sprite arrives.

Implementation rules:

- **Idempotency is DOM-based**, not just module-based: the sprite root carries a stable `id="roxbury-icon-sprite"` and injection checks `document.getElementById()` first. A module flag is only a fast path. This holds under HMR, duplicated library copies, and micro-frontends.
- **Parse with `DOMParser`, not `innerHTML`.** `innerHTML` is a Trusted Types sink and throws under `require-trusted-types-for 'script'`. `DOMParser.parseFromString(…, 'image/svg+xml')` produces an inert document; the root is `importNode`d and appended.
- **Hidden without `display: none`.** Root gets `width="0" height="0"`, `position:absolute; overflow:hidden`, `aria-hidden="true"`, `focusable="false"`. `display: none` on the sprite root has a history of breaking gradients/masks/patterns referenced from inside symbols; `aria-hidden` keeps screen readers (and the axe gate) from traversing hundreds of symbols.
- **Appended to the end of `<body>`**, not prepended, so consumer CSS relying on `body > :first-child` is unaffected.
- **Injected during `setup()`**, guarded by `typeof document !== 'undefined'`, so the sprite is present before the first `<use>` paints and the module never throws in a non-DOM context. No module-level side effect on import.

## Options Considered

### Option A: Inline auto-injection (chosen)

| Dimension             | Assessment                                                                |
| --------------------- | ------------------------------------------------------------------------- |
| Complexity            | Low — one ~60-line module                                                 |
| Consumer setup        | None                                                                      |
| Cross-bundler support | Full — `?raw` resolves at Roxbury build; consumers receive a plain string |
| Caching               | Weakest — sprite lives in the JS bundle                                   |

**Pros:** zero setup; sprite and component are version-locked in the same bundle; independent of asset origin (no same-origin requirement); no second request before first icon paint; `currentColor` trivially correct (same document); works on any consumer bundler.
**Cons:** sprite (~30–80 KB gzipped) is not separately cacheable and re-downloads whenever the bundle hash changes; full icon set ships to every consumer regardless of usage.

### Option B: External file reference (`<use href="{spriteUrl}#icon-…">`)

| Dimension             | Assessment                                                                                                              |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Complexity            | Medium — asset must survive the library → consumer build boundary                                                       |
| Consumer setup        | Effectively required today                                                                                              |
| Cross-bundler support | Poor — a `?url` resolved at Roxbury's build points into Roxbury's dist, which the consumer's bundler does not reprocess |
| Caching               | Best — one long-lived static asset                                                                                      |

**Pros:** ideal caching; sprite out of the JS bundle; no DOM manipulation, so trivially SSR-safe; "inject once" becomes a non-issue.
**Cons:** external `<use>` is blocked cross-origin with **no CORS escape hatch** — any consumer serving assets from a CDN origin gets silently blank icons; second network round-trip before icons paint (icons "pop in"); asset URL cannot be delivered reliably across the library boundary without consumer configuration, which violates the zero-setup requirement.

### Option C: Consumer-provided injection

**Pros:** consumer controls timing and caching.
**Cons:** fails the user story outright; a forgotten setup step blanks every icon in the app.

## Trade-off Analysis

Option B is the better end-state on caching and would be the natural choice if Roxbury controlled asset delivery. It does not: the consumer's bundler and CDN topology decide whether an external `<use>` resolves, and the failure mode (blank icons, no error) is invisible in review. Option A trades a modest, bounded bundle cost — smaller than the FontAwesome payload this epic removes — for correctness that does not depend on how the consumer deploys. The `./icons/icons-sprite.svg` package export and the `installIconSprite()` escape hatch keep Option B available as a later opt-in without an API break.

## Consequences

- **Easier:** consumers upgrade Roxbury and icons work; no docs step, no footgun; sprite/component version skew is impossible.
- **Harder:** the sprite is paid for on every bundle change; a consumer using five icons still ships the full set.
- **Revisit when:** (a) a consumer demonstrates measurable bundle pressure from the sprite → add opt-in external mode using the existing export; (b) subset/tree-shakeable sprites become worth their build complexity; (c) an SSR consumer appears (see Scope).

## Scope: SSR / hydration

**Explicitly out of scope.** Roxbury targets client-rendered Vue 3 SPAs; server-side rendering of the sprite is not supported or verified. The module is guarded so importing or calling it in a non-DOM context (SSR, Node test runners) is a no-op rather than an error. Injecting into `document.body` at `setup()` is hydration-safe by construction (body is outside Vue's mount container), so if an SSR consumer emerges, `installIconSprite()` from the client entry is the supported path and a server-render strategy would be a new ADR.

## Verification

Unit (Vitest + jsdom):

- Mounting three `CnbIcon`s yields exactly one `#roxbury-icon-sprite`.
- Calling `ensureIconSprite()` twice yields one element.
- A pre-existing `#roxbury-icon-sprite` (simulating a second library copy / HMR) is not duplicated.
- With `document` undefined, `ensureIconSprite()` returns `false` and does not throw.
- Sprite root has `aria-hidden="true"`, `focusable="false"`, zero width/height, and no `display: none`.

Browser (Playwright):

- `CnbIcon` inside a parent with `color: rgb(…)` has computed `fill` equal to that color for a `currentColor` symbol. (jsdom does not compute SVG fill; this must run in a real browser.)
- axe reports no violations on a page with injected sprite.

Consumer fixture (`fixtures/icon-test-app`):

- Renders `CnbIcon` with **no** sprite import or setup and asserts the sprite is present — the direct proof of the user story.

## Action Items

1. [ ] Implement `src/icons/sprite.js` + `sprite.d.ts`; export from the `./icons` entry.
2. [ ] `CnbIcon` calls `ensureIconSprite()` in `setup()`.
3. [ ] Remove the manual `?raw` import from `fixtures/icon-test-app/App.vue`; keep it as the zero-setup proof.
4. [ ] Add the unit and Playwright checks above.
5. [ ] Document `installIconSprite()` / plugin as optional eager injection in the icons README.
