# Recommended Future Enhancements

Proposals only. Nothing here has been applied to the kit. Each item links to a finding in `KIT-ANALYSIS.md` and to sources in `SFCC-KNOWLEDGE-BASE.md`.

## Priority scale

| Priority | Meaning |
|---|---|
| Critical | Can change a live instance or data without the user approving it |
| High | Likely to produce wrong code, wrong placement or silent breakage in normal use |
| Medium | Produces incomplete knowledge or confusion, usually caught in review |
| Low | Edge cases, polish, documentation clarity |
| Future | New scope rather than a correction |

## Summary

| ID | Enhancement | Priority | Finding |
|---|---|---|---|
| E-01 | Gate MCP tools that change state | Critical | F-03 |
| E-02 | Adopt official Safety Mode | Critical | F-03, F-04 |
| E-03 | Complete the `ask` list for state-changing CLI commands | High | F-05 |
| E-04 | Correct resolution rules for controllers and hooks | High | F-01, F-02 |
| E-05 | Pin the `dw.json` the CLI uses | Medium | F-06 |
| E-06 | Close inventory detection gaps | Medium | F-07 |
| E-07 | Document inventory limits where the kit says "trust the script" | Medium | F-07 |
| E-08 | Detect SFRA by structure, not package name | Medium | F-08 |
| E-09 | Model the Business Manager cartridge path | Medium | F-09 |
| E-10 | Make convention placeholders inert | Medium | F-10 |
| E-11 | Split "exists" from "current" in API verification | Medium | F-11 |
| E-12 | Record OCAPI deprecation and flag new OCAPI usage | Medium | F-12 |
| E-13 | Enforce protection of base and vendor cartridges | Medium | F-13 |
| E-14 | Watch more structural files in the KB hook | Low | F-14 |
| E-15 | Separate pipelines from SGJC in classification | Low | F-15 |
| E-16 | Follow `superModule` beyond controllers in impact analysis | Low | F-16 |
| E-17 | Document the two deployment modes | Low | F-17 |
| E-18 | Document the `--check` working-directory constraint | Low | F-18 |
| E-19 | Fix empty-column handling in site list import | Low | F-19 |
| E-20 | Refine the official-plugin coverage statement | Low | F-20 |
| E-21 | Headless and Storefront Next support | Future | F-21 |
| E-22 | Regression-test the kit with plugin evals | Future | Section 10 of analysis |

---

## E-01 Gate MCP tools that change state
- **Problem**: `b2c-dx-mcp` tools can deploy, activate, upload, write Admin API data and publish bundles. The kit's `ask` rules only match Bash.
- **Why it matters**: Auto mode is now Claude Code's default, and tool calls without an `ask` rule can proceed after classifier review instead of user approval.
- **Current kit behavior**: `enabledPlugins` turns the MCP server on with no MCP rules.
- **Recommended change**: Add `ask` rules for `cartridge_deploy`, `webdav_put`, `scapi_execute`, `mrt_bundle_push`, `debug_evaluate` and `debug_set_breakpoints`, using the exact tool names shown by `/mcp` (Q02). Optionally restrict toolsets with `SFCC_TOOLSETS` to what the project uses.
- **Expected benefit**: Every instance-changing action through MCP requires explicit approval, consistent with `CLAUDE.md` "Tools".
- **Risk**: Wrong tool names silently match nothing. Ask and deny rules with unknown names produce a startup warning unless they contain `_` or `*` `[FACT C01]`, so verify with `/permissions` after adding.
- **Priority reasoning**: Critical because the gap allows unapproved changes to an instance.
- **Evidence**: `[FACT R01]` (docs/mcp/toolsets.md, security.md, configuration.md), `[FACT C01]`, `[FACT C03]`.

## E-02 Adopt official Safety Mode
- **Problem**: Claude Code rules match command text and tool names. They do not stop `npx b2c`, a script that calls the CLI, or an MCP tool not listed.
- **Why it matters**: Safety Mode is enforced inside the CLI, IDE extension and MCP server themselves.
- **Current kit behavior**: Not mentioned in the guide or template.
- **Recommended change**: In the setup guide, add a `"safety": {"level": "READ_ONLY"}` block to the root `dw.json` for investigation work, with command rules such as `{"command": "code:deploy", "action": "confirm"}` when deploys are wanted. Mention `SFCC_SAFETY_LEVEL` for one-off sessions. Add a check to `/sfcc-kb-init` Phase 1 that reports the effective level.
- **Expected benefit**: A second, independent enforcement layer that matches the kit's own principle.
- **Risk**: `READ_ONLY` also blocks POST-based searches, which need explicit exceptions `[FACT R01]`. Confirm rules block in non-interactive runs.
- **Priority reasoning**: Critical as the backstop for E-01 and E-03.
- **Evidence**: `[FACT R01]` (docs/guide/safety.md, docs/guide/configuration.md).

## E-03 Complete the `ask` list for state-changing CLI commands
- **Problem**: Command groups added to the CLI are not covered.
- **Current kit behavior**: `ask` covers code, job, sites cartridges, webdav, sandbox, ods, preferences, slas, ecdn, mrt.
- **Recommended change**: Add `Bash(b2c scapi replications *)`, `Bash(b2c am *)`, `Bash(b2c bm *)` (consider allowing `b2c bm whoami` explicitly), `Bash(b2c cap install *)`, `Bash(b2c cap uninstall *)`, `Bash(b2c setup instance *)`, `Bash(b2c setup default-config *)`, and deny `Bash(b2c auth token *)` and `Bash(b2c auth client *)` because they print tokens.
- **Expected benefit**: Prompts for replication, user and role changes, app installs and configuration changes.
- **Risk**: Minor extra prompts. Denying `auth token` may block a legitimate debugging flow. Users can still run it themselves.
- **Priority reasoning**: High because replication publishes data between instances.
- **Evidence**: `[FACT R01]` (packages/b2c-cli/src/commands), `[FACT C01]`.

## E-04 Correct resolution rules for controllers and hooks
- **Problem**: F-01 and F-02.
- **Current kit behavior**: "Leftmost file that registers the route" and no hook resolution rule.
- **Recommended change**: In `sfcc-hybrid-migration` and `sfcc-change-impact`, state that the platform selects the first controller file by name without checking the function, that a missing function errors, that controllers are searched across the whole path before pipelines, and that all hook registrations run in path order with Shopper API return values short-circuiting. Update `CLAUDE.md` step 2 with one line: "Controllers and templates: leftmost wins. Hooks: all run in path order."
- **Expected benefit**: Correct placement of fixes and correct impact statements for hooks.
- **Risk**: The rule appears in several files. Change all at once (see analysis section 8).
- **Priority reasoning**: High because both errors produce code that deploys and silently misbehaves.
- **Evidence**: `[FACT S01]`, `[FACT S02]`, `[FACT S09]`, `[FACT S10]`.

## E-05 Pin the `dw.json` the CLI uses
- **Problem**: The CLI searches for `dw.json` upward from the current directory.
- **Current kit behavior**: Guide says the CLI reads `./dw.json`.
- **Recommended change**: Correct the guide sentence. Add to `CLAUDE.md` Tools: run `b2c` only from the workspace root, or pass `--config ./dw.json`. Optionally set `SFCC_CONFIG` in the workspace `.claude/settings.json` `env` block.
- **Expected benefit**: The target instance no longer depends on which folder Claude happens to be in.
- **Risk**: None significant.
- **Priority reasoning**: Medium because repos often carry their own `dw.json`, which may point elsewhere.
- **Evidence**: `[FACT R01]` (dw-json.ts `findDwJson`).

## E-06 Close inventory detection gaps
- **Problem**: F-07.
- **Recommended change**: Add detection for classic `.public = true` routes, variable route names (report as `Controller-<dynamic>` rather than dropping them), `rest-apis/*/schema.yaml` and `api.json`, `experience/` components, `bm_extensions.xml`, `steptypes.xml`, pipeline start nodes, `importClass`, global `dw.*` references, and service IDs passed as identifiers (report the identifier name). Add `client/` to a separate build-time override table.
- **Expected benefit**: Fewer items invisible to the "facts from the script" rule.
- **Risk**: More false positives from broader regexes. Keep output labeled as signals.
- **Priority reasoning**: Medium. Phase 2 subagent reading catches some of these.
- **Evidence**: `[TEST E01]`, `[FACT R02]`, `[FACT S11]`.

## E-07 Document inventory limits where the kit says "trust the script"
- **Problem**: `sfcc-kb-init` says never hand-count routes, hooks or services.
- **Recommended change**: Add a "Known blind spots" list to the generated `inventory.md` header and one line in `sfcc-kb-init`: absence from the inventory is not evidence of absence.
- **Expected benefit**: Prevents false "not found" conclusions.
- **Risk**: None.
- **Priority reasoning**: Medium. Cheap and directly reduces a failure mode.
- **Evidence**: `[TEST E01]`.

## E-08 Detect SFRA by structure, not package name
- **Problem**: F-08.
- **Recommended change**: Detect a repository containing `cartridges/app_storefront_base` and `cartridges/modules/server`, then read that repository's root `package.json` version whatever its name.
- **Expected benefit**: Reliable SFRA version in Phase 1.
- **Risk**: Vendored copies with modified layout. Report "not detected" rather than guessing.
- **Priority reasoning**: Medium because plugin versions must match the base version tag `[FACT S07]`.
- **Evidence**: `[TEST E03]`, `[FACT S07]`.

## E-09 Model the Business Manager cartridge path
- **Problem**: F-09.
- **Recommended change**: Add an optional `businessManager` entry (site `Sites-Site`) to `site-map.json`, import it from `b2c sites cartridges list --bm`, and add `site-map.md` checks: `bm_*` cartridges missing from the BM path, and cartridges with `rest-apis/` that are not on the BM path.
- **Expected benefit**: Resolves the current "bm_* in storefront path" questions with data.
- **Risk**: Schema change to `site-map.json`. Keep it optional for backward compatibility.
- **Priority reasoning**: Medium. The project has 3 `bm_*` cartridges in storefront paths.
- **Evidence**: `[FACT R01]`, `[FACT R02]`, `[FACT S10]`.

## E-10 Make convention placeholders inert
- **Problem**: F-10.
- **Recommended change**: Move the example bullets inside the HTML comment, and replace them with one live line: "Project conventions not yet established. Ask before choosing a cartridge." Replace `int_<vendor>*` with an explicit list filled during Phase 2.
- **Expected benefit**: No placeholder rules before Phase 2. No accidental protection of project-owned `int_*` code.
- **Risk**: None.
- **Priority reasoning**: Medium. Affects every session until conventions are filled.
- **Evidence**: `[FACT C02]`.

## E-11 Split "exists" from "current" in API verification
- **Problem**: F-11.
- **Recommended change**: Amend tier 1 in `CLAUDE.md`: existing usage proves the API exists. When copying it into new code, check deprecation with `b2c docs read`.
- **Expected benefit**: Stops deprecated patterns spreading from legacy code.
- **Risk**: Slightly more verification calls.
- **Priority reasoning**: Medium.
- **Evidence**: `[FACT R03]`.

## E-12 Record OCAPI deprecation and flag new OCAPI usage
- **Problem**: F-12.
- **Recommended change**: Add to `CLAUDE.md`: OCAPI is deprecated (April 2026). Do not add new OCAPI endpoints or OCAPI-only settings without the user's explicit agreement. In Phase 5, mark OCAPI usage in the API index as deprecated and list SCAPI equivalents from the official mapping.
- **Expected benefit**: Migration awareness at the point of change.
- **Risk**: Hooks are shared by OCAPI and SCAPI `[FACT S14]`. Do not flag `dw.ocapi.shop.*` hook names as OCAPI-only.
- **Priority reasoning**: Medium. Affects 11 sites in this project.
- **Evidence**: `[FACT S08]`, `[FACT S14]`.

## E-13 Enforce protection of base and vendor cartridges
- **Problem**: F-13.
- **Recommended change**: Add `Edit(**/app_storefront_base/**)` and `Edit(**/modules/server/**)` to `deny` in `settings.json`, plus confirmed vendor cartridges after Phase 2. Keep the rule file for the explanation.
- **Expected benefit**: Protection that holds regardless of what Claude decides.
- **Risk**: Blocks legitimate SFRA upgrades. Document that upgrades are done by a human or with the rule temporarily removed.
- **Priority reasoning**: Medium. Editing base voids Salesforce's compatibility guarantee `[FACT S01]`.
- **Evidence**: `[FACT C01]`, `[FACT S01]`.

## E-14 Watch more structural files in the KB hook
- **Problem**: F-14.
- **Recommended change**: Add patterns for `rest-apis/**/schema.yaml`, `rest-apis/**/api.json`, `bm_extensions.xml`, `jobs.xml`, `steptypes.xml`, `preferences.xml`, and `experience/**/*.json`.
- **Expected benefit**: KB sync reminders for custom APIs, jobs and Page Designer.
- **Risk**: More reminders. The once-per-category design limits noise.
- **Priority reasoning**: Low.
- **Evidence**: kit `kb-impact.mjs`, `[FACT R02]`.

## E-15 Separate pipelines from SGJC in classification
- **Problem**: F-15.
- **Recommended change**: Add a `pipeline` signal and classification value, and allow `hybrid` to name which legacy style is present.
- **Expected benefit**: Correct tracing strategy per cartridge.
- **Risk**: Changes inventory output, so the CI check will report stale once.
- **Priority reasoning**: Low.
- **Evidence**: `[FACT S05]`.

## E-16 Follow `superModule` beyond controllers in impact analysis
- **Problem**: F-16.
- **Recommended change**: In `sfcc-change-impact` step 3, search for `module.superModule` in any file with the same relative path, including models and scripts.
- **Expected benefit**: Complete dependent lists for model changes.
- **Risk**: None.
- **Priority reasoning**: Low.
- **Evidence**: `[FACT S02]`.

## E-17 Document the two deployment modes
- **Problem**: F-17.
- **Recommended change**: Add a short "Shared mode vs local-only mode" table to the README covering where the KB lives, whether it is committed, the marketplace entry, and repo `CLAUDE.md` files.
- **Expected benefit**: Teammates follow one consistent setup.
- **Risk**: None.
- **Priority reasoning**: Low.
- **Evidence**: README, setup guide.

## E-18 Document the `--check` working-directory constraint
- **Recommended change**: Note in the README's CI section that generation and `--check` must run from the same directory, or make output paths relative to the `--out` folder.
- **Priority reasoning**: Low.
- **Evidence**: `sfcc-inventory.mjs` `rel()`.

## E-19 Fix empty-column handling in site list import
- **Recommended change**: Split on single tabs and trim, then validate that the ID column is non-empty and matches a site ID pattern. Report malformed rows in `importNotes`.
- **Priority reasoning**: Low. Business Manager exports normally fill every column.
- **Evidence**: `sfcc-sitemap.mjs` import loop.

## E-20 Refine the official-plugin coverage statement
- **Recommended change**: Reword to: the official plugins cover SFRA and classic `.public` controllers but not SGJC `guard`, the `app` facade or pipelines.
- **Priority reasoning**: Low.
- **Evidence**: `[FACT R02]`.

## E-21 Headless and Storefront Next support
- **Problem**: The kit covers cartridge storefronts only.
- **Recommended change**: When the first headless project appears, add a workspace type detector (PWA Kit, Storefront Next), install the official `storefront-next` plugin, gate MRT deploys, and add a `sfcc-hybrid-storefront` skill that links eCDN routing, Hybrid Auth and SFRA-owned routes. Consider the `b2c-ops` plugin for production triage runbooks.
- **Expected benefit**: The same safety and knowledge model for headless projects.
- **Risk**: Scope growth. Keep headless material in separate skills so SFRA projects pay no context cost.
- **Priority reasoning**: Future. No headless code is in scope today.
- **Evidence**: `[FACT S06]`, `[FACT S12]`, `[FACT R01]`, `[FACT R02]`.

## E-22 Regression-test the kit with plugin evals
- **Problem**: The README recommends re-running real prompts by hand after kit changes.
- **Recommended change**: Turn the README's starter prompts into `claude plugin eval` cases with and without the plugin.
- **Expected benefit**: Measurable effect of each kit change.
- **Risk**: Eval maintenance effort.
- **Priority reasoning**: Future.
- **Evidence**: `[FACT C03]`.

---

## Suggested order of work

1. E-01, E-02, E-03 together, since they form one safety change to `settings.json`, the guide and `dw.json`.
2. E-04 and E-10, which change the text Claude reads every session.
3. E-05, E-11, E-12, E-13.
4. E-06, E-07, E-08, E-09 as one inventory and site map release, then bump the plugin version.
5. Low items as convenient. Future items when a headless project starts.
