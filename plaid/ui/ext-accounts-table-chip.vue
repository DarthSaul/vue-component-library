<script setup lang="ts">
import { computed } from 'vue';
import { DsChip } from '@ds/vue';
import type { AccountStatus } from '../types';

const props = defineProps<{ status: AccountStatus }>();

// Maps each account status to a design-system chip variant + label. Copy
// lives here rather than in the template so the mapping is exhaustive over
// AccountStatus (a new status forces a new entry).
const STATUS_CONFIG: Record<AccountStatus, { variant: string; label: string }> = {
  active: { variant: 'success', label: 'Active' },
  pending_verification: { variant: 'warning', label: 'Pending verification' },
  verification_failed: { variant: 'danger', label: 'Verification failed' },
  disconnected: { variant: 'neutral', label: 'Disconnected' },
};

const config = computed(() => STATUS_CONFIG[props.status]);
</script>

<template>
  <DsChip :variant="config.variant">{{ config.label }}</DsChip>
</template>
