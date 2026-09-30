---
name: sfcc-change-impact
description: Analyze the blast radius of an SFCC change before implementing it, including which sites and cartridges are affected, whether shared cartridges are involved, and what SGJC/SFRA interactions exist. Use before any change to a shared cartridge, a hook, a job, checkout or payment code, templates or models used by several sites, metadata, or cartridge paths, and whenever the user asks "what does this affect", "is it safe to change", or wants a plan for a non-trivial change. Skip it for isolated single-file fixes in a site-specific cartridge.
---

# Change impact analysis

The goal is a short, evidence-based impact statement the user can review before any code is written. Keep it proportional: a one-line fix in a site-specific cartridge needs one line of impact, a change to a shared checkout helper needs the full table.

## Procedure

1. **Locate** the files to change and their cartridges. Look up each cartridge in `docs/ai/project-map.md`: repository, classification, and which sites include it.
2. **Resolve per site.** For each site that includes the cartridge, check whether the file is actually the active copy for that site (another cartridge further left may shadow it). A file shadowed for every site is dead for this change, which is itself important to report. Hooks are the exception: every cartridge on the path that registers the same extension point runs, in path order, so list all registrations per site instead of a single active copy. If the site's cartridge path is not configured, say so and mark per-site conclusions as unverified rather than guessing a path.
3. **Follow dependents** with search, not memory:
   - who requires this module (grep `require(` for its path, including `*/cartridge/` forms)
   - who extends this module (`module.superModule` in any file with the same relative path in cartridges to the left, including models and scripts, not only controllers)
   - who includes this template (`isinclude`, `isdecorate`, `res.render` / `app.getView().render` names)
   - which client JS calls this route (search the route name in `client/`)
   - hooks, job steps and services registered by this cartridge (generated inventory), and other cartridges registering the same hook extension points
   - SCAPI custom APIs (`rest-apis/`) and Page Designer components that call this code
4. **Check crossings** between SGJC, pipelines and SFRA along those dependency chains (see `sfcc-hybrid-migration`). Check `server.append` around routes that call services or third parties: the original chain still runs, so side effects can happen twice.
5. **Check configuration** the change relies on: site preferences, custom attributes, services, custom objects. New metadata needs an import file in the repository's metadata folder, not just code.
6. **Write the impact statement** and wait for the user when anything shared, payment, or checkout-related is involved.

## Output format

```
Impact: <one-line summary>
Sites affected: SiteA (active copy), SiteB (active copy), SiteC (shadowed, no effect)
Files: <path> [cartridge, sfra|sgjc|hybrid]
Dependents found: <path:reason>, ...
SGJC/SFRA crossings: <none | description>
Config/metadata: <none | what must exist or be imported>
Risk: low | medium | high, because <reason>
Test on: <sites and flows to verify>
Docs to update: <docs/ai files, or none>
```

Only list dependents you actually found. The generated inventory cannot see computed route or service names, `importScript` loads or Business Manager configuration, so absence there is not proof of absence. If a search was not possible (another repo not in the workspace, content assets, Business Manager config), list it under Risk as an unverified area rather than omitting it.
