---
# One file per group of cartridges shared by the same sites. Filled in by /sfcc-kb-init Phase 7.
paths:
  - "**/<shared_cartridge_1>/**"
  - "**/<shared_cartridge_2>/**"
---

# Shared cartridge: used by <SiteA>, <SiteB>, <SiteC>

- A change here ships to every site above. Run the sfcc-change-impact skill before editing and list per-site effects.
- Site-specific behavior does not belong here. Put it in that site's cartridge or behind a site preference the project already uses for this purpose.
