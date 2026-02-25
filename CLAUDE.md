# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install          # Install all workspace dependencies
npm run dev          # Start demo app at http://localhost:3000
npm run build        # Build the component library (outputs to dist/)
npm run build:ui     # Same as build
npm run build:demo   # Build the demo SPA
npm run preview      # Preview the built demo app
```

No test or lint commands are currently configured.

## Architecture

This is an **npm workspaces monorepo** with four packages:

- **`ui/`** — The component library. Vite builds it in library mode, outputting ESM (`dist/index.js`) and CJS (`dist/index.cjs`). `vue` is externalized (not bundled). Entry: `ui/src/index.js`.
- **`demo/`** — A Vite SPA used as a development sandbox. Imports from `@darthsaul/vue-component-library-ui`. Runs on port 3000.
- **`styles/`** — Standalone SCSS package. Exported at `@darthsaul/vue-component-library/styles`. Components have both scoped styles inside `.vue` files and separate SCSS files here.
- **`icons/`** — Placeholder, not yet implemented.

All devDependencies (Vite, Vue, SASS, `@vitejs/plugin-vue`) live at the root `package.json`, not in individual workspace `package.json` files.

## Component Conventions

Components live in `ui/src/components/[ComponentName]/ComponentName.vue` and are barrel-exported from `ui/src/index.js`.

- Use Vue 3 `<script setup>` syntax; `<script setup>` comes first, then `<template>`
- Validate props with `validator` functions where applicable (e.g., `variant: { validator: v => ['primary', 'secondary', 'tertiary'].includes(v) }`)
- Use `defineEmits()` for events
- Use named slots for flexible content areas (header, footer, body)
- Scoped styles go in the `.vue` file; shared/themeable styles go in `styles/components/`

The `styles/` package uses CSS custom properties for theming with SCSS variables defined in `styles/variables/`.
