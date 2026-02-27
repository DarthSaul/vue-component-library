# vue-component-library

UI kit for Vue apps

## Monorepo Structure

This is a monorepo containing:

- **ui/** - Vite + Vue component library with components in `ui/src/components/[COMPONENT_NAME]/ComponentName.vue`
- **styles/** - All component styles
- **icons/** - Icons library (placeholder)
- **docs/** - SPA sandbox/playground for component development

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
