<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { DsButton } from '@ds/vue';
import { usePlaidLink } from '../composables/usePlaidLink';
import { useExternalAccountStore } from '../composables/useExternalAccountStore';
import { usePlaidToasts, derivePresentation } from '../composables/usePlaidToasts';
import ExtAccountsDatatable from './ext-accounts-datatable.vue';
import ExtAccountsResultsModal from './ext-accounts-results-modal.vue';
import type { AccountResult } from '../types';

// Main view. Components never fetch — they go through the store (list) and
// usePlaidLink (exchange). This view wires the SDK, routes toasts, and
// decides when the results modal appears; it holds no request logic itself.
const link = usePlaidLink();
const store = useExternalAccountStore();

// Destructured so the template auto-unwraps these top-level refs/handlers.
const { open, ready, dismissResults } = link;

// usePlaidToasts owns all toast side effects; this view only reads state.
usePlaidToasts(link);

onMounted(() => {
  // Preload the Plaid handler and the current list in parallel.
  void Promise.all([link.initialize(), store.load()]);
});

const presentation = computed(() =>
  derivePresentation(link.itemRejection.value, link.accountResults.value),
);

const results = computed<AccountResult[]>(() => link.accountResults.value ?? []);
const linkedAccounts = computed(() =>
  results.value.filter((r) => r.outcome === 'linked'),
);
const rejectedAccounts = computed(() =>
  results.value.filter((r) => r.outcome === 'rejected'),
);

// Toasts cover all-success / item-rejection; the modal owns the mixed and
// all-rejected outcomes where the user needs the per-account breakdown.
const showResultsModal = computed(
  () =>
    presentation.value === 'all-rejected' ||
    presentation.value === 'partial-success',
);
</script>

<template>
  <section class="manage-external-accounts">
    <header class="mea-header">
      <h1>External accounts</h1>
      <DsButton :disabled="!ready" @click="open">
        Add external account
      </DsButton>
    </header>

    <ExtAccountsDatatable
      :accounts="store.accounts"
      :loading="store.isLoading"
      :error="store.error"
    />

    <ExtAccountsResultsModal
      v-if="showResultsModal"
      :linked="linkedAccounts"
      :rejected="rejectedAccounts"
      @close="dismissResults"
    />
  </section>
</template>
