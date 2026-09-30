---
title: Compatibility matrix
applies_to: all
read_when: Checking whether a capability applies to an architecture
last_verified: 2026-09-26
---

# Compatibility matrix

Evidence labels and source IDs: see [INDEX.md](../INDEX.md) and [sources.md](../sources.md).

| Capability | Pipelines | SGJC | SFRA | PWA Kit | Storefront Next | SCAPI | Notes |
|---|---|---|---|---|---|---|---|
| Cartridge path resolution | Yes | Yes | Yes | No (React) | No (React) | Custom APIs and hooks only | `[FACT S02]` `[FACT R02]` |
| `server` module and middleware | No | No | Yes | No | No | No | `[FACT S01]` |
| `module.superModule` | Platform global | Platform global | Core extension model | No | No | Scripts in cartridges | `[FACT S02]` |
| Pipeline Dictionary | Yes | No | No | No | No | No | `[FACT S05]` |
| Hooks (`hooks.json`) | Yes | Yes | Yes | Server side via SCAPI | Server side via SCAPI | Yes | `[FACT S09]` `[FACT S10]` |
| OnRequest/OnSession | Pipelines | Controllers | Hooks | n/a | n/a | n/a | `[FACT S01]` |
| ISML | Yes | Yes | Yes | No | No | No | `[FACT S01]` |
| Page Designer | `[UNKNOWN]` | `[UNKNOWN]` | Yes | Yes | Yes | Shopper Experience | `[FACT S06]` family pages, detail unverified |
| OCAPI | Callable | Callable | Callable | Legacy option | No | Replaces it | Deprecated April 2026 `[FACT S08]` |
| SLAS | Hybrid Auth | Hybrid Auth | Hybrid Auth | Yes | Yes | Yes | `[FACT S08]` |
| Managed Runtime | No | No | No | Yes | Yes | n/a | `[FACT S06]` `[FACT S12]` |
| Official agent skills | BM ext only | Classic only | Yes | `[UNKNOWN]` | Yes | Yes | `[FACT R01]` |
