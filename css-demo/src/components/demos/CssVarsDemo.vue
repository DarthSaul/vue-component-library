<script setup>
// Demo 1 — CSS Custom Properties as the formal customization API
</script>

<template>
  <div class="section">
    <div class="section__header">
      <span class="tag tag--solution">Solution 1</span>
      <h2>CSS Custom Properties as a Formal API</h2>
      <p>
        Every visual property a consumer might want to override is exposed as a namespaced
        CSS variable on the component root. Consumers set the variable — never the implementation
        selector. Internal markup changes leave the override untouched.
      </p>
    </div>

    <div class="section__body">
      <div class="panel-row">
        <div class="panel">
          <div class="panel__label">Library styles</div>
          <div class="panel__code">
            <pre><code>/* design-system.css */
.rxb-btn {
  /* --- Public CSS API --- */
  --rxb-btn-bg:        #007bff;
  --rxb-btn-color:     white;
  --rxb-btn-radius:    4px;
  --rxb-btn-padding-x: 16px;
  --rxb-btn-padding-y: 8px;
  --rxb-btn-font-size: 0.9rem;

  /* --- Implementation uses the vars --- */
  background:    var(--rxb-btn-bg);
  color:         var(--rxb-btn-color);
  border-radius: var(--rxb-btn-radius);
  padding:       var(--rxb-btn-padding-y)
                 var(--rxb-btn-padding-x);
  font-size:     var(--rxb-btn-font-size);
  border: none;
  cursor: pointer;
}</code></pre>
          </div>
        </div>
        <div class="panel">
          <div class="panel__label">Consumer override</div>
          <div class="panel__code">
            <pre><code>/* consumer app.css */
/* Override the variable, not the class */
.page-actions {
  --rxb-btn-bg:     #8b5cf6;
  --rxb-btn-radius: 20px;
}

/* If the library later adds an inner
   wrapper, wraps in a flex container,
   or renames internal classes, this
   override still works — it's bound to
   the variable contract, not markup. */</code></pre>
          </div>
        </div>
      </div>

      <div class="result-row">
        <div class="result-row__label">Live result — default library button</div>
        <div class="result-row__preview">
          <button class="rxb-btn-vars">Default</button>
          <button class="rxb-btn-vars rxb-btn-vars--secondary">Secondary</button>
        </div>
      </div>

      <div class="result-row">
        <div class="result-row__label">Live result — consumer overrides vars in .page-actions scope</div>
        <div class="result-row__preview page-actions-scope">
          <button class="rxb-btn-vars">Save Draft</button>
          <button class="rxb-btn-vars">Publish</button>
        </div>
      </div>

      <div class="note">
        <strong>Versioning rule:</strong> Removing or renaming a CSS variable
        (<code>--rxb-btn-bg</code> → <code>--rxb-btn-background</code>) is a
        <em>breaking change</em> and requires a major bump. Adding a new variable
        is always non-breaking. Document the variable list alongside props in your
        component API reference.
      </div>
    </div>
  </div>
</template>

<style scoped>
.rxb-btn-vars {
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
.rxb-btn-vars:hover { filter: brightness(0.88); }

.rxb-btn-vars--secondary {
  --rxb-btn-bg:    #6c757d;
  --rxb-btn-color: white;
}

/* Consumer scope override — variables only */
.page-actions-scope {
  --rxb-btn-bg:     #8b5cf6;
  --rxb-btn-radius: 20px;
}
</style>
