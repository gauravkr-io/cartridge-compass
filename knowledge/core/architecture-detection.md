---
title: Identifying architecture from evidence
applies_to: all
read_when: Classifying a repository or cartridge
last_verified: 2026-09-26
---

# Identifying architecture from evidence

Evidence labels and source IDs: see [INDEX.md](../INDEX.md) and [sources.md](../sources.md).

### 3.1 Signatures

| Evidence in a file | Architecture | Source |
|---|---|---|
| `require('server')`, `server.get/post/use`, `server.extend`, `append/prepend/replace`, `module.exports = server.exports()` | SFRA | `[FACT S01]` `[FACT S11]` |
| `require('.../scripts/guard')`, `exports.X = guard.ensure([...], fn)`, `app.getModel/getView/getForm` | SGJC | `[KIT]` |
| `exports.X = fn` plus `exports.X.public = true`, no `server` module | Classic (non-SFRA) controller. SGJC guard wraps this mechanism. | `[FACT R02]` `[ASSUMPTION]` on guard internals |
| `cartridge/pipelines/*.xml`, `.ds` pipelets | SiteGenesis Pipeline Processor (pipelines) | `[FACT S01]` `[FACT S05]` |
| `cartridge/rest-apis/<api>/schema.yaml` plus `api.json` | SCAPI custom API | `[FACT R02]` |
| `hooks.json` with `dw.ocapi.shop.*` names | OCAPI and SCAPI hooks | `[FACT S14]` |
| `bm_extensions.xml`, `<exec pipeline="X" node="Y">` | Business Manager extension | `[FACT R02]` |
| `experience/pages`, `experience/components` | Page Designer | `[ASSUMPTION]` path convention, verify in project |
| React Router 7, Vite, Tailwind, `@salesforce/storefront-next-*` packages | Storefront Next | `[FACT S06]` `[FACT S13]` |
| `@salesforce/pwa-kit-*`, `retail-react-app`, `commerce-sdk-react` | PWA Kit (Composable Storefront) | `[FACT R04]` |

### 3.2 Decision rules

- Classify from implementation, never from names. `[KIT]`
- A cartridge with SFRA controllers that `require`s `app_storefront_core` modules is hybrid, because removing SGJC would break it. `[KIT]`
- Pipelines and SGJC are two different legacy architectures. Keep them distinct in classification even when a tool reports both as "sgjc". `[REC]`
- A cartridge with only scripts, services, hooks and job steps is neutral. Hooks and jobs run regardless of storefront architecture. `[KIT]`
