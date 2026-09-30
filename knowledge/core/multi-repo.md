---
title: Multi-cartridge and multi-repository reasoning
applies_to: all
read_when: Work spanning several cartridges, repositories or sites
last_verified: 2026-09-26
---

# Multi-cartridge and multi-repository reasoning

Evidence labels and source IDs: see [INDEX.md](../INDEX.md) and [sources.md](../sources.md).

### 7.1 Questions to answer before editing

| Question | Where the answer comes from |
|---|---|
| Which repository am I in, and what does it own? | Project map, `git remote -v` |
| Which sites include this cartridge? | Site map |
| Is this cartridge brand-named but shared? | Site map "brand-named cartridges used by other brands" `[KIT]` |
| Where is the cartridge path defined? | Business Manager, `site.xml` in import archives, or the site map `[KIT]` |
| Which cartridges on the path are not in the workspace? | Inventory "not found locally" `[KIT]` |
| Which cartridges exist locally but are on no path? | Inventory "unused locally" (BM-only, jobs-only, dead) `[KIT]` |
| Is this cartridge also on the BM path? | `b2c sites cartridges list --bm` `[FACT R01]` |
| Is the file built at deploy time (client JS, SCSS) or resolved at runtime? | `package.json` `paths` `[FACT S11]` |

### 7.2 Rules

- Never assume one repository equals one site. `[KIT]`
- A shared cartridge change ships to every site that includes it. `[KIT]`
- Site-specific behavior belongs in the site's cartridge or behind a site preference the project already uses. `[KIT]`
- Generated or compiled output (for example `cartridge/static/*/js` produced by a build) should not be edited by hand. `[PRACTICE]` Confirm the build's output folders per project.
