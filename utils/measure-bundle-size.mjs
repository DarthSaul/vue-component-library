#!/usr/bin/env node
/**
 * Roxbury consumer bundle-size benchmark.
 *
 * Automates the manual process: "put one component in App.vue, run `vite build`, read the sizes."
 *
 * Run from the fixture app (e.g. analyze/fixtures/bundle-size-spa). For each component the script
 * builds the fixture with ITS OWN vite.config, index.html and main.js, replacing only the
 * contents of src/App.vue in memory (the file on disk is never touched). It then sums every
 * emitted JS and CSS file and reports:
 *   - total: what the browser downloads for that app (all chunks + CSS)
 *   - delta: total minus a baseline build whose App.vue renders nothing
 *
 * Sizes use the same units as Vite's build output: kB = 1000 bytes, gzip at zlib's default level.
 *
 * Each component is measured two ways:
 *   - via the barrel:  import { CnbX } from '@cnodigital/roxbury/ui'
 *   - via the subpath: '@cnodigital/roxbury/<component-name>' (ui/dist/<component-name>/index.mjs)
 * If those diverge, tree-shaking through the barrel is leaking.
 *
 * Usage:
 *   node measure-bundle-size.mjs --label v9-local
 *   node measure-bundle-size.mjs --label v8.0.0 --only button-base,account-card
 */
import { build } from 'vite'
import { gzipSync, brotliCompressSync } from 'node:zlib'
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { parseArgs } from 'node:util'

const { values: args } = parseArgs({
  options: {
    label: { type: 'string', default: 'local' },
    out: { type: 'string', default: 'reports' },
    only: { type: 'string' }, // comma-separated component folder names
    app: { type: 'string', default: 'src/App.vue' }, // the file whose contents get swapped
  },
})

const PKG = '@cnodigital/roxbury'
const ROOT = process.cwd()
const APP_FILE = resolve(ROOT, args.app)

if (!existsSync(APP_FILE)) {
  console.error(`Can't find ${APP_FILE}. Run this from the fixture app, or pass --app.`)
  process.exit(1)
}

// 'account-card' -> 'CnbAccountCard', 'button-base' -> 'CnbButtonBase'.
const toExportName = (dir) =>
  'Cnb' + dir.split(/[-_]/).map((p) => p[0].toUpperCase() + p.slice(1)).join('')

// ---------------------------------------------------------------------------
// Discovery: every ui/dist/<component-name>/index.mjs in the INSTALLED package
// whose derived name is also exported from the barrel.
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
// App.vue variants — exactly what you'd type by hand.
// ---------------------------------------------------------------------------
const baselineApp = `<template><div /></template>\n`

const barrelApp = (name) => `<script setup>
import { ${name} } from '${PKG}/ui'
</script>
<template><${name} /></template>
`

// Works whether the per-component entry uses a named or a default export.
const subpathApp = (name, subpath) => `<script setup>
import * as M from '${PKG}/${subpath}'
const ${name} = M.${name} ?? M.default
</script>
<template><${name} /></template>
`

// Serves the generated source in place of src/App.vue; @vitejs/plugin-vue (from the
// fixture's own config) then compiles it as if it were on disk.
const swapApp = (source) => ({
  name: 'roxbury-size-swap-app',
  enforce: 'pre',
  load(id) {
    if (id.split('?')[0] === APP_FILE && !id.includes('?')) return source
  },
})

// ---------------------------------------------------------------------------
// Build + measure
// ---------------------------------------------------------------------------
const sizesOf = (buf) => ({
  raw: buf.length,
  gzip: gzipSync(buf).length, // zlib default level, same as Vite's report
  brotli: brotliCompressSync(buf).length,
})
const add = (a, b) => ({ raw: a.raw + b.raw, gzip: a.gzip + b.gzip, brotli: a.brotli + b.brotli })
const sub = (a, b) => ({ raw: a.raw - b.raw, gzip: a.gzip - b.gzip, brotli: a.brotli - b.brotli })
const zero = () => ({ raw: 0, gzip: 0, brotli: 0 })

async function measure(appSource) {
  const result = await build({
    root: ROOT, // picks up the fixture's vite.config, index.html and main.js
    mode: 'production',
    logLevel: 'silent',
    plugins: [swapApp(appSource)],
    resolve: { dedupe: ['vue'] },
    build: { write: false, reportCompressedSize: false },
  })

  const totals = { js: zero(), css: zero(), files: [] }
  for (const out of [result].flat()) {
    for (const file of out.output) {
      const kind = file.fileName.endsWith('.css') ? 'css' : /\.m?js$/.test(file.fileName) ? 'js' : null
      if (!kind) continue // html, fonts, images
      const size = sizesOf(Buffer.from(file.type === 'chunk' ? file.code : file.source))
      totals[kind] = add(totals[kind], size)
      totals.files.push({ file: file.fileName, ...size })
    }
  }
  totals.total = add(totals.js, totals.css)
  return totals
}

console.log(`Measuring ${components.length} components from ${PKG}@${pkg.version} (${args.label})`)

const baseline = await measure(baselineApp)
const results = []

for (const { subpath, name } of components) {
  try {
    const viaBarrel = await measure(barrelApp(name))
    const viaSubpath = await measure(subpathApp(name, subpath))
    const delta = {
      js: sub(viaBarrel.js, baseline.js),
      css: sub(viaBarrel.css, baseline.css),
      total: sub(viaBarrel.total, baseline.total),
    }
    const barrelLeakGzip = viaBarrel.js.gzip - viaSubpath.js.gzip
    results.push({ component: name, subpath, delta, viaBarrel, viaSubpath, barrelLeakGzip })
    console.log(
      `  ✓ ${name.padEnd(28)} +${(delta.js.gzip / 1000).toFixed(2)} kB JS gz` +
        `  (app JS ${(viaBarrel.js.gzip / 1000).toFixed(2)} kB)`,
    )
  } catch (err) {
    results.push({ component: name, subpath, error: String(err.message ?? err) })
    console.log(`  ✗ ${name.padEnd(28)} ${err.message}`)
  }
}

// ---------------------------------------------------------------------------
// Reports: JSON (diffing / CI / history, includes per-file sizes) + Markdown (Confluence)
// ---------------------------------------------------------------------------
const report = {
  package: PKG,
  version: pkg.version,
  label: args.label,
  measuredAt: new Date().toISOString(),
  method: "fixture app's own Vite config; src/App.vue swapped per component; all JS + CSS summed",
  units: 'bytes (kB in markdown = 1000 bytes, matching Vite)',
  baseline,
  components: results,
}

const kB = (bytes) => (bytes / 1000).toFixed(2)
const rows = results
  .filter((r) => !r.error)
  .sort((a, b) => b.delta.js.gzip - a.delta.js.gzip)
  .map(
    (r) =>
      `| ${r.component} | **${kB(r.delta.js.gzip)}** | ${kB(r.delta.js.raw)} | ${kB(r.viaBarrel.js.gzip)} | ${Math.abs(r.barrelLeakGzip) > 100 ? `⚠️ +${kB(r.barrelLeakGzip)}` : '—'} |`,
  )

const markdown = `# Roxbury JS bundle cost — ${PKG}@${pkg.version} (${args.label})

Measured ${report.measuredAt}. Each row is the fixture app built with only that component in App.vue.
JavaScript only (all emitted JS chunks summed); CSS is excluded here but recorded in the JSON report.
"Δ" = that build minus a baseline build whose App.vue renders nothing. kB = 1000 bytes.

Baseline app JS: ${kB(baseline.js.gzip)} kB gzip

| Component | Δ JS gzip (kB) | Δ JS minified (kB) | App JS gzip (kB) | Barrel vs subpath (JS) |
|---|---|---|---|---|
${rows.join('\n')}
`

await mkdir(args.out, { recursive: true })
const stem = `bundle-size-${pkg.version}-${args.label}-${report.measuredAt.slice(0, 10)}`
await writeFile(join(args.out, `${stem}.json`), JSON.stringify(report, null, 2))
await writeFile(join(args.out, `${stem}.md`), markdown)
console.log(`\nWrote ${args.out}/${stem}.json and .md`)
