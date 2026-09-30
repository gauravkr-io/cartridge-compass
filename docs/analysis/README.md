# Analysis (historical)

These two documents record the audit of kit 0.1 that shaped version 1.0.0. They are kept for traceability. They describe the kit as it was, so file names and behavior in them may no longer match the current code. For current behavior read [../ARCHITECTURE.md](../ARCHITECTURE.md) and [../../knowledge/INDEX.md](../../knowledge/INDEX.md).

| File | Contents |
|---|---|
| [KIT-ANALYSIS.md](KIT-ANALYSIS.md) | Findings F-01 to F-21 with evidence, and the inventory test (E01) |
| [ENHANCEMENT-ROADMAP.md](ENHANCEMENT-ROADMAP.md) | Enhancements E-01 to E-22 derived from the findings |

## Roadmap status in 1.0.0

| Item | Status | Where |
|---|---|---|
| E-01 Gate MCP tools that change state | Done | `templates/settings.kit.json` ask rules `mcp__*__<tool>` |
| E-02 Adopt official Safety Mode | Documented | SETUP.md section 8. The kit never reads `dw.json`, so it cannot check the block |
| E-03 Complete the ask list | Done | `templates/settings.kit.json` |
| E-04 Correct resolution rules | Done | Kit block, skills, `knowledge/core/cartridge-resolution.md` |
| E-05 Pin the `dw.json` the CLI uses | Done | Kit block, `doctor` warning, SETUP.md |
| E-06 Close inventory detection gaps | Done | `plugin/scripts/sfcc-inventory.mjs`, `test/scripts.test.mjs` |
| E-07 Document inventory limits | Done | Inventory header, sfcc-kb-init and sfcc-change-impact skills |
| E-08 Detect SFRA by structure | Done | Inventory and `lib/detect.mjs` |
| E-09 Model the BM cartridge path | Done | `site-map.json` `businessManager`, site map report, project context |
| E-10 Inert convention placeholders | Done | Conventions section in HTML comment with one live default line |
| E-11 Exists versus current | Done | Kit block and skills |
| E-12 OCAPI deprecation | Done | Kit block, sfcc-kb-init, `knowledge/apis/ocapi-scapi.md` |
| E-13 Protect base and vendor cartridges | Partly | Base SFRA and `modules` need approval to edit. Vendor cartridges are listed per project by /sfcc-kb-init Phase 7 |
| E-14 More files in the KB hook | Done | `plugin/hooks/kb-impact.mjs` |
| E-15 Pipelines separate from SGJC | Done | Inventory, detection, analyst agent |
| E-16 superModule beyond controllers | Done | sfcc-change-impact skill |
| E-17 Two deployment modes | Done | docs/CONFIGURATION.md "Shared mode and local-only mode" |
| E-18 `--check` working directory | Done | Inventory script header |
| E-19 Site import empty columns | Done | `plugin/scripts/sfcc-sitemap.mjs`, tested |
| E-20 Official plugin coverage | Done | sfcc-sgjc skill description |
| E-21 Headless support | Partly | Detection, mapping, routing and knowledge. No dedicated headless skill yet |
| E-22 Plugin evals | Future | Roadmap in README.md |
