# vue-component-library

UI kit for Vue apps

## Monorepo Structure

This is a monorepo containing:

- **ui/** - Vite + Vue component library with components in `ui/src/components/[COMPONENT_NAME]/ComponentName.vue`
- **styles/** - All component styles
- **icons/** - Icons library (placeholder)
- **docs/** - SPA sandbox/playground for component development
- **css-demo/** - Interactive demo illustrating CSS customization patterns for design systems (see below)

## Getting Started

Install dependencies:

```bash
npm install
```

## Development

Run the docs app to develop components:

```bash
npm run dev
```

This will start the docs app at http://localhost:3000

## Build

Build the component library:

```bash
npm run build
```

Build the docs app:

```bash
npm run build:docs
```

## CSS Customization Patterns Demo

The `css-demo/` package is a standalone Vite + Vue app that demonstrates three patterns
for giving consuming apps a stable CSS customization API. It addresses a common design
system pain point: a consumer writes custom CSS targeting internal class names, and a
non-breaking minor update silently breaks their overrides.

### Running the demo

```bash
npm run dev:css-demo   # starts at http://localhost:3001
```

### What the demo covers

#### The Problem

When consumers target internal class names (`.rxb-btn`, `.rxb-btn__inner`), any internal
markup change — adding a wrapper element, renaming a class, adjusting specificity — can
break their overrides without the library making a breaking API change.

#### Solution 1 — CSS Custom Properties

Every visual property a consumer might want to override is exposed as a namespaced CSS
variable on the component root:

```css
/* Library */
.rxb-btn {
  --rxb-btn-bg:        #007bff;
  --rxb-btn-radius:    4px;
  --rxb-btn-padding-x: 16px;
  background:    var(--rxb-btn-bg);
  border-radius: var(--rxb-btn-radius);
  padding:       var(--rxb-btn-padding-y) var(--rxb-btn-padding-x);
}

/* Consumer — overrides the variable, not the class */
.page-actions {
  --rxb-btn-bg:     #8b5cf6;
  --rxb-btn-radius: 20px;
}
```

Removing or renaming a CSS variable is a **breaking change** (major bump). Adding one is
always non-breaking.

#### Solution 2 — CSS Cascade Layers (`@layer`)

All library styles are declared inside a named layer. Any *unlayered* CSS in a consuming
app automatically wins the cascade — regardless of specificity. New rules added to the
library layer in a minor release cannot accidentally override consumer styles.

```css
/* Library */
@layer roxbury {
  .rxb-btn { background: #007bff; }
}

/* Consumer — unlayered CSS always beats @layer roxbury */
.page-actions .rxb-btn {
  background: #059669; /* wins — no !important needed */
}
```

Wrapping existing output in `@layer roxbury { … }` is safe in a **minor release** because
layered styles have lower implicit priority than unlayered styles.

#### Solution 3 — Stable Selector Contract via Data Attributes

Class names are internal implementation details. Data attributes like `data-rxb="button"`
and `data-rxb-variant="primary"` are the library's **public selector API** — the library
commits to never changing them without a major version bump.

```html
<!-- Button.vue -->
<button class="rxb-btn" data-rxb="button" :data-rxb-variant="variant">
  <slot />
</button>
```

```css
/* Consumer — targets the stable public API */
.page-actions [data-rxb="button"] {
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
```

#### Recommended: All Three Together

Use all three patterns in combination. CSS custom properties handle theming; cascade layers
prevent specificity conflicts; data attributes provide a stable structural hook. Together
they let you tell consuming teams:

> "Override the variables for theming; target data attributes for structural changes. We'll
> never break either in a minor release."

```css
/* Library */
@layer roxbury {
  [data-rxb="button"] {
    --rxb-btn-bg:     #007bff;
    --rxb-btn-radius: 4px;
    background:    var(--rxb-btn-bg);
    border-radius: var(--rxb-btn-radius);
  }
}

/* Consumer — option A: variable override */
.page-actions { --rxb-btn-bg: #7c3aed; }

/* Consumer — option B: selector override (unlayered, always wins) */
.page-actions [data-rxb="button"] { border: 2px dashed #7c3aed; }
```

---

## Available Components

- **Button** - Button component with variants (primary, secondary, tertiary)
- **Card** - Card component with optional elevation and slots for header/footer

## Usage

```vue
<script setup>
import { Button, Card } from '@darthsaul/vue-component-library'
</script>

<template>
  <Card elevated>
    <template #header>
      <h3>Card Title</h3>
    </template>
    <p>Card content goes here</p>
    <template #footer>
      <Button variant="primary">Action</Button>
    </template>
  </Card>
</template>
```
