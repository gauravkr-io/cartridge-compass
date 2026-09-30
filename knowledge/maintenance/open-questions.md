---
title: Open questions and knowledge gaps
applies_to: all
read_when: Before relying on an uncertain area
last_verified: 2026-09-26
---

# Open questions and knowledge gaps

Evidence labels and source IDs: see [INDEX.md](../INDEX.md) and [sources.md](../sources.md).

| ID | Question | Why it matters | Current understanding | What would resolve it |
|---|---|---|---|---|
| Q01 | Latest SFRA release and the root `package.json` name | Version reporting | Mitigated in 1.0.0: the inventory also recognizes base SFRA by folder structure (`app_storefront_base` plus `modules/server`) `[TEST E01]`. The release list itself still requires access `[TEST E03]` | Check the project's vendored SFRA or the GitHub releases page with access |
| Q02 | Exact permission names for plugin-installed MCP tools | Ask rules for state-changing MCP tools | Mitigated in 1.0.0: ask rules use the glob form `mcp__*__<tool>`, which Claude Code accepts for ask and deny rules `[FACT C01]`. Tool names confirmed in the b2c-dx-mcp source of R01 `[FACT R01]`. The full name of a plugin-installed server is still not verified | Run `/permissions` in a session with the plugin installed and read the listed names |
| Q03 | Effect of listing `modules` on a cartridge path | Seen in real paths | Not required `[FACT S01]` | Official statement or sandbox test |
| Q04 | How the BM path appears in site import archives | Inventory reads only storefront `site.xml` | Not verified | Export a site archive from a sandbox |
| Q05 | Duplicate cartridge names in one code version | Kit warns about it | Plausible, not verified | Official doc on code upload |
| Q06 | Whether guard sets `.public` internally | Affects route detection of SGJC | Consistent with classic controllers | Read the project's `guard.js` |
| Q07 | `steptypes.json` vs `steptypes.xml` precedence | Job step inventory | The 1.0.0 inventory reads both formats. Which wins when a cartridge has both is not established | Official custom job steps page |
| Q08 | OCAPI end-of-life date | Migration planning | "Two more years" from April 2026 `[FACT S08]`, exact date not stated | Salesforce deprecation notice |
| Q09 | Storefront Next general availability details | Future kit scope | Recommended option `[FACT S06]` | Storefront Next release notes |
| Q10 | Pipeline route naming and start nodes | Pipeline route inventory | `Pipeline-StartNode` `[ASSUMPTION]`. The 1.0.0 inventory reads `<start-node name="...">` best-effort and falls back to the pipeline name. The XML shape was not verified against a real pipeline | A real pipeline file or legacy pipeline docs |
| Q11 | Page Designer support on SGJC and pipelines | Matrix gap | Unknown | Page Designer developer guide |
| Q12 | Current status of `sfcc-ci` | Official page still lists it | Unknown | `sfcc-ci` repository status |
| Q13 | Page Designer in PWA Kit without ISML | Future headless work | Seen only in a search snippet of a Salesforce blog, not fetched | Read the March 2026 Salesforce developer blog post |
| Q14 | Other `server` methods beyond get, post, use, append, prepend, replace, extend | Route inventory | Not established | SFRA JSDoc for the `server` module |
