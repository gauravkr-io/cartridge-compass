# Changelog

All notable changes to this kit. Versions follow [semantic versioning](docs/UPGRADING.md). Each release states whether setup must be rerun, whether project configuration changed, and whether agent behavior changed.

## 1.0.0 (2026-09-26)

First public release, under the name **Cartridge Compass** (previously developed as sfcc-claude-kit). Rerun setup: **yes**. Configuration migration: **automatic from 0.1**. Agent behavior: **changed** (see "Corrected").

### Added

- Command line `bin/sfcc-kit.mjs` with `setup`, `sync`, `detect`, `doctor`, `uninstall` and `protect-repos`. No dependencies, Node.js 18.17 or newer.
- Repository mapping `docs/ai/repositories.md`, optional and authoritative over detection.
- Evidence-based architecture detection with confidence for SFRA, SGJC, pipelines, classic controllers, SCAPI custom APIs, API hooks, OCAPI and SCAPI clients, PWA Kit, Storefront Next, other headless storefronts, integrations and BM extensions.
- Generated `docs/ai/generated/project-context.md` and `.json` with explicit "not configured" states.
- Idempotent, upgrade-safe setup: managed `CLAUDE.md` block, additive settings merge, hash-tracked managed rules, backups, refusal of Git roots and symbolic links.
- Modular knowledge base under `knowledge/` with a routing index, source registry, discrepancies and open questions.
- Permissions: approval for `b2c scapi replications`, `am`, `bm`, `cap install/uninstall`, `setup instance`, `setup default-config`, the B2C MCP tools `cartridge_deploy`, `webdav_put`, `scapi_execute`, `mrt_bundle_push` and debugger tools, and edits to base SFRA and `modules`. Deny `b2c auth token`, `b2c auth client`, `*.pfx` and `*.jks`.
- Inventory: classic `.public` routes, routes and services with computed names, global `dw.*` usage, `importClass`, SCAPI custom APIs, Page Designer metadata, BM extensions, `steptypes.xml`, best-effort pipeline start nodes, base SFRA found by folder structure, build-time client override table, and a blind-spot notice.
- Site map: optional Business Manager cartridge path, which variant wins in legacy and `_sfra` pairs, "not configured" instead of `TODO` placeholders.
- KB-impact hook: SCAPI custom APIs, BM extensions, `jobs.xml`, `steptypes.xml`, `preferences.xml`, Page Designer metadata, and project configuration edits.
- Scenario tests for fifteen failure modes, script tests, `scripts/validate-kit.mjs` and a CI workflow.
- Documentation: README, SETUP, configuration, multi-repository examples, architecture decisions, upgrading, troubleshooting, knowledge maintenance, contributing, security.

### Corrected

- Controller resolution: the platform selects the first `controllers/<Name>.js` on the path without checking the requested function. Earlier text said the first file that registers or exports the action wins.
- Hooks: every registered implementation runs in path order. Earlier text applied leftmost-wins to everything.
- API verification: existing usage proves an API exists, not that it is current.
- OCAPI is recorded as deprecated (April 2026). New OCAPI usage needs explicit agreement.
- Pipelines are classified separately from SGJC.
- Official plugin coverage: they include classic `.public` controllers, not SGJC `guard` or pipelines.

### Changed

- `project-template/` became `templates/` and is installed by setup instead of copied by hand.
- The `CLAUDE.md` template became a managed block. Convention placeholders are now inert until filled.
- `site-map.json` import no longer writes a `TODO` repositories placeholder. Use `repositories.md`.
- Site list import splits on single tabs and reports malformed rows instead of shifting columns.
- Plugin `sfcc-kb` 1.0.0.

### Renamed

- Product: Cartridge Compass. Marketplace: `cartridge-compass`. Package: `cartridge-compass`.
- Unchanged for compatibility: plugin `sfcc-kb`, command `sfcc-kit`, state folder `.sfcc-kit/`, `CLAUDE.md` markers, rule and skill names.
- Projects that enable `sfcc-kb@sfcc-claude-kit` keep working and are not changed by setup. See "Switching to the cartridge-compass marketplace" in docs/UPGRADING.md.

### Deprecated

- `repositories` in `site-map.json`. Still read, but `repositories.md` is the supported place.

## 0.1.0

Internal version: plugin with inventory, site map, five skills, analyst agent, KB hook, and a project template copied by hand. Its README is preserved in `docs/history/README-0.1.md`.
