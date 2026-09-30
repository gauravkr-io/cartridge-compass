---
title: Hooks, job steps, services, metadata, deployment
applies_to: all cartridge-based
read_when: Changing hooks.json, steptypes, services, import XML, code versions
last_verified: 2026-09-26
---

# Hooks, job steps, services, metadata, deployment

Evidence labels and source IDs: see [INDEX.md](../INDEX.md) and [sources.md](../sources.md).

### 2.5 Hooks

- `package.json` in the cartridge's top-level directory points to `hooks.json` with the `hooks` key. Paths in `hooks.json` are relative to that file. `[FACT S10]`
- Within one `hooks.json`, several modules can be registered for one extension point. Their order cannot be controlled and all are called. `[FACT S09]`
- Across cartridges, all registrations run in cartridge-path order. `[FACT S09]`
- For Shopper API extension points, a hook that returns a value skips the system implementation and all subsequent registered hooks. Salesforce recommends returning nothing so that functions such as cart calculation still run. Custom extension points always run every registration. `[FACT S10]`
- OCAPI and SCAPI share the same hook extension points, which keep the historical `dw.ocapi.shop.*` prefix. `[FACT S14]`
- SCAPI hook execution must be enabled in Business Manager (Administration > Global Preferences > Feature Switches). `[FACT S10]`
- A hook circuit breaker returns HTTP 503 when a hook fails too often. `[FACT S10]`
- Since B2C Commerce 24.7, Shopper Context hooks can be site-specific. If the caller omits `siteId`, those hooks are not called and no error is returned. `[FACT S14]`
- In SFRA, `OnRequest` and `OnSession` are implemented as hooks, not controllers. `[FACT S01]`

**Agent consequence.** A change to a hook is never "shadowed" the way a controller is. Every cartridge on the path that registers the same extension point participates. `[FACT S09]`

### 2.6 Job steps

- Custom step types are declared in `steptypes.json` at the cartridge root, not inside `cartridge/`. `[FACT R02]`
- Supported kinds include `script-module-step` and `chunk-script-module-step`. `[FACT R02]` `[KIT]`
- `steptypes.json` only declares a step type. A runnable job needs a `jobs.xml` definition whose `<step type>` matches the step's `@type-id`. `[FACT R02]`
- An XML form, `steptypes.xml`, also exists in the official docs (guide `b2c-step-types-xml-example`). `[FACT R03]` Precedence when both exist is `[UNKNOWN]` (Q07).

### 2.7 Services

- `dw.svc.LocalServiceRegistry` manages service instances. The older `dw.svc.ServiceRegistry` is marked deprecated in the Script API reference. `[FACT R03]`
- Service definitions, credentials and profiles are configured in Business Manager and can be imported as `services.xml` (schema `services.xsd`). `[FACT R03]`

### 2.8 Metadata and import/export XML

- Official XSDs for site import and export are bundled with the B2C tooling SDK (59 schemas, including `site.xsd`, `metadata.xsd`, `jobs.xsd`, `services.xsd`, `preferences.xsd`, `bmext.xsd`, `customobject.xsd`, `catalog.xsd`, `order.xsd`, `promotion.xsd`). `[FACT R03]`
- `site.xsd` defines an optional `<custom-cartridges>` string element on a site. `[FACT R03]`
- Validate with `b2c docs schema <name> --path` and `xmllint`. `[FACT R01]`

### 2.9 Code versions and deployment

- Cartridges are uploaded to a code version, and one version is active. `[FACT S04]`
- After changing a cartridge path, re-activate the code version so SCAPI custom endpoints re-register. `[FACT R02]`
- MCP cartridge deployment can reload a code version, which can briefly activate another version before the target. `[FACT R01]`
