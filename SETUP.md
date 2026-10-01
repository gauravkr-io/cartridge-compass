# Setup guide

From a clean machine to an SFCC-aware Claude Code session. Each step is marked **Required**, **Recommended** or **Optional**. Skipping an optional step never breaks the kit. It only means the agent treats that information as unknown.

Commands are for macOS and Linux. Windows notes follow where they differ. Paths with spaces must be quoted.

## 1. Prerequisites

| Item | Status | Check |
|---|---|---|
| Node.js 18.17 or newer | Required | `node --version` |
| Git | Required | `git --version` |
| Claude Code | Required | `claude --version` |
| Node.js 22.16 or newer | Required only for the B2C CLI | `node --version` |
| B2C CLI `@salesforce/b2c-cli` | Recommended | `b2c --version` |
| Access to a sandbox instance | Optional | For read-only discovery with the CLI |

## 2. Directory structure (Required)

Put the kit next to your repositories in a folder that is **not** a Git repository. This folder is the project root.

```text
Project Root/
├── storefront-sfra/        your repository
├── storefront-legacy/      your repository
├── integrations/           your repository
└── cartridge-compass/        the kit
```

Why: Claude Code reads settings and hooks from the folder you start it in. Starting from the project root gives the agent every repository at once and keeps all kit files out of your repositories. Setup refuses to run if the project root is inside a Git repository, because the kit's files would then show up in `git status`.

A kit stored elsewhere (for example `~/tools/cartridge-compass`) also works. Pass `--root` and setup grants Claude Code read access to the kit folder through `permissions.additionalDirectories`.

## 3. Install the kit (Required)

```bash
cd "/path/to/Project Root"
git clone https://github.com/gauravkr-io/cartridge-compass.git cartridge-compass
```

Windows (PowerShell):

```powershell
cd "C:\path\to\Project Root"
git clone https://github.com/gauravkr-io/cartridge-compass.git cartridge-compass
```

## 4. Preview and run setup (Required)

```bash
node cartridge-compass/bin/sfcc-kit.mjs detect          # what the kit finds, writes nothing
node cartridge-compass/bin/sfcc-kit.mjs setup --dry-run  # what setup would change
node cartridge-compass/bin/sfcc-kit.mjs setup
```

Setup creates or updates only these paths in the project root:

| Path | Owner | What setup does |
|---|---|---|
| `CLAUDE.md` | Shared | Inserts or refreshes a block between `sfcc-kit:begin` and `sfcc-kit:end` markers. Everything outside the markers is yours |
| `.claude/settings.json` | Shared | Adds missing kit permissions and plugin entries. Never removes or changes yours |
| `.claude/rules/sfcc-*.md` | Kit | Installs two path-scoped rules. If you edit one, setup leaves it and writes `<name>.kit-new` beside it |
| `docs/ai/repositories.md` | You | Created once from discovery. Later runs only append new repositories |
| `docs/ai/*.md` skeleton | You | Created only if missing |
| `docs/ai/generated/` | Kit | Regenerated project context. Do not edit |
| `.sfcc-kit/` | Kit | Install state and backups |

Setup never writes inside your repositories, never runs Git commands and never reads `dw.json`. It is safe to run any number of times.

The site map (`docs/ai/site-map.json`, `docs/ai/site-map.md`) and the code inventory (`docs/ai/generated/inventory.md`, `inventory.json`) are created later, by section 6 or by the `run` command (see "Doing it in fewer commands" below). `uninstall` removes them with the rest of `docs/ai`.

To do sections 4, 6 and the kit plugin in section 9 in one command, jump to "Doing it in fewer commands".

## 5. Repository mapping (Recommended)

Open `docs/ai/repositories.md`. Setup listed every Git repository it found, and every plain folder with SFCC or storefront evidence, with `Type: auto`.

```markdown
## storefront-sfra
- Path: storefront-sfra
- Type: auto
- Purpose:
- Sites:
- Status: active
- Notes: Added by sfcc-kit on 2026-09-26. Replace "auto" with an explicit type to override detection.
```

**Why it exists.** Detection is evidence-based but not infallible. Some repositories are hard to classify (a shared library, a migration branch, a repository with legacy code that is no longer used). The mapping lets you state the truth once, and the agent then never contradicts it.

**When it is useful.** Any time there is more than one repository, a repository detection reports as `unknown`, or detection is technically right but misleading (for example SGJC code still present in a repository that is now SFRA only).

**Fields.** All optional.

| Field | Meaning | If missing |
|---|---|---|
| Heading | Short name used in reports | Required for the section to exist |
| `Path` | Folder relative to the project root. Must stay inside the root | The heading is used |
| `Type` | `auto`, or one or more types separated by commas | `auto` |
| `Purpose` | One line | Blank |
| `Sites` | Site IDs, comma separated | Unknown |
| `Status` | `active`, `archived`, or `ignore` | `active` |
| `Notes` | Free text | Blank |

Types: `sfra`, `sgjc`, `pipelines`, `custom-controllers`, `scapi-custom-api`, `api-hooks`, `ocapi`, `scapi`, `pwa-kit`, `storefront-next`, `headless`, `integration`, `bm-extension`, `library`, `build-deploy`, `other`. Common spellings such as `SFRA`, `SiteGenesis`, `Storefront Next`, `PWA Kit` and `SCAPI / OCAPI` are accepted.

**How to tell repositories apart.** Run `detect` and read the evidence it prints. In short:

| You see | Type |
|---|---|
| Controllers with `require('server')` and `server.exports()` | `sfra` |
| Controllers with `guard.ensure(...)` and `app.getView()` | `sgjc` |
| `cartridge/pipelines/*.xml` | `pipelines` |
| `cartridge/rest-apis/<name>/schema.yaml` | `scapi-custom-api` |
| `hooks.json` registering `dw.ocapi.shop.*` | `api-hooks` |
| `@salesforce/storefront-next-*` dependencies | `storefront-next` |
| `@salesforce/pwa-kit-*` dependencies | `pwa-kit` |
| Cartridges with scripts, services or job steps and no controllers | `integration` |

**What happens if you do not configure it.** Nothing breaks. The agent uses detection results with their confidence, and treats `unknown` as unknown.

**How agents use it.** `docs/ai/generated/project-context.md` combines your mapping with detection. A configured Type always wins. If detection disagrees, the context records the disagreement as a note so you can review it.

**Adding or removing a repository later.** Clone or delete the folder, then run `node cartridge-compass/bin/sfcc-kit.mjs sync`. New repositories are appended. Removed ones stay in the file and are reported as missing until you delete the section or set `Status: archived`.

More examples: [docs/MULTI-REPO.md](docs/MULTI-REPO.md).

## 6. Site map and cartridge paths (Optional, strongly recommended for multi-site projects)

Without cartridge paths the agent cannot tell which cartridge wins for a site, and it says so instead of guessing.

**Option A, import a site list.** Two formats work. Both are read by the same command.

1. In Business Manager, open Administration > Sites > Manage Sites > (your site) > Settings and note each site's name, ID and cartridge path.
2. Write them as JSON (recommended) or as a tab-separated text file.
3. Run the import from the project root:

```bash
node cartridge-compass/plugin/scripts/sfcc-sitemap.mjs --import sites.json
```

JSON format. `cartridgePath` can be a colon-separated string or an array. A bare array of sites also works. A ready-made example is `cartridge-compass/templates/docs-ai/site-map.sample.json`:

```json
{
  "sites": [
    { "id": "BrandOne", "name": "Brand One", "cartridgePath": "app_custom_brandone:app_brand_core:app_storefront_base" },
    { "id": "BrandTwo_DE", "name": "Brand Two Germany", "cartridgePath": ["app_custom_brandtwo", "app_brand_core", "app_storefront_base"] }
  ]
}
```

Tab-separated format. The columns are `Name`, `ID` and `Cartridge Path`, one site per line:

The example is `cartridge-compass/templates/docs-ai/site-map.sample.txt`:

```text
Name	ID	Cartridge Path
Brand One	BrandOne	app_custom_brandone:app_brand_core:int_payment_sfra:app_storefront_base
Brand Two Germany	BrandTwo_DE	app_custom_brandtwo:app_brand_core:plugin_wishlists:app_storefront_base
```

The import writes two files:

- `docs/ai/site-map.json` is the source of truth. You edit this one.
- `docs/ai/site-map.md` is generated analysis that the agent reads.

Entries without an ID or cartridge path are skipped and recorded in `importNotes`, so check the command output. The setup command prints these same steps at the end of its run.

**Option B, read from `site.xml`.** If your repositories contain site import archives (`sites/<id>/site.xml`), `/sfcc-kb-init` reads cartridge paths from them. No action needed.

**Fields to fill in `site-map.json`:**

| Field | Status | Notes |
|---|---|---|
| `sites[].id`, `sites[].cartridgePath` | Required for a site map | Created by the import |
| `authoritative` | Recommended | `true` makes the kit use the site map and ignore `site.xml` |
| `instance` | Optional | Which instance the paths came from. `TODO` values count as not configured |
| `businessManager.cartridgePath` | Optional | The Business Manager cartridge path, for BM extensions and org-level custom APIs |
| `sites[].repository`, `sites[].notes` | Optional | Kept when you re-import |

After editing the JSON, regenerate the analysis:

```bash
node cartridge-compass/plugin/scripts/sfcc-sitemap.mjs
```

## 7. Business Manager cartridge path (Optional)

Business Manager extensions and SCAPI Admin custom APIs called in organization context resolve through the Business Manager cartridge path, not a storefront path. To record it, read it with `b2c sites cartridges list --bm` (read-only) or copy it from Business Manager, and add:

```json
"businessManager": { "cartridgePath": ["bm_extension_a", "bm_extension_b"] }
```

If it is missing, the agent treats BM resolution as unknown.

## 8. B2C CLI and `dw.json` (Recommended)

```bash
npm install -g @salesforce/b2c-cli
b2c --version
```

Place a **sandbox** `dw.json` in the project root. Never commit it. The kit never reads it, and its settings deny it to the agent.

The CLI searches for `dw.json` upward from the folder it runs in. If a repository contains its own `dw.json`, running `b2c` inside that repository uses that file instead. Run `b2c` from the project root, or pass `--config ./dw.json`. `doctor` warns when repositories contain their own `dw.json`.

**Safety Mode (Recommended).** The CLI, IDE extension and MCP server share Safety Mode, which is enforced by the tools themselves. For investigation work add to the root `dw.json`:

```json
"safety": { "level": "READ_ONLY" }
```

To allow deploys only with confirmation, keep a stricter level and add a command rule, for example `"rules": [{"command": "code:deploy", "action": "confirm"}]`. `READ_ONLY` also blocks POST-based searches unless you add an exception. See the B2C Developer Tooling Safety Mode guide listed in [knowledge/sources.md](knowledge/sources.md) (R01).

Test the credentials: `b2c sites list`. If authentication fails, `b2c setup` walks you through configuring an API client.

## 9. Claude Code plugins

### The kit plugin (Required for the skills)

Run from the project root, never from inside a repository. Project scope writes to the root `.claude/settings.json`.

```bash
claude plugin marketplace add ./cartridge-compass
claude plugin install sfcc-kb@cartridge-compass --scope project
```

The marketplace is the kit folder on your disk, so this needs no network. A message that the plugin is already installed or enabled is fine. `run --steps 4` runs these two commands for you.

### Official B2C plugins (Optional, manual)

The kit never installs these and setup never enables them. Install them yourself only if you want them. Without them the kit still works, and the agent simply has no official B2C skills, CLI helpers or MCP tools to draw on.

| Plugin | Gives you | Needs |
|---|---|---|
| `b2c` | Official B2C Commerce skills for the platform | Nothing extra |
| `b2c-cli` | Skills for the `b2c` command line | The B2C CLI from section 8 |
| `b2c-dx-mcp` | An MCP server with B2C tools (some can change an instance, and the kit's settings ask before they run) | Node.js 22.16 or newer and a root `dw.json` |

1. Finish section 8 first if you want `b2c-cli` or `b2c-dx-mcp`.
2. Run from the project root. The first command downloads the plugin list from GitHub, so it needs network access, and your machine may ask you to sign in to Git:

```bash
claude plugin marketplace add SalesforceCommerceCloud/b2c-developer-tooling
claude plugin install b2c@b2c-developer-tooling --scope project
claude plugin install b2c-cli@b2c-developer-tooling --scope project
claude plugin install b2c-dx-mcp@b2c-developer-tooling --scope project
```

3. Install only the ones you want. Each line is independent.
4. Start a new Claude Code session, then check `/plugin` for the plugins and `/mcp` for `b2c-dx-mcp`.

For headless work the same marketplace also offers `storefront-next`. For production triage runbooks it offers `b2c-ops`.

The kit's permission rules for `b2c` commands and the B2C MCP tools are installed by setup whether or not the plugins are present. They only take effect when you install the plugins, and they keep deploys, jobs and other changes behind your approval.

## 10. Optional: keep kit files out of repository status

Only needed if Claude Code might create `CLAUDE.md` or `.claude/` inside a repository. This adds three lines to each repository's local `.git/info/exclude`, which is never committed:

```bash
node cartridge-compass/bin/sfcc-kit.mjs protect-repos --dry-run
node cartridge-compass/bin/sfcc-kit.mjs protect-repos
```

## 11. Validate (Required)

```bash
node cartridge-compass/bin/sfcc-kit.mjs doctor
```

Then start Claude Code in the project root:

```bash
claude
```

| Command in Claude Code | Expect |
|---|---|
| `/context` | `CLAUDE.md` under Memory files |
| `/plugin` | `sfcc-kb` enabled, plus any official B2C plugins you installed |
| `/mcp` | `b2c-dx-mcp` connected, only if you installed it |
| `/permissions` | `b2c docs`, `b2c sites list` under allow. Deploy, job, replication and MCP deploy rules under ask. `dw.json` under deny |

Ask the agent: "What do you know about this project and what is not configured?" It should answer from `docs/ai/generated/project-context.md`.

If you ran `run --steps 1-3`, the code inventory in `docs/ai/generated/` already exists and `/sfcc-kb-init` reuses it instead of rebuilding it, which saves tokens.

## 12. Build the project knowledge base (Recommended)

In Claude Code, run `/sfcc-kb-init`. It stops after Phase 0 with a table per brand or site for you to confirm. Continue one phase per fresh session with `/sfcc-kb-init 1` and so on up to 8, or run several at once with `/sfcc-kb-init 1-4` or `/sfcc-kb-init all`. Progress is saved in `docs/ai/.kb-state.md`. After Phase 2, fill in the "Project conventions" section of `CLAUDE.md`.

## 13. Test the setup

Useful first prompts:

- "Which implementation of Cart-Show runs for <site>?"
- "Which sites are affected if I change <shared helper>?"
- "Which hooks run for dw.ocapi.shop.basket.afterPOST on <site>?"

Hooks are tracked across cartridges. A `hooks.json` in one cartridge can name a script that lives in another, and the "Hook registry" section of `docs/ai/generated/inventory.md` shows each registration, where its script was found, and any script that nothing registers. It marks as unconfirmed whether the platform resolves a script that exists only in a different cartridge.

A good answer names files, cartridges and the evidence, and says what it could not verify.

## Doing it in fewer commands

The numbered sections above can all be run one at a time. To run several in one go, use `run`:

```bash
node cartridge-compass/bin/sfcc-kit.mjs steps                                  # list the numbered steps
node cartridge-compass/bin/sfcc-kit.mjs run --steps 1-3 --sites sites.json     # files, site map, inventory
node cartridge-compass/bin/sfcc-kit.mjs run --all --sites sites.json           # everything the CLI can do
node cartridge-compass/bin/sfcc-kit.mjs run --all --dry-run                    # preview, writes and installs nothing
```

| Step | What it does |
|---|---|
| 1 | Same as `setup` |
| 2 | Imports the `--sites` file, or refreshes the analysis of an existing site map. Skipped if neither exists |
| 3 | Generates the code inventory with a script, using no model tokens |
| 4 | Installs the `sfcc-kb` plugin with `claude plugin marketplace add` and `claude plugin install`. This changes `.claude/settings.json`. The official B2C plugins are never installed by the kit (see section 9) |
| 5 | Same as `doctor` |
| 6 | Not run by the CLI. Start Claude Code and run `/sfcc-kb-init` |

A step that fails is reported and the run goes on. The exit code is 1 if any step failed. Running it again is safe.

For the knowledge base itself, `/sfcc-kb-init` accepts a phase (`/sfcc-kb-init 3`), a range (`/sfcc-kb-init 1-4`) or `all`. The two checkpoints that need your answer still pause the run. Running one phase per session remains the best choice for very large projects.

## 14. Troubleshooting

See [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md). Start with `doctor`.

## 15. Upgrading

```bash
git -C cartridge-compass pull
node cartridge-compass/bin/sfcc-kit.mjs setup --dry-run
node cartridge-compass/bin/sfcc-kit.mjs setup
```

Then update `sfcc-kb` from `/plugin` in Claude Code. Details and migration notes: [docs/UPGRADING.md](docs/UPGRADING.md).

## 16. Removing the kit

```bash
node cartridge-compass/bin/sfcc-kit.mjs uninstall          # preview
node cartridge-compass/bin/sfcc-kit.mjs uninstall --apply  # remove kit-managed content
```

This removes the kit block from `CLAUDE.md` (or the file, if nothing of yours remains), unedited kit rules, the settings entries the kit added, the generated context and the install state. It also deletes `docs/ai/` (repository mapping, site map, project knowledge, the code inventory and other generated files) and `.sfcc-kit/` (install state and backups), so copy anything you want to keep first. The `docs/` folder is removed too when nothing else is in it. Other files you keep in `docs/` are never touched. It keeps `dw.json` and `CLAUDE.local.md`. Remove the plugins from `/plugin`, then delete the kit folder.

## Daily habits

- Always start Claude Code from the project root.
- After adding, removing or renaming a repository, run `sync`.
- When the agent makes the same mistake twice, add one line to the "Project conventions" section of `CLAUDE.md`.
- Back up `docs/ai/` if the project root is not under version control.
