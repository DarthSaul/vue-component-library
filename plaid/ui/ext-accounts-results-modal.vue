<script setup lang="ts">
import { DsModal, DsButton } from '@ds/vue';
import { copyForAccountRejection, type RejectionCopy } from '../rejectionUI';
import type { AccountResult } from '../types';

// Shown for mixed/all-rejected exchanges, where a toast can't do the
// outcome justice. Two sections: what linked, and what didn't (with the
// per-account rejection copy). All wording comes from copyForAccountRejection.
defineProps<{
  linked: AccountResult[];
  rejected: AccountResult[];
}>();

defineEmits<{ (e: 'close'): void }>();

// Empty fallback keeps the template total; only 'rejected' rows ever reach
// this section, but the type is the full union.
const EMPTY_COPY: RejectionCopy = { title: '', body: '' };

function rejectionCopy(result: AccountResult): RejectionCopy {
  return result.outcome === 'rejected'
    ? copyForAccountRejection(result.reason)
    : EMPTY_COPY;
}
</script>

<template>
  <DsModal @close="$emit('close')">
    <template #header>
      <h2>Account connection results</h2>
    </template>

    <template #body>
      <section v-if="linked.length" class="results-section results-section--linked">
        <h3>Linked successfully</h3>
        <ul>
          <li v-for="result in linked" :key="result.plaidAccountId">
            <template v-if="result.outcome === 'linked'">
              {{ result.account.institutionName }} •••• {{ result.account.accountMask }}
            </template>
          </li>
        </ul>
      </section>

      <section
        v-if="rejected.length"
        class="results-section results-section--rejected"
      >
        <h3>Couldn't be connected</h3>
        <ul>
          <li v-for="result in rejected" :key="result.plaidAccountId">
            <strong>{{ rejectionCopy(result).title }}</strong>
            <p>{{ rejectionCopy(result).body }}</p>
          </li>
        </ul>
      </section>
    </template>

    <template #footer>
      <DsButton @click="$emit('close')">Done</DsButton>
    </template>
  </DsModal>
</template>
