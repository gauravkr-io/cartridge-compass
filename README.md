# Cartridge Compass

**Cartridge Compass**: project intelligence for AI coding agents on Salesforce B2C Commerce (SFCC). Works with Claude Code.

[![CI](https://github.com/gauravkr-io/cartridge-compass/actions/workflows/ci.yml/badge.svg)](https://github.com/gauravkr-io/cartridge-compass/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
![Node.js 18.17+](https://img.shields.io/badge/node-%3E%3D18.17-brightgreen.svg)

AI coding agents know SFCC in general. They do not know **your** project: which of your repositories is SFRA and which is SiteGenesis, which cartridge wins on which site, what is configured and what is not. Cartridge Compass gives them that map, tells them to stop and ask where the map is blank, and puts guard rails around anything that touches an instance.

It sits on top of Salesforce's official [B2C Developer Tooling](https://github.com/SalesforceCommerceCloud/b2c-developer-tooling). The official plugins teach the platform. Cartridge Compass teaches the project.

## The problem it solves

Agents make the same SFCC mistakes again and again:

- editing a controller that never runs, because a cartridge further left on the site path wins
- assuming one hook runs, when every registered implementation runs in path order
- applying SFRA patterns to SiteGenesis code
- inventing APIs, hooks, Business Manager settings or cartridge paths
- treating the repository they are in as the whole system
- deploying or changing an instance without being asked

Each capability below exists to stop one of these.

## What you get

| Capability | What it does |
|---|---|
| **Discovery and detection** | Finds the repositories in your workspace and identifies their architecture from evidence in the code, with a confidence level |
| **Repository mapping** | One readable file, `docs/ai/repositories.md`, where you state what each repository is. Your word always beats detection |
| **Project context** | A generated file the agent reads first: what is known, and what is explicitly **not configured** |
| **Site analysis** | Imports your sites' cartridge paths and shows overrides, shared cartridges and legacy variants per site |
| **Code inventory** | Deterministic facts: routes, hooks, job steps, services, `dw.*` usage, custom APIs, overrides |
| **Guard rails** | Approval required for deploys, jobs, replication, user and role changes and MCP write tools. Credential files are unreadable |
| **Skills** | Knowledge-base building, change impact, SiteGenesis and pipeline work, hybrid migration, doc sync |
| **Knowledge base** | Small, source-backed files the agent loads only when the task needs them |

## Quick start

Requirements: Node.js 18.17 or newer and [Claude Code](https://code.claude.com/docs). The B2C CLI, if you use it, needs Node.js 22.16 or newer.

Put Cartridge Compass next to your repositories, in a folder that is **not** a Git repository:

```text
my-project/                  your project root, not a Git repository
├── storefront-sfra/         your repositories, never modified
├── storefront-legacy/
├── integrations/
└── cartridge-compass/       this project
```

```bash
cd my-project
git clone https://github.com/gauravkr-io/cartridge-compass.git
node cartridge-compass/bin/sfcc-kit.mjs detect      # see what it finds, writes nothing
node cartridge-compass/bin/sfcc-kit.mjs setup       # safe to run again at any time
```

Then install the plugins (setup prints these commands with the right paths):

```bash
claude plugin marketplace add ./cartridge-compass
claude plugin install sfcc-kb@cartridge-compass --scope project
claude plugin marketplace add SalesforceCommerceCloud/b2c-developer-tooling
claude plugin install b2c@b2c-developer-tooling --scope project
claude plugin install b2c-cli@b2c-developer-tooling --scope project
claude plugin install b2c-dx-mcp@b2c-developer-tooling --scope project
```

Start `claude` in the project root and ask: *"What do you know about this project, and what is not configured?"*

Everything else is optional: site cartridge paths (see below), the Business Manager path, site IDs and repository types. Missing values are reported as not configured and never guessed. The full walkthrough, with Windows notes and validation, is in [SETUP.md](SETUP.md).

## Tell it about your sites

Cartridge paths let the agent work out which cartridge wins for each site. To add them:

1. In Business Manager, open Administration > Sites > Manage Sites > (your site) > Settings.
2. Copy each site's name, ID and cartridge path into a tab-separated text file, one site per line. See `cartridge-compass/templates/docs-ai/site-map.sample.txt`.
3. Run `node cartridge-compass/plugin/scripts/sfcc-sitemap.mjs --import sites.txt`.

This writes `docs/ai/site-map.json` (the source of truth you edit) and `docs/ai/site-map.md` (generated analysis the agent reads). Rows that are not three tab-separated columns are skipped and reported. More detail is in [SETUP.md](SETUP.md).

## Supported architectures

| Kind | Types |
|---|---|
| Cartridge storefronts | `sfra`, `sgjc`, `pipelines`, `custom-controllers`, and any mix |
| APIs | `ocapi`, `scapi`, `scapi-custom-api`, `api-hooks` |
| Headless | `pwa-kit`, `storefront-next`, `headless` |
| Supporting code | `integration`, `bm-extension`, `library`, `build-deploy`, `other` |

## Tell it about your repositories

Setup writes `docs/ai/repositories.md` from what it discovers. Edit it where detection is wrong or unsure:

```markdown
## storefront-sfra
- Type: sfra
- Purpose: Main storefront
- Sites: BrandA, BrandA_UK

## storefront-legacy
- Type: sgjc, pipelines
- Status: archived

## integrations
- Type: integration, api-hooks, scapi-custom-api
```

Every field is optional. More layouts, from one repository to mixed enterprise estates: [docs/MULTI-REPO.md](docs/MULTI-REPO.md).

## How the agent uses it

1. A short instruction block in the workspace `CLAUDE.md` tells the agent how to orient itself.
2. The agent reads `docs/ai/generated/project-context.md` first.
3. [knowledge/INDEX.md](knowledge/INDEX.md) routes it to the one or two knowledge files the task needs.
4. Path-scoped rules and skills load only when relevant.
5. Permissions are enforced by Claude Code, whatever the model decides.

The always-on cost is roughly a thousand tokens. Everything else is loaded on demand.

## Commands

| Command | Writes | Purpose |
|---|---|---|
| `setup` | yes | Create or update everything. Idempotent and upgrade-safe |
| `sync` | yes | Add newly cloned repositories and refresh the project context |
| `detect` | no | Show discovered repositories with their evidence |
| `doctor` | no | Check configuration, versions and safety settings |
| `uninstall` | with `--apply` | Remove everything the kit created, including `docs/ai` and `.sfcc-kit` |
| `protect-repos` | opt-in | Keep kit files out of each repository's `git status` |

Run them as `node cartridge-compass/bin/sfcc-kit.mjs <command>`. Add `--dry-run` to preview.

## Safe by design

- Writes only to `CLAUDE.md`, `.claude/`, `docs/ai/` and `.sfcc-kit/` in the project root. Never inside your repositories.
- Refuses to run when the project root is inside a Git repository, and never runs Git itself.
- Never reads `dw.json`, `.env` or keys, and denies them to the agent.
- Never overwrites what you wrote. Replaced files are backed up to `.sfcc-kit/backups/`.
- No dependencies and no network access.

Details: [SECURITY.md](SECURITY.md).

## Documentation

| Guide | For |
|---|---|
| [SETUP.md](SETUP.md) | Installing and configuring, step by step |
| [docs/CONFIGURATION.md](docs/CONFIGURATION.md) | Every file and field, and what wins when they disagree |
| [docs/MULTI-REPO.md](docs/MULTI-REPO.md) | Examples for real project layouts |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | How it works and why it was built this way |
| [docs/UPGRADING.md](docs/UPGRADING.md) | Versions, upgrades and migrations |
| [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) | Common problems and fixes |
| [docs/KNOWLEDGE-MAINTENANCE.md](docs/KNOWLEDGE-MAINTENANCE.md) | Keeping the knowledge base accurate |

## Updates

Releases ship in fixed windows: March and September always, June and December when changes have accumulated, and urgent fixes at any time. To update:

```bash
git -C cartridge-compass pull
node cartridge-compass/bin/sfcc-kit.mjs setup
```

Then update the `sfcc-kb` plugin from `/plugin` in Claude Code. See [CHANGELOG.md](CHANGELOG.md) for what changed.

## Roadmap

- Headless workflows alongside the official `storefront-next` plugin
- Per-site hook participation and override resolution in the inventory
- Deprecated API detection against the bundled Script API reference
- Published before-and-after evaluation results on real projects

## Contributing

Contributions are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) first. The most important rule: nothing specific to any organization, client or project belongs here.

## License and trademarks

MIT. See [LICENSE](LICENSE).

Not affiliated with or endorsed by Salesforce or Anthropic. Salesforce, Commerce Cloud and Claude are trademarks of their respective owners.
