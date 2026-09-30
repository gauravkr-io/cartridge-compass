---
title: OCAPI, SCAPI and custom APIs
applies_to: ocapi, scapi, scapi-custom-api
read_when: API usage, API verification, custom endpoints
last_verified: 2026-09-26
---

# OCAPI, SCAPI and custom APIs

Evidence labels and source IDs: see [INDEX.md](../INDEX.md) and [sources.md](../sources.md).

### 8.1 Verifying platform APIs (the kit's tiers, with refinements)

| Tier | When | How | Source |
|---|---|---|---|
| 1 | Already used in this project the same way | Cite the file. This proves the API exists, not that it is current. | `[KIT]` `[REC]` refinement |
| 2 | `dw.*` class not yet used here | `b2c docs read dw.catalog.ProductMgr` (accepts short names, `--raw`, `--json`) | `[FACT R01]` |
| 3 | OCAPI/SCAPI endpoints, hooks, custom APIs, XML | `b2c docs search "<topic>" --category commerce-api`, `b2c docs schema <name>` | `[FACT R01]` |
| 4 | Cannot verify | State that it could not be verified and do not write dependent code | `[KIT]` |

`b2c docs` works offline from bundled data: 546 Script API pages, 59 XSDs and an index of 632 official guides. `[FACT R03]` Deprecations appear in the Script API pages, for example `dw.svc.ServiceRegistry`. `[FACT R03]`

### 8.2 OCAPI

- OCAPI is marked deprecated as of April 2026. It stays available for two more years with security updates and no new features. `[FACT S08]`
- New implementations must use SCAPI exclusively. Existing OCAPI users must plan migration. `[FACT S08]`
- As of May 2026, some system information and niche Data API tasks were still best handled through OCAPI. `[FACT S08]`
- SLAS can issue one token usable across OCAPI and SCAPI during migration. `[FACT S08]`

### 8.3 SCAPI

- Stateless REST APIs defined with OpenAPI 3, authenticated with OAuth2. Shopper APIs use SLAS. `[FACT S08]`
- Forward-compatible versioning: additive changes do not bump the version. `[FACT S08]`
- Object-level caching rather than whole-response caching. `[FACT S08]`
- Shopper Context API handles personalization that OCAPI needed hooks for. `[FACT S08]`
- The official page includes an OCAPI to SCAPI resource mapping (for example Shop Baskets to Shopper Baskets V1/V2, Data Jobs to Admin Jobs, Data OcapiConfigs has no equivalent because permissions move to Account Manager and SLAS scopes). `[FACT S08]`

### 8.4 SCAPI custom APIs

- Folder layout: `cartridge/rest-apis/<api-name>/schema.yaml` (OAS 3.0 contract), `api.json` (endpoint mapping) and the implementing script. `[FACT R02]`
- Shopper custom APIs use `ShopperToken` and are always site-scoped. Admin custom APIs use `AmOAuth2`. `[FACT R02]`
- Registration status: `b2c scapi custom status`. `[FACT R01]`
- Custom APIs benefit from eCDN validation, server-side caching and circuit breaking. `[FACT S08]`
