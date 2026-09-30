---
paths:
  - "**/app_storefront_base/**"
  - "**/cartridges/modules/**"
---

# Protected cartridge: read, do not edit

- This is base SFRA or the global `modules` folder. Salesforce's backward-compatibility guarantee is void once base or the `server` module is edited.
- Extend from a custom cartridge instead: `server.extend(module.superModule)` with `append`, `prepend` or `replace`, or an override file in a cartridge further left on the path.
- Edits here prompt for approval by kit settings. If a change still seems unavoidable, explain why before asking.
- Vendor integration cartridges the project does not own are listed per project in a separate rule created by /sfcc-kb-init Phase 7. Do not treat every `int_*` cartridge as vendor code. Many are project-owned.
