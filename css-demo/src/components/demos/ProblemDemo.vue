<script setup>
// Nothing — this demo is pure CSS to illustrate the problem.
</script>

<template>
  <div class="section">
    <div class="section__header">
      <span class="tag tag--problem">The Problem</span>
      <h2>Consumer CSS Coupled to Library Internals</h2>
      <p>
        A consumer targets <code>.rxb-btn</code> or inner class names to override styles.
        When the library ships a minor update — renaming a class, adding a wrapper element,
        adjusting specificity — their overrides silently break.
      </p>
    </div>

    <div class="section__body">
      <div class="panel-row">
        <div class="panel">
          <div class="panel__label">Library styles (v1)</div>
          <div class="panel__code">
            <pre><code>/* design-system.css */
.rxb-btn {
  background: #007bff;
  color: white;
  padding: 8px 16px;
  border-radius: 4px;
  border: none;
  cursor: pointer;
}</code></pre>
          </div>
        </div>
        <div class="panel">
          <div class="panel__label">Consumer override</div>
          <div class="panel__code">
            <pre><code>/* consumer app.css */
/* Targets library internals directly */
.page-actions .rxb-btn {
  background: #8b5cf6;
  border-radius: 20px;
}</code></pre>
          </div>
        </div>
      </div>

      <div class="result-row">
        <div class="result-row__label">Live result — consumer override works in v1</div>
        <div class="result-row__preview problem-preview-v1">
          <button class="rxb-btn-v1 page-action-v1">Save Draft</button>
          <button class="rxb-btn-v1 page-action-v1">Publish</button>
        </div>
      </div>

      <div class="panel-row">
        <div class="panel">
          <div class="panel__label">Library styles (v1.1 minor update)</div>
          <div class="panel__code">
            <pre><code>/* design-system.css — minor release */
/* Added a wrapper for loading state: */
.rxb-btn {
  background: #007bff;
  color: white;
  padding: 0;        /* padding moved inward */
  border-radius: 4px;
  border: none;
  cursor: pointer;
}
.rxb-btn__inner {   /* NEW inner element */
  padding: 8px 16px;
  display: flex;
  align-items: center;
  gap: 6px;
}</code></pre>
          </div>
        </div>
        <div class="panel">
          <div class="panel__label">Consumer override (unchanged)</div>
          <div class="panel__code">
            <pre><code>/* consumer app.css — not changed */
.page-actions .rxb-btn {
  background: #8b5cf6;
  border-radius: 20px;
}

/* The consumer's purple override still
   works, but border-radius no longer
   rounds correctly because the visual
   "pill" shape is broken by the new
   inner padding model. */</code></pre>
          </div>
        </div>
      </div>

      <div class="result-row">
        <div class="result-row__label">Live result — override partially breaks in v1.1</div>
        <div class="result-row__preview problem-preview-v2">
          <div class="rxb-btn-v2 page-action-v2">
            <span class="rxb-btn-v2__inner">Save Draft</span>
          </div>
          <div class="rxb-btn-v2 page-action-v2">
            <span class="rxb-btn-v2__inner">Publish</span>
          </div>
        </div>
      </div>

      <div class="note">
        <strong>Why this happens:</strong> The consumer's <code>border-radius: 20px</code>
        now applies to the outer wrapper, but the pill shape depends on the inner element's
        layout — a coupling the library never advertised but the consumer depended on anyway.
        No API contract was broken, but the UI regressed.
      </div>
    </div>
  </div>
</template>

<style scoped>
/* v1 button */
.rxb-btn-v1 {
  background: #007bff;
  color: white;
  padding: 8px 16px;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  font-size: 0.9rem;
}
.page-action-v1 {
  background: #8b5cf6;
  border-radius: 20px;
}

/* v1.1 button */
.rxb-btn-v2 {
  display: inline-block;
  background: #007bff;
  color: white;
  padding: 0;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  font-size: 0.9rem;
}
.rxb-btn-v2__inner {
  padding: 8px 16px;
  display: flex;
  align-items: center;
  gap: 6px;
}
/* Consumer override — unchanged from v1 */
.page-action-v2 {
  background: #8b5cf6;
  border-radius: 20px; /* no longer produces a pill — wrapper vs inner mismatch */
}
</style>
