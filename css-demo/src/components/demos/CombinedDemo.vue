<script setup>
// Demo 4 — All three patterns combined: the recommended approach
</script>

<template>
  <div class="section">
    <div class="section__header">
      <span class="tag tag--combined">Recommended</span>
      <h2>All Three Patterns Together</h2>
      <p>
        CSS custom properties, cascade layers, and data attributes are complementary —
        each solves a different layer of the problem. In production, use all three.
      </p>
    </div>

    <div class="section__body">
      <div class="panel-row">
        <div class="panel">
          <div class="panel__label">Library — component template</div>
          <div class="panel__code">
            <pre><code>&lt;!-- Button.vue --&gt;
&lt;template&gt;
  &lt;button
    class="rxb-btn"
    data-rxb="button"
    :data-rxb-variant="variant"
  &gt;
    &lt;slot /&gt;
  &lt;/button&gt;
&lt;/template&gt;</code></pre>
          </div>
        </div>
        <div class="panel">
          <div class="panel__label">Library — stylesheet</div>
          <div class="panel__code">
            <pre><code>/* design-system.css */
@layer roxbury {
  [data-rxb="button"] {
    --rxb-btn-bg:        #007bff;
    --rxb-btn-color:     white;
    --rxb-btn-radius:    4px;
    --rxb-btn-padding-x: 16px;
    --rxb-btn-padding-y: 8px;

    background:    var(--rxb-btn-bg);
    color:         var(--rxb-btn-color);
    border-radius: var(--rxb-btn-radius);
    padding: var(--rxb-btn-padding-y)
             var(--rxb-btn-padding-x);
    border: none;
    cursor: pointer;
  }
}</code></pre>
          </div>
        </div>
      </div>

      <div class="panel-row">
        <div class="panel">
          <div class="panel__label">Consumer — scoped variable override</div>
          <div class="panel__code">
            <pre><code>/* consumer app.css */
/* Option A: variable override (best for
   theming — survives any markup change) */
.page-actions {
  --rxb-btn-bg:     #7c3aed;
  --rxb-btn-radius: 20px;
}</code></pre>
          </div>
        </div>
        <div class="panel">
          <div class="panel__label">Consumer — stable selector override</div>
          <div class="panel__code">
            <pre><code">/* Option B: data-attribute selector
   (use when variables aren't enough —
   still safe because it's the public API
   and wins over the @layer) */
.page-actions [data-rxb="button"] {
  border: 2px dashed #7c3aed;
  background: transparent;
  color: #7c3aed;
}</code></pre>
          </div>
        </div>
      </div>

      <div class="result-row">
        <div class="result-row__label">Live result — default</div>
        <div class="result-row__preview">
          <button class="rxb-btn-combined" data-rxb="button" data-rxb-variant="primary">Primary</button>
          <button class="rxb-btn-combined" data-rxb="button" data-rxb-variant="secondary">Secondary</button>
        </div>
      </div>

      <div class="result-row">
        <div class="result-row__label">Live result — variable override (Option A)</div>
        <div class="result-row__preview combined-vars-override">
          <button class="rxb-btn-combined" data-rxb="button">Save Draft</button>
          <button class="rxb-btn-combined" data-rxb="button">Publish</button>
        </div>
      </div>

      <div class="result-row">
        <div class="result-row__label">Live result — selector override (Option B)</div>
        <div class="result-row__preview combined-selector-override">
          <button class="rxb-btn-combined" data-rxb="button">Save Draft</button>
          <button class="rxb-btn-combined" data-rxb="button">Publish</button>
        </div>
      </div>

      <div class="note">
        <strong>Summary:</strong>
        <strong>Custom properties</strong> give consumers a variable-level contract for
        theming. <strong>Cascade layers</strong> structurally prevent library updates from
        clobbering consumer overrides. <strong>Data attributes</strong> provide a stable
        selector surface that survives internal refactors. Together they let you tell
        consuming teams: <em>"Override the variables for theming; target data attributes for
        structural changes. We'll never break either in a minor release."</em>
      </div>
    </div>
  </div>
</template>

<style>
@layer roxbury-combined {
  [data-rxb="button"].rxb-btn-combined {
    --rxb-btn-bg:        #007bff;
    --rxb-btn-color:     white;
    --rxb-btn-radius:    4px;
    --rxb-btn-padding-x: 16px;
    --rxb-btn-padding-y: 8px;
    --rxb-btn-font-size: 0.9rem;

    background:    var(--rxb-btn-bg);
    color:         var(--rxb-btn-color);
    border-radius: var(--rxb-btn-radius);
    padding:       var(--rxb-btn-padding-y) var(--rxb-btn-padding-x);
    font-size:     var(--rxb-btn-font-size);
    border: none;
    cursor: pointer;
    transition: filter 0.15s;
  }
  [data-rxb="button"].rxb-btn-combined:hover {
    filter: brightness(0.88);
  }
  [data-rxb-variant="secondary"].rxb-btn-combined {
    --rxb-btn-bg:    #6c757d;
    --rxb-btn-color: white;
  }
}

/* Option A — variable override, unlayered beats the @layer */
.combined-vars-override {
  --rxb-btn-bg:     #7c3aed;
  --rxb-btn-radius: 20px;
}

/* Option B — data-attribute selector override */
.combined-selector-override [data-rxb="button"] {
  background: transparent;
  color: #7c3aed;
  border: 2px dashed #7c3aed;
  border-radius: 20px;
}
</style>
