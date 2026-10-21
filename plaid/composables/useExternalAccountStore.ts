import { defineStore } from 'pinia';
import { ref, type Ref } from 'vue';
import { fetchExternalTransferAccounts } from '../api/api';
import type { LinkedAccount } from '../types';

// Setup-style Pinia store for the linked-account list that the Manage
// External Accounts table renders. usePlaidLink triggers load() after a
// successful exchange so a freshly linked account shows up. The store
// speaks domain models only — the DTO→domain mapping already happened
// inside api.ts.
export const useExternalAccountStore = defineStore('externalAccounts', () => {
  const accounts: Ref<LinkedAccount[]> = ref([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const hasLoaded = ref(false);

  async function load(): Promise<void> {
    isLoading.value = true;
    error.value = null;
    try {
      accounts.value = await fetchExternalTransferAccounts();
      hasLoaded.value = true;
    } catch (e) {
      error.value = (e as Error).message;
    } finally {
      isLoading.value = false;
    }
  }

  return { accounts, isLoading, error, hasLoaded, load };
});
