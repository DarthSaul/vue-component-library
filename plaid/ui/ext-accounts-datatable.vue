<script setup lang="ts">
import { DsDatatable } from '@ds/vue';
import ExtAccountsTableChip from './ext-accounts-table-chip.vue';
import type { LinkedAccount } from '../types';

// Renders the linked-account list. Reads domain models straight from the
// store — no fetching here. Loading / error / empty are handled before the
// datatable renders.
defineProps<{
  accounts: LinkedAccount[];
  loading: boolean;
  error: string | null;
}>();

const columns = [
  { key: 'institutionName', label: 'Institution' },
  { key: 'accountMask', label: 'Account' },
  { key: 'accountType', label: 'Type' },
  { key: 'status', label: 'Status' },
];
</script>

<template>
  <div class="ext-accounts-datatable">
    <p v-if="loading" class="ead-state ead-state--loading">
      Loading linked accounts…
    </p>
    <p v-else-if="error" class="ead-state ead-state--error">{{ error }}</p>
    <p v-else-if="accounts.length === 0" class="ead-state ead-state--empty">
      No external accounts linked yet.
    </p>

    <DsDatatable v-else :columns="columns" :rows="accounts">
      <template #cell:accountMask="{ row }">
        •••• {{ row.accountMask }}
      </template>
      <template #cell:status="{ row }">
        <ExtAccountsTableChip :status="row.status" />
      </template>
    </DsDatatable>
  </div>
</template>
