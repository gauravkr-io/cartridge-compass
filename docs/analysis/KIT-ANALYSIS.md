# SFCC Claude Kit: Analysis

Analysis date: 2026-09-26. Kit analyzed: `sfcc-claude-kit.zip`, plugin `sfcc-kb` version 0.1.0, plus `SFCC-Claude-Kit-Setup-Guide.pdf`, `site-map.json` and `site-map.md`.

Evidence labels and source IDs follow `SFCC-KNOWLEDGE-BASE.md` (section 0.2 and section 16).

---

## 1. Scope and integrity

- The original kit was not modified. Analysis ran on a scratch copy outside the upload folder, which is read-only.
- SHA-256 of the analyzed archive: `25f5b015ee4905f5e91ece420e6e52e0e38193a1ce7ca06dd4389e13c4565f17`. Recompute it to confirm the kit you hold is the one analyzed.
- Every file in the archive was read in full. `__MACOSX/` and `.DS_Store` entries are macOS archive artifacts with no content relevant to the kit.

---

## 2. What the kit contains

| Path | Role |
|---|---|
| `README.md` | Layer model, setup, daily use, CI check, mapping from two earlier prompts to the new structure |
| `.claude-plugin/marketplace.json` | Local marketplace exposing the `sfcc-kb` plugin |
| `plugin/.claude-plugin/plugin.json` | Plugin manifest, version 0.1.0 |
| `plugin/agents/sfcc-cartridge-analyst.md` | Read-only subagent (Read, Grep, Glob) returning a fixed per-cartridge summary |
| `plugin/hooks/hooks.json` + `kb-impact.mjs` | PostToolUse hook on Edit and Write. Reminds once per session per category to sync the KB when structural files change |
| `plugin/scripts/sfcc-inventory.mjs` (261 lines) | Deterministic fact extraction: cartridges, signals, routes, hooks, job steps, services, `dw.*` usage, cross-cartridge requires, override candidates, site paths, `--check` for CI |
| `plugin/scripts/sfcc-sitemap.mjs` (198 lines) | Imports a Business Manager site list and renders `site-map.md` with shared, brand and per-site analysis and observations |
| `plugin/skills/sfcc-kb-init` | Nine-phase KB build, one phase per session, STOP checkpoints, user-invoked only |
| `plugin/skills/sfcc-kb-sync` | Minimal, targeted KB updates after structural change |
| `plugin/skills/sfcc-change-impact` | Per-site blast-radius procedure with a fixed output format |
| `plugin/skills/sfcc-hybrid-migration` | Where code belongs in SGJC plus SFRA projects, active implementation, reachability, migration status |
| `plugin/skills/sfcc-sgjc` | Recognizing, tracing and modifying SGJC and pipeline code |
| `project-template/CLAUDE.md` | Always-on workflow, API verification tiers, conventions placeholder, tools, confidence, secrets, git |
| `project-template/.claude/settings.json` | Deny reads of secrets, ask for risky `b2c` commands, allow read-only ones, marketplaces, enabled plugins |
| `project-template/.claude/rules/*.md` | Path-scoped rules for protected, SGJC and shared cartridges |
| `project-template/docs/ai/*` | KB skeleton: state, project map, migration, decisions, sample site list, `flows/`, `sites/` |
| `project-template/CLAUDE.local.md.example`, `.gitignore.additions` | Personal notes template, ignore list |

---

## 3. How the kit works

### 3.1 Layers

The README's layer table is the kit's architecture: always-on rules (`CLAUDE.md`), location-aware rules (`.claude/rules` with `paths`), procedures (skills), facts (script output), enforcement (settings and hook) and platform knowledge (official plugins and `b2c docs`). The stated principle is that anything which must happen is enforced by settings, hooks or scripts rather than prose. `[KIT]`

### 3.2 Lifecycle

1. Setup copies the template to a non-git workspace root that contains the repositories, installs the plugins at project scope, and protects the repos through `.git/info/exclude`.
2. A site map (from Business Manager) becomes the authoritative source of cartridge paths.
3. `/sfcc-kb-init` builds `docs/ai/` over nine phases, one per session, with state in `.kb-state.md`.
4. Daily work relies on rules and skills loading when relevant. The hook reminds Claude to run `sfcc-kb-sync` after structural edits.
5. CI can fail when the generated inventory is stale.

### 3.3 Interaction with Claude Code

| Kit mechanism | Claude Code behavior it relies on | Verified |
|---|---|---|
| Start from workspace root | Settings and hooks load only from the starting directory | Yes `[FACT C01]` |
| Path-scoped rules | Load when a matching file is read | Yes `[FACT C02]` |
| `CLAUDE.md` under 150 lines | Shorter files improve adherence (docs say under 200) | Yes `[FACT C02]` |
| `Bash(b2c docs *)` style rules | Trailing ` *` also matches the bare command | Yes `[FACT C01]` |
| `Read(**/dw.json)` deny | Blocks built-in reads and recognized Bash readers | Yes, with limits `[FACT C01]` |
| `disable-model-invocation: true` on `sfcc-kb-init` | Skill runs only when the user invokes it | Not re-verified this session `[UNKNOWN]` |
| Hook `additionalContext` output | Injects a reminder after a tool call | Not re-verified this session `[UNKNOWN]` |

---

## 4. Assumptions the kit makes

| Assumption | Where | Holds? |
|---|---|---|
| Projects are hybrid SFRA plus SGJC with most sites on SFRA | `CLAUDE.md` title and first paragraph | Project-specific. Wrong for SFRA-only, SGJC-only or headless projects without editing |
| Cartridge detection by `.project` or `cartridge/<name>.properties` | inventory | Standard for SFRA and SiteGenesis layouts `[ASSUMPTION]` |
| Repos keep cartridges under `cartridges/` | protected-cartridges rule glob for `modules` | Common, not universal |
| `app_storefront_base` exists in every path | sitemap "base missing" check | Correct for SFRA sites. SGJC-only sites would be flagged |
| Brand equals the site ID prefix before `_` | sitemap import | Works for this project. Breaks for IDs like `RefArch` variants |
| Official plugins provide SFRA and platform knowledge | README, `CLAUDE.md` Tools | Yes `[FACT R01]` |
| Risky actions happen through Bash `b2c` commands | `settings.json` | No longer true. See F-03 |

---

## 5. Strengths

1. **Enforcement over prose.** Secrets are denied by settings, not just discouraged. This matches Claude Code's own guidance that `CLAUDE.md` is context, not enforcement `[FACT C02]`.
2. **Facts from scripts, interpretation from the model.** Route and hook lists come from a deterministic, sorted, timestamp-free inventory with a `--check` mode. This removes a large class of hallucination.
3. **Confidence labels everywhere**, and the rule "Reason unknown. Do not assume intent."
4. **Context protection.** One phase per session, subagent reading, marker-bounded auto sections that never overwrite human text.
5. **Correct core rules.** Leftmost precedence, never editing base, reachability evidence before deletion, and classification by implementation all match official sources `[FACT S01]` `[FACT S03]`.
6. **Every CLI command and flag the kit tells Claude to use exists as written**: `b2c docs read`, `docs search --category`, `docs schema`, `sites cartridges list`, `code list`, `logs` `[FACT R01]`.
7. **The site map workflow is strong.** Mechanical observations are phrased as questions, not verdicts. `--check` confirmed the uploaded `site-map.md` is current `[TEST E02]`.
8. **Honest scope.** It refuses to copy official API docs into the repo and points to `b2c docs` instead, which avoids stale copies.

---

## 6. Findings

Classification uses the seven categories requested: genuine error, outdated platform behavior, project-specific convention, intentional simplification, context-specific rule, misunderstanding, needs verification. Severity reflects the damage an agent could cause if it followed the kit as written. Recommended changes are in `ENHANCEMENT-ROADMAP.md`.

### F-01 Controller resolution is described at the wrong granularity
- **Kit says** (`sfcc-hybrid-migration`, "Determining the active implementation"): for SFRA, the leftmost `controllers/Name.js` "that registers the route" is the entry point. For SGJC, the leftmost `controllers/Name.js` "exporting Action through guard" wins.
- **Evidence**: The platform searches for the controller file by name and does not verify that it contains the requested function. Calling a function that does not exist causes an error. `[FACT S02]` The first controller with the correct name executes. `[FACT S01]`
- **Classification**: intentional simplification that becomes incorrect in edge cases.
- **Why it matters**: An agent could conclude that a route falls through to a lower cartridge when the leftmost file lacks it, and place a fix in a file that never runs, or miss a production error.
- **Severity**: High. **Roadmap**: E-04.

### F-02 Hooks do not follow leftmost-wins
- **Kit says**: `sfcc-change-impact` resolves "the active copy" per site and reports shadowed files. Hooks are listed from the inventory but no resolution rule is given for them.
- **Evidence**: All registered hooks for an extension point run in cartridge-path order `[FACT S09]`. For Shopper API extension points, returning a value skips the system implementation and later hooks `[FACT S10]`.
- **Classification**: missing knowledge.
- **Why it matters**: An agent may call a hook implementation "shadowed" and ignore it, or add a hook that returns `Status.OK` and silently disables basket calculation in another cartridge.
- **Severity**: High. **Roadmap**: E-04.

### F-03 MCP tools with side effects have no permission gate
- **Kit says**: `settings.json` puts risky `Bash(b2c ...)` commands under `ask`. The kit enables `b2c-dx-mcp`.
- **Evidence**: The MCP server enables all toolsets by default, including `cartridge_deploy` (optionally activating or reloading a code version), `webdav_put`, `scapi_execute` (Admin API data changes), `mrt_bundle_push` and `debug_evaluate` `[FACT R01]`. Bash rules do not match MCP tool calls. MCP tools need `mcp__...` rules `[FACT C01]`. Auto mode became Claude Code's default in August 2026 `[FACT C03]`.
- **Classification**: outdated (the tool surface and default mode changed after the kit's design) and a safety gap.
- **Severity**: Critical. **Roadmap**: E-01, E-02.

### F-04 Official Safety Mode is not used
- **Kit says**: nothing. Safety relies on Claude Code permission rules only.
- **Evidence**: The CLI, IDE extension and MCP server share Safety Mode (`READ_ONLY`, `NO_DELETE`, confirmation rules), configurable per instance in `dw.json` or by `SFCC_SAFETY_LEVEL` `[FACT R01]`. It enforces at the tool level regardless of how the command is invoked, which covers the Bash-rule limits documented in C01.
- **Classification**: missing knowledge that fits the kit's own "enforce, don't advise" principle.
- **Severity**: High. **Roadmap**: E-02.

### F-05 Several state-changing CLI commands are not in `ask`
- **Kit says**: `ask` covers code, job, sites cartridges, webdav, sandbox, ods, preferences, slas, ecdn, mrt.
- **Evidence**: Other command groups change instances or expose secrets: `scapi replications publish`, `am` user, client and role changes, `bm` user, role and access-key changes, `cap install/uninstall`, `setup instance create/remove/set-active`, `auth token` and `auth client token` `[FACT R01]`. Bash rules also miss forms like `npx b2c` or an absolute path `[FACT C01]`.
- **Classification**: incomplete list, likely because the CLI grew.
- **Severity**: High. **Roadmap**: E-03.

### F-06 `dw.json` lookup is described as current-folder only
- **Setup guide says** (Step 4): the CLI reads `./dw.json` from the folder you run it in.
- **Evidence**: `findDwJson` searches upward from the current directory `[FACT R01]`.
- **Classification**: simplification.
- **Why it matters**: If Claude runs `cd repoA && b2c ...`, `repoA/dw.json` wins over the root file and may target a different instance. The root placement still works when commands run from the root.
- **Severity**: Medium. **Roadmap**: E-05.

### F-07 Inventory detection gaps
- **Evidence** `[TEST E01]`: on a fixture, the inventory missed
  - an SFRA route whose name is a variable (`server.get(ROUTE, ...)`)
  - a classic route (`exports.AddProduct = add` plus `.public = true`), a documented pattern `[FACT R02]`
  - a service ID held in a constant
  - `dw.system.Site` used as a global without `require`
  - a SCAPI custom API under `rest-apis/` (Phase 5 asks for these)
  - a Page Designer component under `experience/`
  
  By reading the code, it also does not parse `steptypes.xml`, pipeline start nodes, `bm_extensions.xml`, or client-side overrides (it excludes `client/` from the override index, while SFRA client overrides are resolved at build time `[FACT S11]`).
- **Classification**: known limitation of regex extraction, not documented as such.
- **Why it matters**: The kit tells Claude never to hand-count routes, hooks or services and to trust the script. Unreported items look nonexistent.
- **Severity**: Medium. **Roadmap**: E-06, E-07.

### F-08 SFRA version detection may miss the base package
- **Kit says**: storefront packages are found by `package.json` name matching `storefront-reference-architecture|sitegenesis|storefront`.
- **Evidence**: The SFRA repository requires access, so its package name could not be verified `[TEST E03]`.
- **Classification**: needs verification.
- **Severity**: Low to Medium (Phase 1 records the SFRA version from this). **Roadmap**: E-08.

### F-09 Business Manager cartridge path is not modeled
- **Kit says**: `site-map.json` and the inventory hold storefront paths. `site-map.md` flags `bm_*` cartridges in storefront paths.
- **Evidence**: BM has its own path, readable with `b2c sites cartridges list --bm` `[FACT R01]`. Org-context Admin custom APIs and BM extensions resolve through it `[FACT R02]`. Organization-level hook customizations register on the BM site `[FACT S10]`.
- **Classification**: missing knowledge. The reachability checklist does mention the BM path, but nothing captures it.
- **Severity**: Medium. **Roadmap**: E-09.

### F-10 Template bullets under "Project conventions" are live instructions
- **Kit says**: an HTML comment explains how to fill the section, followed by example bullets such as "New storefront code goes in: `<cartridge>`" and "Never modify: `app_storefront_base`, `modules`, vendor integration cartridges (`int_<vendor>*`)".
- **Evidence**: Claude Code strips HTML comments but keeps the bullets `[FACT C02]`.
- **Classification**: ambiguity.
- **Why it matters**: Until Phase 2 fills the section, Claude reads placeholders as rules. `int_<vendor>*` can be read as `int_*`, which in many real projects would also cover project-owned integration cartridges.
- **Severity**: Medium. **Roadmap**: E-10.

### F-11 "Existing usage verifies the API" conflicts with the deprecation warning
- **Kit says**: `CLAUDE.md` tier 1 treats existing project usage as verification. `sfcc-sgjc` warns that older code may use deprecated methods.
- **Evidence**: Deprecations are marked in the Script API, for example `dw.svc.ServiceRegistry` `[FACT R03]`.
- **Classification**: contradiction between two kit files.
- **Severity**: Medium. **Roadmap**: E-11.

### F-12 OCAPI deprecation is not reflected
- **Evidence**: OCAPI is deprecated as of April 2026, new implementations must use SCAPI `[FACT S08]`. Projects with OCAPI extension cartridges on their site paths are directly affected.
- **Classification**: outdated platform behavior.
- **Severity**: Medium. **Roadmap**: E-12.

### F-13 Protection of base and vendor code is advisory only
- **Kit says**: the protected-cartridges rule asks Claude not to edit base, `modules` or vendor code.
- **Evidence**: rules are context. `Edit` deny rules or a PreToolUse hook enforce `[FACT C01]` `[FACT C02]`.
- **Classification**: inconsistent with the kit's own enforcement principle.
- **Severity**: Medium. **Roadmap**: E-13.

### F-14 The KB-impact hook misses some structural files
- **Kit says**: the hook watches controllers, pipelines, `hooks.json`, `steptypes.json`, `site.xml`, metadata XML, `services.xml` and cartridge `package.json`.
- **Not watched**: `rest-apis/**/schema.yaml` and `api.json`, `bm_extensions.xml`, `jobs.xml`, `steptypes.xml`, `preferences.xml`, Page Designer JSON under `experience/`, and `site-map.json` (excluded because it sits in `docs/ai/`).
- **Classification**: incomplete list.
- **Severity**: Low. **Roadmap**: E-14.

### F-15 Pipelines are reported as "sgjc"
- **Kit says**: the inventory treats pipelines as an SGJC signal. The `sfcc-sgjc` skill table correctly lists pipelines separately.
- **Evidence**: pipelines and SGJC are separate architectures with different execution models `[FACT S05]`.
- **Classification**: simplification.
- **Severity**: Low. **Roadmap**: E-15.

### F-16 Change impact looks for `superModule` only in controllers
- **Kit says**: "who extends this controller (`module.superModule` in cartridges to the left)".
- **Evidence**: `module.superModule` works for any module with the same path and name, including models and scripts `[FACT S02]`.
- **Severity**: Low. **Roadmap**: E-16.

### F-17 README and setup guide describe two different deployment modes
- README: commit the KB, append `.gitignore.additions`, replace `YOUR_ORG`, repos may keep their own `CLAUDE.md`. Setup guide: nothing at the root is committed, delete `.gitignore.additions`, delete the `sfcc-claude-kit` marketplace entry, exclude `CLAUDE.md` in repos.
- **Classification**: context-specific rules (shared team mode vs local-only mode), not an error. `.git/info/exclude` only affects untracked files, so a committed repo `CLAUDE.md` still loads.
- **Severity**: Low. **Roadmap**: E-17.

### F-18 `--check` depends on the working directory
- **Evidence**: inventory paths are written relative to the current directory. Running generation and `--check` from different directories reports the inventory as stale.
- **Classification**: undocumented constraint.
- **Severity**: Low. **Roadmap**: E-18.

### F-19 Site list import collapses empty columns
- **Evidence**: `split(/\t+/)` merges consecutive tabs, so a row with an empty Name shifts the ID into the Name column.
- **Classification**: genuine error (edge case).
- **Severity**: Low. **Roadmap**: E-19.

### F-20 The official-plugin coverage claim needs one refinement
- **Kit says**: the official plugins have no SGJC coverage.
- **Evidence**: The official `b2c-controllers` skill covers classic `.public = true` controllers, and the BM extensions skill covers `<exec pipeline node>` wiring. Neither covers `guard` or the `app` facade `[FACT R02]`.
- **Classification**: mostly correct, slightly overstated.
- **Severity**: Info. **Roadmap**: E-20.

### F-21 No coverage of headless storefronts or the newer official plugins
- **Evidence**: Storefront Next is Salesforce's recommended storefront, with an official hybrid path from SFRA `[FACT S06]`. Official plugins `storefront-next` and `b2c-ops` exist and are not installed by the kit `[FACT R01]`.
- **Classification**: future scope, not an error.
- **Severity**: Future. **Roadmap**: E-21.

### Items checked and found correct
- Node 22.16 requirement `[FACT R01]`.
- `site.xml` `<custom-cartridges>` parsing `[FACT R03]`.
- `steptypes.json` at the cartridge root and its step kinds `[FACT R02]`.
- `hooks.json` located through the cartridge `package.json` `[FACT S10]`.
- `b2c ods` exists as an alias of `sandbox` `[FACT R01]`.
- The `modules` observation in `site-map.md` is phrased as a question, which matches the official statement that `modules` need not be on the path `[FACT S01]`.

---

## 7. AI-agent failure points

| Failure | Current kit protection | Residual risk |
|---|---|---|
| Modify the wrong cartridge | Leftmost rule, change-impact skill | F-01 edge cases, F-02 hooks |
| Modify the wrong repository | Project map, "one repo is not one site" | Repositories are `TODO` in the current site map, so Phase 0 must finish first |
| Confuse SFRA and SGJC | SGJC skill and rule | Pipelines lumped with SGJC (F-15) |
| Invent APIs | Verification tiers | Tier 1 accepts deprecated usage (F-11) |
| Ignore cartridge precedence | Site map, override table | Hooks and client builds follow different rules (F-02, F-07) |
| Break extension patterns | Official skills | `server.append` around service calls duplicates side effects `[FACT S11]`. Not called out in the kit |
| Introduce incompatible code | SGJC skill forbids SFRA constructs in SGJC | None significant |
| Modify generated or build artifacts | Inventory marked generated | Compiled client output in `cartridge/static` not addressed |
| Change configuration incorrectly | `ask` rules | MCP tools and some commands ungated (F-03, F-05) |
| Target the wrong instance | Sandbox-only rule in prose | Upward `dw.json` search (F-06), no Safety Mode (F-04) |
| Break backward compatibility | "Never modify base" | Advisory only (F-13) |
| Ignore project conventions | Conventions section | Placeholders read as rules until filled (F-10) |
| Trust stale knowledge | Hook plus sync skill plus CI check | Unwatched structural files (F-14) |
| Treat an unreported item as nonexistent | "Trust the script" | Inventory gaps (F-07) |

---

## 8. Redundancy (identified, not removed)

| Topic | Appears in | Assessment |
|---|---|---|
| Leftmost-wins explanation | `CLAUDE.md`, `sfcc-hybrid-migration`, `sfcc-sgjc`, `site-map.md`, `project-map.md` | Useful reinforcement. Any correction (E-04) must be applied everywhere at once |
| Reachability questions | `sfcc-hybrid-migration`, `sfcc-sgjc` rule, `sfcc-kb-init` Phase 4 | Single source in the skill, others point to it. Fine |
| Secrets rule | `CLAUDE.md`, agent, `sfcc-kb-init`, `settings.json` | Intentional defense in depth |
| Status values for migration | `sfcc-hybrid-migration`, `sfcc-kb-init`, `migration.md` | Must stay identical. A shared definition would prevent drift |
| Setup steps | README, setup guide | Two modes (F-17) |

---

## 9. Test evidence (E01)

A synthetic workspace with one SFRA cartridge and one SGJC cartridge was scanned with the kit's inventory script.

| Planted item | Reported |
|---|---|
| `server.extend` plus `server.append('Show', ...)` | Yes, `Cart-Show (append)` |
| `server.get(ROUTE, ...)` with a variable | No |
| `hooks.json` through `package.json` | Yes |
| `steptypes.json` script-module step | Yes |
| `LocalServiceRegistry.createService(ID, ...)` with a constant | No |
| `dw.system.Site.getCurrent()` without `require` | No |
| `importPackage(dw.system)` in a `.ds` pipelet | Yes |
| `rest-apis/my-api/schema.yaml` | No |
| `experience/components/...json` | No |
| `exports.Show = guard.ensure(...)` | Yes, `Cart-Show (guard)` |
| `exports.AddProduct = add` plus `.public = true` | No |
| `pipelines/Old.xml` | Yes, as `Old (pipeline)` without start nodes |
| `require('app_storefront_controllers/...')` | Yes, as a cross-cartridge require and SGJC signal |
| `site.xml` custom cartridges | Yes, with `app_storefront_base` reported as not found locally |

---

## 10. Automation opportunities

| Determination | Possible automation |
|---|---|
| Project architecture | Extend inventory signals with classic `.public`, pipeline start nodes, `rest-apis`, `experience`, `bm_extensions.xml`, headless `package.json` dependencies |
| Active implementation per site | Resolve the override table per site in the script instead of in the model (Phase 3 does this by hand today) |
| Hook participation | Per site, list every cartridge registering each extension point, in path order |
| Legacy vs `_sfra` precedence | Report which variant of each pair wins per site in `site-map.md` |
| Repository relationships | Propose `repositories` in `site-map.json` from the inventory's Repo column automatically |
| Deprecated API usage | Cross-check `dw.*` usage against deprecations in the bundled Script API (`b2c docs read --json`) |
| Environment and instance | Record which `dw.json` each repo would resolve to, and flag when they differ from the root |
| Safety posture | A `doctor` check: Safety Mode level, MCP `ask` rules present, default permission mode |
| Kit regression testing | `claude plugin eval` with the README's starter prompts `[FACT C03]` |
