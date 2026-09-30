# Multi-repository examples

Every example assumes the kit is cloned into the project root as `cartridge-compass`. Run `setup` first. It writes the mapping with `Type: auto`, which you then edit.

## One repository

```text
Project Root/
├── my-storefront/
└── cartridge-compass/
```

```markdown
## my-storefront
- Type: auto
```

`auto` is fine when `detect` reports the right type with high confidence. Set the type explicitly if it does not.

## Two repositories: SFRA and SGJC

```markdown
## storefront
- Type: sfra
- Purpose: Current storefront

## storefront-legacy
- Type: sgjc, pipelines
- Purpose: Legacy code still on some site paths
- Notes: Being migrated. Check docs/ai/migration.md before changing anything here.
```

Both repositories' cartridges usually appear on the same site paths. Add a site map so the agent can tell which copy of a controller wins.

## SFRA with a headless storefront

```markdown
## storefront-sfra
- Type: sfra, api-hooks
- Purpose: SFRA pages not yet migrated, plus hooks for SCAPI

## storefront-next
- Type: storefront-next
- Purpose: New storefront on Managed Runtime

## api-extensions
- Type: scapi-custom-api, integration
- Purpose: Custom APIs used by storefront-next
```

The headless repository has no cartridge path. Its server-side customizations live in the cartridges of the other repositories.

## Several SFRA repositories for several brands

```markdown
## platform-core
- Type: sfra, library
- Purpose: Shared cartridges used by every brand
- Sites: BrandA, BrandA_UK, BrandB

## brand-a
- Type: sfra
- Sites: BrandA, BrandA_UK

## brand-b
- Type: sfra
- Sites: BrandB
```

Import the site map from Business Manager. `site-map.md` then shows which cartridges are shared by every site, which are brand-specific, and brand-named cartridges that other brands also use.

## Mixed enterprise estate

```text
Project Root/
├── sfra-storefront/
├── legacy-storefront/
├── headless-storefront/
├── integrations/
├── ci-pipelines/
├── vendor-sfra/          base SFRA and plugins, unmodified
└── cartridge-compass/
```

```markdown
Format: 1
- Project: Acme Commerce

## sfra-storefront
- Type: sfra
- Sites: Acme_US, Acme_EU

## legacy-storefront
- Type: sgjc
- Sites: Acme_Outlet
- Status: active

## headless-storefront
- Type: storefront-next

## integrations
- Type: integration, api-hooks, scapi-custom-api, bm-extension

## ci-pipelines
- Type: build-deploy

## vendor-sfra
- Type: library
- Notes: Base SFRA and official plugins at the tagged release. Never edited.
```

## Repositories in subfolders

Discovery only looks one level below the root. For deeper folders, add a section with `Path`:

```markdown
## payments
- Path: integrations/payments
- Type: integration
```

## Repositories the agent should not touch

```markdown
## old-poc
- Status: ignore
```

## When things change

| Change | Do |
|---|---|
| New repository cloned | `node cartridge-compass/bin/sfcc-kit.mjs sync`. It is appended with `Type: auto` |
| Repository removed | Delete its section or set `Status: archived`. Until then it is reported as missing |
| Repository renamed | Rename the folder, update `Path`, run `sync` |
| Repository re-architected | Update `Type`, run `sync` |
