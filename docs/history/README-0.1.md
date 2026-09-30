# SFCC Claude Kit

A knowledge system for Claude Code on Salesforce B2C Commerce projects, including hybrid SFRA + SGJC codebases. It complements the official Salesforce plugins (`b2c`, `b2c-cli`, `b2c-dx-mcp`) rather than duplicating them.

The kit has two halves, kept apart on purpose so it can be shared:

| Folder | What it is | Shared how |
|---|---|---|
| `plugin/` | Generic, reusable across every SFCC project: skills, a subagent, the inventory script, the doc-sync hook | Installed as a Claude Code plugin from this repo's marketplace |
| `project-template/` | Per-project files: `CLAUDE.md`, path-scoped rules, safety settings, `docs/ai/` skeleton | Copied into each project workspace and filled in |

## How the layers work

| Layer | Mechanism | Loads | Holds |
|---|---|---|---|
| Always-on rules | `CLAUDE.md` | Every session | Workflow, verification tiers, safety. Short on purpose |
| Location-aware rules | `.claude/rules/*.md` with `paths:` | Only when Claude opens matching files | "You are in SGJC code", "this cartridge is shared by 3 sites", "do not edit base" |
| Procedures | Skills in `plugin/skills/` | Only when relevant or invoked | KB build, SGJC patterns, hybrid decisions, impact analysis, doc sync |
| Facts | `sfcc-inventory.mjs` output | Read on demand | Routes, hooks, job steps, services, dw.* usage, overrides, cartridge paths |
| Enforcement | `settings.json` permissions, plugin hook | Always, by the client | Secret files unreadable, risky b2c commands need approval, doc-sync reminders |
| Platform knowledge | Official `b2c` plugins + `b2c docs` | On demand | SFRA and Script API patterns, official API reference |

The principle: instructions are advisory, so anything that must happen is enforced by settings, hooks or scripts instead of prose.

## Setup (per project)

1. **Workspace.** If the project spans several repositories, create a parent folder containing all of them and run Claude Code from there. The knowledge base lives at that workspace root (commit it to its own small repo, or to the main repo if there is one). Each repository can keep its own `CLAUDE.md` for its build commands; those load automatically when Claude works inside that repo.
2. **Copy** `project-template/` into the workspace root. Append `.gitignore.additions` to your `.gitignore`.
3. **Edit `.claude/settings.json`**: replace `YOUR_ORG/sfcc-claude-kit` with this kit's repository. Starting Claude Code in the folder then prompts everyone to install the official Salesforce plugins and this kit. Check `/permissions` once to confirm the rules parsed as intended on your Claude Code version.
4. **Install the B2C CLI** (`npm install -g @salesforce/b2c-cli`) and configure `dw.json` with a **sandbox** only.
5. Start `claude` in the workspace and run `/context` to confirm `CLAUDE.md` loaded.
6. Run `/sfcc-kb-init`. It stops after Phase 0 to show you the site and cartridge inventory for confirmation. Continue one phase per session: `/sfcc-kb-init 2`, `/sfcc-kb-init 3`, and so on.
7. Fill in the "Project conventions" section of `CLAUDE.md` with what Phase 1–2 found. Keep only conventions that differ from SFRA defaults.

## Optional: give Claude a site map instead of site.xml

If your cartridge paths live only in Business Manager, or you don't want Claude to rely on `site.xml`, provide a site map:

1. In Business Manager, copy each site's name, ID and cartridge path (Administration > Sites > Manage Sites > site > Settings) into a tab-separated text file. See `project-template/docs/ai/site-map.sample.txt` for the format.
2. Import it and generate the analysis:
   ```bash
   node ~/tools/sfcc-claude-kit/plugin/scripts/sfcc-sitemap.mjs --import sites.txt --map docs/ai/site-map.json
   ```
3. Open `docs/ai/site-map.json` and fill in `instance` and the `repositories` list (or let `/sfcc-kb-init` propose them).

This creates `site-map.json` (the source of truth, which you edit) and `site-map.md` (generated analysis Claude reads: shared vs brand-specific cartridges, per-site differences, and questions to confirm). While `"authoritative": true` is set, `/sfcc-kb-init` and the inventory script use this file and never read `site.xml`. When a path changes in Business Manager, edit the JSON or re-import; your repository and notes fields are kept.

## Daily use

- Ask normally. The rules and skills load themselves when relevant.
- For risky work, ask for a plan first. The change-impact skill produces a per-site impact statement.
- When you edit a structural file (controller, hooks.json, steptypes.json, site.xml, metadata, services), the hook reminds Claude to run the doc sync before finishing.
- If Claude repeats a mistake, add one line to `CLAUDE.md` or the relevant rule. That is the main way the system gets better.

## Keep it honest in CI

Add a job that fails when the generated inventory is stale:

```bash
node path/to/plugin/scripts/sfcc-inventory.mjs repoA repoB --out docs/ai/generated --check
```

## Where the original two prompts went

| Original section(s) | Now lives in | Why |
|---|---|---|
| Prompt 1 (initial discovery table) | `sfcc-kb-init` Phase 0 + optional `site-map.json` | Same table, pre-filled from your site map (or `site.xml` / the instance), then confirmed by you |
| 2, 3, 24, 36, 38, 41 (never invent, source hierarchy, dev rules) | `CLAUDE.md` "Verifying Salesforce APIs" and "Before changing code" | Needed every session; condensed into tiers to avoid over-verification |
| 4, 30, 31, 42 (phases, init command) | `sfcc-kb-init` skill | Commands are now skills; phase-per-session protects context |
| 5–8, 16, 23 (SGJC/SFRA classification, SFRA priority, migration) | `sfcc-hybrid-migration`, `sfcc-sgjc`, `docs/ai/migration.md` | The official plugins have no SGJC coverage; this is the real gap |
| 9, 37 (tooling, MCP rules) | `CLAUDE.md` "Tools" + `settings.json` | Enforced by permissions instead of prose |
| 10, 11, 27, 35, 40 (knowledge architecture) | This README's layer table | Decided once so every developer gets the same structure |
| 12–14 (SFCC API, OCAPI, SCAPI knowledge bases) | Replaced by `b2c docs read/search` + the project usage index | Copies of official docs go stale and can themselves be hallucinated |
| 15 (base SFRA analysis) | Version + override map only (Phase 3) | Base SFRA is public; only the project's deltas need recording |
| 17, 18 (complete scan, trace flows) | Inventory script + subagent + Phase 6 selected flows | Mechanical facts by script; interpretation only where it pays off |
| 19–22 (per-site architecture/design/instructions/cartridge map) | `project-map.md` + `sites/<id>.md` only where sites differ | 9 files × N sites would go stale quickly |
| 25, 32 (doc sync, incremental) | `sfcc-kb-sync` skill + hook + CI `--check` | Deterministic trigger instead of relying on memory |
| 26 (impact analysis) | `sfcc-change-impact` skill | Procedure with a fixed output format |
| 28, 29 (quality, confidence) | Confidence labels in `CLAUDE.md` and every skill | Kept as-is; this was one of the strongest parts |
| 33, 34 (git, secrets) | `CLAUDE.md` + `settings.json` deny rules | Secrets are blocked, not just discouraged |

## Sharing with other teams

Push this folder as a Git repository. Other teams run:

```bash
claude plugin marketplace add YOUR_ORG/sfcc-claude-kit
claude plugin install sfcc-kb@sfcc-claude-kit --scope project
```

and copy `project-template/`. Bump `version` in `plugin/.claude-plugin/plugin.json` when you change the plugin. Contributions that are project-specific belong in each project's `CLAUDE.md` or rules, never in the plugin.

## Evaluating changes to the kit

Keep a few real prompts from your project and re-run them after changing a skill, comparing results with and without the change. Good starter prompts: "Which implementation of Cart-Show runs for <site>?", "Add a field to the checkout shipping form for <site> only", "Can we delete <sgjc cartridge>?", "Which sites are affected if I change <shared helper>?".
