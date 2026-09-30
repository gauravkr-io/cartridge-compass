import fs from 'node:fs';
import path from 'node:path';
import { readTextIfExists, sha256 } from './util.mjs';

export const BLOCK_BEGIN = '<!-- sfcc-kit:begin -->';
export const BLOCK_END = '<!-- sfcc-kit:end -->';
export const STATE_FILE = '.sfcc-kit/state.json';
export const CONFIG_VERSION = 1;

export const CONVENTIONS_SECTION = `## Project conventions

<!-- Owned by your team. The kit never edits this section.
Fill it after /sfcc-kb-init Phase 2 and keep only rules that differ from official defaults. Examples:
- New storefront code goes in: <cartridge> (site-specific), <cartridge> (shared).
- Never modify: <explicit list of vendor cartridges>.
- Logging: <helper and category convention>.
- Build: <command per repository>. Lint: <command>. Tests: <command>.
-->
- Project conventions are not established yet. Ask the user before choosing a cartridge or style for new code.
`;

// ---------- CLAUDE.md ----------

export function renderBlock(template, vars) {
  const body = template.replace(/\{\{(\w+)\}\}/g, (m, key) => (key in vars ? vars[key] : m)).trim();
  return `${BLOCK_BEGIN}\n${body}\n${BLOCK_END}`;
}

export function isLegacyClaudeMd(text) {
  return /Salesforce B2C Commerce, hybrid SFRA \+ SGJC/.test(text) && /## Verifying Salesforce APIs/.test(text) && !text.includes(BLOCK_BEGIN);
}

function extractSection(text, heading) {
  const start = text.indexOf(`\n## ${heading}`);
  if (start < 0) return null;
  const rest = text.slice(start + 1);
  const next = rest.slice(3).search(/\n## /);
  return (next < 0 ? rest : rest.slice(0, next + 3)).trim();
}

/** Returns { text, mode } or throws when markers are damaged, so the caller never writes a guess. */
export function upsertClaudeMd(existing, block, projectName) {
  const title = `# ${projectName || 'SFCC workspace'}`;
  if (existing === null) return { text: `${title}\n\n${block}\n\n${CONVENTIONS_SECTION}`, mode: 'create' };
  const begin = existing.indexOf(BLOCK_BEGIN);
  const end = existing.indexOf(BLOCK_END);
  if (begin >= 0 && end > begin) {
    return { text: existing.slice(0, begin) + block + existing.slice(end + BLOCK_END.length), mode: 'update' };
  }
  if (begin >= 0 || end >= 0) {
    throw new Error('CLAUDE.md contains only one sfcc-kit marker. Restore both markers or remove both, then run setup again.');
  }
  if (isLegacyClaudeMd(existing)) {
    const oldTitle = existing.split(/\r?\n/)[0].replace(/^#\s*/, '').replace(/:\s*Salesforce B2C Commerce.*$/, '').trim();
    const name = oldTitle && !oldTitle.includes('<PROJECT NAME>') ? oldTitle : projectName;
    const conventions = extractSection(existing, 'Project conventions');
    const kept = conventions ? `${conventions}\n` : CONVENTIONS_SECTION;
    const note = '<!-- Migrated from sfcc-claude-kit 0.1.x. The previous file is in .sfcc-kit/backups. The conventions section above was preserved as written. -->';
    return { text: `# ${name || 'SFCC workspace'}\n\n${block}\n\n${kept}\n${note}\n`, mode: 'migrate-0.1' };
  }
  return { text: `${existing.trimEnd()}\n\n${block}\n`, mode: 'append' };
}

export function removeBlock(existing) {
  const begin = existing.indexOf(BLOCK_BEGIN);
  const end = existing.indexOf(BLOCK_END);
  if (begin < 0 || end < begin) return null;
  return (existing.slice(0, begin) + existing.slice(end + BLOCK_END.length)).replace(/\n{3,}/g, '\n\n');
}

// ---------- settings.json ----------

const PLACEHOLDER_MARKETPLACE = 'YOUR_ORG/sfcc-claude-kit';

/**
 * Adds kit entries without removing or changing anything the user set.
 * The only removal is the 0.1.x placeholder marketplace, which could never resolve.
 */
export function mergeSettings(existingText, fragment, { extraDirectories = [] } = {}) {
  let settings = {};
  if (existingText !== null && existingText.trim()) {
    settings = JSON.parse(existingText);
    if (!settings || typeof settings !== 'object' || Array.isArray(settings)) throw new Error('.claude/settings.json is not a JSON object');
  }
  const added = [];
  const removed = [];
  settings.permissions ??= {};
  for (const list of ['deny', 'ask', 'allow']) {
    const wanted = fragment.permissions?.[list] || [];
    if (!wanted.length) continue;
    settings.permissions[list] ??= [];
    for (const rule of wanted) {
      if (!settings.permissions[list].includes(rule)) {
        settings.permissions[list].push(rule);
        added.push(`permissions.${list}:${rule}`);
      }
    }
  }
  if (extraDirectories.length) {
    settings.permissions.additionalDirectories ??= [];
    for (const dir of extraDirectories) {
      if (!settings.permissions.additionalDirectories.includes(dir)) {
        settings.permissions.additionalDirectories.push(dir);
        added.push(`permissions.additionalDirectories:${dir}`);
      }
    }
  }
  for (const key of ['extraKnownMarketplaces', 'enabledPlugins']) {
    const wanted = fragment[key] || {};
    settings[key] ??= {};
    for (const [name, value] of Object.entries(wanted)) {
      if (!(name in settings[key])) {
        settings[key][name] = value;
        added.push(`${key}:${name}`);
      }
    }
  }
  const legacy = settings.extraKnownMarketplaces?.['sfcc-claude-kit'];
  if (legacy?.source?.repo === PLACEHOLDER_MARKETPLACE) {
    delete settings.extraKnownMarketplaces['sfcc-claude-kit'];
    removed.push(`extraKnownMarketplaces:sfcc-claude-kit (placeholder ${PLACEHOLDER_MARKETPLACE})`);
  }
  return { text: `${JSON.stringify(settings, null, 2)}\n`, added, removed };
}

export function unmergeSettings(existingText, added) {
  const settings = JSON.parse(existingText);
  const removed = [];
  for (const entry of added) {
    const sep = entry.indexOf(':');
    const where = entry.slice(0, sep);
    const value = entry.slice(sep + 1);
    if (where.startsWith('permissions.')) {
      const list = settings.permissions?.[where.slice('permissions.'.length)];
      const i = Array.isArray(list) ? list.indexOf(value) : -1;
      if (i >= 0) {
        list.splice(i, 1);
        removed.push(entry);
      }
    } else if (settings[where] && value in settings[where]) {
      delete settings[where][value];
      removed.push(entry);
    }
  }
  prune(settings);
  return { text: `${JSON.stringify(settings, null, 2)}\n`, removed };
}

/** Drops arrays and objects the kit emptied, so uninstall leaves no skeleton behind. */
function prune(obj) {
  for (const [key, value] of Object.entries(obj)) {
    if (value && typeof value === 'object') {
      if (!Array.isArray(value)) prune(value);
      if (Array.isArray(value) ? value.length === 0 : Object.keys(value).length === 0) delete obj[key];
    }
  }
}

// ---------- managed rule files ----------

/**
 * Decides what to do with a kit-managed file.
 * install/update when absent, unchanged since the kit wrote it, or identical to a known older kit version.
 * Otherwise the user edited it: leave it and write the new version beside it for manual review.
 */
export function planManagedFile({ current, next, recordedHash, legacyVersions = [] }) {
  if (current === null) return 'install';
  if (current === next) return 'unchanged';
  if (recordedHash && sha256(current) === recordedHash) return 'update';
  if (legacyVersions.includes(current)) return 'update';
  return 'user-modified';
}

// ---------- state ----------

export function loadState(root) {
  const text = readTextIfExists(path.join(root, STATE_FILE));
  if (text === null) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { corrupt: true };
  }
}

export function readTemplate(kitDir, rel) {
  return fs.readFileSync(path.join(kitDir, 'templates', rel), 'utf8');
}
