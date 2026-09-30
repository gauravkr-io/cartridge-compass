---
title: Hybrid projects and migration
applies_to: sfra+sgjc, legacy+headless
read_when: Code that exists in more than one architecture, reachability, cleanup
last_verified: 2026-09-26
---

# Hybrid projects and migration

Evidence labels and source IDs: see [INDEX.md](../INDEX.md) and [sources.md](../sources.md).

### 6.1 What "hybrid" can mean

1. SGJC or pipelines and SFRA cartridges on the same site path. `[KIT]`
2. Different sites on different architectures in the same realm. `[KIT]`
3. An SFRA or SiteGenesis storefront plus a headless storefront (Storefront Next or PWA Kit) sharing sessions. `[FACT R02]` `[FACT S06]`

### 6.2 Resolution in type 1 hybrids

- Controllers are searched first across the whole path. Pipelines are only reached if no controller of that name exists anywhere. So an SGJC `Cart.js` far to the right beats a `Cart` pipeline in the leftmost cartridge. `[FACT S02]`
- If the leftmost `Cart.js` lacks the requested function, the request errors. It does not fall through to a lower `Cart.js`. `[FACT S02]`
- For SFRA, several files can contribute to one route through `extend`. Read the whole chain. `[KIT]` `[FACT S11]`

### 6.3 Crossings

A crossing is a dependency between architectures, for example an SFRA controller requiring an `app_storefront_core` script, or `*/cartridge/...` resolving into a cartridge of the other style. List every crossing in impact statements. `[KIT]`

### 6.4 Reachability checklist before marking legacy code obsolete

1. Is the cartridge on any storefront path or the BM path? `[KIT]`
2. Is the route shadowed for every site that includes it? Remember the file-level rule in 6.2.
3. Is the route referenced in `URLUtils` calls, `isinclude url`, form actions, client JS, content assets, Page Designer data or other repositories? `[KIT]`
4. Is it required by name from another cartridge? `[KIT]`
5. Is it registered as a hook or job step? These run regardless of storefront architecture. `[KIT]`
6. Is it referenced by metadata or configuration (services, payment processors, jobs XML, preferences)? `[KIT]`

Status values: `active`, `replaced-still-referenced`, `replaced-unreferenced`, `unknown`. `[KIT]`

### 6.5 Headless hybrids

- Salesforce's official path for gradual migration from SFRA is Storefront Next in a hybrid implementation. `[FACT S06]`
- In production, Cloudflare eCDN routes URLs between Storefront Next and SFRA. Locally, a Vite plugin proxies non-matching requests to the sandbox. Session bridging uses shared cookies. `[FACT R02]`
- Hybrid Auth syncs sessions between SFRA or SiteGenesis pages and headless storefronts. `[FACT S08]`
