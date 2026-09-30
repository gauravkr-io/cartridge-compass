---
title: B2C CLI, MCP server and official plugins
applies_to: all
read_when: Running b2c commands or MCP tools
last_verified: 2026-09-26
---

# B2C CLI, MCP server and official plugins

Evidence labels and source IDs: see [INDEX.md](../INDEX.md) and [sources.md](../sources.md).

### 10.1 B2C CLI (`@salesforce/b2c-cli`)

- Requires Node.js 22.16.0 or later. `[FACT R01]`
- Command groups: `am`, `auth`, `bm`, `cap`, `cip`, `code`, `content`, `debug`, `docs`, `ecdn`, `job`, `logs`, `metrics`, `mrt`, `preferences`, `sandbox` (alias `ods`), `scaffold`, `scapi`, `setup`, `sites`, `slas`, `webdav`. `[FACT R01]`
- Configuration lookup: `dw.json` is found by searching upward from the current directory. Multi-config files select by instance name, then `active: true`, then the root config. `--config` and `SFCC_CONFIG` select a file explicitly. `[FACT R01]`
- Safety Mode (off by default) restricts operations across the CLI, IDE extension and MCP server. Levels `NONE`, `NO_DELETE`, `READ_ONLY` (and legacy `NO_UPDATE`). Set per instance in `dw.json` (`"safety": {"level": "READ_ONLY"}`), by `SFCC_SAFETY_LEVEL`, or by a shared file through `SFCC_SAFETY_CONFIG`. Rules can require confirmation for specific commands. In non-interactive runs, a confirm rule blocks. `[FACT R01]`

Commands with side effects on an instance (non-exhaustive, from the command tree `[FACT R01]`): `code deploy/activate/delete/watch`, `job run/import`, `sites cartridges add/remove/set`, `webdav put/rm/mkdir/unzip`, `preferences ... update`, `sandbox create/delete/reset/start/stop/restart`, `scapi replications publish`, `am users/clients/roles` create, update, delete, grant, revoke, `bm users/roles/access-key` create, update, delete, `cap install/uninstall`, `ecdn` updates, `mrt` deploys, `slas client` create, update, delete, `setup instance create/remove/set-active`. `auth token` and `auth client token` print tokens. `[FACT R01]`

### 10.2 MCP server (`b2c-dx-mcp`)

- All toolsets are enabled by default: `CARTRIDGES`, `DIAGNOSTICS`, `MRT`, `PWAV3`, `SCAPI`, `STOREFRONTNEXT`, `CIP`. Restrict with `--toolsets` or `SFCC_TOOLSETS`, or `--tools`. `[FACT R01]`
- Tools that change state: `cartridge_deploy` (optionally activate or reload), `webdav_put`, `scapi_execute` (Admin API data management), `mrt_bundle_push`, `debug_evaluate` (can change application state), `debug_set_breakpoints` (can pause requests). `[FACT R01]`
- Safety Mode applies to MCP tools. SCAPI Code Mode can ask for approval if the client supports it, otherwise the change is blocked. `[FACT R01]`
- Logs, debugger variables and API responses can contain customer data or secrets. `[FACT R01]`

### 10.3 Official Claude Code plugins (marketplace `b2c-developer-tooling`)

`b2c-cli`, `b2c`, `b2c-ops` (triage runbooks), `b2c-dx-mcp`, `storefront-next`, `storefront-next-figma`, `figma-to-sfnext-pagedesigner`, `b2c-python-sdk`. `[FACT R01]` The kit installs `b2c`, `b2c-cli` and `b2c-dx-mcp` only. `[KIT]`
