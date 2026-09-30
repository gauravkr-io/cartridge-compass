---
name: sfcc-kb-sync
description: Keep the SFCC knowledge base in docs/ai/ in sync after code changes. Use when a KB impact reminder appears, before finishing any task that added or changed routes, hooks, job steps, services, metadata, cartridge paths, cartridge responsibilities or SGJC/SFRA migration status, and when the user asks to update the docs or KB. Not needed for internal logic changes that alter no structure or behavior documented in docs/ai/.
---

# Sync the knowledge base after a change

Stale knowledge is worse than no knowledge, because Claude trusts it. This procedure keeps updates small and targeted.

## Steps

1. **Regenerate facts**: run `node "${CLAUDE_PLUGIN_ROOT}/scripts/sfcc-inventory.mjs" <repo roots> --out docs/ai/generated` with the same roots recorded in `docs/ai/.kb-state.md` (add `--sites docs/ai/site-map.json` if that file exists). If `docs/ai/` is under git, `git diff docs/ai/generated` shows what changed mechanically. Otherwise read the regenerated sections that relate to the change.
2. **Decide which human-maintained docs are affected**, using the diff and the change you made:

| Change | Update |
|---|---|
| Cartridge path changed in Business Manager | `site-map.json` (edit it, or re-import with `sfcc-sitemap.mjs --import`), then regenerate `site-map.md` |
| Repository added, removed, renamed or re-typed | `docs/ai/repositories.md` (the user's file: propose the edit, do not rewrite sections), then `node <kit>/bin/sfcc-kit.mjs sync` |
| New SCAPI custom API, BM extension, job definition or Page Designer component | `project-map.md` and the API usage index |
| New or removed cartridge, cartridge now used by another site | `project-map.md` |
| SGJC code replaced, newly referenced or removed, or a new SFRA replacement | `migration.md` |
| A traced flow's path changed (new step, helper, service, template) | `flows/<flow>.md` |
| A site-only behavior changed | `sites/<site-id>.md` |
| A deliberate design choice was made that future readers need the reason for | `decisions.md` |
| Only internal logic, no structure change | Nothing. Say so and stop. |

3. **Edit minimally.** Change only the affected rows or marker sections (`<!-- kb:auto:start ... -->`). Do not rewrite surrounding text, reorder tables, or restyle files. Keep confidence labels accurate: something you just implemented and read back is `[code]`.
4. **Keep rules in step with the map.** If a cartridge's classification or sharing changed, update the `paths:` globs in the matching `.claude/rules/` file.
5. **Report** in one or two lines which docs changed and why, so the user can review them in the same commit as the code.
