---
paths:
  - "**/app_storefront_base/**"
  - "**/cartridges/modules/**"
  # Add vendor integration cartridges the project does not own, e.g. "**/int_<vendor>*/**"
---

# Protected cartridge: read, do not edit

- This is base SFRA or vendor code. Extend it from a custom cartridge (server.extend(module.superModule), or an override file in a cartridge further left in the path).
- If a change here seems unavoidable, stop and explain why to the user first. Upgrades overwrite in-place edits.
