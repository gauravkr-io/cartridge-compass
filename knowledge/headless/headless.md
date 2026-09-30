---
title: Headless storefronts: Storefront Next, PWA Kit, Managed Runtime
applies_to: pwa-kit, storefront-next, headless
read_when: Headless storefront work
last_verified: 2026-09-26
---

# Headless storefronts: Storefront Next, PWA Kit, Managed Runtime

Evidence labels and source IDs: see [INDEX.md](../INDEX.md) and [sources.md](../sources.md).

### 9.1 Current positioning (as of 2026-09-26)

| Option | Status in Salesforce's decision table | Stack | Source |
|---|---|---|---|
| Storefront Next | "Recommended option", includes Managed Runtime | React Router 7 framework mode, React 19, Tailwind, shadcn/ui, Vite, SCAPI client | `[FACT S06]` |
| SFRA | For reusing existing SFRA skills, code and connectors | Server-side HTML and JavaScript, Script API | `[FACT S06]` |
| Storefront Next hybrid | For gradual migration from SFRA | Both | `[FACT S06]` |
| Build your own | Custom needs | SCAPI, Commerce SDK | `[FACT S06]` |
| PWA Kit (Composable Storefront) | Not listed in the decision table, still documented and released | React, `retail-react-app`, `commerce-sdk-react` | `[FACT S06]` `[FACT R04]` |

PWA Kit v3.18.0 shipped `retail-react-app@10.0.0` and `commerce-sdk-react@5.2.0` in May 2026. `[FACT R04]` A Salesforce developer blog post suggests PWA Kit 3.17 and later can render Page Designer without ISML through `@salesforce/storefront-next-runtime`. `[UNKNOWN]` because only a search snippet was seen (Q13).

### 9.2 Managed Runtime

- Hosts PWA Kit storefronts. Only applications created from a PWA Kit template are supported. Bundles are immutable snapshots. `[FACT S12]`
- From 2026-09-29, an environment can be marked production only if associated with a Staging or Production B2C instance. `[FACT S12]`
- HTTP (non-secure) proxy configurations are retired from 2026-08-31. `[FACT S13]`

### 9.3 Agent rules for headless work

- Do not apply cartridge path reasoning to React code. Headless storefronts call SCAPI, and server-side customization happens through hooks and custom APIs in cartridges. `[PRACTICE]`
- Use the official `storefront-next` plugin skills for Storefront Next work. `[FACT R01]`
- Treat the MRT production flag and bundle deploys as production-affecting actions requiring explicit approval. `[REC]`
