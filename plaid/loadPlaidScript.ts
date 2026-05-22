// Plaid SDK — injects the link-initialize.js script tag the first time
// it's called, resolves once window.Plaid is available. Subsequent calls
// no-op and return the same resolved promise.
const PLAID_SRC = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js';

let loadPromise: Promise<void> | null = null;

export function loadPlaidScript(): Promise<void> {
  if (window.Plaid) return Promise.resolve();
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = PLAID_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      loadPromise = null; // allow retry
      reject(new Error('Failed to load Plaid Link script'));
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}
