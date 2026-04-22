# Roxbury Adoption Cleanup — Guidance for `cno-personal-spa`

## Background

The app currently has three relevant dependencies installed:

- `@cnbdigital/framework-library` v4.6 *(legacy, deprecated)*
- `@cnbdigital/framework-library-css` v4.6 *(legacy, deprecated)*
- `@cnodigital/roxbury` v6.18 *(current)*

The legacy `framework-library` and `framework-library-css` packages were intended to be fully removed when the app transitioned to `@cnodigital/roxbury`. They are not designed to coexist with Roxbury, and continued use is actively causing bugs.

**Concrete example of the problem:** A visual bug in our Dropdown component when nested inside Modal was fixed in `@cnodigital/roxbury` v6.7. The app is on v6.18, so the fix should be present — but it isn't taking effect, because styles imported from `@cnbdigital/framework-library-css` are winning the cascade. This is one symptom of a broader class of issues that will keep recurring until the legacy packages are removed.

A contributing factor: many `.vue` files import legacy stylesheets directly (either the full library or individual component SCSS files), and most of those files use unscoped `<style>` blocks. This means legacy styles get hoisted into the bundle after the global Roxbury styles, overriding fixes from newer Roxbury versions.

-----

## Priority 1a — Remove all `framework-library` and `framework-library-css` usage

This is the root cause and should be the end goal. The packages were never meant to ship alongside Roxbury, and the longer they remain, the more upgrade pain compounds.

Because removal touches many files and requires regression testing, it can be staged. The first staging step is consolidating stylesheet imports (Priority 1b), which immediately reduces the conflict surface and creates a clean foundation for the full removal.

-----

## Priority 1b — Consolidate Roxbury stylesheet imports

### Current pattern

Component stylesheets are imported individually in each `.vue` file that uses the corresponding component, e.g.:

```vue
<style>
@import '@cnodigital/roxbury/css/components/Dropdown.min.css';
</style>
```

### Recommended pattern

Create a single `src/styles/roxbury.scss` and import it once in `main.js`:

```scss
// src/styles/roxbury.scss
@import '@cnodigital/roxbury/css/Core.min.css';
@import '@cnodigital/roxbury/css/components/Dropdown.min.css';
@import '@cnodigital/roxbury/css/components/Modal.min.css';
// ...add per component as needed
```

```js
// main.js
import './styles/roxbury.scss';
```

**Order matters:** `Core.min.css` first, then component styles. Any app-level overrides of Roxbury tokens or variables should be imported *after* the Roxbury block so they take precedence predictably.

### Why consolidate

The per-file import pattern offers no real benefit for a library consumer:

- The styles belong to Roxbury, not the consuming file, so colocation doesn't aid refactoring.
- Components are typically used in many files, so "automatic pruning" when a single usage is removed rarely applies.
- Bundlers hoist imports in module-resolution order, which shifts as the app grows — making cascade order unpredictable.

Consolidation provides:

- **Predictable cascade order** — one file controls what loads when.
- **A single upgrade audit point** when bumping Roxbury versions.
- **Protection against duplicate imports** via different paths.
- **A clean wrapper point** for cascade layers (see below).

The only "cost" is remembering to add a line to `roxbury.scss` when a new component is adopted — a trivial one-line PR change that the usage scanner can flag if missed.

### Why this is also the right pattern long-term

Once the legacy packages are removed, the consolidated `roxbury.scss` remains the correct approach for the Core + per-component import strategy this app prefers. There is no reason to revert to per-file imports later.

-----

## Priority 1c — Use CSS Cascade Layers as a transitional safety net

While the legacy CSS still exists, wrap both libraries in cascade layers in `main.js`'s entry stylesheet:

```scss
@layer legacy, roxbury;

@layer legacy {
  @import '@cnbdigital/framework-library-css/style.css';
}

@layer roxbury {
  @import '@cnodigital/roxbury/css/Core.min.css';
  @import '@cnodigital/roxbury/css/components/Dropdown.min.css';
  // ...
}
```

Any rule inside `@layer roxbury` beats any rule inside `@layer legacy`, regardless of source order or selector specificity. This means newer Roxbury fixes (like the Dropdown-in-Modal fix) will apply correctly even before the legacy CSS is fully removed.

**Important:** For this to work, the per-`.vue`-file imports of `framework-library-css` must be moved into the centralized `legacy` layer. Imports left in individual `.vue` files land outside any layer and bypass the precedence rules.

Browser support for cascade layers is universal at this point (Safari 15.4+, all other modern browsers earlier).

As legacy imports are audited and removed file-by-file, the `@layer legacy` block shrinks until it can be deleted entirely.

-----

## Other recommended improvements (low effort, non-disruptive)

### Lazy-load routes

Convert Vue Router route definitions to dynamic imports:

```js
{ path: '/example', component: () => import('./views/Example.vue') }
```

Vite handles chunking automatically. The tradeoff — a small network round-trip on first navigation to each route — is dwarfed by initial bundle savings for an app of this size. Add a loading state or route transition to keep navigation feeling smooth on slow connections.

### Add ESLint guardrails

- `no-restricted-imports` rule warning on any import from `@cnbdigital/framework-library` or `@cnbdigital/framework-library-css` to stop new usage.
- A rule discouraging CSS imports inside `.vue` `<script>` or `<style>` blocks for library styles, directing developers to the consolidated `roxbury.scss` instead.

### Audit unscoped `<style>` blocks

Most page-level styles don't need to pierce component boundaries and can be converted to `scoped` without learning `:deep()`. The cases that genuinely need deep selectors can be migrated incrementally. Unscoped page styles are a major source of silent overrides of library internals and a recurring cause of upgrade regressions.

### Enable CSS code splitting

Confirm Vite's `build.cssCodeSplit` is enabled (it's the default in modern Vite). Combined with lazy-loaded routes, component-specific CSS ships only with the route chunks that need it.

### Track legacy removal as a measurable backlog item

Run the Roxbury usage scanner against the SPA once cascade layers are in place. This produces a concrete, shrinking count of legacy imports remaining — much easier to socialize with product owners than a vague "big migration" and turns the cleanup into a reviewable, incremental backlog.

-----

## Suggested sequencing

1. **Centralize stylesheet imports** into `src/styles/roxbury.scss` and a parallel `legacy.scss` (or a single entry file with both layers). Remove all per-`.vue`-file CSS imports for both Roxbury and `framework-library-css`.
1. **Wrap both libraries in cascade layers** so newer Roxbury fixes immediately take effect.
1. **Add ESLint guardrails** to prevent regression.
1. **Lazy-load routes** as an independent, parallel improvement.
1. **Audit and convert unscoped `<style>` blocks** incrementally.
1. **Run the usage scanner** to measure and track removal of `framework-library` and `framework-library-css` imports.
1. **Remove the legacy packages entirely** once the scanner reports zero usages.
