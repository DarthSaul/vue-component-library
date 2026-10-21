// ─────────────────────────────────────────────────────────────
// MSW browser worker
// ─────────────────────────────────────────────────────────────
//
// `setupWorker` registers a Service Worker that sits between the
// page and the network. Once started, EVERY fetch/XHR the
// browser issues passes through it. Requests matching a handler
// in handlers.ts get a synthetic response; everything else falls
// through to the real network (configured in setup.ts via
// `onUnhandledRequest: 'bypass'`).
//
// Two things to know:
//   1. The Service Worker file itself (`mockServiceWorker.js`)
//      must be served from your app's public directory. Generate
//      it once per project with:
//        npx msw init public/ --save
//      Commit the resulting file — it's a runtime dependency.
//
//   2. Don't import this module unconditionally — that pulls
//      MSW into your production bundle. setup.ts uses a dynamic
//      import inside a dev-only branch so bundlers can tree-
//      shake it out of release builds.

import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

// Spread the handlers array as the variadic arg list. To add or
// remove endpoints, edit handlers.ts — nothing here changes.
export const worker = setupWorker(...handlers);
