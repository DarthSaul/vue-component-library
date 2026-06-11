// ─────────────────────────────────────────────────────────────
// MSW startup helper
// ─────────────────────────────────────────────────────────────
//
// Call this once at the top of your app entry (main.ts) BEFORE
// creating the Vue app, so the Service Worker is registered
// before any component issues fetch calls.
//
// Usage in main.ts:
//
//   import { createApp } from 'vue';
//   import { createPinia } from 'pinia';
//   import App from './App.vue';
//   import { setupMocks } from '@/plaid/mocks/setup';
//
//   async function bootstrap() {
//     await setupMocks();          // ← register MSW first
//     const app = createApp(App);
//     app.use(createPinia());
//     app.mount('#app');
//   }
//
//   bootstrap();
//
// One-time setup per project:
//   1. npm install --save-dev msw
//   2. npx msw init public/ --save
//      (generates public/mockServiceWorker.js — commit it)
//   3. Add to .env.development:
//        VITE_USE_MSW=true
//
// To run against the real backend later, flip VITE_USE_MSW=false
// (or delete it). No code changes — the fetch calls are
// identical either way.

export async function setupMocks(): Promise<void> {
  // Production guardrail #1 — mocks must never run against real
  // user traffic. `import.meta.env.DEV` is set by Vite only in
  // dev builds.
  if (!import.meta.env.DEV) return;

  // Production guardrail #2 — env-flag opt-in so you can develop
  // against the real backend without ripping out the import.
  if (import.meta.env.VITE_USE_MSW !== 'true') return;

  // Dynamic import — the MSW library is referenced only inside
  // this branch, so bundlers tree-shake it out of release builds.
  // (A static `import { worker } from './browser'` at the top of
  // this file would pull all of MSW into prod, which we don't want.)
  const { worker } = await import('./browser');

  // Start the Service Worker. The `onUnhandledRequest` option
  // controls what happens to calls we haven't written a handler
  // for:
  //   'bypass' — pass through to the real network (default here,
  //              good for hitting real CDN assets, analytics, etc.)
  //   'warn'   — log a console warning, then pass through (useful
  //              when you want to catch missed endpoints during dev)
  //   'error'  — throw, fail the request (strictest; use sparingly)
  await worker.start({ onUnhandledRequest: 'bypass' });
}
