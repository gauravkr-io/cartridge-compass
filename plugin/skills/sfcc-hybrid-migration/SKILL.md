---
name: sfcc-hybrid-migration
description: Decide where code belongs in a hybrid SGJC + SFRA SFCC project, determine which implementation is active for a site, check whether legacy code is still reachable, and classify migration status. Use whenever a task touches functionality that may exist in both SGJC and SFRA, when choosing a cartridge for new code, when someone asks whether legacy code is still used or can be removed, or when updating docs/ai/migration.md.
---

# Hybrid SGJC + SFRA: where does the change go?

In a partially migrated project the same feature can exist twice. Picking the wrong copy produces code that deploys cleanly and never runs. This skill gives the decision procedure and the evidence needed for each step.

## Decision procedure for a change or new feature

1. **Identify the site(s)** the task is for, and their cartridge paths from `docs/ai/project-map.md`.
2. **Find every implementation** of the functionality: search routes in `docs/ai/generated/inventory.md`, then grep for the controller, template and helper names across all cartridges in those paths.
3. **Determine the active implementation per site** (next section). Different sites can have different active implementations.
4. **Choose**:
   - Active SFRA implementation exists: extend it (SFRA extension patterns: `server.extend(module.superModule)` with `append/prepend/replace`, or an override in a higher cartridge), in the cartridge the project conventions assign.
   - Only SGJC is active: modify SGJC, following `sfcc-sgjc`. Do not migrate it unless the user asked for migration.
   - Neither exists: follow the project's current conventions for new SFRA code. Ask if conventions are unclear.
5. **Never duplicate** logic into both implementations "to be safe". If both are active for different sites and both need the change, say so and make the change twice deliberately, with the user's agreement.
6. **State your conclusion in the plan** in one line, e.g. "Active for SiteA: SFRA `app_custom/controllers/Cart.js`. SGJC `Cart.js` is replaced-still-referenced by `minicart.isml`."

## Determining the active implementation

For a route `Name-Action` on a site, the platform selects a file first and a function second. Concretely:

- **Controller file**: the first `controllers/Name.js` on the site's cartridge path (left to right) is used, whether it is SGJC or SFRA. The platform does not check that the file contains `Action`. If it does not, the request errors. It does not fall through to a lower `Name.js`.
- **Pipelines**: only when no `controllers/Name.js` exists anywhere on the path is the path searched again for `pipelines/Name.xml`. A controller far to the right beats a pipeline far to the left.
- **SFRA chains**: when the selected file calls `server.extend(module.superModule)`, it inherits routes from the next `Name.js` to the right, so several files can contribute to one route. Read the whole chain. A file that does not extend shadows lower copies completely, including routes it does not define.
- **SGJC**: the selected file fully shadows the rest. Customization is usually a copied and edited controller.
- **Templates and `*/cartridge/...` modules**: first match, left wins. The generated inventory's override table lists files that exist in more than one cartridge.
- **Hooks are different**: every cartridge on the path that registers an extension point runs, in path order. A hook in a lower cartridge is never shadowed. A Shopper API hook that returns a value skips the later hooks and the system implementation.

Sources: SFRA Modules and SFRA Features and Components (controller resolution), SFRA Hooks and SCAPI Extensibility via Hooks (hook order). See the kit's `knowledge/core/cartridge-resolution.md`.

## Reachability: is legacy code still used?

Before marking anything obsolete, collect evidence for each question. "It looks old" is not evidence.

- Is the cartridge in any site's cartridge path (including Business Manager path, for BM extensions)? Not in any path: unreachable at runtime, but check jobs and other repos.
- Is the route shadowed for every site that includes it?
- Is it referenced anywhere? Search for the route name in `URLUtils.url(`, `URLUtils.https(`, `<isinclude url=`, `<form action=`, client-side JS, content assets and Page Designer components, and in other repositories.
- Is it required by name from other cartridges (`require('<cartridge>/cartridge/...')`)? The inventory's "Requires other cartridges" line lists these.
- Is it registered as a hook (`hooks.json`) or job step (`steptypes.json` or `steptypes.xml`)? Hooks and jobs run regardless of storefront architecture, and every registered hook runs.
- Is it referenced in metadata or configuration (services, payment processors, jobs XML, site preferences)?

Record the result in `docs/ai/migration.md` with status and confidence:

| Status | Meaning |
|---|---|
| `active` | Reachable and the implementation that runs for at least one site |
| `replaced-still-referenced` | An SFRA replacement is active, but something still calls this code |
| `replaced-unreferenced` | Replacement active and no references found. Cleanup candidate, not deleted automatically |
| `unknown` | Evidence incomplete. List what is missing |

Content assets, Page Designer data and other repositories are often not in the workspace. If you could not search them, the best status you can give is `unknown` or `replaced-unreferenced (repo-only search)`.

## Classifying cartridges

Use implementation evidence, never the name, and prefer the Type recorded in `docs/ai/repositories.md` when the user configured one. `sfra`, `sgjc`, `pipeline` (SiteGenesis pipelines, a different legacy style from SGJC), `hybrid` (contains or depends on more than one style, name the files), `neutral` (integration, hooks, services, jobs with no controller layer), `bm` (Business Manager extension). A cartridge with SFRA controllers that requires `app_storefront_core` modules is hybrid even though every controller is SFRA, because an SGJC removal would break it.
