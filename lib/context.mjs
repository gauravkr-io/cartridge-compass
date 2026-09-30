import fs from 'node:fs';
import path from 'node:path';
import { detectRepository, discoverRepositories } from './detect.mjs';
import { parseRepositories, resolveRepoPath, REPOSITORIES_FILE } from './repositories.mjs';
import { readJsonIfExists, readTextIfExists, toPosix } from './util.mjs';

export const CONTEXT_MD = 'docs/ai/generated/project-context.md';
export const CONTEXT_JSON = 'docs/ai/generated/project-context.json';
export const SITE_MAP = 'docs/ai/site-map.json';

const NOT_CONFIGURED = 'not configured';

export function loadSiteMap(root) {
  const result = readJsonIfExists(path.join(root, SITE_MAP));
  if (result.status === 'missing') return { status: NOT_CONFIGURED, warnings: [] };
  if (result.status === 'invalid') return { status: 'invalid', warnings: [`${SITE_MAP} is not valid JSON (${result.error}). Cartridge paths are treated as not configured.`] };
  const data = result.data;
  const warnings = [];
  const sites = Array.isArray(data.sites) ? data.sites : [];
  if (!Array.isArray(data.sites)) warnings.push(`${SITE_MAP} has no "sites" array.`);
  const valid = sites.filter((s) => {
    const ok = s && typeof s.id === 'string' && s.id.trim() && Array.isArray(s.cartridgePath) && s.cartridgePath.every((c) => typeof c === 'string');
    if (!ok) warnings.push(`${SITE_MAP}: a site entry is missing "id" or has an invalid "cartridgePath". It is ignored.`);
    return ok;
  });
  const bm = data.businessManager;
  const bmPath = bm && Array.isArray(bm.cartridgePath) && bm.cartridgePath.every((c) => typeof c === 'string') ? bm.cartridgePath : null;
  if (bm && !bmPath) warnings.push(`${SITE_MAP}: "businessManager.cartridgePath" is not a list of cartridge names. It is ignored.`);
  const instance = typeof data.instance === 'string' && data.instance.trim() && !/^TODO/i.test(data.instance) ? data.instance : null;
  return { status: 'configured', authoritative: data.authoritative === true, sites: valid, bmPath, instance, warnings };
}

function detectionTypes(detection) {
  return detection.types.map((t) => ({ type: t.type, confidence: t.confidence }));
}

export function buildContext({ root, kitDir, kitVersion }) {
  const warnings = [];
  const repoText = readTextIfExists(path.join(root, REPOSITORIES_FILE));
  const parsed = repoText === null ? null : parseRepositories(repoText);
  if (parsed) warnings.push(...parsed.warnings);

  const discovered = discoverRepositories(root, { exclude: kitDir ? [kitDir] : [] });
  const repositories = [];
  const claimed = new Set();

  for (const repo of parsed ? parsed.repositories : []) {
    const resolved = resolveRepoPath(root, repo.path);
    const entry = {
      name: repo.name,
      path: repo.path,
      source: 'configured',
      status: repo.status,
      purpose: repo.purpose,
      sites: repo.sites,
      exists: false,
      git: false,
      configuredTypes: repo.typeInfo.types,
      unrecognizedTypes: repo.typeInfo.unrecognized,
      detected: [],
      architecture: [],
      architectureSource: '',
      notes: [],
    };
    if (!resolved.ok) {
      entry.notes.push(`Path "${repo.path}" points outside the project root and is ignored.`);
      warnings.push(`Repository "${repo.name}": path "${repo.path}" is outside the project root. Ignored.`);
    } else {
      claimed.add(resolved.abs);
      entry.path = resolved.rel;
      entry.exists = fs.existsSync(resolved.abs) && fs.statSync(resolved.abs).isDirectory();
      entry.git = entry.exists && fs.existsSync(path.join(resolved.abs, '.git'));
      if (!entry.exists) entry.notes.push('Configured but not found on disk. Kept in the mapping. Clone it or set Status: archived.');
      if (entry.exists && repo.status !== 'ignore') entry.detected = detectionTypes(detectRepository(resolved.abs));
    }
    resolveArchitecture(entry, repo.typeInfo);
    repositories.push(entry);
  }

  for (const found of discovered) {
    if (claimed.has(path.resolve(found.abs))) continue;
    const entry = {
      name: found.name,
      path: found.path,
      source: parsed ? 'discovered (not in repositories.md)' : 'discovered',
      status: 'active',
      purpose: '',
      sites: [],
      exists: true,
      git: found.git,
      configuredTypes: [],
      unrecognizedTypes: [],
      detected: detectionTypes(detectRepository(found.abs)),
      architecture: [],
      architectureSource: '',
      notes: [],
    };
    resolveArchitecture(entry, { types: [], unrecognized: [], auto: true });
    repositories.push(entry);
  }

  const siteMap = loadSiteMap(root);
  warnings.push(...siteMap.warnings);
  if (siteMap.status === 'configured' && !fs.existsSync(path.join(root, 'docs/ai/site-map.md'))) {
    warnings.push('docs/ai/site-map.json exists but site-map.md has not been generated. Run the plugin script sfcc-sitemap.mjs from the project root.');
  }

  const dwJsonRoot = fs.existsSync(path.join(root, 'dw.json'));
  const dwJsonInRepos = repositories.filter((r) => r.exists && fs.existsSync(path.join(root, r.path, 'dw.json'))).map((r) => r.path);

  return {
    generator: `sfcc-kit ${kitVersion}`,
    root: toPosix(root),
    kitPath: kitDir ? toPosix(path.relative(root, kitDir) || '.') : null,
    repositoriesFile: parsed ? 'configured' : NOT_CONFIGURED,
    explicitTypes: parsed ? parsed.repositories.filter((r) => r.typeInfo.types.length).length : 0,
    repositories,
    siteMap: {
      status: siteMap.status,
      authoritative: siteMap.authoritative ?? false,
      siteCount: siteMap.sites ? siteMap.sites.length : 0,
      siteIds: siteMap.sites ? siteMap.sites.map((s) => s.id) : [],
      businessManagerPath: siteMap.bmPath ? 'configured' : NOT_CONFIGURED,
      instance: siteMap.instance || NOT_CONFIGURED,
    },
    environment: {
      dwJsonAtRoot: dwJsonRoot,
      dwJsonInRepositories: dwJsonInRepos,
    },
    warnings,
  };
}

function resolveArchitecture(entry, typeInfo) {
  if (typeInfo.types.length) {
    entry.architecture = typeInfo.types.map((t) => ({ type: t, confidence: 'configured' }));
    entry.architectureSource = 'configured';
    const extra = entry.detected.filter((d) => d.confidence !== 'low' && !typeInfo.types.includes(d.type));
    if (extra.length) {
      entry.notes.push(`Detection also found ${extra.map((d) => `${d.type} (${d.confidence})`).join(', ')}. The configured type wins. Review the mapping if this is unexpected.`);
    }
  } else if (typeInfo.unrecognized.length) {
    entry.architecture = [{ type: 'unknown', confidence: 'configured value not recognized' }];
    entry.architectureSource = 'configured (unrecognized)';
  } else if (entry.detected.length) {
    entry.architecture = entry.detected;
    entry.architectureSource = 'detected';
  } else {
    entry.architecture = [{ type: 'unknown', confidence: 'no evidence' }];
    entry.architectureSource = entry.exists ? 'not determined' : 'not available';
  }
}

const cell = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');

export function renderContextMarkdown(ctx) {
  const L = [];
  L.push('<!-- GENERATED by sfcc-kit. Do not edit. Regenerate with: node <kit>/bin/sfcc-kit.mjs sync -->');
  L.push('# Project context\n');
  L.push('Read this first. It says what is known about this workspace and, just as important, what is not.');
  L.push('A value shown as "not configured" or "unknown" is unknown. Do not guess it. Discover it from the code or tooling, or ask the user.\n');
  L.push('## Repositories\n');
  if (!ctx.repositories.length) {
    L.push('_No repositories found under the project root and none configured._\n');
  } else {
    L.push('| Name | Path | Status | Architecture | Source | Notes |');
    L.push('|---|---|---|---|---|---|');
    for (const r of ctx.repositories) {
      const arch = r.architecture.map((a) => `${a.type} (${a.confidence})`).join(', ');
      const notes = [r.purpose, r.sites.length ? `Sites: ${r.sites.join(', ')}` : '', ...r.notes].filter(Boolean).join(' ');
      L.push(`| ${cell(r.name)} | \`${cell(r.path)}\` | ${r.status}${r.exists ? '' : ', missing'} | ${cell(arch)} | ${cell(r.architectureSource)} | ${cell(notes)} |`);
    }
    L.push('');
    L.push('Confidence: `configured` comes from `docs/ai/repositories.md` and always wins. `high`, `medium` and `low` are detection results and are hints, not facts. Repositories with Status `ignore` are listed only so they are not rediscovered.\n');
  }
  L.push('## Configuration status\n');
  L.push('| Item | State |');
  L.push('|---|---|');
  const mapped = ctx.repositories.filter((r) => r.source === 'configured').length;
  const mapping = ctx.repositoriesFile === 'configured' ? `present, ${mapped} repositories, ${ctx.explicitTypes} with an explicit Type` : ctx.repositoriesFile;
  L.push(`| Repository mapping (\`docs/ai/repositories.md\`) | ${mapping} |`);
  L.push(`| Site cartridge paths (\`docs/ai/site-map.json\`) | ${ctx.siteMap.status}${ctx.siteMap.status === 'configured' ? `, ${ctx.siteMap.siteCount} sites, authoritative: ${ctx.siteMap.authoritative ? 'yes' : 'no'}` : ''} |`);
  L.push(`| Business Manager cartridge path | ${ctx.siteMap.businessManagerPath} |`);
  L.push(`| Instance the paths came from | ${cell(ctx.siteMap.instance)} |`);
  L.push(`| \`dw.json\` at project root | ${ctx.environment.dwJsonAtRoot ? 'present (never read by the kit)' : 'absent'} |`);
  L.push(`| \`dw.json\` inside repositories | ${ctx.environment.dwJsonInRepositories.length ? ctx.environment.dwJsonInRepositories.map((p) => `\`${p}\``).join(', ') : 'none'} |`);
  L.push('');
  const kb = ctx.kitPath ? `${ctx.kitPath}/knowledge` : 'the kit knowledge folder';
  const guidance = [];
  if (ctx.siteMap.status !== 'configured') guidance.push('**Cartridge paths not configured**: do not assume one. Look for `sites/<id>/site.xml` in the repositories, or ask the user to run `b2c sites cartridges list --site-id <id>` or add a site map. Until then, say which conclusions depend on the path.');
  if (ctx.siteMap.businessManagerPath !== 'configured') guidance.push('**Business Manager path not configured**: do not assume where `bm_*` cartridges or org-level custom APIs resolve. Ask, or have the user run `b2c sites cartridges list --bm`.');
  if (ctx.repositories.some((r) => r.status === 'active' && r.architecture.some((a) => a.type === 'unknown'))) guidance.push(`**Architecture unknown**: read \`${kb}/core/architecture-detection.md\` and inspect the code. Ask the user before choosing an implementation style.`);
  if (ctx.repositories.some((r) => r.architectureSource === 'detected')) guidance.push('**Detected, not configured**: treat detection as a hint. `low` confidence needs confirmation from the code before you rely on it.');
  if (ctx.environment.dwJsonInRepositories.length) guidance.push('**Several dw.json files**: the B2C CLI searches upward from the current directory, so run `b2c` from the project root or pass `--config ./dw.json`.');
  L.push('## Gaps to respect\n');
  if (guidance.length) for (const g of guidance) L.push(`- ${g}`);
  else L.push('Everything the kit tracks is configured. Other facts still need evidence from code or official tooling.');
  if (ctx.warnings.length) {
    L.push('\n## Configuration warnings\n');
    for (const w of ctx.warnings) L.push(`- ${w}`);
  }
  L.push('');
  return L.join('\n');
}
