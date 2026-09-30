# Contributing

Thank you for helping. This kit is used across organizations, so every change must stay generic, verifiable and safe.

## Ground rules

1. **No organization-specific content.** No company, realm, site, cartridge, instance or person names in the kit. Use placeholders such as `BrandA`, `app_custom_brand`, `<sandbox>`. Project facts belong in each project's `docs/ai/`.
2. **No secrets**, even fake-looking ones. Use `<placeholder>`.
3. **Evidence for Salesforce claims.** Every platform fact needs a source in `knowledge/sources.md`. Official documentation first. See [docs/KNOWLEDGE-MAINTENANCE.md](docs/KNOWLEDGE-MAINTENANCE.md).
4. **Optional stays optional.** A new setting must have a safe default and a "not configured" state. Add a test proving the kit works without it.
5. **Safety first.** Kit code never reads credentials, never writes inside application repositories, never runs Git commands that change state, and never downloads anything.
6. **Small context.** Always-on text (the `CLAUDE.md` block) must stay short. Put procedures in skills and facts in knowledge files.
7. **Writing style.** Plain, precise English. No em dashes or semicolons in prose. No AI-attribution comments.

## How to propose a change

Open an issue describing the problem, the evidence, and the smallest change that fixes it. For knowledge corrections include the source URL and the date you checked it.

## Common changes

| Change | Steps |
|---|---|
| Correct or add knowledge | Edit the file under `knowledge/`, add or update the source, update `last_verified`, run `npm run validate` |
| Add a Salesforce reference | Add it to `knowledge/sources.md` with ID, URL, what it establishes, applicability, access and date |
| Support a new architecture | Add the type to `TYPES` in `lib/repositories.mjs`, signals in `lib/detect.mjs`, a routing row in `knowledge/INDEX.md`, a knowledge file, and a scenario test with a fixture in `test/helpers.mjs` |
| Change setup | Keep it idempotent. Add a test for a second run and for an existing user file. If project files change shape, bump `CONFIG_VERSION` and add a migration test |
| Add a permission | Edit `templates/settings.kit.json`. Explain the risk it addresses in the pull request |
| Change a skill | Keep instructions consistent with `knowledge/`. Rules that appear in several files must change together |

## Tests

```bash
npm run check
```

Runs `scripts/validate-kit.mjs` and all tests. Pull requests must pass it. Tests must not touch the network or the real home directory.

## Releases

Releases are published in fixed windows: March and September always, June and December only when changes have accumulated, and patch releases at any time for urgent issues. See [docs/KNOWLEDGE-MAINTENANCE.md](docs/KNOWLEDGE-MAINTENANCE.md).

1. Update `CHANGELOG.md` with the three impact lines (rerun setup, configuration change, agent behavior).
2. Bump the version in `package.json` and `plugin/.claude-plugin/plugin.json` together. `npm run validate` checks they match.
3. Tag the release `vX.Y.Z`.
