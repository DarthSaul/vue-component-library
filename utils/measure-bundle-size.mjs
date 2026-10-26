#!/usr/bin/env node
/**
 * Roxbury consumer bundle-size benchmark.
 *
 * For each component, builds a minimal production app ("empty App.vue that renders one
 * component") with the same bundler consumers use (Vite 8 / Rolldown + @vitejs/plugin-vue),
 * and reports the size DELTA over a baseline app that renders nothing.
 *
 * Each component is measured two ways:
 *   - via the barrel:   import { CnbX } from '@cnodigital/roxbury/ui'
 *   - via the subpath:  '@cnodigital/roxbury/<component-name>' (ui/dist/<component-name>/index.mjs)
 * If those two numbers diverge, tree-shaking through the barrel is leaking (sideEffects,
 * top-level code, shared chunk wiring) — that's a bug worth catching.
 *
 * Run from a consumer-like fixture (e.g. analyze/) that has @cnodigital/roxbury installed
 * from a packed tarball or the registry — never from workspace source — so the exports map,
 * sideEffects flag and dist output are exactly what app teams get.
 *
 * Usage:
 *   node measure-bundle-size.mjs --label v9.0.0-local
 *   node measure-bundle-size.mjs --label v8.0.0 --only autocomplete,input
 */
import { build } from 'vite'
import vue from '@vitejs/plugin-vue'
import { gzipSync, brotliCompressSync, constants as zlib } from 'node:zlib'
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { parseArgs } from 'node:util'

const { values: args } = parseArgs({
  options: {
    label: { type: 'string', default: 'local' },
    out: { type: 'string', default: 'reports' },
    only: { type: 'string' }, // comma-separated subpaths
  },
})

// ---------------------------------------------------------------------------
// Config — adjust to match Roxbury's actual export shape
// ---------------------------------------------------------------------------
const PKG = '@cnodigital/roxbury'
const ROOT = process.cwd()

// Core.min.css is mandatory for every consumer, so it belongs in the baseline,
// not in any one component's delta. Point this at the real CSS export.
const CORE_CSS_IMPORT = `import '${PKG}/css/Core.min.css'`

// 'account-card' -> 'CnbAccountCard', 'input-base' -> 'CnbInputBase'.
const toExportName = (dir) =>
  'Cnb' + dir.split(/[-_]/).map((p) => p[0].toUpperCase() + p.slice(1)).join('')

// ---------------------------------------------------------------------------
// Discovery: every ui/dist/<component-name>/index.mjs in the INSTALLED package
// whose derived name (CnbXxx) is also exported from the barrel. The barrel check
// filters out non-component dist folders (shared chunks, composables, utils) and
// reports any component folder the barrel forgot to export.
// ---------------------------------------------------------------------------
const PKG_DIR = join(ROOT, 'node_modules', PKG)
const DIST_DIR = join(PKG_DIR, 'ui', 'dist')
const pkg = JSON.parse(await readFile(join(PKG_DIR, 'package.json'), 'utf8'))
const barrelSource = await readFile(join(DIST_DIR, 'index.mjs'), 'utf8')
const onlyList = args.only?.split(',').map((s) => s.trim())

const candidateDirs = (await readdir(DIST_DIR, { withFileTypes: true }))
  .filter((d) => d.isDirectory() && existsSync(join(DIST_DIR, d.name, 'index.mjs')))
  .map((d) => d.name)

const components = []
for (const dir of candidateDirs) {
  if (onlyList && !onlyList.includes(dir)) continue
  const name = toExportName(dir)
  if (new RegExp(`\\b${name}\\b`).test(barrelSource)) components.push({ subpath: dir, name })
  else console.warn(`  · skipping ui/dist/${dir}/ — ${name} not found in barrel`)
}

// ---------------------------------------------------------------------------
// Build + measure
// ---------------------------------------------------------------------------
const appSource = (importLine, componentName) => `
import { createApp, h } from 'vue'
${CORE_CSS_IMPORT}
${importLine}
createApp({ render: () => ${componentName ? `h(${componentName})` : 'null'} }).mount('#app')
`

const virtualEntry = (code) => ({
  name: 'roxbury-size-virtual-entry',
  resolveId: (id) => (id === 'virtual:entry' ? '\0virtual:entry' : null),
  load: (id) => (id === '\0virtual:entry' ? code : null),
})

const sizesOf = (buf) => ({
  raw: buf.length,
  gzip: gzipSync(buf, { level: 9 }).length,
  brotli: brotliCompressSync(buf, { params: { [zlib.BROTLI_PARAM_QUALITY]: 11 } }).length,
})

const add = (a, b) => ({ raw: a.raw + b.raw, gzip: a.gzip + b.gzip, brotli: a.brotli + b.brotli })
const sub = (a, b) => ({ raw: a.raw - b.raw, gzip: a.gzip - b.gzip, brotli: a.brotli - b.brotli })
const zero = () => ({ raw: 0, gzip: 0, brotli: 0 })

async function measure(code) {
  const result = await build({
    configFile: false,
    root: ROOT,
    mode: 'production',
    logLevel: 'silent',
    plugins: [vue(), virtualEntry(code)],
    build: {
      write: false,
      modulePreload: false,
      reportCompressedSize: false,
      rolldownOptions: { input: 'virtual:entry' },
    },
  })

  const totals = { js: zero(), css: zero() }
  for (const out of [result].flat()) {
    for (const file of out.output) {
      const kind = file.fileName.endsWith('.css') ? 'css' : file.fileName.endsWith('.js') ? 'js' : null
      if (!kind) continue // fonts/images are fetched lazily; track them separately if needed
      const content = file.type === 'chunk' ? file.code : file.source
      totals[kind] = add(totals[kind], sizesOf(Buffer.from(content)))
    }
  }
  totals.total = add(totals.js, totals.css)
  return totals
}

console.log(`Measuring ${components.length} components from ${PKG}@${pkg.version} (${args.label})`)

const baseline = await measure(appSource('', null))
const results = []

for (const { subpath, name } of components) {
  try {
    const viaBarrel = await measure(appSource(`import { ${name} } from '${PKG}/ui'`, name))
    // Works whether the per-component entry uses a named or a default export;
    // static member access on a namespace import still tree-shakes.
    const viaSubpath = await measure(
      appSource(`import * as M from '${PKG}/${subpath}'\nconst ${name} = M.${name} ?? M.default`, name),
    )
    const delta = {
      js: sub(viaBarrel.js, baseline.js),
      css: sub(viaBarrel.css, baseline.css),
      total: sub(viaBarrel.total, baseline.total),
    }
    const barrelLeak = viaBarrel.total.gzip - viaSubpath.total.gzip
    results.push({ component: name, subpath, delta, viaBarrel, viaSubpath, barrelLeakGzip: barrelLeak })
    console.log(`  ✓ ${name.padEnd(28)} +${(delta.total.gzip / 1024).toFixed(2)} KB gz`)
  } catch (err) {
    results.push({ component: name, subpath, error: String(err.message ?? err) })
    console.log(`  ✗ ${name.padEnd(28)} ${err.message}`)
  }
}

// ---------------------------------------------------------------------------
// Reports: JSON (for diffing / CI / history) + Markdown (for Confluence)
// ---------------------------------------------------------------------------
const report = {
  package: PKG,
  version: pkg.version,
  label: args.label,
  measuredAt: new Date().toISOString(),
  bundler: 'vite (rolldown) + @vitejs/plugin-vue, production mode',
  baseline,
  components: results,
}

const kb = (bytes) => (bytes / 1024).toFixed(2)
const rows = results
  .filter((r) => !r.error)
  .sort((a, b) => b.delta.total.gzip - a.delta.total.gzip)
  .map((r) =>
    `| ${r.component} | ${kb(r.delta.js.gzip)} | ${kb(r.delta.css.gzip)} | **${kb(r.delta.total.gzip)}** | ${kb(r.delta.total.brotli)} | ${kb(r.viaBarrel.total.gzip)} | ${Math.abs(r.barrelLeakGzip) > 100 ? `⚠️ ${kb(r.barrelLeakGzip)}` : '—'} |`,
  )

const markdown = `# Roxbury bundle cost — ${PKG}@${pkg.version} (${args.label})

Measured ${report.measuredAt}. Minimal production app rendering one component, built with ${report.bundler}.
"Delta" = app size minus a baseline app (Vue + Core.min.css, renders nothing).

Baseline: ${kb(baseline.total.gzip)} KB gzip (${kb(baseline.js.gzip)} JS + ${kb(baseline.css.gzip)} CSS)

| Component | Δ JS gz (KB) | Δ CSS gz (KB) | Δ Total gz (KB) | Δ Total br (KB) | Full app gz (KB) | Barrel vs subpath |
|---|---|---|---|---|---|---|
${rows.join('\n')}
`

await mkdir(args.out, { recursive: true })
const stem = `bundle-size-${pkg.version}-${args.label}-${report.measuredAt.slice(0, 10)}`
await writeFile(join(args.out, `${stem}.json`), JSON.stringify(report, null, 2))
await writeFile(join(args.out, `${stem}.md`), markdown)
console.log(`\nWrote ${args.out}/${stem}.json and .md`)
