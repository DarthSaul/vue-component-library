<template>
  <div class="demo-app">
    <header class="demo-header">
      <h1>Vue Component Library</h1>
      <p>Component Playground & Sandbox</p>
    </header>

    <main class="demo-main">
      <section class="demo-section">
        <h2>Button Component</h2>
        <div class="demo-group">
          <Button variant="primary" @click="handleClick">
            Primary Button
          </Button>
          <Button variant="secondary" @click="handleClick">
            Secondary Button
          </Button>
          <Button variant="tertiary" @click="handleClick">
            Tertiary Button
          </Button>
        </div>
      </section>

      <section class="demo-section">
        <h2>Card Component</h2>
        <div class="demo-group">
          <Card>
            <template #header>
              <h3>Basic Card</h3>
            </template>
            <p>This is a basic card with a header and body content.</p>
            <template #footer>
              <Button variant="primary">Action</Button>
            </template>
          </Card>

          <Card elevated>
            <template #header>
              <h3>Elevated Card</h3>
            </template>
            <p>This card has an elevated style with a shadow effect.</p>
          </Card>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { Button, Card } from '@darthsaul/vue-component-library-ui'

const handleClick = () => {
  console.log('Button clicked!')
}
</script>

<style scoped>
.demo-app {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.demo-header {
  text-align: center;
  margin-bottom: 3rem;
  padding-bottom: 2rem;
  border-bottom: 2px solid #e0e0e0;
}

.demo-header h1 {
  font-size: 2.5rem;
  margin: 0 0 0.5rem 0;
  color: #007bff;
}

.demo-header p {
  font-size: 1.2rem;
  color: #6c757d;
  margin: 0;
}

.demo-section {
  margin-bottom: 3rem;
}

.demo-section h2 {
  font-size: 1.8rem;
  margin-bottom: 1.5rem;
  color: #333;
}

.demo-group {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}
</style>
