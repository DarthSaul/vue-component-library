import { ref, type Ref } from 'vue';
import { onBeforeUnmount } from 'vue';
import { loadPlaidScript } from '../loadPlaidScript';
import { createLinkToken, exchangePublicToken } from '../api/api';
import { toExchangeRequest } from '../api/mappers';
import { useExternalAccountStore } from './useExternalAccountStore';
import { copyForPlaidError, GENERIC_PLAID_ERROR_COPY } from '../plaidErrorUI';
import { copyForExitStatus } from '../plaidExitUI';
import type { CopyEntry } from '../plaidErrorUI';
import type {
  PlaidHandler,
  PlaidSuccessMetadata,
  PlaidExitError,
  PlaidExitMetadata,
  AccountResult,
  ItemLevelRejectionReason,
} from '../types';

// This is the ONLY file that touches window.Plaid. It owns the SDK
// lifecycle (script load → link token → create → open → destroy) and
// exposes result STATE only — no toast/UI side effects live here. Toast
// routing is usePlaidToasts's job; it watches the refs we return.

// OAuth — when the bank redirects back to our SPA, the URL carries this
// query param. Its presence is the signal to resume the Link session.
const OAUTH_PARAM = 'oauth_state_id';

function isOAuthReturn(): boolean {
  return new URLSearchParams(window.location.search).has(OAUTH_PARAM);
}

// State surfaced by an item-level rejection (short-circuits per-account
// processing, so there are no per-account results to show).
export interface ItemRejectionState {
  reason: ItemLevelRejectionReason;
  message: string;
}

export function usePlaidLink() {
  const ready = ref(false);
  const itemRejection: Ref<ItemRejectionState | null> = ref(null);
  const accountResults: Ref<AccountResult[] | null> = ref(null);
  const plaidError: Ref<CopyEntry | null> = ref(null);

  let handler: PlaidHandler | null = null;

  // Call from onMounted of the view. Loading the SDK + token early (vs.
  // on button click) lets Plaid preload and cuts perceived latency.
  async function initialize(): Promise<void> {
    await loadPlaidScript();
    if (!window.Plaid) throw new Error('Plaid SDK not available');

    const { linkToken } = await createLinkToken();
    const resuming = isOAuthReturn();

    handler = window.Plaid.create({
      token: linkToken,
      // OAuth — only set on resume. Plaid reads oauth_state_id from this
      // URL; the link_token MUST be the same one used pre-redirect.
      receivedRedirectUri: resuming ? window.location.href : undefined,
      onSuccess: (publicToken, metadata) => {
        // Fire and forget — Plaid's callback isn't async-aware.
        void handleSuccess(publicToken, metadata);
      },
      onExit: (err, metadata) => handleExit(err, metadata),
      onEvent: (_name, _meta) => {
        // Telemetry hook. Do NOT log public_token or PII metadata.
      },
      onLoad: () => {
        ready.value = true;
      },
    });

    // OAuth — auto-resume without a user gesture. The browser treats this
    // as a continuation of the original click, so it's the one sanctioned
    // open() that isn't bound to a fresh user action.
    if (resuming) {
      handler.open();
      const url = new URL(window.location.href);
      url.searchParams.delete(OAUTH_PARAM);
      window.history.replaceState({}, '', url.toString());
    }
  }

  // Bound to the "Add external account" button.
  function open(): void {
    if (!handler) {
      throw new Error('Plaid handler not initialized — call initialize() first');
    }
    handler.open();
  }

  // Plaid onSuccess → build the request from ALL selected accounts,
  // exchange it (link_session_id as the idempotency key), then set result
  // state. Item-level rejection and completed results are mutually
  // exclusive branches.
  async function handleSuccess(
    publicToken: string,
    metadata: PlaidSuccessMetadata,
  ): Promise<void> {
    try {
      const request = toExchangeRequest(publicToken, metadata);
      const result = await exchangePublicToken(request, metadata.link_session_id);

      if (result.status === 'rejected_at_item') {
        itemRejection.value = { reason: result.reason, message: result.message };
        return;
      }

      accountResults.value = result.results;
      // Refresh the table if anything actually linked.
      if (result.results.some((r) => r.outcome === 'linked')) {
        await useExternalAccountStore().load();
      }
    } catch {
      // Network/5xx during exchange — surface a generic Plaid error.
      plaidError.value = GENERIC_PLAID_ERROR_COPY;
    }
  }

  // Plaid onExit. err === null → user cancelled: surface copy only if the
  // exit status is one we've chosen to map, otherwise stay silent. err !==
  // null → look up our own copy for the Plaid error code.
  function handleExit(
    err: PlaidExitError | null,
    metadata: PlaidExitMetadata,
  ): void {
    if (err === null) {
      plaidError.value = copyForExitStatus(metadata.status);
      return;
    }
    plaidError.value = copyForPlaidError(err.error_code);
  }

  function dismissResults(): void {
    accountResults.value = null;
    itemRejection.value = null;
  }

  function dismissPlaidError(): void {
    plaidError.value = null;
  }

  // Clear any error state and reopen Link (or re-initialize if the handler
  // was already torn down). Wired to the 'reopen-link' retry action.
  function retryPlaidLink(): void {
    dismissPlaidError();
    dismissResults();
    if (handler) {
      handler.open();
    } else {
      void initialize();
    }
  }

  // Plaid SDK — destroy releases DOM/event listeners. Leaks cause
  // double-fire bugs on remount; this is non-negotiable.
  onBeforeUnmount(() => {
    handler?.destroy();
    handler = null;
  });

  return {
    initialize,
    open,
    ready,
    itemRejection,
    accountResults,
    plaidError,
    dismissResults,
    dismissPlaidError,
    retryPlaidLink,
  };
}
