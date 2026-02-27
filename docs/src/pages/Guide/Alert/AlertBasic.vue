<script setup>
import { Alert } from '@darthsaul/vue-component-library-ui'
</script>

<template>
  <div style="display: flex; flex-direction: column; gap: 1rem;">
    <Alert variant="info">This is an info alert.</Alert>
    <Alert variant="success">This is a success alert.</Alert>
    <Alert variant="warning">This is a warning alert.</Alert>
    <Alert variant="danger">This is a danger alert.</Alert>
  </div>
</template>
