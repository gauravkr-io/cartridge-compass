---
paths:
  - "**/app_storefront_controllers/**"
  - "**/app_storefront_core/**"
  - "**/cartridge/pipelines/**"
---

# You are in legacy SiteGenesis code

- Load the sfcc-sgjc skill before reasoning about this file. SGJC controllers and pipelines are different architectures. Do not apply SFRA patterns here.
- Check `docs/ai/migration.md`: if an active SFRA implementation exists for the target site, the change belongs there.
- Modify this code only when it is the active implementation for at least one site, and say so in the plan.
- Do not delete or clean up legacy code without reachability evidence (sfcc-hybrid-migration skill).
- Other cartridges using SGJC or pipelines are added to this rule by /sfcc-kb-init Phase 7.
