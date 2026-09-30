---
title: SGJC and pipelines
applies_to: sgjc, pipelines
read_when: Legacy SiteGenesis code
last_verified: 2026-09-26
---

# SGJC and pipelines

Evidence labels and source IDs: see [INDEX.md](../INDEX.md) and [sources.md](../sources.md).

### 5.1 SGJC

- Controllers are CommonJS modules. Exported functions wrapped by `guard` become routes `Controller-Function`. `guard` enforces method, HTTPS and login conditions defined in the project's `scripts/guard.js`. `[KIT]`
- `app.js` is a facade returning models, views and forms. Templates and much business logic traditionally live in `app_storefront_core`. `[KIT]`
- SGJC has no `server.extend` model. Customization usually copies a controller into a higher cartridge, which fully shadows the lower one. `[KIT]` Note that `module.superModule` itself is a platform global and is technically available to any module `[FACT S02]`. Whether a given project uses it in SGJC code must be checked.
- Do not introduce `server`, `res.render` or middleware into SGJC controllers. `[KIT]`
- The official Salesforce plugins cover SFRA and "classic" `.public = true` controllers, but not the SGJC `guard` and `app` facade. `[FACT R02]` This refines the kit's statement that the official plugins have no SGJC coverage.

### 5.2 Pipelines (SGPP)

- Pipelines are XML flows in `cartridge/pipelines/`. Controllers do not have access to the Pipeline Dictionary. `[FACT S05]`
- Pipeline routes are `PipelineName-StartNode`. `[ASSUMPTION]` naming, consistent with `<exec pipeline node>` usage in BM extensions `[FACT R02]`.
- Pipelets (`.ds`) can be converted to script methods or job steps (official guide `b2c-pipelet-to-script-conversion`). `[FACT R03]`
- Do not hand-edit pipeline XML unless asked. `[KIT]`
