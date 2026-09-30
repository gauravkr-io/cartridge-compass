---
title: Claude Code mechanics
applies_to: all
read_when: Changing kit settings, rules or permissions
last_verified: 2026-09-26
---

# Claude Code mechanics

Evidence labels and source IDs: see [INDEX.md](../INDEX.md) and [sources.md](../sources.md).

| Topic | Verified behavior | Source |
|---|---|---|
| Rule precedence | deny, then ask, then allow. First match wins. Specificity does not matter. | `[FACT C01]` |
| Bash wildcards | `Bash(ls *)` also matches bare `ls`. A trailing ` *` with a space does not match `lsof`. | `[FACT C01]` |
| Bash rule limits | Rules match command text. `/usr/bin/x`, `sh -c 'x'` or `npx x` forms are not matched. Not a security boundary. | `[FACT C01]` |
| Read deny limits | Apply to built-in file tools and recognized Bash readers (`cat`, `head`, ...). Not to scripts that open files themselves or `grep -r` from a parent. | `[FACT C01]` |
| MCP rules | `mcp__<server>__<tool>`, `mcp__<server>__*`. Allow globs need a literal server prefix. | `[FACT C01]` |
| Auto mode | Became the default permission mode in August 2026. Ask rules still prompt in auto mode. | `[FACT C03]` `[FACT C01]` |
| Settings location | `.claude/settings.json` hooks and keys load from the starting directory only. | `[FACT C01]` |
| Project allow rules | Apply only after workspace trust is accepted. Deny and ask rules always apply. | `[FACT C01]` |
| Path-scoped rules | `paths` frontmatter. Loaded when Claude reads a matching file. `paths` is the only field read. | `[FACT C02]` |
| CLAUDE.md | HTML comments are stripped before injection. Subdirectory CLAUDE.md files load on demand. Target under 200 lines. | `[FACT C02]` |
| Instructions vs enforcement | CLAUDE.md is context, not enforcement. Use permissions or hooks for anything that must hold. | `[FACT C02]` |
| Plugin evals | `claude plugin eval` exists for testing plugins against a baseline. | `[FACT C03]` |
