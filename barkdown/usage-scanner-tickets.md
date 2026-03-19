# Component Usage Scanner — Jira Tickets

---

## Epic: Component Usage Tracking

**Epic Name:** Component Adoption Tracking & Usage Analytics

**Summary:** Build a standalone CLI tool and supporting infrastructure to track component library adoption across the organization's consuming repositories, enabling both point-in-time snapshots and historical trend analysis.

**Business Value:**
The design system team currently has no visibility into how components are adopted across the organization. This makes it difficult to prioritize component improvements, identify under-adopted components, justify investment in the design system, and measure the impact of migration efforts (e.g., the Common Controls consolidation). A usage scanner solves this by providing concrete adoption data.

**Scope:**

- A Node.js CLI tool (housed in its own repo) that scans a given codebase and produces structured JSON reporting which `@pvt-scope/package-name` components are imported and where.
- AST-based parsing of `.vue`, `.js`, and `.ts` files for accurate detection — no regex.
- Designed to be extensible to other `@pvt-scope/*` packages in the future.
- A scheduled automation pipeline (GitHub Actions) that runs the scanner against known consuming repos on a cadence and persists results for trend tracking.
- A lightweight dashboard or integration into a docs SPA for visualizing adoption data.

**Out of Scope (for now):**

- Tracking component usage via runtime telemetry or analytics events.
- Scanning for non-import usage patterns (e.g., globally registered components, dynamic imports).
- Auto-discovery of consuming repos (manual configuration to start).

**Acceptance Criteria:**

- [ ] CLI tool can scan a target repository and produce a JSON report of component usage.
- [ ] Report includes: component name, import count, file paths, and repo identifier.
- [ ] Scanner handles standard import patterns: named imports, renamed imports, and deep path imports from `@pvt-scope/package-name`.
- [ ] Tool is packaged in its own repository under `@pvt-scope/`.
- [ ] Automated pipeline runs on a schedule and persists historical results.
- [ ] Team can view usage data (snapshot + trends) through a dashboard or report.

---

## IP Sprint Story: Scanner CLI Proof of Concept

**Story Title:** [IP][Spike] Build core library usage scanner CLI

**Type:** Spike / Proof of Concept

**Sprint:** Innovation & Planning (PI [X] IP Sprint)

**Parent Epic:** Component Adoption Tracking & Usage Analytics

**Summary:** Build and validate the core scanning engine that can parse a target repository's source files and produce an accurate JSON report of `@pvt-scope/package-name` component imports. This is the foundational piece that all future automation and dashboarding depends on.

**Context:**
This is an IP sprint spike. The goal is to prove out the AST-based scanning approach, validate its accuracy against a known consuming repo, and establish the project's repo and tooling foundation. There is no expectation of production polish — the focus is on correctness of detection and a solid architectural starting point.

**Approach:**

- Initialize a new repository (e.g., `lib-usage-scanner`) with a Node.js project.
- Use `@vue/compiler-sfc` to parse `.vue` Single File Components and extract `<script>` blocks.
- Use `@babel/parser` + `@babel/traverse` to walk the AST of script content and standalone `.js`/`.ts` files, identifying `ImportDeclaration` nodes where the source matches the target package.
- Use `@vue/compiler-dom` to parse `<template>` blocks into a template AST, then walk it to find component tag usage (mapping PascalCase component names to their kebab-case template equivalents and vice versa).
- Output a structured JSON report.

**Acceptance Criteria:**

- [ ] New repo created and scaffolded with ESM, linting, and a clear project structure.
- [ ] CLI accepts a `--target` (repo path) and `--package` (npm package name, defaulting to `@pvt-scope/package-name`) argument.
- [ ] Scanner correctly identifies named imports (e.g., `import { Button, Input } from '@pvt-scope/package-name'`).
- [ ] Scanner correctly identifies renamed imports (e.g., `import { Button as PreButton } from '@pvt-scope/package-name'`).
- [ ] Scanner correctly identifies deep/path imports if applicable (e.g., `import Button from '@pvt-scope/package-name/components/Button'`).
- [ ] Scanner parses `.vue` file `<script>` and `<script setup>` blocks.
- [ ] Scanner parses `.js` and `.ts` files.
- [ ] Output is a JSON file with structure: `{ repoName, scannedAt, components: { [name]: { count, files: [] } } }`.
- [ ] Tool has been validated against at least one real consuming repo with results manually verified.

**Out of Scope for this story:**

- Template AST scanning (detecting `<Button>` / `<r-button>` usage in templates). This is a follow-up enhancement.
- Scheduled automation / GitHub Actions pipeline.
- Dashboard or visualization.
- npm publishing of the tool.

**Story Points:** [Team to estimate]

**Notes:**

- Template scanning is intentionally deferred. Import-based detection alone gives us the core data. Template scanning adds accuracy (catching components that are imported but used under different names, or registered locally) and can be layered on in a follow-up story.
- The `--package` flag is included from the start so the tool is immediately usable for scanning another package or any other `@pvt-scope/*` package without code changes.
