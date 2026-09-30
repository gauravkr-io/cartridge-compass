# Project map

Status: **incomplete. Run /sfcc-kb-init**
Workspace roots scanned: <!-- kb:auto:start roots --><!-- kb:auto:end roots -->

## Repositories

The repository list and each repository's type are owned by `docs/ai/repositories.md`. This table adds what /sfcc-kb-init learned (purpose, which sites each serves). If the two disagree, repositories.md wins and the difference is an open question.

<!-- kb:auto:start repos -->
| Repository | Path | Purpose | Type (site-specific / shared / common) | Sites |
|---|---|---|---|---|
<!-- kb:auto:end repos -->

## Sites and cartridge paths

Cartridge path is leftmost-wins for controllers, templates and modules. Hooks registered by several cartridges all run, in path order. Source column says where the path was confirmed (site map / repo site.xml / instance / user). A site with no confirmed path is marked not configured, never guessed.

<!-- kb:auto:start sites -->
| Site ID | Site name | Repository | Cartridge path | Source | Discrepancies |
|---|---|---|---|---|---|
<!-- kb:auto:end sites -->

## Cartridges

<!-- kb:auto:start cartridges -->
| Cartridge | Repo | Sites | Shared? | Classification | Evidence | Confidence |
|---|---|---|---|---|---|---|
<!-- kb:auto:end cartridges -->

## Environment

<!-- kb:auto:start env -->
- SFRA version:
- Build / lint / test per repo:
- CI:
<!-- kb:auto:end env -->

## Notes from the team

(Human-maintained. Never overwritten by tooling.)
