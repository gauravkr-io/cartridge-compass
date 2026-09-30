---
title: Cartridges, paths and resolution rules
applies_to: sfra, sgjc, pipelines, scapi-custom-api
read_when: Deciding which file, route or template actually runs
last_verified: 2026-09-26
---

# Cartridges, paths and resolution rules

Evidence labels and source IDs: see [INDEX.md](../INDEX.md) and [sources.md](../sources.md).

### 2.1 Cartridges and the cartridge path

- A cartridge packages program code and data. Sites register cartridges as a colon-separated list in Business Manager (Administration > Sites > Manage Sites > site > Settings). Cartridges take precedence from left to right. `[FACT S04]`
- The path is searched left to right and the first controller or pipeline with a matching name is used, which is how cartridges on the left override those on the right. `[FACT S01]`
- The same page contains a contradictory sentence about overriding by placing a cartridge at the end of the list. See discrepancy D01. Treat left-to-right precedence as authoritative.
- Cartridges are resolved by name, so two different cartridges with the same name cannot both be deployed to one code version. `[KIT]` (inventory warning) `[ASSUMPTION]` on the exact platform behavior, not verified against a doc this session.
- Cartridge data (catalogs, content, metadata) is imported separately and is not stored in the cartridge. `[FACT S01]`

### 2.2 The Business Manager cartridge path

- Business Manager has its own cartridge path, reached through Administration > Sites > Manage Sites > Business Manager > Settings > Cartridges. `[FACT R02]`
- SCAPI Admin custom APIs called with `siteId=Sites-Site` or without a `siteId` resolve their `rest-apis/` folder through the BM cartridge path, not a storefront path. `[FACT R02]`
- `b2c sites cartridges list --bm` reads it. `--site-id` and `--bm` are mutually exclusive and one is required. `[FACT R01]`
- For organization-level hook customizations (for example libraries), register the cartridge on the Business Manager site. `[FACT S10]`

### 2.3 Resolution rules by artifact type

| Artifact | How the platform resolves it | Source |
|---|---|---|
| Controller (`controllers/Name.js`) | First file named `Name.js` in a `controllers` folder, left to right. SGJC and SFRA controllers are treated as equal. The platform does not check that the file contains the requested function. A missing function is an error. | `[FACT S01]` `[FACT S02]` |
| Pipeline (`pipelines/Name.xml`) | Only if no controller with that name exists anywhere on the path, the path is searched again for a pipeline. Within one cartridge, a controller beats a pipeline of the same name. | `[FACT S02]` `[FACT S05]` |
| Template | First template with the same name and relative location on the path. | `[FACT S11]` |
| `module.superModule` | The next module with the same path and name in cartridges to the right of the current one. Returns `null` if none. It is a platform global, not an SFRA-only feature. | `[FACT S02]` |
| `require('*/cartridge/...')` | Resolves along the cartridge path. | `[KIT]` `[FACT R02]` (official skill guidance) |
| `require('<cartridge>/cartridge/...')` | Loads that specific cartridge regardless of order. | `[KIT]` |
| `require('server')` and other names in `modules` | Anything in the `modules` folder or the `TopLevel` package is globally available without a path. | `[FACT S01]` |
| Hooks (`hooks.json`) | All registered implementations run, in the order their cartridges appear on the path. Not leftmost-wins. | `[FACT S09]` |
| Job step types (`steptypes.json`) | Declared in the cartridge root folder, one file per cartridge. | `[FACT R02]` |
| SCAPI custom API (`cartridge/rest-apis/<api>/`) | Looked up on the storefront site path for Shopper APIs, and on the BM path for org-context Admin APIs. | `[FACT R02]` |
| Client JS and SCSS | Resolved at build time through the `paths` property in the cartridge's `package.json` and `sgmf-scripts`, not by the platform at runtime. | `[FACT S11]` |

### 2.4 The `modules` folder

- The `modules` folder is a separate cartridge, uploaded like any other, but it does not have to be on the cartridge path. `[FACT S01]`
- It holds the SFRA `server` module. Do not edit `server`. To extend it, create your own module in `modules` and wrap it. `[FACT S01]`
- Whether listing `modules` on a path has any effect is `[UNKNOWN]` (Q03).
