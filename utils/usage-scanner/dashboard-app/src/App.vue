<script setup>
import { ref, onMounted } from 'vue';
import DashboardView from './components/DashboardView.vue';

const report = ref(null);
const error = ref(null);
const loading = ref(true);

onMounted(async () => {
  try {
    const res = await fetch('/report.json');
    if (!res.ok) {
      throw new Error(`${res.status} ${res.statusText}`);
    }
    report.value = await res.json();
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="app">
    <header class="app-header">
      <h1 class="app-title">Usage Scanner Dashboard</h1>
    </header>

    <main class="app-main">
      <p v-if="loading" class="status-message">Loading report...</p>
      <p v-else-if="error" class="error-message">
        Could not load report.json — {{ error }}
      </p>
      <DashboardView v-else :report="report" />
    </main>
  </div>
</template>
