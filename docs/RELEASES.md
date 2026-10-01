# Releases

Every release of Cartridge Compass at a glance. Each version is a Git tag and a GitHub release. For the full list of changes see [CHANGELOG.md](../CHANGELOG.md). For step-by-step upgrade instructions see [UPGRADING.md](UPGRADING.md).

## Release table

| Version | Date | Rerun setup | Configuration change | Agent behavior | Headline |
|---|---|---|---|---|---|
| [1.1.0](https://github.com/gauravkr-io/cartridge-compass/releases/tag/v1.1.0) | 2026-10-01 | Recommended | None | Changed | One-command `run`, `/sfcc-kb-init` ranges, hook registry across cartridges, JSON site map, manual B2C plugins, lower token use |
| [1.0.0](https://github.com/gauravkr-io/cartridge-compass/releases/tag/v1.0.0) | 2026-09-26 | Yes | Automatic from 0.1 | Changed | First public release under the name Cartridge Compass |

## What each column means

| Column | Meaning |
|---|---|
| Rerun setup | Whether `sfcc-kit setup` must be run again to get the new files and settings |
| Configuration change | Whether your own files (`repositories.md`, `site-map.json`, `CLAUDE.md` conventions) need editing |
| Agent behavior | Whether the instructions, skills or rules the agent follows changed in a way that can change its answers |

## Where to find what

| You want | Read |
|---|---|
| Everything that changed in a release | [CHANGELOG.md](../CHANGELOG.md) |
| How to upgrade, and what to check afterwards | [UPGRADING.md](UPGRADING.md) |
| What may come next | [analysis/ENHANCEMENT-ROADMAP.md](analysis/ENHANCEMENT-ROADMAP.md) |
| How the kit decides when to release | [KNOWLEDGE-MAINTENANCE.md](KNOWLEDGE-MAINTENANCE.md) |
| How to cut a release | "Releases" in [CONTRIBUTING.md](../CONTRIBUTING.md) |

## Versioning

Semantic versioning. A major version means a configuration migration or a change that can alter the code the agent writes. A minor version adds commands, signals, knowledge or permissions and keeps existing configuration working. A patch version fixes bugs and corrects knowledge. The rules are in [UPGRADING.md](UPGRADING.md#versions).
