# Troubleshooting

Start with:

```bash
node cartridge-compass/bin/sfcc-kit.mjs doctor
```

| Symptom | Cause | Fix |
|---|---|---|
| `The project root ... is inside a Git repository` | You ran setup inside a repository, or the root folder is itself a repository | Run from the folder that contains your repositories, or pass `--root`. Use `--allow-git-root` only for shared mode |
| `The project root cannot be the kit folder` | Ran with `--root` pointing at the kit | Point `--root` at the parent folder |
| A repository is missing from `repositories.md` | It is nested deeper than one level, or it is a plain folder with no SFCC evidence | Add a section with `Path` |
| Wrong or `unknown` architecture | Detection found no or misleading evidence | Run `detect` to see the evidence, then set `Type` in `repositories.md` |
| Context says "Detection also found ..." | Your configured type differs from detection | Intended if you chose the type deliberately. Otherwise fix the mapping |
| `CLAUDE.md contains only one sfcc-kit marker` | A marker was deleted or edited | Restore both markers, or remove both and rerun setup |
| `.claude/settings.json was not changed` | The file is not valid JSON | Fix the JSON, rerun setup |
| A `.kit-new` file appeared in `.claude/rules/` | You edited a kit rule | Compare, merge what you want into a project rule, delete the kit file and the `.kit-new`, rerun setup |
| `/context` does not list `CLAUDE.md` | Claude Code started in a subfolder | Start `claude` from the project root |
| Skills such as `/sfcc-kb-init` are missing | Plugin not installed or not updated | `/plugin`, then install or update `sfcc-kb` |
| Agent still uses old instructions after an upgrade | Plugin not updated, or an old session | Update the plugin, start a new session |
| `b2c` targets an unexpected instance | A `dw.json` inside a repository was found first | Run `b2c` from the root or pass `--config ./dw.json`. `doctor` lists such files |
| Setup ran on the wrong folder | | `uninstall --apply --root <that folder>`. This also deletes `docs/ai` and `.sfcc-kit/backups` |
| Detection is slow or incomplete on a very large repository | The scan stops after 25,000 files | Set the type in `repositories.md`. Detection is then only used for notes |
