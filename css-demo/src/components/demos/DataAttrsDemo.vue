<script setup>
// Demo 3 — Stable selector contract via data attributes
</script>

<template>
  <div class="section">
    <div class="section__header">
      <span class="tag tag--solution">Solution 3</span>
      <h2>Stable Selector Contract via Data Attributes</h2>
      <p>
        Class names are internal implementation details — they can be renamed, scoped, or
        hashed. Data attributes like <code>data-rxb="button"</code> are the library's
        <em>public selector API</em>. The library commits never to change them without a
        major version bump. Consumers who target data attributes are insulated from class
        renames and refactors.
      </p>
    </div>

    <div class="section__body">
      <div class="panel-row">
        <div class="panel">
          <div class="panel__label">Library component template</div>
          <div class="panel__code">
            <pre><code>&lt;!-- Button.vue --&gt;
&lt;template&gt;
  &lt;button
    class="rxb-btn"
    data-rxb="button"
    :data-rxb-variant="variant"
    :data-rxb-size="size"
    v-bind="$attrs"
  &gt;
    &lt;slot /&gt;
  &lt;/button&gt;
&lt;/template&gt;

&lt;!-- The class "rxb-btn" is internal.
     data-rxb="button" is the public API.
     Both exist today; only the data
     attribute is a stability promise. --&gt;</code></pre>
          </div>
        </div>
        <div class="panel">
          <div class="panel__label">Consumer override (targets data attributes)</div>
          <div class="panel__code">
            <pre><code>/* consumer app.css */
/* Targets the stable public API */
.page-actions [data-rxb="button"] {
  background: #dc2626;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  font-size: 0.8rem;
}

/* Variant-specific override */
.page-actions [data-rxb="button"]
             [data-rxb-variant="primary"] {
  background: #dc2626;
}

/* Even if the library renames .rxb-btn
   to .rxb-button or adds CSS Modules,
   this override survives. */</code></pre>
          </div>
        </div>
      </div>

      <div class="result-row">
        <div class="result-row__label">Live result — buttons with data attributes</div>
        <div class="result-row__preview">
          <button class="rxb-btn-da" data-rxb="button" data-rxb-variant="primary">Primary</button>
          <button class="rxb-btn-da" data-rxb="button" data-rxb-variant="secondary">Secondary</button>
          <button class="rxb-btn-da" data-rxb="button" data-rxb-variant="tertiary">Tertiary</button>
        </div>
      </div>

      <div class="result-row">
        <div class="result-row__label">Live result — consumer targets [data-rxb="button"] in scope</div>
        <div class="result-row__preview da-page-actions">
          <button class="rxb-btn-da" data-rxb="button" data-rxb-variant="primary">Save Draft</button>
          <button class="rxb-btn-da" data-rxb="button" data-rxb-variant="secondary">Discard</button>
        </div>
      </div>

      <div class="note">
        <strong>What to commit to:</strong> The presence and values of
        <code>data-rxb</code> and <code>data-rxb-variant</code> are part of the
        component's public API. Document them alongside props. Removing an attribute or
        changing its values is a breaking change. Adding new attributes is non-breaking.
      </div>
    </div>
  </div>
</template>

<style scoped>
.rxb-btn-da {
  background: #007bff;
  color: white;
  padding: 8px 16px;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  font-size: 0.9rem;
  transition: filter 0.15s;
}
.rxb-btn-da:hover { filter: brightness(0.88); }

.rxb-btn-da[data-rxb-variant="secondary"] {
  background: #6c757d;
}
.rxb-btn-da[data-rxb-variant="tertiary"] {
  background: transparent;
  color: #007bff;
  border: 1px solid #007bff;
}
</style>

<style>
/* Consumer override targeting data attributes — non-scoped to show real behavior */
.da-page-actions [data-rxb="button"] {
  background: #dc2626;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  font-size: 0.78rem;
}
</style>
