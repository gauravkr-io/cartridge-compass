---
title: Discrepancies between sources
applies_to: all
read_when: Sources disagree
last_verified: 2026-09-26
---

# Discrepancies between sources

Evidence labels and source IDs: see [INDEX.md](../INDEX.md) and [sources.md](../sources.md).

| ID | Topic | Source A says | Source B says | Assessment |
|---|---|---|---|---|
| D01 | Override direction | S04: to overwrite files, put the cartridge at the end of the list | S01, S03 and S04 itself: left takes precedence | Left precedence is authoritative. The sentence is likely legacy wording. Raise with Salesforce docs if needed. |
| D02 | Storefront Next stack | X01 (vendor blog): built on Next.js, also called PWA Kit Next | S06: React Router 7 and Vite | S06 is authoritative. X01 is unreliable on this point. |
| D03 | SFRA replace example | S11 sample: `require('app_storefront_base/cartridge/controller/Product')` and `require('server)` | SFRA folder is `controllers`, and the string literal is unterminated | Typos in official sample code. Do not copy. |
| D04 | Recommended CLI for SFRA | S06 lists `sfcc-ci` | R01 ships a `sfcc-ci-migration` guide for the b2c CLI | Status of `sfcc-ci` is `[UNKNOWN]` (Q12). Prefer the b2c CLI, which the kit already uses. |
| D05 | Hook return values | S09: all modules are called regardless of return value (single `hooks.json` context) | S10: Shopper API hooks returning a value skip later hooks and the system implementation | Not a contradiction once scoped. Custom extension points follow S09, Shopper API extension points follow S10. |
| D06 | `dw.json` location | Kit setup guide: read from `./dw.json` in the folder you run in | R01: searched upward from the current directory | R01 is authoritative (source code). Resolved in kit 1.0.0: SETUP.md and the kit block say the CLI searches upward, and `doctor` warns about `dw.json` files inside repositories. |
| D07 | Controller resolution | Kit `sfcc-hybrid-migration`: leftmost file that registers the route (SFRA) or exports the action through guard (SGJC) wins | S02: first file by name wins, function not checked | S02 is authoritative. Resolved in kit 1.0.0: skills and the kit block use the S02 rule. See [F-01](../../docs/analysis/KIT-ANALYSIS.md). |
| D08 | Claude Code Bash rules | X03: settings page said prefix matching only | C01: `*` works at any position | Historical inconsistency, resolved in current C01. |
