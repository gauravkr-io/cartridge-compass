# Security

## Reporting

Report vulnerabilities privately to the repository maintainers rather than in a public issue.

## Security model

| Concern | Protection |
|---|---|
| Credentials | Kit code never opens `dw.json`, `.env*` or key files. Kit settings deny them to the agent. Docs reference where credentials are configured, never values |
| Writing outside intended places | All writes go through `Writer`, which allows only `CLAUDE.md`, `.claude/`, `docs/ai/` and `.sfcc-kit/` under the project root |
| Symbolic link tricks | The writer refuses to write through any symbolic link between the root and the target. Discovery does not follow symbolic links |
| Path traversal in configuration | `Path` values in `repositories.md` that resolve outside the root are ignored with a warning |
| Accidental Git repositories | Setup refuses a root inside a Git repository and never runs `git` |
| Modifying application repositories | Nothing is written inside them. The opt-in `protect-repos` appends ignore lines to local `.git/info/exclude` only |
| Destructive setup | Identical content is never rewritten. Replaced files are backed up. User-edited managed files are never overwritten. `uninstall` previews unless `--apply` |
| Instance changes by the agent | Ask rules for deploy, activate, jobs, WebDAV, sandbox, preferences, replication, users, roles, apps and MCP write tools. B2C Safety Mode recommended as a tool-level boundary |
| Hook input | The KB hook sanitizes the session ID before using it in a temporary file name and only prints a reminder |
| External downloads | None. No dependencies, no network access |

## Review performed for 1.0.0

Checked: credential handling, secret leakage in output, shell execution (the kit spawns no shell, tests use `execFileSync` with fixed arguments), destructive operations, path traversal, symbolic links, unintended Git operations, generated configuration, external downloads, and deletion paths. Findings fixed during the review: the hook used the raw session ID in a file path, and the 0.1 site list import could shift columns. Known limitation: permission rules match command text and tool names, so a determined bypass through a different binary path is possible. That is why Safety Mode is recommended.

## Limitations

- Claude Code permission rules are not a sandbox. For OS-level isolation use Claude Code sandboxing or a container.
- The kit cannot verify the `safety` block in `dw.json` because it never reads that file.
- Logs, debugger output and API responses may contain customer data. Review before sharing.
