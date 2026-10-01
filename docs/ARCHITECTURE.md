# Architecture

This document explains how the kit is built and why. It is for maintainers and for anyone evaluating whether the design fits their organization.

## Guiding principle

**Generic by default, project-aware when configured, safe when configuration is missing.**

Everything else follows from it:

- The kit discovers what it can safely discover.
- Explicit configuration always overrides discovery.
- What can be neither discovered nor configured is reported as unknown, never guessed.
- Anything that must hold is enforced by settings, hooks or scripts, not by instructions alone. Claude Code's own documentation states that `CLAUDE.md` is context, not enforcement.

## Layers

| Layer | Mechanism | Loads | Holds |
|---|---|---|---|
| Always-on instructions | Managed block in the project root `CLAUDE.md` | Every session | Orientation, priorities, resolution rules, verification, safety. About 70 lines |
| Project context | `docs/ai/generated/project-context.md` | Read first, on demand | Repositories, architecture with source and confidence, configuration status |
| Location-aware rules | `.claude/rules/*.md` with `paths` | When a matching file is read | "Protected cartridge", "you are in legacy code" |
| Procedures | Plugin skills | When relevant or invoked | KB build, change impact, SGJC, hybrid migration, KB sync |
| Facts | Inventory and site map scripts | On demand | Routes, hooks, job steps, services, `dw.*` usage, overrides, site paths |
| Knowledge | `knowledge/` | Routed by `knowledge/INDEX.md` | What an agent cannot infer or look up |
| Enforcement | `.claude/settings.json`, plugin hook, B2C Safety Mode | Always | Secrets denied, risky actions need approval |
| Platform reference | Official `b2c` plugins and `b2c docs` | On demand | Script API, schemas, SCAPI reference |

## Context budget

The always-on cost is the managed block plus the two path rules when they match. Everything else is pulled in by the agent for the task at hand. The knowledge base is split into files of 20 to 90 lines with a routing index, so an SFRA controller task reads `core/cartridge-resolution.md` and `sfra/sfra.md`, not the headless or SGJC material. Official reference content (API signatures, schemas) is never copied into the kit, because `b2c docs` serves it offline from Salesforce's bundled data and copies go stale.

## Components

```text
bin/sfcc-kit.mjs         command line, argument parsing only
lib/util.mjs             Writer: allow-listed paths, symlink refusal, no-op on identical content, backups
lib/repositories.mjs     type vocabulary, repositories.md parser and renderer
lib/detect.mjs           repository discovery and multi-signal architecture detection
lib/context.mjs          merges configuration over detection, loads the site map, renders project context
lib/project-files.mjs    CLAUDE.md block, settings merge, managed file decisions, state
lib/commands.mjs         setup, sync, detect, doctor, uninstall, protect-repos
lib/steps.mjs            the numbered steps behind the run command
plugin/                  Claude Code plugin (skills, agent, hook, scripts)
templates/               files setup installs, plus 0.1 versions used to recognize unmodified old files
knowledge/               modular knowledge base
```

The kit has no runtime dependencies. It uses only Node.js built-ins, so there is nothing to install and no supply chain to audit beyond Node itself.

## Design decisions

### D1. The kit lives beside the repositories, not inside them

**Decision.** The project root is a plain folder containing the repositories and the kit. Setup writes only to `CLAUDE.md`, `.claude/`, `docs/ai/` and `.sfcc-kit/` in that root.

**Why.** Claude Code loads settings and hooks from the directory it starts in, with no parent fallback. Starting from the root gives the agent all repositories and the kit's knowledge without adding files to any repository. The kit folder is inside the root, so the agent reads its knowledge without extra permissions.

**Alternatives rejected.** Copying the kit into each project duplicates it and breaks upgrades. Symbolic links behave differently on Windows and are refused by the writer for safety. Installing everything as a plugin would hide the knowledge base inside the plugin cache, where the user cannot read or version it easily.

### D2. Repository mapping is Markdown with a strict, tiny grammar

**Decision.** `docs/ai/repositories.md` uses one `##` section per repository and `- Key: value` lines. HTML comments are ignored.

**Why.** It is readable in any editor and on any Git host, diffs cleanly, and needs no schema knowledge to edit. The grammar is small enough that parsing is unambiguous. Guidance lives in an HTML comment, so it can never be misread as data.

**Alternatives rejected.** YAML is easy to break with indentation and is less friendly to non-developers. JSON is hostile to hand editing. A Markdown table cannot hold multi-value fields cleanly.

### D3. Configuration always beats detection, and unrecognized values are not replaced by detection

**Decision.** A recognized configured `Type` is used as is. If detection disagrees, the context shows a note. A configured value the kit does not recognize becomes `unknown`, not the detected value.

**Why.** Detection sees code, not intent. A repository may deliberately be treated as legacy. Silently replacing a typo with a detection result would hide the problem, so the kit reports it instead.

### D4. Detection needs more than one kind of evidence for high confidence

**Decision.** Each type has signals of weak, medium or strong weight. High confidence needs two strong kinds, or one strong kind plus another. One strong kind is medium. Storefront architectures rank above API usage tags when confidence ties.

**Why.** A single filename or dependency is easy to misread (a leftover `sgmf-scripts`, a stray pipeline). Signal kinds are counted once, so a thousand SFRA controllers are still one kind of evidence.

**Limits.** Detection is heuristic. It reports evidence file paths so a person can check it. Package and URL patterns used are listed in `lib/detect.mjs`. The OCAPI URL pattern is weak on purpose because it was not verified against an official source.

### D5. Setup is a convergent, idempotent operation

**Decision.** Setup computes the desired content for each file and writes only when it differs. It creates project files only when missing, appends to the repository mapping only, and updates managed files only when they are unmodified since the kit wrote them (tracked by hash in `.sfcc-kit/state.json`) or identical to a known older kit version.

**Why.** Running setup twice, after an upgrade, or after a partial failure always ends in the same state without losing user edits. There is one command to remember.

### D6. Shared files use markers or additive merges

**Decision.** `CLAUDE.md` gets a block between `<!-- sfcc-kit:begin -->` and `<!-- sfcc-kit:end -->`. `.claude/settings.json` gets missing entries appended, and nothing is removed except the 0.1 placeholder marketplace that could never resolve. Damaged markers or invalid JSON stop the change for that file and are reported.

**Why.** These files often hold team content. Claude Code strips HTML comments before sending `CLAUDE.md` to the model, so the markers cost no context.

### D7. Enforcement covers MCP tools, not only shell commands

**Decision.** Ask rules cover the B2C MCP tools that change an instance, using the tool-name glob form `mcp__*__<tool>`.

**Why.** Claude Code applies Bash rules only to Bash. The B2C MCP server enables all toolsets by default, including deployment and Admin API writes, and auto mode became Claude Code's default permission mode in August 2026. The glob form matches the tool regardless of how the server is named in a given install. B2C Safety Mode in `dw.json` is recommended as a second, tool-level boundary.

### D8. The kit never reads credentials

**Decision.** No kit code opens `dw.json`, `.env` or key files. `doctor` reports only whether `dw.json` files exist and where.

**Why.** A tool that reads secrets can leak them in logs or output. Checking for a Safety Mode block would require reading `dw.json`, so the kit asks the user instead.

### D9. Knowledge is modular, routed and sourced

**Decision.** Small files with frontmatter (`applies_to`, `read_when`, `last_verified`), one routing index, and one source registry. Labels separate verified facts, kit conventions, practices, recommendations, assumptions and unknowns.

**Why.** Selective loading keeps context small. Labels let an agent answer "why do you believe this?" with a source. Discrepancies and open questions are kept as first-class files so that gaps are never filled with guesses.

### D10. Versioning separates the kit, the plugin and the project configuration

**Decision.** The kit and plugin share a semantic version. Project files carry a separate configuration version (`CONFIG_VERSION`, and `Format:` in `repositories.md`). See [UPGRADING.md](UPGRADING.md).

**Why.** Most kit releases change knowledge or instructions without changing the shape of project files. A separate configuration version makes it obvious when a migration is actually needed.

### D11. Product renamed, identifiers kept

**Decision.** The product is named Cartridge Compass and its marketplace is `cartridge-compass`. Identifiers that running projects depend on keep their 0.1 names: the plugin `sfcc-kb`, the command `sfcc-kit`, the `.sfcc-kit/` state folder, the `CLAUDE.md` markers, and the rule and skill names.

**Why.** The product name carries no third-party trademark. Renaming the internal identifiers would break existing installs for no functional gain. A project that still enables the plugin through the old marketplace ID `sfcc-kb@sfcc-claude-kit` is left untouched by setup and switches when its owner chooses (see [UPGRADING.md](UPGRADING.md)).

## Extension points

| To add | Where |
|---|---|
| A new architecture type | `TYPES` in `lib/repositories.mjs`, signals in `lib/detect.mjs`, a routing row in `knowledge/INDEX.md`, a scenario test |
| A new knowledge area | A file under `knowledge/<area>/`, a row in `knowledge/INDEX.md`, sources in `knowledge/sources.md` |
| A new managed rule | `templates/rules/`, the `MANAGED_RULES` list in `lib/commands.mjs` |
| A new permission | `templates/settings.kit.json`. Existing installs receive it on the next setup |
| A configuration migration | Bump `CONFIG_VERSION`, add the migration in `setup`, add a test that starts from the old layout |
| Another agent | Point it at `docs/ai/generated/project-context.md`, `knowledge/INDEX.md` and the instructions in `templates/claude-block.md` |

## History

The 0.1 layer model and the mapping from the two original prompts to the kit's components are preserved in [history/README-0.1.md](history/README-0.1.md). The analysis that led to 1.0 is in [analysis/](analysis/).
