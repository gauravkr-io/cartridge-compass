---
title: Agent operating procedure
applies_to: all
read_when: Before any change, bug fix, review or explanation
last_verified: 2026-09-26
---

# Agent operating procedure

Evidence labels and source IDs: see [INDEX.md](../INDEX.md) and [sources.md](../sources.md).

### 1.1 The first principle

An SFCC repository is almost never the whole implementation. The code that runs for a site is the union of every cartridge on that site's cartridge path, which can span several repositories, vendor packages that are not checked in, Business Manager configuration, imported metadata and content. Assume nothing is complete until the cartridge path says so. `[KIT]` `[FACT S04]`

### 1.2 Before changing code

| Step | Action | Why it matters |
|---|---|---|
| 1 | Identify the workspace root and every repository in it. Start Claude Code from the workspace root, never from inside a repo. | Claude Code loads `.claude/settings.json` hooks and most settings only from the directory it starts in, with no parent fallback `[FACT C01]`. Starting inside a repo silently drops the kit's permissions. |
| 2 | Identify the target site or sites. | Different sites can run different code for the same URL. `[KIT]` |
| 3 | Read the site's cartridge path from the site map (or `site.xml`, or the instance). | The path decides everything else. Left takes precedence. `[FACT S03]` |
| 4 | Identify the architecture of each cartridge from evidence, not names ([core/architecture-detection.md](architecture-detection.md)). | `int_x_sfra` may contain no SFRA code. `[KIT]` |
| 5 | Resolve the active implementation with the rule that matches the artifact type ([core/cartridge-resolution.md](cartridge-resolution.md)). Controllers, templates, hooks and job steps resolve differently. | Hooks are not leftmost-wins `[FACT S09]`. |
| 6 | Read the whole chain: the active file plus everything it extends through `module.superModule`. | An SFRA route can be assembled from several files. `[FACT S11]` |
| 7 | Inspect related models, helpers, templates, forms, client JS, hooks, services, job steps and metadata. | |
| 8 | Search for an existing implementation of the same pattern in the project and follow it. | `[KIT]` |
| 9 | Verify every platform API you plan to use ([apis/ocapi-scapi.md](../apis/ocapi-scapi.md)). | Never invent `dw.*` APIs, hooks or endpoints. `[KIT]` |
| 10 | For shared cartridges, checkout, payment, hooks, jobs or metadata, produce a per-site impact statement before editing. | `[KIT]` (sfcc-change-impact skill) |
| 11 | Make the smallest change in the cartridge the project assigns for it. Never edit `app_storefront_base` or the `server` module. | Editing them voids Salesforce's backward-compatibility guarantee. `[FACT S01]` |
| 12 | If new metadata, preferences, services or custom objects are needed, add the import XML to the repository, not just code. | `[KIT]` |
| 13 | Validate XML against the official schema (`b2c docs schema <name>`). | `[FACT R01]` |
| 14 | Run the project's lint, unit tests and build for every affected repository. | `[PRACTICE]` |
| 15 | Re-check SFCC-specific risks: duplicate side effects from `server.append`, hook return values, cache headers, transactions, quotas. | `[FACT S11]` `[FACT S10]` |
| 16 | Report exactly what changed, per site, with the confidence of each claim, and sync `docs/ai/`. | `[KIT]` (sfcc-kb-sync) |

### 1.3 Playbooks by task type

**Bug fix.** Reproduce the route and site. Resolve the active controller file for that site. Remember that the platform picks the controller file before checking whether it contains the function, so a missing function in a higher cartridge causes an error rather than a fall-through `[FACT S02]`. Check hooks that run for the same request, since several may execute `[FACT S09]`. Fix in the active copy only.

**Feature.** Decide the cartridge first (brand-specific, shared, or integration). For SFRA, extend with `server.extend(module.superModule)` plus `append`, `prepend` or `replace` `[FACT S11]` `[FACT R02]`. Prefer `replace` when the original middleware calls a third party, because `append` runs the original chain too `[FACT S11]`.

**Code review.** Check for edits to base or plugin cartridges, `server.append` wrapped around routes that call services, hooks that return a value on Shopper API extension points, new OCAPI usage, secrets in code, missing metadata imports, and changes to shared cartridges without an impact statement.

**Impact analysis.** For every file changed, list the sites whose path includes the cartridge, then decide per site whether the file is the active copy. For hooks, list every cartridge registering the same extension point on that path.

**Migration (SGJC or pipelines to SFRA, or SFRA to headless).** Establish reachability with evidence before calling anything obsolete ([hybrid/hybrid-and-migration.md](../hybrid/hybrid-and-migration.md)). Never delete legacy code in the same change that adds its replacement unless asked.

**Debugging.** Read logs through `b2c logs` (read-only) and correlate by request ID. Logs can contain customer data, so do not paste them into shared documents `[FACT R01]`.

**Onboarding or explanation.** Start from the site map and project map, then trace one flow end to end (route, middleware, controller, models, services, template, client JS).

**Deletion or cleanup.** Only after the reachability checklist passes for every site and every repository, including content assets and Page Designer data. Otherwise the best status is `unknown`. `[KIT]`
