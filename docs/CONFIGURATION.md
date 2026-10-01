# Configuration

Every setting is optional. Missing values are reported as "not configured" and treated as unknown.

## Configuration layers

| Layer | Files | Owner | Committed? |
|---|---|---|---|
| Kit | Everything in the kit folder | Kit maintainers | In the kit repository |
| Project | `docs/ai/repositories.md`, `docs/ai/site-map.json`, `docs/ai/*.md` knowledge, the "Project conventions" section and anything outside the kit block in `CLAUDE.md`, project rules in `.claude/rules/` other than the two kit rules | Your team | Optional. See "Shared mode" below |
| User and local | `dw.json`, `.env*`, `CLAUDE.local.md`, `.claude/settings.local.json` | Each developer | Never |
| Generated | `docs/ai/generated/`, `docs/ai/site-map.md`, `.sfcc-kit/state.json` | Kit tools | Not needed. Regenerate instead |
| Managed shared | The kit block in `CLAUDE.md`, kit entries in `.claude/settings.json`, `.claude/rules/sfcc-protected-cartridges.md`, `.claude/rules/sfcc-sgjc-cartridges.md` | Kit, refreshed by setup | Same as project files |

## Precedence

```text
Explicit configuration (repositories.md, site-map.json)
  overrides
Automatic detection (sfcc-kit detect, inventory script)
  overrides
Nothing: the value is reported as not configured or unknown
```

For cartridge paths: `site-map.json` with `"authoritative": true` wins over `site.xml` in the repositories, which wins over nothing. The instance (`b2c sites cartridges list`) is a read-only cross-check during `/sfcc-kb-init`.

## `docs/ai/repositories.md`

Format version 1. Grammar:

- A line `Format: 1` before the first section.
- Optional project fields before the first section, as `- Key: value`. Only `Project` is used today. It becomes the `CLAUDE.md` title for new files.
- One section per repository, starting with `## <name>`.
- Fields as `- Key: value`. Keys are case-insensitive. Unknown keys are ignored and kept.
- HTML comments are ignored.

| Field | Values | Default | Behavior when invalid |
|---|---|---|---|
| `Path` | Folder relative to the root | The heading | Outside the root: ignored with a warning |
| `Type` | `auto` or types separated by commas, `/`, `+` or "and" | `auto` | Unrecognized: architecture is `unknown`, with a warning. Never replaced by detection |
| `Purpose` | Text | Empty | |
| `Sites` | Site IDs separated by commas | Empty | |
| `Status` | `active`, `archived`, `ignore` | `active` | Unknown value: treated as `active`, with a warning |
| `Notes` | Text | Empty | |

`ignore` excludes the repository from detection and agent attention but keeps it listed so it is not rediscovered. `archived` keeps it visible without warnings when it is missing from disk.

Duplicate headings: the first section wins and a warning is shown.

### Type vocabulary

| Type | Meaning |
|---|---|
| `sfra` | SFRA cartridges, controllers built on the `server` module |
| `sgjc` | SiteGenesis JavaScript Controllers with `guard` and the `app` facade |
| `pipelines` | SiteGenesis pipelines (XML) |
| `custom-controllers` | Classic controllers exported with `.public = true` |
| `scapi-custom-api` | SCAPI custom API definitions under `cartridge/rest-apis/` |
| `api-hooks` | Hook implementations for `dw.ocapi.*` extension points, shared by OCAPI and SCAPI |
| `ocapi` | Code that calls OCAPI |
| `scapi` | Code that calls SCAPI |
| `pwa-kit` | PWA Kit (Composable Storefront) |
| `storefront-next` | Storefront Next |
| `headless` | Other headless or custom storefront |
| `integration` | Cartridges without a controller layer (services, jobs, hooks) |
| `bm-extension` | Business Manager extension |
| `library` | Shared library or vendor code, for example base SFRA |
| `build-deploy` | Build, CI or deployment tooling |
| `other` | Anything else |

Accepted aliases include `SFRA`, `SiteGenesis`, `SGPP`, `Storefront Next`, `sfnext`, `PWA Kit`, `Composable Storefront`, `custom API`, `hooks`, `BM`, `integrations`, `CI`, `deploy`.

## `docs/ai/site-map.json`

Created by `sfcc-sitemap.mjs --import <file>` or by `sfcc-kit run` step 2. The input file can be JSON (a `sites` array or a bare array, with `id`, `name` and `cartridgePath` as a colon-separated string or an array) or tab-separated text. Schema `sfcc-sitemap/v1`.

| Field | Required | Notes |
|---|---|---|
| `sites[]` with `id` and `cartridgePath` (array of names, leftmost first) | Yes, for a site map | Invalid entries are ignored with a warning |
| `authoritative` | No | `true`: kit tools use this file and never read `site.xml` |
| `instance` | No | Values starting with `TODO` count as not configured |
| `businessManager.cartridgePath` | No | Business Manager cartridge path |
| `sites[].brand`, `sites[].repository`, `sites[].notes` | No | Kept across re-imports |
| `repositories` | No | Kept for 0.1 compatibility. `repositories.md` is the preferred place |

## Generated files

| File | Written by | Purpose |
|---|---|---|
| `docs/ai/generated/project-context.md` | `setup`, `sync` | First file an agent reads |
| `docs/ai/generated/project-context.json` | `setup`, `sync` | Same data for tools and other agents |
| `docs/ai/generated/inventory.md`, `inventory.json` | `sfcc-inventory.mjs`, `run` step 3 | Code facts, including the cross-cartridge hook registry |
| `docs/ai/site-map.md` | `sfcc-sitemap.mjs`, `run` step 2 | Site and cartridge analysis |
| `.sfcc-kit/state.json` | `setup` | Kit version, configuration version, managed file hashes, settings entries added |
| `.sfcc-kit/backups/<timestamp>/` | `setup` | Copies of files before the kit changed them. Deleted by `uninstall --apply` |

## Shared mode and local-only mode

| | Local-only (default) | Shared |
|---|---|---|
| Project root | Plain folder on each machine | Committed as its own small repository, separate from the application repositories |
| `docs/ai/` history | Back it up yourself | In Git |
| Ignore list | Not needed | Add `templates/gitignore.additions` to the root `.gitignore` |
| Each developer | Runs setup | Clones the root repository, clones the application repositories into it, runs setup |

In shared mode the root is a Git repository, which setup refuses by default. Run setup with `--allow-git-root` in that case. The protection exists so that nobody turns the root into a repository by accident.

## Secrets

Never put credentials in any kit or project file. Use placeholders in examples. `dw.json`, `.env*`, `*.pem`, `*.key`, `*.p12`, `*.pfx` and `*.jks` are denied to the agent by kit settings. The kit's code never reads them.
