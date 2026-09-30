---
title: SFRA
applies_to: sfra
read_when: SFRA controllers, middleware, templates, models, client builds
last_verified: 2026-09-26
---

# SFRA

Evidence labels and source IDs: see [INDEX.md](../INDEX.md) and [sources.md](../sources.md).

### 4.1 Structure

- SFRA provides the `app_storefront_base` cartridge and the `server` module. Sites layer plug-in, LINK and custom cartridges over base to form a cartridge stack. `[FACT S01]`
- Typical stack, left to right: custom, LINK, plug-in, base. Salesforce suggests `app_custom_*` naming for custom cartridges. `[FACT S01]`
- Base models and `server` objects are guaranteed backward compatible between major point releases. Editing base or `server` voids that guarantee. `[FACT S01]`
- Official plug-ins (for example `plugin_wishlists`, `plugin_instorepickup`, `plugin_sitemap`, `plugin_productcompare`, `plugin-applepay`, `plugin_datadownload`, `lib_productlist`) use the same version tags as base. Check out matching tags across all SFRA repositories. Only versions labeled "Release" are integration-tested together. `[FACT S07]`
- The SFRA GitHub repositories require granted access. `[FACT S07]` `[TEST E03]`

### 4.2 Routes and middleware

- Endpoints use `Controller-RouteName`. `server.get` and `server.post` wrap `server.use` with a method check. `server.exports()` registers routes defined with `get`, `post` or `use`. `[FACT S01]`
- Middleware steps take `req`, `res`, `next` and must call `next()`. `[FACT S01]`
- Built-in middleware filters include `get`, `post`, `https`, `http` and `include`. A mismatch fails with "Params do not match route". `[FACT S11]`
- `res.setViewData` merges data into the view object across steps. `[FACT S01]`
- The server emits `route:Start`, `route:Step`, `route:Redirect`, `route:BeforeComplete` and `route:Complete`. Individual middleware steps cannot be overridden through events. `[FACT S01]`

### 4.3 Extension patterns

```js
'use strict';
var server = require('server');
server.extend(module.superModule);

server.append('Show', function (req, res, next) {
    var viewData = res.getViewData();
    viewData.extra = true;
    res.setViewData(viewData);
    next();
});

module.exports = server.exports();
```

| Pattern | Effect | Source |
|---|---|---|
| `server.extend(module.superModule)` | Inherits routes from the next same-named controller to the right | `[FACT S11]` |
| `server.append(route, ...)` | Runs the original chain, then the new step. Side effects in the original chain still happen, so third-party calls can run twice. | `[FACT S11]` |
| `server.prepend(route, ...)` | Adds a step at the beginning of an existing route | `[FACT R02]` |
| `server.replace(route, ...)` | Replaces the route entirely. Recommended when changing access or when the original calls a web service. | `[FACT S11]` |
| Override file without `extend` | Shadows the lower controller completely, including routes you did not redefine | `[FACT S02]` |

The official "Customize SFRA" replace example contains typos. Do not copy it verbatim (D03).

### 4.4 Templates, models and client code

- Override a template by placing a same-named file at the same relative location in a cartridge further left. `[FACT S11]`
- SFRA has two decorators, `common/layout/page.isml` and `common/layout/checkout.isml`. `[FACT S11]`
- Do not override, delete, or change the signature of `pdict` variables. `[FACT S11]`
- Models convert Script API objects into JSON. Anything in `modules` or `TopLevel` is globally available and extendable. `[FACT S11]`
- Client CSS and JS are overridden through `package.json` `paths` and compiled with `sgmf-scripts`. `[FACT S11]`
- ISML guidance from base: set cache, content type, cookies, redirects and status in the controller rather than the template. `[FACT S11]`
