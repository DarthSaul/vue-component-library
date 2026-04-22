<script setup>
import ProblemDemo from './components/demos/ProblemDemo.vue'
import CssVarsDemo from './components/demos/CssVarsDemo.vue'
import CascadeLayersDemo from './components/demos/CascadeLayersDemo.vue'
import DataAttrsDemo from './components/demos/DataAttrsDemo.vue'
import CombinedDemo from './components/demos/CombinedDemo.vue'
</script>

<template>
  <div>
    <div class="intro">
      <h1>CSS Customization Patterns for Design Systems</h1>
      <p>
        When consuming apps write custom CSS that targets a design system's internal class
        names, minor library updates can silently break their overrides. This demo walks
        through three patterns — CSS custom properties, cascade layers, and data attributes
        — that give consumers a <strong>stable, explicit customization API</strong> while
        preserving your freedom to refactor internals.
      </p>
      <p style="margin-bottom: 0;">
        Each section shows live button examples alongside the CSS that produces them,
        so you can see exactly what each pattern does and why.
      </p>
    </div>

    <ProblemDemo />
    <CssVarsDemo />
    <CascadeLayersDemo />
    <DataAttrsDemo />
    <CombinedDemo />
  </div>
</template>
