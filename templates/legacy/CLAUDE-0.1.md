# <PROJECT NAME>: Salesforce B2C Commerce, hybrid SFRA + SGJC

<!-- Maintainers: keep this file under ~150 lines. Anything that is a procedure belongs in a skill;
anything that applies to specific folders belongs in .claude/rules/ with paths frontmatter. -->

Most sites run SFRA. Some functionality still runs on SGJC (SiteGenesis JavaScript Controllers) or pipelines. Treat every task as hybrid until the project map says otherwise.

## Where knowledge lives

- `docs/ai/site-map.md`: every site ID, its full cartridge path, shared vs brand-specific cartridges, per-site differences. Generated from `docs/ai/site-map.json`, which is the source of truth for cartridge paths; do not use `site.xml` for this.
- `docs/ai/project-map.md`: repositories, which repo each site comes from, cartridge classification (SFRA/SGJC/hybrid). Read the relevant part before changing code.
- `docs/ai/generated/inventory.md`: machine-generated facts (routes, hooks, job steps, services, dw.* usage, overrides). Never edit by hand; regenerate with the sfcc-kb-sync skill.
- `docs/ai/migration.md`: SGJC <-> SFRA relationships and which implementation is active per site.
- `docs/ai/flows/`, `docs/ai/sites/`, `docs/ai/decisions.md`: traced flows, site-only differences, design rationale.
- If `docs/ai/project-map.md` is missing or marked incomplete, tell the user and suggest `/sfcc-kb-init` instead of guessing the structure.

## Before changing code

1. Identify the repository, site(s), and cartridge path involved. Do not assume one repo = one site or that all sites share a path.
2. Find the active implementation: leftmost cartridge in the site's path wins. For hybrid functionality use the sfcc-hybrid-migration skill.
3. Search for an existing project pattern before writing new code, and follow it. Mark any deviation as a proposal.
4. For shared cartridges, checkout, payment, hooks, jobs or metadata, run the sfcc-change-impact skill and show the result before editing.

## Verifying Salesforce APIs (never invent)

Pick the lightest check that actually establishes the fact:

- **Already used in this project the same way**: the existing usage is the verification. Cite the file.
- **dw.* class, method or property not yet used here**: `b2c docs read dw.<package>.<Class>` before writing code.
- **OCAPI/SCAPI endpoints, hook extension points, SCAPI custom APIs, import/export XML**: `b2c docs search "<topic>" --category commerce-api`, `b2c docs schema <name>`, or the official b2c SCAPI skills.
- **Cannot verify**: say "This API or behavior could not be verified from the project code or official Salesforce documentation," and do not write code that depends on it.

Distinguish "used by this project" from "available in the platform" whenever you describe an API.

## Project conventions

<!-- Fill from the real codebase during /sfcc-kb-init Phase 1-2. Keep only rules that differ from
official SFRA defaults; Claude already knows the defaults. Examples of the right granularity: -->
- New storefront code goes in: `<cartridge>` (site-specific) / `<cartridge>` (shared).
- Never modify: `app_storefront_base`, `modules`, vendor integration cartridges (`int_<vendor>*`). Extend or override in a custom cartridge.
- Logging: `<project logger helper and category convention>`.
- Build: `<npm run ... per repo>`. Lint: `<command>`. Tests: `<command>`.

## Tools

- Official Salesforce plugins `b2c` (development patterns) and `b2c-cli` (CLI operations) are installed. Prefer their skills for platform patterns; use sfcc-sgjc for SGJC code, which they do not cover.
- `b2c` CLI and the b2c-dx-mcp server read `dw.json`. Instances configured there are sandboxes only. Never target production or staging unless the user explicitly asks in this session.
- Read-only CLI commands (docs, list, logs) are fine. Anything that deploys, activates, imports, runs jobs, or changes cartridge paths or preferences needs the user's go-ahead for that specific action.

## Confidence and honesty

When writing docs or explaining architecture, label non-trivial claims: `[code]`, `[docs]`, `[inferred]`, `[unknown]`. If the reason for a design is not in code, commits or docs, write "Reason unknown. Do not assume intent."

## Secrets

Never open or copy `dw.json`, `.env*`, keys or certificates. In docs, reference where a credential is configured (service ID, preference ID, file), never its value.

## Git

Never reset, revert, force-push or discard changes you did not make without explicit instruction.
