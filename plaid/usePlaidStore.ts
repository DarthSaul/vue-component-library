import { defineStore } from 'pinia';
import { ref } from 'vue';
import { createLinkToken, exchangePublicToken } from './api';
import { toExchangeRequest } from './mappers';
import type {
  LinkStatus,
  LinkedAccount,
  LinkRejectionReason,
  PlaidSuccessMetadata,
  PlaidExitError,
} from './types';

// sessionStorage key — survives the OAuth full-page redirect.
const TOKEN_KEY = 'plaid:link_token';

export const usePlaidStore = defineStore('plaid', () => {
  const status = ref<LinkStatus>('idle');
  const linkToken = ref<string | null>(null);
  const linkedAccount = ref<LinkedAccount | null>(null);
  const rejectionReason = ref<LinkRejectionReason | null>(null);
  const rejectionMessage = ref<string | null>(null);
  const errorMessage = ref<string | null>(null);

  // CNB API — fetch (or rehydrate from sessionStorage on OAuth return).
  async function ensureLinkToken(): Promise<string> {
    const cached = sessionStorage.getItem(TOKEN_KEY);
    if (cached) {
      linkToken.value = cached;
      return cached;
    }
    status.value = 'fetching-token';
    try {
      const { linkToken: token } = await createLinkToken();
      sessionStorage.setItem(TOKEN_KEY, token);
      linkToken.value = token;
      return token;
    } catch (e) {
      status.value = 'error';
      errorMessage.value = (e as Error).message;
      throw e;
    }
  }

  // CNB API — called from Plaid onSuccess via the composable.
  async function exchange(
    publicToken: string,
    metadata: PlaidSuccessMetadata,
  ) {
    status.value = 'exchanging';
    try {
      const req = toExchangeRequest(publicToken, metadata);
      // Idempotency key — link_session_id is unique per Plaid Link session,
      // prevents duplicate exchanges if onSuccess fires twice (OAuth edge).
      const result = await exchangePublicToken(req, metadata.link_session_id);
      sessionStorage.removeItem(TOKEN_KEY); // token is single-use now

      switch (result.status) {
        case 'linked':
          linkedAccount.value = result.account;
          status.value = 'linked';
          return;
        case 'pending':
          status.value = 'verifying';
          // TODO: kick off polling or subscribe to webhook-driven push
          return;
        case 'rejected':
          rejectionReason.value = result.reason;
          rejectionMessage.value = result.message;
          status.value = 'rejected';
          return;
      }
    } catch (e) {
      status.value = 'error';
      errorMessage.value = (e as Error).message;
    }
  }

  // Plaid SDK — onExit handler. err === null means user cancelled.
  function handleExit(err: PlaidExitError | null, _metadata: unknown) {
    sessionStorage.removeItem(TOKEN_KEY);
    if (err === null) {
      // user-initiated cancel — return to idle, do NOT surface as error
      status.value = 'idle';
      return;
    }
    status.value = 'error';
    errorMessage.value = err.display_message ?? err.error_message;
  }

  function reset() {
    sessionStorage.removeItem(TOKEN_KEY);
    status.value = 'idle';
    linkToken.value = null;
    linkedAccount.value = null;
    rejectionReason.value = null;
    rejectionMessage.value = null;
    errorMessage.value = null;
  }

  return {
    status, linkedAccount, rejectionReason, rejectionMessage, errorMessage,
    ensureLinkToken, exchange, handleExit, reset,
  };
});
