import { ref, onBeforeUnmount } from 'vue';
import { usePlaidStore } from './usePlaidStore';
import { loadPlaidScript } from './loadPlaidScript';
import type { PlaidHandler } from './types';

// Plaid OAuth — when the bank redirects back to our SPA, the URL will
// contain this query param. Its presence is the signal to resume.
const OAUTH_PARAM = 'oauth_state_id';

function isOAuthReturn(): boolean {
  return new URLSearchParams(window.location.search).has(OAUTH_PARAM);
}

export function usePlaidLink() {
  const store = usePlaidStore();
  const ready = ref(false);
  let handler: PlaidHandler | null = null;

  // Call from onMounted of the "Connect bank" view.
  // Doing this early (vs. on button click) lets Plaid preload and reduces
  // perceived latency when the user clicks Open.
  async function initialize() {
    await loadPlaidScript();
    if (!window.Plaid) throw new Error('Plaid SDK not available');

    const token = await store.ensureLinkToken();
    const resuming = isOAuthReturn();

    // Plaid SDK — construct the handler.
    handler = window.Plaid.create({
      token,
      // Plaid OAuth — only set on resume. Plaid extracts oauth_state_id
      // from this URL; the link_token MUST be the same one used pre-redirect.
      receivedRedirectUri: resuming ? window.location.href : undefined,

      onSuccess: (publicToken, metadata) => {
        // Hand off to the store — composable stays SDK-only.
        store.exchange(publicToken, metadata);
      },
      onExit: (err, metadata) => store.handleExit(err, metadata),
      onEvent: (name, _meta) => {
        // Telemetry hook. Do NOT log public_token or PII metadata.
        // e.g. analytics.track(`plaid.${name}`);
      },
      onLoad: () => { ready.value = true; },
    });

    // Plaid OAuth — auto-resume the flow without a user gesture.
    // This is the one sanctioned case for opening without a click,
    // because the browser sees it as continuation of the original action.
    if (resuming) {
      handler.open();
      // Clean up the query param so a refresh doesn't re-trigger resume.
      const url = new URL(window.location.href);
      url.searchParams.delete(OAUTH_PARAM);
      url.searchParams.delete('oauth_state_id');
      window.history.replaceState({}, '', url.toString());
    }
  }

  // Bound to the "Connect a bank" button click.
  function open() {
    if (!handler) {
      throw new Error('Plaid handler not initialized — call initialize() first');
    }
    handler.open();
  }

  // Plaid SDK — destroy releases DOM/event listeners. Leaks cause
  // double-fire bugs on remount; this is non-negotiable.
  onBeforeUnmount(() => {
    handler?.destroy();
    handler = null;
  });

  return { initialize, open, ready };
}
