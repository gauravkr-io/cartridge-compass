import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildContext, renderContextMarkdown, CONTEXT_JSON, CONTEXT_MD } from './context.mjs';
import { detectRepository, discoverRepositories } from './detect.mjs';
import {
  CONFIG_VERSION, CONVENTIONS_SECTION, STATE_FILE, BLOCK_BEGIN, loadState, mergeSettings, planManagedFile, readTemplate,
  removeBlock, renderBlock, unmergeSettings, upsertClaudeMd,
} from './project-files.mjs';
import { parseRepositories, renderRepoSection, renderRepositoriesFile, resolveRepoPath, REPOSITORIES_FILE } from './repositories.mjs';
import { findGitAncestor, isInside, readTextIfExists, sha256, today, toPosix, Writer } from './util.mjs';

export const KIT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const KIT_VERSION = JSON.parse(fs.readFileSync(path.join(KIT_DIR, 'package.json'), 'utf8')).version;

const MANAGED_RULES = ['sfcc-protected-cartridges.md', 'sfcc-sgjc-cartridges.md'];
const DOCS_AI_SKELETON = ['.kb-state.md', 'decisions.md', 'migration.md', 'project-map.md', 'flows/.gitkeep', 'sites/.gitkeep'];

export class UsageError extends Error {}

export const CURRENT_PLUGIN_ID = 'sfcc-kb@cartridge-compass';
export const LEGACY_PLUGIN_ID = 'sfcc-kb@sfcc-claude-kit';

function usesLegacyPluginId(settingsText) {
  if (!settingsText) return false;
  try {
    return LEGACY_PLUGIN_ID in (JSON.parse(settingsText).enabledPlugins || {});
  } catch {
    return false;
  }
}

/** Validates the project root. Refuses anything that would put kit files into a Git repository. */
export function resolveRoot({ root, allowGitRoot = false, kitDir = KIT_DIR }) {
  const abs = path.resolve(root || path.dirname(kitDir));
  if (!fs.existsSync(abs) || !fs.statSync(abs).isDirectory()) throw new UsageError(`Project root does not exist: ${abs}`);
  if (abs === path.resolve(kitDir) || isInside(kitDir, abs)) throw new UsageError('The project root cannot be the kit folder or inside it. Pass --root <folder that contains your repositories>.');
  const gitDir = findGitAncestor(abs);
  if (gitDir && !allowGitRoot) {
    throw new UsageError(`The project root ${abs} is inside a Git repository (${gitDir}). Kit files would show up in git status. Use the folder that contains your repositories, or pass --allow-git-root if this is intended.`);
  }
  return abs;
}

function kitReference(root, kitDir) {
  return isInside(root, kitDir) ? toPosix(path.relative(root, kitDir)) : toPosix(kitDir);
}

function writeContext(root, kitDir, writer) {
  const ctx = buildContext({ root, kitDir, kitVersion: KIT_VERSION });
  writer.write(path.join(root, CONTEXT_MD), renderContextMarkdown(ctx), { backup: false });
  writer.write(path.join(root, CONTEXT_JSON), `${JSON.stringify(ctx, null, 2)}\n`, { backup: false });
  return ctx;
}

/** Creates the mapping file, or appends repositories it does not mention yet. Never edits existing sections. */
function syncRepositoriesFile(root, kitDir, writer, report) {
  const file = path.join(root, REPOSITORIES_FILE);
  const text = readTextIfExists(file);
  const discovered = discoverRepositories(root, { exclude: [kitDir] });
  if (text === null) {
    writer.write(file, renderRepositoriesFile(discovered, today()));
    report.push(discovered.length
      ? `Created ${REPOSITORIES_FILE} with ${discovered.length} discovered repositories (Type: auto). Review it.`
      : `Created ${REPOSITORIES_FILE} with no repositories. None were found under the project root.`);
    return;
  }
  const parsed = parseRepositories(text);
  const known = new Set(parsed.repositories.map((r) => resolveRepoPath(root, r.path)).filter((r) => r.ok).map((r) => r.abs));
  const fresh = discovered.filter((d) => !known.has(path.resolve(d.abs)) && !parsed.repositories.some((r) => r.name === d.name));
  if (!fresh.length) {
    writer.note('unchanged', REPOSITORIES_FILE);
    return;
  }
  const appended = `${text.trimEnd()}\n\n${fresh.map((d) => renderRepoSection(d, today())).join('\n')}`;
  writer.write(file, appended);
  const noun = fresh.length === 1 ? 'repository' : 'repositories';
  report.push(`Added ${fresh.length} newly discovered ${noun} to ${REPOSITORIES_FILE}: ${fresh.map((d) => d.name).join(', ')}.`);
}

export function setup({ root, kitDir = KIT_DIR, dryRun = false, allowGitRoot = false }) {
  const projectRoot = resolveRoot({ root, allowGitRoot, kitDir });
  const writer = new Writer(projectRoot, { dryRun });
  const report = [];
  const problems = [];
  const state = loadState(projectRoot);
  if (state?.corrupt) problems.push(`${STATE_FILE} is not valid JSON. It will be rewritten. Managed files that differ from the kit are treated as user-modified.`);
  const previous = state && !state.corrupt ? state : null;
  if (previous && previous.configVersion > CONFIG_VERSION) {
    throw new UsageError(`This project was set up by a newer kit (configuration version ${previous.configVersion}). Update the kit before running setup.`);
  }
  const kitRef = kitReference(projectRoot, kitDir);

  // 1. Project configuration (never overwritten)
  syncRepositoriesFile(projectRoot, kitDir, writer, report);
  for (const rel of DOCS_AI_SKELETON) {
    writer.createIfMissing(path.join(projectRoot, 'docs/ai', rel), readTemplate(kitDir, path.join('docs-ai', rel)));
  }

  // 2. CLAUDE.md managed block
  const repoText = readTextIfExists(path.join(projectRoot, REPOSITORIES_FILE));
  const projectName = repoText ? (parseRepositories(repoText).project.project || '').trim() : '';
  const block = renderBlock(readTemplate(kitDir, 'claude-block.md'), { KIT: kitRef, VERSION: KIT_VERSION });
  const claudePath = path.join(projectRoot, 'CLAUDE.md');
  try {
    const { text, mode } = upsertClaudeMd(readTextIfExists(claudePath), block, projectName);
    writer.write(claudePath, text);
    if (mode === 'migrate-0.1') report.push('Migrated CLAUDE.md from kit 0.1.x. Your "Project conventions" section was preserved. The old file is in .sfcc-kit/backups.');
    if (mode === 'append') report.push('Appended the kit block to your existing CLAUDE.md. Your content was not changed.');
  } catch (err) {
    problems.push(err.message);
  }

  // 3. Managed rules
  const managedFiles = { ...(previous?.managedFiles || {}) };
  for (const name of MANAGED_RULES) {
    const target = path.join(projectRoot, '.claude/rules', name);
    const rel = `.claude/rules/${name}`;
    const next = readTemplate(kitDir, path.join('rules', name));
    const legacy = readTextIfExists(path.join(kitDir, 'templates/legacy/rules-0.1', name));
    const decision = planManagedFile({ current: readTextIfExists(target), next, recordedHash: managedFiles[rel], legacyVersions: legacy ? [legacy] : [] });
    if (decision === 'user-modified') {
      writer.write(`${target}.kit-new`, next, { backup: false });
      report.push(`${rel} was edited by someone. It was left as is. The kit's version is in ${rel}.kit-new for manual comparison.`);
      continue;
    }
    writer.write(target, next);
    managedFiles[rel] = sha256(next);
  }

  // 4. settings.json merge
  const settingsPath = path.join(projectRoot, '.claude/settings.json');
  let settingsAdded = [...(previous?.settingsAdded || [])];
  try {
    const fragment = JSON.parse(readTemplate(kitDir, 'settings.kit.json').replaceAll('{{KIT}}', kitRef));
    if (usesLegacyPluginId(readTextIfExists(settingsPath))) {
      // The project still runs the plugin from the old marketplace. Leave plugin entries alone so nothing stops loading.
      delete fragment.enabledPlugins[CURRENT_PLUGIN_ID];
      report.push(`This project still enables ${LEGACY_PLUGIN_ID}. It was left unchanged so the plugin keeps working. To switch to ${CURRENT_PLUGIN_ID}, follow "Switching to the cartridge-compass marketplace" in docs/UPGRADING.md.`);
    }
    const extraDirectories = isInside(projectRoot, kitDir) ? [] : [toPosix(kitDir)];
    const { text, added, removed } = mergeSettings(readTextIfExists(settingsPath), fragment, { extraDirectories });
    writer.write(settingsPath, text);
    settingsAdded = [...new Set([...settingsAdded, ...added])];
    if (removed.length) report.push(`Removed from settings.json: ${removed.join(', ')}.`);
  } catch (err) {
    problems.push(`.claude/settings.json was not changed: ${err.message}. Fix the JSON and run setup again.`);
  }

  // 5. Generated context
  const ctx = writeContext(projectRoot, kitDir, writer);

  // 6. State
  const newState = {
    kitVersion: KIT_VERSION,
    configVersion: CONFIG_VERSION,
    installedAt: previous?.installedAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    previousKitVersion: previous && previous.kitVersion !== KIT_VERSION ? previous.kitVersion : previous?.previousKitVersion ?? null,
    kitPath: kitRef,
    managedFiles,
    settingsAdded,
  };
  const stateWithoutTime = (s) => JSON.stringify({ ...s, updatedAt: null });
  if (!previous || stateWithoutTime(previous) !== stateWithoutTime(newState) || writer.changes.some((c) => ['create', 'update'].includes(c.action))) {
    writer.write(path.join(projectRoot, STATE_FILE), `${JSON.stringify(newState, null, 2)}\n`, { backup: false });
  }
  if (previous && previous.kitVersion !== KIT_VERSION) report.push(`Upgraded project files from kit ${previous.kitVersion} to ${KIT_VERSION}. See CHANGELOG.md for behavior changes.`);
  if (!state) report.push('First setup in this workspace. Review docs/ai/repositories.md, then follow the next steps below.');

  return { root: projectRoot, kitRef, changes: writer.changes, report, problems, context: ctx, dryRun };
}

export function sync({ root, kitDir = KIT_DIR, dryRun = false, allowGitRoot = false }) {
  const projectRoot = resolveRoot({ root, allowGitRoot, kitDir });
  const writer = new Writer(projectRoot, { dryRun });
  const report = [];
  syncRepositoriesFile(projectRoot, kitDir, writer, report);
  const context = writeContext(projectRoot, kitDir, writer);
  return { root: projectRoot, changes: writer.changes, report, problems: [], context, dryRun };
}

export function detect({ root, kitDir = KIT_DIR, allowGitRoot = false }) {
  const projectRoot = resolveRoot({ root, allowGitRoot, kitDir });
  return discoverRepositories(projectRoot, { exclude: [kitDir] }).map((r) => ({ ...r, detection: detectRepository(r.abs) }));
}

export function doctor({ root, kitDir = KIT_DIR, allowGitRoot = false, env = process.env }) {
  const projectRoot = resolveRoot({ root, allowGitRoot, kitDir });
  const errors = [];
  const warnings = [];
  const info = [];
  const state = loadState(projectRoot);
  if (!state) warnings.push('Setup has not been run in this workspace. Run: node <kit>/bin/sfcc-kit.mjs setup');
  else if (state.corrupt) errors.push(`${STATE_FILE} is not valid JSON. Run setup again.`);
  else {
    info.push(`Kit ${KIT_VERSION}. Workspace set up with kit ${state.kitVersion}.`);
    if (state.kitVersion !== KIT_VERSION) warnings.push(`Kit version changed (${state.kitVersion} to ${KIT_VERSION}). Run setup to update managed files.`);
    for (const [rel, hash] of Object.entries(state.managedFiles || {})) {
      const text = readTextIfExists(path.join(projectRoot, rel));
      if (text === null) warnings.push(`Managed file ${rel} is missing. Setup will recreate it.`);
      else if (sha256(text) !== hash) info.push(`${rel} was edited locally. Setup will not overwrite it.`);
    }
  }
  const claude = readTextIfExists(path.join(projectRoot, 'CLAUDE.md'));
  if (claude === null) warnings.push('CLAUDE.md is missing.');
  else if (!claude.includes(BLOCK_BEGIN)) warnings.push('CLAUDE.md has no sfcc-kit block. Run setup.');

  const settings = readTextIfExists(path.join(projectRoot, '.claude/settings.json'));
  if (settings !== null) {
    try {
      const s = JSON.parse(settings);
      const ask = s.permissions?.ask || [];
      if (s.enabledPlugins && LEGACY_PLUGIN_ID in s.enabledPlugins) info.push(`${LEGACY_PLUGIN_ID} is the plugin's pre-rename ID. It keeps working. Switch when convenient: see "Switching to the cartridge-compass marketplace" in docs/UPGRADING.md.`);
      if (!ask.some((r) => r.includes('cartridge_deploy'))) warnings.push('No ask rule gates the MCP cartridge_deploy tool. Run setup, or add rules from templates/settings.kit.json.');
    } catch (err) {
      errors.push(`.claude/settings.json is not valid JSON: ${err.message}`);
    }
  } else warnings.push('.claude/settings.json is missing. Run setup.');

  const ctx = buildContext({ root: projectRoot, kitDir, kitVersion: KIT_VERSION });
  warnings.push(...ctx.warnings);
  for (const r of ctx.repositories) {
    if (!r.exists && r.source === 'configured' && r.status === 'active') warnings.push(`Repository "${r.name}" is configured but ${r.path} does not exist.`);
    if (r.source.startsWith('discovered') && ctx.repositoriesFile === 'configured') info.push(`Repository "${r.name}" exists but is not in repositories.md. Run sync to add it.`);
    if (r.architecture[0]?.type === 'unknown' && r.exists && r.status === 'active') info.push(`Repository "${r.name}": architecture unknown. Set Type in repositories.md if detection cannot find it.`);
  }
  if (ctx.environment.dwJsonInRepositories.length) warnings.push(`dw.json found inside ${ctx.environment.dwJsonInRepositories.join(', ')}. The b2c CLI searches upward, so running it inside those folders uses that file, not the root one.`);
  info.push(`SFCC_SAFETY_LEVEL in this shell: ${env.SFCC_SAFETY_LEVEL || 'not set'}. The kit does not read dw.json, so a "safety" block there cannot be checked here.`);
  if (ctx.siteMap.status !== 'configured') info.push('Site cartridge paths: not configured. The kit works without them. Agents will treat cartridge precedence as unknown.');
  if (ctx.siteMap.businessManagerPath !== 'configured') info.push('Business Manager cartridge path: not configured (optional).');
  info.push('Plugin installation cannot be checked from outside Claude Code. Run /plugin in a session to confirm sfcc-kb is enabled. The official B2C plugins are optional and installed by hand.');
  return { root: projectRoot, errors, warnings, info };
}

/** True when only the kit-created title and the untouched default conventions section remain. */
function isPristineRemainder(text) {
  const body = text.trim().replace(/^# [^\n]*\n+/, '').trim();
  return body === '' || body === CONVENTIONS_SECTION.trim();
}

export function uninstall({ root, kitDir = KIT_DIR, apply = false, allowGitRoot = false }) {
  const projectRoot = resolveRoot({ root, allowGitRoot, kitDir });
  const writer = new Writer(projectRoot, { dryRun: !apply });
  const report = [];
  const state = loadState(projectRoot) || {};
  const claudePath = path.join(projectRoot, 'CLAUDE.md');
  const claude = readTextIfExists(claudePath);
  if (claude !== null) {
    const stripped = removeBlock(claude);
    if (stripped === null) report.push('CLAUDE.md has no kit block. Left unchanged.');
    else if (isPristineRemainder(stripped)) writer.remove(claudePath);
    else writer.write(claudePath, stripped);
  }
  for (const [rel, hash] of Object.entries(state.managedFiles || {})) {
    const text = readTextIfExists(path.join(projectRoot, rel));
    if (text === null) continue;
    if (sha256(text) === hash) writer.remove(path.join(projectRoot, rel));
    else report.push(`${rel} was edited locally and was kept.`);
  }
  const settingsPath = path.join(projectRoot, '.claude/settings.json');
  const settings = readTextIfExists(settingsPath);
  if (settings !== null && state.settingsAdded?.length) {
    try {
      const { text } = unmergeSettings(settings, state.settingsAdded);
      if (text.trim() === '{}') writer.remove(settingsPath);
      else writer.write(settingsPath, text);
    } catch (err) {
      report.push(`.claude/settings.json left unchanged: ${err.message}`);
    }
  }
  const rulesDir = path.join(projectRoot, '.claude/rules');
  if (fs.existsSync(rulesDir)) {
    for (const name of fs.readdirSync(rulesDir)) {
      if (name.endsWith('.kit-new')) writer.remove(path.join(rulesDir, name));
    }
  }
  // Everything below is created by setup, sync or the plugin scripts. Backups live inside .sfcc-kit, so they go too.
  writer.removeTree(path.join(projectRoot, 'docs/ai'));
  writer.removeTree(path.join(projectRoot, '.sfcc-kit'));
  if (apply) {
    writer.removeIfEmpty(rulesDir);
    writer.removeIfEmpty(path.join(projectRoot, '.claude'));
    writer.removeIfEmpty(path.join(projectRoot, 'docs'));
  }
  report.push('Removed docs/ai (repository mapping, site map, project knowledge, generated files) and .sfcc-kit (state and backups). The docs folder is removed too when nothing of yours is in it. Nothing can be restored from the kit afterwards.');
  report.push('Kept: dw.json and CLAUDE.local.md. You create those yourself.');
  report.push('Plugins are not removed by this command. Remove them with /plugin in Claude Code if you no longer want them.');
  return { root: projectRoot, changes: writer.changes, report, problems: [], dryRun: !apply };
}

/** Opt-in: adds local-only ignore lines to each repository's .git/info/exclude. Never touches tracked files. */
export function protectRepos({ root, kitDir = KIT_DIR, dryRun = false, allowGitRoot = false }) {
  const projectRoot = resolveRoot({ root, allowGitRoot, kitDir });
  const lines = ['CLAUDE.md', 'CLAUDE.local.md', '.claude/'];
  const changes = [];
  for (const repo of discoverRepositories(projectRoot, { exclude: [kitDir] })) {
    const gitDir = path.join(repo.abs, '.git');
    if (!fs.existsSync(gitDir) || !fs.statSync(gitDir).isDirectory()) {
      changes.push({ action: 'skipped', file: `${repo.name} (no .git directory)` });
      continue;
    }
    const exclude = path.join(gitDir, 'info', 'exclude');
    const current = readTextIfExists(exclude) || '';
    const missing = lines.filter((l) => !current.split(/\r?\n/).includes(l));
    if (!missing.length) {
      changes.push({ action: 'unchanged', file: toPosix(path.relative(projectRoot, exclude)) });
      continue;
    }
    if (!dryRun) {
      fs.mkdirSync(path.dirname(exclude), { recursive: true });
      fs.appendFileSync(exclude, `${current && !current.endsWith('\n') ? '\n' : ''}${missing.join('\n')}\n`);
    }
    changes.push({ action: 'update', file: toPosix(path.relative(projectRoot, exclude)) });
  }
  return { root: projectRoot, changes, report: [], problems: [], dryRun };
}
