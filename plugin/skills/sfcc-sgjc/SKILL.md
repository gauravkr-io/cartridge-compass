---
name: sfcc-sgjc
description: Read, trace, and safely modify SiteGenesis JavaScript Controllers (SGJC) and pipeline code in SFCC projects. Use whenever a file uses guard.ensure, app.getModel/getView/getForm, lives in app_storefront_controllers or app_storefront_core or a cartridge with a pipelines/ folder, or when the user mentions SiteGenesis, SGJC, legacy controllers, or pipelines. The official Salesforce b2c skills cover SFRA and classic `.public = true` controllers but not the SGJC guard and app facade or pipelines, so use this skill instead of guessing from SFRA knowledge.
---

# SGJC (SiteGenesis JavaScript Controllers)

SGJC code looks superficially like SFRA (both are CommonJS controllers) but works differently. Applying SFRA habits to SGJC code is the most common source of wrong answers in hybrid projects, so identify the style of a file before reasoning about it.

## Recognize the style first

| Signal in the file | Style |
|---|---|
| `var server = require('server')`, `server.get/post/append/prepend/replace`, `module.exports = server.exports()`, `module.superModule` | SFRA |
| `var guard = require('~/cartridge/scripts/guard')`, `exports.Show = guard.ensure([...], fn)`, `app.getView(...)`, `app.getModel(...)`, `app.getForm(...)` | SGJC |
| `cartridge/pipelines/*.xml` | Pipelines (older than SGJC, XML-defined flows, a separate architecture) |
| `exports.X = fn` plus `exports.X.public = true`, no `server`, no guard | Classic controller (official "classic" pattern) |
| No controllers, only scripts, services, hooks | Neutral integration cartridge |

The generated inventory (`docs/ai/generated/inventory.md`) already lists these signals per cartridge. Treat it as the starting point, then confirm in the file you are working on.

## How SGJC is typically structured

These are the standard SiteGenesis conventions. This project may deviate, so confirm each one in the code before relying on it.

- Controllers live in `app_storefront_controllers/cartridge/controllers/`. Each exported function wrapped in `guard` becomes a public route `Controller-Function`. Functions not exported through guard are not routable.
- `guard` enforces request conditions (HTTP method, HTTPS, login). Read the project's `scripts/guard.js` to see which conditions exist here.
- `app` (`scripts/app.js`) is a facade that returns models, views and forms. Models are commonly under `scripts/models/`, views under `scripts/views/`.
- Templates and much of the business logic traditionally live in `app_storefront_core`. SGJC controller cartridges depend on core, so check the cartridge path for both.
- Forms are XML definitions in `cartridge/forms/`, accessed through `app.getForm('name')`.
- Unlike SFRA, SGJC has no `server.extend(module.superModule)` extension model. Customization is usually done by copying and editing a controller in a higher cartridge, which fully shadows the lower one.

## Tracing an SGJC request

1. Find which cartridge provides the controller file for this site: the leftmost cartridge in the site's cartridge path that contains `controllers/<Name>.js` wins. Use `docs/ai/project-map.md` for the path.
2. Confirm the function is exported through guard and note its guard conditions.
3. Follow `app.getModel` / `app.getView` / `app.getForm` into the actual files.
4. Follow template rendering to the ISML file, again resolved by cartridge path.
5. Note every `require` of a path outside the cartridge (especially `*/cartridge/...`, which resolves along the cartridge path and can land in an SFRA cartridge, or the reverse).

If a route name exists as both a controller and a pipeline anywhere in the path, the controller wins: the platform searches the whole path for `controllers/Name.js` first and only then for `pipelines/Name.xml`. It also does not check that the selected controller contains the requested function. Source: SFRA Modules (official docs), recorded in the kit's `knowledge/core/cartridge-resolution.md`.

## Modifying SGJC code

- Check `docs/ai/migration.md` first. If an SFRA implementation of this functionality exists and is active for the target site, the change belongs there, not here. See the `sfcc-hybrid-migration` skill.
- Change SGJC code only when it is the active implementation for at least one site and the task requires it. Say so explicitly in your plan.
- Follow the file's own style (guard usage, app facade, pipeline dictionary conventions). Do not introduce SFRA constructs (`server`, `res.render`, middleware) into an SGJC controller. They will not work there.
- Script API classes are shared between SGJC and SFRA. Verify dw.* APIs the same way as anywhere else (`b2c docs read <Class>`). Existing usage proves an API exists, not that it is current. Older SGJC code sometimes uses methods that are now deprecated, for example `dw.svc.ServiceRegistry`. The Script API reference marks deprecations, so check before copying an old pattern into new code.
- `module.superModule` is a platform feature, not SFRA-only. Check whether this project uses it in SGJC code before assuming copy-and-edit overrides.
- Pipelines are XML. Do not hand-edit pipeline XML unless the user explicitly asks. They are normally edited in legacy tooling, and a malformed pipeline breaks the route.
