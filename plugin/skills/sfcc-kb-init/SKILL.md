---
name: sfcc-kb-init
description: Build or rebuild the SFCC project knowledge base (site/repository/cartridge map, SGJC/SFRA classification, migration state, key flows) in docs/ai/. Run only when the user invokes /sfcc-kb-init, optionally with a phase number to resume (e.g. /sfcc-kb-init 3).
disable-model-invocation: true
argument-hint: "[phase number to resume, optional]"
---

# SFCC knowledge base: initialize or rebuild

This workflow builds a small, verified knowledge base that the rest of the project instructions rely on. It is designed to be safe to re-run: it resumes from `docs/ai/.kb-state.md`, regenerates mechanical facts with a script, and edits only sections it owns.

## Ground rules for this workflow

- **One phase per session is normal.** A full multi-repo scan does not fit in one context window, and quality drops after compaction. Finish a phase, update `docs/ai/.kb-state.md`, and tell the user to start a fresh session with `/sfcc-kb-init <next phase>`.
- **Facts come from the script, interpretation comes from you.** Never hand-count routes, hooks, services or cartridge paths. Run the inventory script and read its output. Absence from the inventory is not proof of absence: it cannot see computed names, `importScript` loads or Business Manager configuration. Its header lists the blind spots.
- **Configuration beats detection.** `docs/ai/repositories.md` is the user's repository mapping. A configured Type always wins over detection. Record disagreements as questions, never overwrite the user's value.
- **Missing configuration is a state, not an error.** When a site path, BM path, site ID or repository mapping is missing, record it as not configured in `.kb-state.md` and continue with what is known.
- **Delegate reading.** For per-cartridge analysis, spawn the `sfcc-cartridge-analyst` subagent (one per cartridge or small group) so raw file contents never enter the main context. Collect their summaries.
- **Label confidence** on every non-trivial claim: `[code]` verified in source, `[docs]` verified in official Salesforce docs, `[code+docs]`, `[inferred]`, `[unknown]`. An inference is never written as a fact.
- **Never write secrets.** Record where credentials are configured (file, preference or service ID), never their values. Do not open `dw.json` or `.env` files. They are denied in settings anyway.
- **Stop at every checkpoint marked STOP** and wait for the user.

## Files this workflow owns

```
docs/ai/
  .kb-state.md          progress + open questions (this workflow only)
  project-map.md        repos -> sites -> cartridge paths -> classification
  migration.md          SGJC <-> SFRA relationships and remaining dependencies
  decisions.md          design rationale, "Reason unknown" where not established
  sites/<site-id>.md    only what is specific to that site
  flows/<flow>.md       only for flows the user selects
  generated/            script output, never edited by hand
```

In human-maintained files, only replace content between `<!-- kb:auto:start <id> -->` and `<!-- kb:auto:end <id> -->` markers. Everything outside markers belongs to humans.

## Phase 0: Site and repository inventory (replaces the separate "Initial Discovery" prompt)

### 0a. Read what setup already knows

Read `docs/ai/generated/project-context.md` (written by `sfcc-kit setup` and `sfcc-kit sync`). It lists repositories, configured or detected architecture with confidence, and what is not configured. If it is missing, ask the user to run `node <kit>/bin/sfcc-kit.mjs setup` from the workspace root. Use the repositories marked `active` as the inventory roots. Skip repositories with Status `ignore`.

### 0b. Choose the source of cartridge paths

- **If `docs/ai/site-map.json` exists** and has `"authoritative": true`, it is the source of truth. Do not search for or read `site.xml` files. Regenerate its analysis first:
  `node "${CLAUDE_PLUGIN_ROOT}/scripts/sfcc-sitemap.mjs" --map docs/ai/site-map.json`
  Then run the inventory against it:
  `node "${CLAUDE_PLUGIN_ROOT}/scripts/sfcc-inventory.mjs" <repo1> <repo2> ... --sites docs/ai/site-map.json --out docs/ai/generated`
- **If the user pastes or attaches a list** of sites (name, ID, cartridge path), save it to a text file, import it with `sfcc-sitemap.mjs --import <file>`, and continue as above.
- **Otherwise**, collect paths from the repository (`sites/<site-id>/site.xml` `<custom-cartridges>`, read by the inventory script without `--sites`) and, if a sandbox is configured, from the instance (`b2c sites list`, `b2c sites cartridges list`, read-only). Ask the user to confirm.

(If the plugin root variable is unavailable, find the scripts under the installed plugin.)

### 0c. Fill the gaps the site map cannot know

The site map has cartridge paths but not repositories. Use the inventory's Cartridges table (the Repo column shows where each cartridge lives locally) to propose which repository each site's custom cartridges come from, then ask the user to confirm. Record confirmed site ownership in each site's `repository` field in `site-map.json` and the `Sites` field in `docs/ai/repositories.md` (propose the edit, the file is the user's), then regenerate `site-map.md`. If the Business Manager cartridge path is not in the site map, ask whether to add it (`b2c sites cartridges list --bm`, read-only). It is optional.

Report three lists from the inventory: cartridges in a site path but **not found locally** (other repo, vendor code not checked in, or a typo), cartridges **found locally but in no site path** (BM-only, jobs-only, or dead), and the observations section of `site-map.md`.

### 0d. Present and STOP

Present one table per brand (or per site if they differ) and STOP for the user to confirm:

| Field | Value | Source |
|---|---|---|
| Repository name / path | | |
| Repository purpose | | |
| Repository type | site-specific / shared / common | |
| Site ID | | |
| Site name | | |
| Cartridge path (full, in order) | | site map / repo / instance / user |
| Site-specific cartridges | | derived: used by this site only |
| Shared cartridges | | derived: used by 2+ sites |
| Architecture (configured or detected, with confidence) | | repositories.md / detection |
| SFRA base location and version | | |

If sources disagree (for example the site map and the instance), show all values side by side. Do not choose silently. The user decides which one the map records.

Write the confirmed result to `docs/ai/project-map.md` using the hierarchy Repository -> Site -> Cartridge path -> Cartridge. Do not copy full cartridge paths into project-map.md when `site-map.md` exists. Link to it instead. Record open questions in `.kb-state.md`.

## Phase 1: Environment

Record in `project-map.md`: package managers and build commands per repo (from `package.json` scripts), lint and test commands, CI config location, SFRA version (the generated inventory lists storefront packages, including base SFRA found by folder structure), and which tools are available (`b2c --version`, configured MCP servers). Also run `node <kit>/bin/sfcc-kit.mjs doctor` and record its safety findings, and ask whether the root `dw.json` has a Safety Mode block (the kit never reads `dw.json`). Keep it to commands and locations. Do not describe what Claude can read from the files themselves.

## Phase 2: Cartridge classification

For headless repositories (`pwa-kit`, `storefront-next`, `headless`), do not run cartridge classification. Record framework, package versions, build and deploy commands, and which SCAPI custom APIs or hooks in cartridge repositories they depend on. Use the official `storefront-next` plugin skills for framework details.

For each cartridge in any site's path, spawn `sfcc-cartridge-analyst` with the cartridge path and the generated inventory entry. Ask it to return: purpose (one line), classification (SFRA / SGJC / hybrid / neutral integration / BM), evidence file paths, cross-cartridge dependencies, and anything that contradicts the script's signal. Build the classification table in `project-map.md`:

| Cartridge | Repo | Sites | Classification | Evidence | Confidence |
|---|---|---|---|---|---|

Classify from implementation, never from the name alone. `neutral` is a valid answer for integration cartridges with no controller layer. `pipeline` is separate from `sgjc`.

## Phase 3: Base and override map

Do not document base SFRA itself. It is public and Claude can read it. Record only: the exact SFRA version, whether base is modified in place (diff against the tagged release if available), and the override candidates list from the generated inventory resolved per site (which copy wins for that site's cartridge path: the leftmost copy for controllers, templates and modules, while every registered hook runs).

## Phase 4: SGJC and hybrid analysis

Load the `sfcc-sgjc` and `sfcc-hybrid-migration` skills. For every SGJC or hybrid cartridge, determine reachability using the procedure in `sfcc-hybrid-migration` and fill `migration.md`:

| SGJC functionality | Location | SFRA replacement | Active implementation (per site) | Remaining dependencies | Status | Confidence |
|---|---|---|---|---|---|---|

Status values: `active`, `replaced-still-referenced`, `replaced-unreferenced (cleanup candidate)`, `unknown`. Never mark something obsolete without reachability evidence.

## Phase 5: API usage index

From the generated inventory, list the dw.* classes, services, hooks, OCAPI and SCAPI usage **this project actually uses** (the inventory lists SCAPI custom APIs from `cartridge/rest-apis/`). This is a usage index with file references, not API documentation. Official capability is looked up on demand with `b2c docs read` and is never copied into the repo.

Mark deprecations: check each dw.* class not yet verified with `b2c docs read <Class>` and flag deprecated ones. Mark OCAPI client usage as deprecated (April 2026) and name the SCAPI equivalent from the official mapping where one exists. Hook extension points named `dw.ocapi.shop.*` are shared by OCAPI and SCAPI and are not deprecated by that notice.

## Phase 6: Flows (user selects)

STOP and ask which business flows matter most (typical: checkout, payment, order placement, login, PDP, cart). For each selected flow, trace the real execution path for each site where it differs: route -> middleware -> controller -> model/helpers -> services -> template -> client JS, plus SGJC/SFRA crossings. One file per flow in `docs/ai/flows/`, with file:function references and no pasted code.

## Phase 7: Site files and rules

Create `docs/ai/sites/<site-id>.md` only for sites with real differences. Then generate path-scoped rules in `.claude/rules/` from the confirmed map. Setup installs `sfcc-protected-cartridges.md` and `sfcc-sgjc-cartridges.md` as kit-managed files: do not edit them. Write project rules as new files instead:

- `sfcc-project-legacy.md` for SGJC and pipeline cartridges not covered by the kit rule.
- `sfcc-shared-<group>.md` per group of cartridges shared by the same sites, using the kit's `templates/rules/sfcc-shared-cartridges.template.md`.
- `sfcc-project-vendor.md` listing vendor cartridges the project does not own, confirmed by the user. Do not treat every `int_*` cartridge as vendor code.

Fill in the `paths:` globs from real cartridge locations.

## Phase 8: Validation and report

Second pass: re-run the inventory with `--check`, compare `project-map.md` against it, list every `[unknown]` and `[inferred]` item, stale references, and cartridges present in a site path but not found locally. Report briefly: what was created, what is unverified, recommended next questions for the team. Mark the run complete in `.kb-state.md` with the git commit of each repo.

## Re-running later

`/sfcc-kb-init` on an existing KB starts at Phase 0 in diff mode: regenerate the inventory, report what changed since the commits recorded in `.kb-state.md`, and update only affected marker sections. For small changes, the `sfcc-kb-sync` skill is enough.
