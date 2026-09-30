---
title: Domain areas: where to verify
applies_to: all
read_when: Catalog, orders, promotions, caching, localization and similar
last_verified: 2026-09-26
---

# Domain areas: where to verify

Evidence labels and source IDs: see [INDEX.md](../INDEX.md) and [sources.md](../sources.md).

This section deliberately contains few asserted facts. For each area it gives the official page to read before writing code. All URLs appear in the official guide index `[FACT R03]`. Prefix: `https://developer.salesforce.com/docs/commerce/`.

| Area | Official guide | Agent pitfalls `[PRACTICE]` |
|---|---|---|
| Cartridges, deployment | `b2c-commerce/guide/b2c-cartridges.html`, `b2c-commerce/guide/b2c-code-deployment.html` | Deploying to the wrong code version or instance |
| Controllers | `b2c-commerce/guide/b2c-working-with-controllers.html` | Missing function in the active controller file |
| Script modules | `b2c-commerce/guide/usingjavascriptmodules.html` | Using a named cartridge `require` where `*/` was intended |
| Forms | `b2c-commerce/guide/b2c-forms.html` | Changing form XML without updating templates and validation |
| Localization | `b2c-commerce/guide/b2c-localization.html` | Hard-coded strings instead of resource bundles |
| Page Designer | `b2c-commerce/guide/b2c-dev-for-page-designer.html` | Component JSON and script changes need matching metadata |
| Content cache | `b2c-commerce/guide/b2c-content-cache.html` | Caching personalized output |
| Custom caches | `b2c-commerce/guide/b2c-custom-caches.html` | Cache keys missing site or locale |
| Jobs | `b2c-commerce/guide/b2c-custom-job-steps.html` | Declaring a step without a `jobs.xml` |
| BM customization | `b2c-commerce/guide/b2c-customize-business-manager.html` | BM cartridge missing from the BM path |
| Quotas | `b2c-commerce/guide/b2c-governance-and-quotas.html` | Object and API quotas in loops |
| Best practices | `b2c-commerce/guide/b2c-dev-best-practices.html` | |
| Performance | `b2c-commerce/guide/b2c-site-performance.html` | Service calls inside cached includes |
| Logging | `b2c-commerce/guide/b2c-log-files-overview.html` | Logging customer data |
| Compatibility mode | `b2c-commerce/guide/b2c-compatibility-mode-considerations.html` | Behavior differences between compatibility modes |
| Inventory | `b2c-commerce/guide/b2c-inventory-for-developers.html` | |
| Promotions | `b2c-commerce/guide/b2c-promotions-for-developers.html` | |
| Orders | `b2c-commerce/guide/b2c-create-and-find-orders.html` | Transactions around order state changes |
| Search | `b2c-commerce/guide/b2c-search-and-navigation.html` | |
| SCAPI limits | `commerce-api/guide/timeouts-limits.html` | Hook and custom API timeouts |
| Shopper auth | `commerce-api/guide/authorization-for-shopper-apis.html` | |
| Hybrid routing | `commerce-api/guide/ecdn-rules-for-phased-headless-rollout.html`, `b2c-commerce/guide/hybrid-auth-environment-matrix.html` | |
| SFRA testing | `sfra/guide/b2c-testing-sfra.html` | |
| SFRA troubleshooting | `sfra/guide/b2c-troubleshooting-sfra.html` | |
| Repository access | `b2c-commerce/guide/b2c-github-repo-access.html` | |

Payments, tax, shipping and customer management are not covered by a page read in this session. Use `b2c docs search` and the official `b2c` skills (`b2c-ordering`, `b2c-hooks`) before implementing. `[UNKNOWN]`
