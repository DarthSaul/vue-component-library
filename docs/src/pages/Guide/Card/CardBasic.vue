<script setup>
import { Card, Button } from '@darthsaul/vue-component-library-ui'
</script>

<template>
  <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
    <Card>
      <template #header><h3>Basic Card</h3></template>
      <p>Card body content goes here.</p>
      <template #footer>
        <Button variant="primary">Action</Button>
      </template>
    </Card>

    <Card elevated>
      <template #header><h3>Elevated Card</h3></template>
      <p>This card has an elevated shadow.</p>
    </Card>
  </div>
</template>
