import fs from 'node:fs';
import path from 'node:path';
import { toPosix } from './util.mjs';

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'coverage', '.next', '.cache', '.idea', '.vscode', '.claude', '.sfcc-kit', '.turbo', 'out', '.react-router']);
const SKIP_ROOT_ENTRIES = new Set(['docs', 'node_modules', '.claude', '.sfcc-kit']);
const MAX_FILES = 25000;
const MAX_BYTES = 512 * 1024;

// Signal strength. Confidence needs more than one kind of evidence to be "high".
const STRONG = 3;
const MEDIUM = 2;
const WEAK = 1;

// Storefront architectures rank above API-usage and supporting tags when confidence ties.
const PRIMARY_ORDER = ['storefront-next', 'pwa-kit', 'headless', 'sfra', 'sgjc', 'pipelines', 'custom-controllers', 'scapi-custom-api', 'api-hooks', 'bm-extension', 'integration', 'library', 'build-deploy', 'scapi', 'ocapi', 'other'];

const read = (file) => {
  try {
    return fs.statSync(file).size > MAX_BYTES ? '' : fs.readFileSync(file, 'utf8');
  } catch {
    return '';
  }
};

const readJson = (file) => {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
};

function isCartridgeDir(dir, name) {
  const inner = path.join(dir, 'cartridge');
  try {
    if (!fs.statSync(inner).isDirectory()) return false;
  } catch {
    return false;
  }
  return fs.existsSync(path.join(dir, '.project')) || fs.existsSync(path.join(inner, `${name}.properties`));
}

/**
 * Lists candidate repositories directly under the project root. Git repositories are always listed.
 * Plain folders are listed only when detection finds SFCC or storefront evidence in them.
 */
export function discoverRepositories(root, { exclude = [] } = {}) {
  const found = [];
  let entries = [];
  try {
    entries = fs.readdirSync(root, { withFileTypes: true });
  } catch {
    return found;
  }
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith('.') || SKIP_ROOT_ENTRIES.has(entry.name)) continue;
    const abs = path.join(root, entry.name);
    if (exclude.some((ex) => path.resolve(ex) === abs)) continue;
    const git = fs.existsSync(path.join(abs, '.git'));
    if (!git && detectRepository(abs).types.length === 0) continue;
    found.push({ name: entry.name, path: entry.name, abs, git });
  }
  return found.sort((a, b) => a.name.localeCompare(b.name));
}

const DEP_RULES = [
  { test: (n) => n.startsWith('@salesforce/pwa-kit-'), type: 'pwa-kit', kind: 'package @salesforce/pwa-kit-*', weight: STRONG },
  { test: (n) => n.endsWith('retail-react-app'), type: 'pwa-kit', kind: 'package retail-react-app', weight: MEDIUM },
  { test: (n) => n.startsWith('@salesforce/storefront-next-'), type: 'storefront-next', kind: 'package @salesforce/storefront-next-*', weight: STRONG },
  { test: (n) => n.includes('commerce-sdk'), type: 'scapi', kind: 'package commerce-sdk*', weight: MEDIUM },
  { test: (n) => n === 'sgmf-scripts', type: 'sfra', kind: 'package sgmf-scripts (SFRA build tool)', weight: WEAK },
];

export function detectRepository(repoDir) {
  const evidence = [];
  const cartridges = [];
  let filesSeen = 0;
  let truncated = false;
  const add = (type, kind, weight, file) => evidence.push({ type, kind, weight, file: toPosix(path.relative(repoDir, file)) });

  const cartridgeInfo = new Map();

  function walk(dir, cartridge) {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (truncated) return;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue;
        if (!cartridge && isCartridgeDir(full, entry.name)) {
          const info = { name: entry.name, path: toPosix(path.relative(repoDir, full)), controllers: 0, pipelines: 0, scripts: 0 };
          cartridges.push(info);
          cartridgeInfo.set(full, info);
          if (entry.name === 'app_storefront_base') add('sfra', 'cartridge app_storefront_base', STRONG, full);
          if (entry.name === 'app_storefront_base') add('library', 'contains base SFRA source', MEDIUM, full);
          if (/^app_storefront_(controllers|core)$/.test(entry.name)) add('sgjc', `cartridge ${entry.name}`, STRONG, full);
          if (entry.name.startsWith('bm_')) add('bm-extension', 'cartridge named bm_*', WEAK, full);
          walk(full, info);
        } else {
          walk(full, cartridge);
        }
        continue;
      }
      if (!entry.isFile()) continue;
      if (++filesSeen > MAX_FILES) {
        truncated = true;
        return;
      }
      inspectFile(full, entry.name, cartridge);
    }
  }

  function inspectFile(file, base, cartridge) {
    const rel = toPosix(path.relative(repoDir, file));
    if (base === 'package.json') {
      const pkg = readJson(file);
      if (!pkg) return;
      const deps = { ...pkg.dependencies, ...pkg.devDependencies, ...pkg.peerDependencies };
      const names = Object.keys(deps);
      for (const rule of DEP_RULES) {
        const hit = names.find(rule.test);
        if (hit) add(rule.type, rule.kind, rule.weight, file);
      }
      if (names.includes('react') && names.some((n) => n.includes('commerce-sdk'))) add('headless', 'package react with commerce-sdk*', MEDIUM, file);
      return;
    }
    if (base === 'bm_extensions.xml') add('bm-extension', 'bm_extensions.xml', STRONG, file);
    if (!cartridge) {
      if (/\.(m?js|ts|tsx|jsx)$/.test(base)) scanApiHosts(file);
      return;
    }
    const inCartridge = rel.slice(rel.indexOf('/cartridge/') + 1);
    if (/\/cartridge\/controllers\/[^/]+\.(js|ds)$/.test(`/${inCartridge}`)) {
      cartridge.controllers++;
      const src = read(file);
      const sfra = /require\(\s*['"]server['"]\s*\)/.test(src);
      const guard = /guard\.\w+\(/.test(src) || /require\([^)]*scripts\/guard['"]\)/.test(src);
      if (sfra) add('sfra', 'controller uses the server module', STRONG, file);
      if (sfra && /server\.extend\(|module\.superModule/.test(src)) add('sfra', 'controller extends a lower cartridge', MEDIUM, file);
      if (guard) add('sgjc', 'controller uses guard', STRONG, file);
      if (/app\.get(Model|View|Form|Controller)\(/.test(src)) add('sgjc', 'controller uses the app facade', MEDIUM, file);
      if (!sfra && !guard && /\.public\s*=\s*true/.test(src)) add('custom-controllers', 'controller exports .public = true', STRONG, file);
      if (/require\([^)]*app_storefront_(core|controllers)/.test(src)) add('sgjc', 'requires app_storefront_core or controllers', MEDIUM, file);
    } else if (/^cartridge\/pipelines\/[^/]+\.xml$/.test(inCartridge)) {
      cartridge.pipelines++;
      add('pipelines', 'pipeline XML', STRONG, file);
    } else if (/^cartridge\/rest-apis\/[^/]+\/schema\.ya?ml$/.test(inCartridge)) {
      add('scapi-custom-api', 'rest-apis schema', STRONG, file);
    } else if (/^cartridge\/rest-apis\/[^/]+\/api\.json$/.test(inCartridge)) {
      add('scapi-custom-api', 'rest-apis api.json', MEDIUM, file);
    } else if (base === 'hooks.json') {
      if (/"dw\.ocapi\./.test(read(file))) add('api-hooks', 'hooks.json registers dw.ocapi.* extension points', STRONG, file);
    } else if (base === 'steptypes.json' || base === 'steptypes.xml') {
      add('integration', 'job step types', MEDIUM, file);
    } else if (/\.(js|ds)$/.test(base)) {
      cartridge.scripts++;
      if (base.endsWith('.ds')) add('pipelines', 'pipelet or .ds script', MEDIUM, file);
      scanApiHosts(file);
    }
  }

  function scanApiHosts(file) {
    const src = read(file);
    if (/\.api\.commercecloud\.salesforce\.com/.test(src)) add('scapi', 'SCAPI host in code', MEDIUM, file);
    // OCAPI URL shape, heuristic only. Kept weak on purpose.
    if (/\/dw\/(shop|data|meta)\/v\d+_\d+/.test(src)) add('ocapi', 'OCAPI URL pattern in code (heuristic)', WEAK, file);
  }

  walk(repoDir, null);

  for (const info of cartridgeInfo.values()) {
    if (info.controllers === 0 && info.pipelines === 0 && info.scripts > 0) {
      add('integration', 'cartridge without controllers or pipelines', MEDIUM, path.join(repoDir, info.path));
    }
  }

  return summarize(evidence, cartridges, truncated);
}

function summarize(evidence, cartridges, truncated) {
  const byType = new Map();
  for (const e of evidence) {
    if (!byType.has(e.type)) byType.set(e.type, new Map());
    const kinds = byType.get(e.type);
    if (!kinds.has(e.kind)) kinds.set(e.kind, { kind: e.kind, weight: e.weight, count: 0, examples: [] });
    const k = kinds.get(e.kind);
    k.count++;
    if (k.examples.length < 3) k.examples.push(e.file);
  }
  const types = [];
  for (const [type, kinds] of byType) {
    const list = [...kinds.values()];
    const strong = list.filter((k) => k.weight >= STRONG).length;
    const score = list.reduce((s, k) => s + k.weight, 0);
    let confidence = 'low';
    if (strong >= 2 || (strong >= 1 && list.length >= 2)) confidence = 'high';
    else if (strong === 1 || score >= 4) confidence = 'medium';
    types.push({ type, confidence, score, evidence: list });
  }
  const rank = { high: 3, medium: 2, low: 1 };
  const specificFrontend = types.some((t) => t.type === 'pwa-kit' || t.type === 'storefront-next');
  const kept = specificFrontend ? types.filter((t) => t.type !== 'headless') : types;
  kept.sort((a, b) => rank[b.confidence] - rank[a.confidence] || PRIMARY_ORDER.indexOf(a.type) - PRIMARY_ORDER.indexOf(b.type) || b.score - a.score);
  return { types: kept, cartridges: cartridges.sort((a, b) => a.name.localeCompare(b.name)), truncated };
}

