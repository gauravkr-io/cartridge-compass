---
title: Source registry
applies_to: all
read_when: Looking up evidence for a claim
last_verified: 2026-09-26
---

# Source registry

Evidence labels and source IDs: see [INDEX.md](INDEX.md) and [sources.md](sources.md).

All sources were accessed on 2026-09-26 unless stated.

### Official Salesforce documentation (Tier 1)

| ID | Title and URL | Establishes | Applies to | Access |
|---|---|---|---|---|
| S01 | SFRA Features and Components, https://developer.salesforce.com/docs/commerce/sfra/guide/b2c-sfra-features-and-comps.html | Stack layers, controller resolution, `modules`, route registration, events, OnRequest/OnSession | SFRA, SGJC | Full page |
| S02 | SFRA Modules, https://developer.salesforce.com/docs/commerce/sfra/guide/b2c-sfra-modules.html | Controller then pipeline search, function not checked, `module.superModule` | All cartridge storefronts | Search excerpt |
| S03 | Configure SFRA, https://developer.salesforce.com/docs/commerce/sfra/guide/b2c-configuring-sfra.html | Left-to-right precedence | All | Search excerpt |
| S04 | Cartridges, https://developer.salesforce.com/docs/commerce/b2c-commerce/guide/b2c-cartridges.html | Registering cartridges, precedence, D01 wording | All | Search excerpt |
| S05 | Comparing Pipelines and SGJC Controllers (legacy), https://documentation.b2c.commercecloud.salesforce.com/DOC2/topic/com.demandware.dochelp/LegacyDevDoc/ComparingPipelinesAndControllers.html | Controller vs pipeline precedence, Pipeline Dictionary | Pipelines, SGJC | Search excerpt, legacy site |
| S06 | Choose Your B2C Commerce Storefront Type, https://developer.salesforce.com/docs/commerce/sfra/guide/which-product.html | Storefront Next recommended, stacks, hybrid option | All storefronts | Full page |
| S07 | SFRA Versions and Releases, https://developer.salesforce.com/docs/commerce/sfra/guide/b2c-sfra-versions.html | Semantic versioning, matching tags, releases vs pre-releases | SFRA | Full page |
| S08 | Why Use SCAPI, https://developer.salesforce.com/docs/commerce/commerce-api/guide/why-use-scapi.html | OCAPI deprecation, SCAPI traits, mapping table | OCAPI, SCAPI | Full page |
| S09 | SFRA Hooks, https://developer.salesforce.com/docs/commerce/sfra/guide/b2c-sfra-hooks.html | All hooks run in cartridge-path order | All | Search excerpt |
| S10 | Extensibility via Hooks, https://developer.salesforce.com/docs/commerce/commerce-api/guide/extensibility_via_hooks.html | Return-value semantics, feature switch, circuit breaker, `package.json` location | SCAPI, OCAPI | Search excerpt |
| S11 | Customize SFRA, https://developer.salesforce.com/docs/commerce/sfra/guide/b2c-customizing-sfra.html | extend, append, replace, templates, client builds, anti-patterns | SFRA | Full page |
| S12 | Managed Runtime Overview, https://developer.salesforce.com/docs/commerce/pwa-kit-managed-runtime/guide/mrt-overview.html | MRT basics, production flag change | PWA Kit, Storefront Next | Search excerpt |
| S13 | Composable Storefront release notes, https://developer.salesforce.com/docs/commerce/pwa-kit-managed-runtime/references/about-pwa-kit-managed-runtime/about.html | HTTP proxy retirement | PWA Kit | Search excerpt |
| S14 | Customization with Hooks (OCAPI guide), https://developer.salesforce.com/docs/commerce/ocapi/guide/extensibility_via_hooks.html | Shared hooks, `dw.ocapi.shop.*` prefix, site-level Shopper Context hooks | OCAPI, SCAPI | Search excerpt |
| S15 | Commerce B2C Release Overview, https://help.salesforce.com/s/articleView?id=000382762&type=1, and B2C Commerce Release Notes, https://help.salesforce.com/s/articleView?id=commerce.b2c_rn_release_notes.htm&type=5 | Major releases roughly every four to five weeks, rolled out in stages. From 26.3, release notes are published in the Salesforce Release Notes | Release cadence for the maintenance schedule | Search excerpts, 2026-09-26 |

### Official repositories and bundled data (Tier 2)

| ID | Source | Areas inspected |
|---|---|---|
| R01 | https://github.com/SalesforceCommerceCloud/b2c-developer-tooling at commit `ce3ed28` (2026-09-25) | CLI command tree, `docs` flags, `dw.json` lookup (`packages/b2c-tooling-sdk/src/config/dw-json.ts`), engines, Safety Mode (`docs/guide/safety.md`), MCP toolsets, configuration and security (`docs/mcp/`), marketplace plugins |
| R02 | Official skills in R01 (`skills/b2c`, `skills/b2c-cli`, `skills/storefront-next`) | `b2c-hooks`, `b2c-controllers` (and `SFRA-PATTERNS.md`, `CLASSIC-PATTERNS.md`), `b2c-custom-api-development`, `b2c-custom-job-steps`, `b2c-business-manager-extensions`, `sfnext-hybrid-storefronts` |
| R03 | SDK bundled data in R01 (`packages/b2c-tooling-sdk/data`) | `guides/index.json` (632 official guide entries, generated 2026-09-25), `script-api` (546 pages), `xsd` (59 schemas) |
| R04 | https://github.com/SalesforceCommerceCloud/pwa-kit/releases | PWA Kit 3.18 releases |
| R05 | https://github.com/SalesforceCommerceCloud | Active public repositories (b2c-developer-tooling, storefront-next templates, pwa-kit) |

### Claude Code documentation

| ID | Source | Establishes |
|---|---|---|
| C01 | https://code.claude.com/docs/en/permissions | Rule syntax, precedence, limits, MCP rules, trust, settings loading |
| C02 | https://code.claude.com/docs/en/memory | CLAUDE.md loading, HTML comment stripping, path-scoped rules |
| C03 | https://code.claude.com/docs/llms.txt | Auto mode default (week 32, 2026), plugin evals (week 37, 2026) |

### Secondary sources (Tier 3)

| ID | Source | Use | Authority |
|---|---|---|---|
| X01 | Ksolves blog, https://www.ksolves.com/blog/salesforce/storefront-next-for-e-commerce | Discrepancy example only (D02) | Low |
| X02 | Rhino Inquisitor, https://rhino-inquisitor.com/how-to-use-ocapi-scapi-hooks/ | Consistent with S09 on hook ordering | Community, medium |
| X03 | https://github.com/anthropics/claude-code/issues/18961 | Historical Claude Code doc inconsistency (D08) | Issue tracker |

### Experiments run during this session

| ID | What was run | Result |
|---|---|---|
| E01 | Kit `sfcc-inventory.mjs` against a synthetic two-cartridge fixture | See [docs/analysis/KIT-ANALYSIS.md](../docs/analysis/KIT-ANALYSIS.md), section 9 |
| E02 | `sfcc-sitemap.mjs --check` on the uploaded `site-map.json` | Up to date |
| E03 | `git clone` of `storefront-reference-architecture` | Authentication required |
