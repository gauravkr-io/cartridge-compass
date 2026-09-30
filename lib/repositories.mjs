import path from 'node:path';
import { isInside, toPosix } from './util.mjs';

export const REPOSITORIES_FILE = 'docs/ai/repositories.md';
export const REPOSITORIES_FORMAT = 1;

/** Architecture vocabulary shared by the mapping file, detection and generated context. */
export const TYPES = {
  sfra: 'SFRA cartridges (controllers built on the server module)',
  sgjc: 'SiteGenesis JavaScript Controllers (guard and app facade)',
  pipelines: 'SiteGenesis pipelines (XML flows)',
  'custom-controllers': 'Classic controllers exported with .public = true',
  'scapi-custom-api': 'SCAPI custom API definitions (cartridge/rest-apis)',
  'api-hooks': 'OCAPI and SCAPI hook implementations (dw.ocapi.* extension points)',
  ocapi: 'Code that calls OCAPI',
  scapi: 'Code that calls SCAPI',
  'pwa-kit': 'PWA Kit (Composable Storefront)',
  'storefront-next': 'Storefront Next',
  headless: 'Other headless or custom storefront',
  integration: 'Integration cartridges without a controller layer',
  'bm-extension': 'Business Manager extension',
  library: 'Shared library or vendor code, for example base SFRA',
  'build-deploy': 'Build, CI or deployment tooling',
  other: 'Anything else',
};

const ALIASES = {
  sitegenesis: 'sgjc',
  sg: 'sgjc',
  sgpp: 'pipelines',
  pipeline: 'pipelines',
  storefrontnext: 'storefront-next',
  sfnext: 'storefront-next',
  pwa: 'pwa-kit',
  pwakit: 'pwa-kit',
  composablestorefront: 'pwa-kit',
  customapi: 'scapi-custom-api',
  customapis: 'scapi-custom-api',
  hooks: 'api-hooks',
  bm: 'bm-extension',
  businessmanager: 'bm-extension',
  integrations: 'integration',
  sharedlibrary: 'library',
  customcontroller: 'custom-controllers',
  customcontrollers: 'custom-controllers',
  classiccontrollers: 'custom-controllers',
  ci: 'build-deploy',
  deployment: 'build-deploy',
  deploy: 'build-deploy',
};

export const STATUSES = ['active', 'archived', 'ignore'];

export function normalizeType(raw) {
  const token = raw.trim().toLowerCase().replace(/[\s_]+/g, '-');
  if (!token) return null;
  if (token === 'auto') return { type: 'auto' };
  if (TYPES[token]) return { type: token };
  const squashed = token.replace(/-/g, '');
  if (ALIASES[squashed]) return { type: ALIASES[squashed] };
  if (TYPES[squashed]) return { type: squashed };
  return { unrecognized: raw.trim() };
}

export function parseTypeList(value) {
  const types = [];
  const unrecognized = [];
  let auto = false;
  for (const part of String(value || '').split(/[,/+]|\band\b/i)) {
    const result = normalizeType(part);
    if (!result) continue;
    if (result.type === 'auto') auto = true;
    else if (result.type) {
      if (!types.includes(result.type)) types.push(result.type);
    } else unrecognized.push(result.unrecognized);
  }
  return { types, unrecognized, auto: auto || (types.length === 0 && unrecognized.length === 0) };
}

const FIELD = /^\s*[-*]\s+([A-Za-z][A-Za-z ]*?)\s*:\s*(.*?)\s*$/;

/** Parses the Markdown mapping. HTML comments are ignored so guidance text never becomes data. */
export function parseRepositories(text) {
  const result = { format: null, project: {}, repositories: [], warnings: [] };
  const clean = text.replace(/<!--[\s\S]*?-->/g, '');
  let current = null;
  for (const line of clean.split(/\r?\n/)) {
    const heading = line.match(/^##\s+(.+?)\s*$/);
    if (heading) {
      const name = heading[1];
      if (result.repositories.some((r) => r.name === name)) {
        result.warnings.push(`Duplicate repository section "${name}". Only the first one is used.`);
        current = { name, fields: {}, duplicate: true };
      } else {
        current = { name, fields: {} };
        result.repositories.push(current);
      }
      continue;
    }
    const format = !current && line.match(/^\s*Format\s*:\s*(\S+)/i);
    if (format) {
      result.format = Number(format[1]);
      continue;
    }
    const field = line.match(FIELD);
    if (!field) continue;
    const key = field[1].trim().toLowerCase();
    if (current) current.fields[key] = field[2];
    else result.project[key] = field[2];
  }
  if (result.format !== null && result.format > REPOSITORIES_FORMAT) {
    result.warnings.push(`repositories.md uses format ${result.format}, newer than this kit understands (${REPOSITORIES_FORMAT}). Upgrade the kit. Fields may be ignored.`);
  }
  for (const repo of result.repositories) {
    const f = repo.fields;
    repo.path = (f.path || repo.name).trim();
    repo.typeInfo = parseTypeList(f.type);
    repo.purpose = f.purpose || '';
    repo.sites = (f.sites || '').split(',').map((s) => s.trim()).filter(Boolean);
    repo.notes = f.notes || '';
    const status = (f.status || 'active').trim().toLowerCase();
    repo.status = STATUSES.includes(status) ? status : 'active';
    if (!STATUSES.includes(status)) result.warnings.push(`Repository "${repo.name}": unknown status "${f.status}". Treated as active.`);
    for (const t of repo.typeInfo.unrecognized) {
      result.warnings.push(`Repository "${repo.name}": type "${t}" is not recognized. It is recorded as unknown, not guessed. Supported: auto, ${Object.keys(TYPES).join(', ')}.`);
    }
  }
  return result;
}

/** Resolves a configured path safely. Paths may not escape the project root. */
export function resolveRepoPath(root, configuredPath) {
  const abs = path.resolve(root, configuredPath);
  if (!isInside(root, abs) || abs === path.resolve(root)) return { ok: false, abs };
  return { ok: true, abs, rel: toPosix(path.relative(root, abs)) };
}

export function renderRepoSection(repo, date) {
  return [
    `## ${repo.name}`,
    `- Path: ${repo.path}`,
    '- Type: auto',
    '- Purpose:',
    '- Sites:',
    '- Status: active',
    `- Notes: Added by sfcc-kit on ${date}. Replace "auto" with an explicit type to override detection.`,
    '',
  ].join('\n');
}

export function renderRepositoriesFile(repos, date) {
  const header = `# SFCC project repositories

<!--
This file tells the SFCC kit and AI agents which repositories belong to this project and what each one is.
Everything in it is optional. A missing value means "not configured", never "guess".

One section per repository. The heading is a short name. Fields:
  Path     Folder relative to the project root. Defaults to the heading. Must stay inside the root.
  Type     auto, or one or more of the types below, separated by commas.
           An explicit type always overrides automatic detection.
  Purpose  One line of free text.
  Sites    Site IDs served by this repository, comma separated.
  Status   active (default), archived, or ignore. ignore hides the repository from agents.
  Notes    Free text.
Unknown fields are kept and ignored.

Types: ${Object.keys(TYPES).join(', ')}
Details: see docs/CONFIGURATION.md in the kit.

Setup appends newly discovered repositories. It never edits or removes your sections.
-->

Format: ${REPOSITORIES_FORMAT}
- Project:

`;
  return header + repos.map((r) => renderRepoSection(r, date)).join('\n');
}
