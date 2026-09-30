---
title: Knowledge index
last_verified: 2026-09-26
---

# Knowledge index

Read this file, then open only the files your task needs. Do not load the whole folder.

The knowledge base holds what an agent cannot reliably infer from the project or look up with the official tooling. Script API signatures, schema contents and endpoint references are not copied here. Look them up with `b2c docs read`, `b2c docs search` and `b2c docs schema` (see [tooling/b2c-cli-and-mcp.md](tooling/b2c-cli-and-mcp.md)).

## Route by task

| Task | Read | Skip unless relevant |
|---|---|---|
| Any change, fix, review or explanation | [core/agent-workflow.md](core/agent-workflow.md) | |
| Which file, route or template runs for a site | [core/cartridge-resolution.md](core/cartridge-resolution.md) | headless |
| Hooks, job steps, services, import XML, code versions | [platform/hooks-jobs-services-metadata.md](platform/hooks-jobs-services-metadata.md) | |
| Classifying a repository or cartridge | [core/architecture-detection.md](core/architecture-detection.md) | |
| Work across repositories, sites or shared cartridges | [core/multi-repo.md](core/multi-repo.md) | |
| Using or verifying OCAPI, SCAPI or custom APIs | [apis/ocapi-scapi.md](apis/ocapi-scapi.md) | |
| Running `b2c` commands or MCP tools | [tooling/b2c-cli-and-mcp.md](tooling/b2c-cli-and-mcp.md) | |
| Changing kit rules, settings or permissions | [tooling/claude-code.md](tooling/claude-code.md) | |
| Catalog, orders, promotions, caching, localization and similar | [reference/domain-pointers.md](reference/domain-pointers.md) | |
| Does capability X apply to architecture Y | [reference/compatibility-matrix.md](reference/compatibility-matrix.md) | |
| Sources disagree, or a claim looks uncertain | [maintenance/discrepancies.md](maintenance/discrepancies.md), [maintenance/open-questions.md](maintenance/open-questions.md) | |
| "Where does this claim come from?" | [sources.md](sources.md) | |

## Route by architecture

Use the architecture recorded in `docs/ai/generated/project-context.md` for the repository you are working in.

| Architecture | Read | Do not load |
|---|---|---|
| `sfra` | [sfra/sfra.md](sfra/sfra.md) | sgjc, headless |
| `sgjc`, `pipelines` | [sgjc/sgjc-and-pipelines.md](sgjc/sgjc-and-pipelines.md) | sfra patterns for the file you are editing |
| Both in one site path | [hybrid/hybrid-and-migration.md](hybrid/hybrid-and-migration.md) plus both of the above | headless |
| `pwa-kit`, `storefront-next`, `headless` | [headless/headless.md](headless/headless.md), [apis/ocapi-scapi.md](apis/ocapi-scapi.md) | sfra, sgjc, cartridge resolution |
| `scapi-custom-api`, `api-hooks` | [apis/ocapi-scapi.md](apis/ocapi-scapi.md), [platform/hooks-jobs-services-metadata.md](platform/hooks-jobs-services-metadata.md) | headless |
| `integration`, `bm-extension`, `library` | [platform/hooks-jobs-services-metadata.md](platform/hooks-jobs-services-metadata.md) | storefront files |
| `unknown` | [core/architecture-detection.md](core/architecture-detection.md), then ask the user | everything else |

## Evidence labels

| Label | Meaning |
|---|---|
| `[FACT Sxx]` | Verified in the cited source. `S` official docs, `R` official repositories, `C` Claude Code docs |
| `[KIT]` | Convention established by this kit |
| `[PRACTICE]` | Recommended approach, not a platform requirement |
| `[REC]` | Recommendation not yet adopted everywhere |
| `[ASSUMPTION]` | Inferred, not verified. Do not build on it without checking |
| `[UNKNOWN]` | Not established. Listed in [maintenance/open-questions.md](maintenance/open-questions.md) |
| `[TEST Exx]` | Observed by running code |

A `[FACT]` is only as current as its `last_verified` date. When a fact matters for a change and is older than six months, re-check it with the official tooling before relying on it.

## Maintaining the knowledge base

See [docs/KNOWLEDGE-MAINTENANCE.md](../docs/KNOWLEDGE-MAINTENANCE.md). In short: every fact needs a source ID and a date, superseded facts move to the discrepancies file instead of being deleted, and gaps go to open questions instead of being guessed.
