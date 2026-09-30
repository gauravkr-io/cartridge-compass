# Versioning and upgrading

## Versions

| Version | Where | Changes when |
|---|---|---|
| Kit version | `package.json` and `plugin/.claude-plugin/plugin.json`, always equal | Every release. Semantic versioning |
| Configuration version | `CONFIG_VERSION` in `lib/project-files.mjs`, recorded in `.sfcc-kit/state.json` | The shape or location of project files changes |
| Mapping format | `Format:` in `repositories.md` | The mapping grammar changes |

Semantic versioning for the kit:

- **Major**: a configuration migration is required, a command or file location is removed, or agent behavior changes in a way that could change code the agent writes.
- **Minor**: new types, detection signals, knowledge, commands, rules or permissions. Existing configuration keeps working.
- **Patch**: fixes and knowledge corrections.

The changelog states, for each release, whether setup must be rerun, whether configuration changed, and whether agent behavior changed.

## Upgrading

```bash
git -C cartridge-compass pull
node cartridge-compass/bin/sfcc-kit.mjs setup --dry-run
node cartridge-compass/bin/sfcc-kit.mjs setup
node cartridge-compass/bin/sfcc-kit.mjs doctor
```

Then update the `sfcc-kb` plugin from `/plugin` in Claude Code, because Claude Code runs an installed copy of the plugin rather than the kit folder.

What setup does on upgrade:

- Refreshes the kit block in `CLAUDE.md`. Your content outside the block is untouched.
- Adds new kit permissions to `.claude/settings.json`. Nothing of yours is removed.
- Updates the kit rules if you have not edited them. If you have, your file stays and the new version is written as `<name>.kit-new`.
- Never changes `repositories.md`, `site-map.json` or other project knowledge.
- Backs up every file it replaces to `.sfcc-kit/backups/<timestamp>/`.
- Refuses to run if the workspace was set up by a newer kit.

## Upgrading from 0.1

0.1 was installed by copying `project-template/` into the root. Setup recognizes that layout:

| 0.1 file | What 1.0 setup does |
|---|---|
| `CLAUDE.md` from the template | Keeps your project name and your "Project conventions" section, replaces the rest with the kit block, backs up the old file |
| `.claude/settings.json` | Adds new permissions, removes only the `YOUR_ORG/sfcc-claude-kit` placeholder marketplace |
| `.claude/rules/sfcc-protected-cartridges.md` and `sfcc-sgjc-cartridges.md` | Replaced if unchanged from the 0.1 template. Kept if you or Phase 7 edited them, with `.kit-new` beside them |
| `.claude/rules/sfcc-shared-cartridges.md` | Not managed. Left alone |
| `docs/ai/*` | Kept. `repositories.md` is created from discovery |
| `site-map.json` with `"repositories": [{"name": "TODO"}]` | Kept. Record repositories in `repositories.md` instead |

After upgrading from 0.1, move any content that Phase 7 wrote into `sfcc-sgjc-cartridges.md` to a project rule such as `sfcc-project-legacy.md`, then delete the old file and run setup so the kit rule is installed.

## Switching to the cartridge-compass marketplace

Installs made before the rename enable the plugin as `sfcc-kb@sfcc-claude-kit`. That keeps working, and setup never changes it. Switch when convenient, in a quiet moment rather than mid-task:

1. Clone or unzip the new kit next to the old one, as `cartridge-compass`. Keep the old folder until the switch is done.
2. From the project root, run `node cartridge-compass/bin/sfcc-kit.mjs setup`. The `CLAUDE.md` block now points to the new folder.
3. `claude plugin marketplace add ./cartridge-compass`, then `claude plugin install sfcc-kb@cartridge-compass --scope project`.
4. In `/plugin`, disable or uninstall `sfcc-kb@sfcc-claude-kit` and remove the `sfcc-claude-kit` marketplace, so the plugin is not loaded twice. Then check that `sfcc-kb@sfcc-claude-kit` no longer appears under `enabledPlugins` in `.claude/settings.json`, and delete that line if it does.
5. Start a new session. `/plugin` should list `sfcc-kb` once, from `cartridge-compass`. Run setup once more so the new plugin ID is recorded, then delete the old kit folder.

## Rolling back

Check out the previous kit tag, then restore files from `.sfcc-kit/backups/<timestamp>/` if needed. Project configuration is never changed by an upgrade, so it needs no rollback.
