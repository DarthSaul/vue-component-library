<script setup>
import { ref, computed } from 'vue';
import ReportDropzone from './components/ReportDropzone.vue';
import DashboardView from './components/DashboardView.vue';

const report = ref(null);
const error = ref(null);

function onReportLoaded(data) {
  error.value = null;
  report.value = data;
}

function onError(message) {
  error.value = message;
  report.value = null;
}

function reset() {
  report.value = null;
  error.value = null;
}
</script>

<template>
  <div class="app">
    <header class="app-header">
      <h1 class="app-title">Usage Scanner Dashboard</h1>
      <button v-if="report" class="btn-reset" @click="reset">
        Load another report
      </button>
    </header>

    <main class="app-main">
      <ReportDropzone
        v-if="!report"
        @report-loaded="onReportLoaded"
        @error="onError"
      />

      <p v-if="error" class="error-message">{{ error }}</p>

      <DashboardView v-if="report" :report="report" />
    </main>
  </div>
</template>
