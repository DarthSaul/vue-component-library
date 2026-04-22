<script setup>
// Demo 2 — CSS Cascade Layers (@layer)
</script>

<template>
  <div class="section">
    <div class="section__header">
      <span class="tag tag--solution">Solution 2</span>
      <h2>CSS Cascade Layers (<code>@layer</code>)</h2>
      <p>
        All library styles are declared inside a named layer. Any <em>unlayered</em> CSS in a
        consuming app automatically wins the cascade — regardless of specificity. Consumers
        never need <code>!important</code>, and new rules added inside the library layer
        cannot accidentally override consumer styles.
      </p>
    </div>

    <div class="section__body">
      <div class="panel-row">
        <div class="panel">
          <div class="panel__label">Library styles (wrapped in @layer)</div>
          <div class="panel__code">
            <pre><code>/* design-system.css */
@layer roxbury {
  .rxb-btn {
    background: #007bff;
    color: white;
    padding: 8px 16px;
    border-radius: 4px;
    border: none;
    cursor: pointer;
  }

  /* Any new rules added in minor releases
     stay inside the layer and can never
     beat the consumer's unlayered CSS. */
  .rxb-btn:focus-visible {
    outline: 2px solid #007bff;
    outline-offset: 2px;
  }
}</code></pre>
          </div>
        </div>
        <div class="panel">
          <div class="panel__label">Consumer override (unlayered — always wins)</div>
          <div class="panel__code">
            <pre><code>/* consumer app.css — no @layer needed */
.page-actions .rxb-btn {
  background: #059669;
  border-radius: 20px;
}

/* This wins over @layer roxbury regardless
   of selector specificity, because unlayered
   styles have higher implicit priority than
   any named layer.

   Even if the library later adds a more
   specific rule inside @layer roxbury,
   this override is safe. */</code></pre>
          </div>
        </div>
      </div>

      <div class="result-row">
        <div class="result-row__label">Live result — default layered button</div>
        <div class="result-row__preview">
          <button class="rxb-btn-layered">Default</button>
          <button class="rxb-btn-layered rxb-btn-layered--secondary">Secondary</button>
        </div>
      </div>

      <div class="result-row">
        <div class="result-row__label">Live result — unlayered consumer override wins</div>
        <div class="result-row__preview layered-page-actions">
          <button class="rxb-btn-layered">Save Draft</button>
          <button class="rxb-btn-layered">Publish</button>
        </div>
      </div>

      <div class="panel-row">
        <div class="panel">
          <div class="panel__label">Specificity battle — WITHOUT @layer</div>
          <div class="panel__code">
            <pre><code>/* Library ships a more specific rule in v1.1: */
.rxb-theme-light .rxb-btn {  /* higher specificity */
  background: #0056b3;
}

/* Consumer had: */
.page-actions .rxb-btn { background: green; }

/* Both have specificity (0,2,0).
   Source order decides — library loaded
   last, so library wins. Consumer must
   add !important or increase specificity. */</code></pre>
          </div>
        </div>
        <div class="panel">
          <div class="panel__label">Specificity battle — WITH @layer</div>
          <div class="panel__code">
            <pre><code>/* Library ships the same rule inside layer: */
@layer roxbury {
  .rxb-theme-light .rxb-btn {
    background: #0056b3;  /* higher specificity */
  }
}

/* Consumer's unlayered rule: */
.page-actions .rxb-btn { background: green; }

/* Consumer wins — always.
   Unlayered styles beat layered styles
   regardless of specificity or source
   order. No !important needed. */</code></pre>
          </div>
        </div>
      </div>

      <div class="note">
        <strong>Migration:</strong> Wrapping existing output in
        <code>@layer roxbury &#123; … &#125;</code> is safe in a minor release.
        Layered styles have <em>lower</em> cascade priority than unlayered styles,
        so existing consumer overrides will continue to work — they'll actually win
        more consistently than before.
      </div>
    </div>
  </div>
</template>

<style>
/* @layer must be in non-scoped style to demonstrate the real cascade */
@layer roxbury-demo {
  .rxb-btn-layered {
    background: #007bff;
    color: white;
    padding: 8px 16px;
    border-radius: 4px;
    border: none;
    cursor: pointer;
    font-size: 0.9rem;
    transition: filter 0.15s;
  }
  .rxb-btn-layered:hover {
    filter: brightness(0.88);
  }
  .rxb-btn-layered--secondary {
    background: #6c757d;
  }
}

/* Consumer unlayered override — always wins */
.layered-page-actions .rxb-btn-layered {
  background: #059669;
  border-radius: 20px;
}
</style>
