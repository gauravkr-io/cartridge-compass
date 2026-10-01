#!/usr/bin/env node
/**
 * sfcc-inventory: deterministic fact extraction for SFCC codebases.
 *
 * Produces the "facts layer" of the knowledge base so Claude never has to
 * guess (or re-read thousands of files) to know what exists:
 *   cartridges, repos, SFRA/SGJC signals, routes, hooks, job steps,
 *   services, dw.* API usage, cross-cartridge overrides, site cartridge
 *   paths from site-import archives.
 *
 * Usage:
 *   node sfcc-inventory.mjs [root ...] [--out docs/ai/generated] [--check]
 *
 *   root     One or more folders to scan (default: current directory).
 *   --out    Output folder (default: docs/ai/generated).
 *   --check  Do not write. Exit 1 if the committed inventory is stale.
 *            Use this in CI or a pre-commit hook.
 *   --sites  Path to a user-provided site map (docs/ai/site-map.json, see
 *            sfcc-sitemap.mjs). When given, it is the source of cartridge paths
 *            and site.xml files are NOT read (add --also-site-xml to compare).
 *
 * Zero dependencies. Node 18+. Output is sorted and timestamp-free so that
 * --check is stable. Paths are relative to the current directory, so run
 * generation and --check from the same folder (the project root).
 */
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const roots = args.filter((a, i) => !a.startsWith('--') && !['--out', '--sites'].includes(args[i - 1]));
if (roots.length === 0) roots.push('.');
const OUT = opt('--out', 'docs/ai/generated');
const CHECK = flag('--check');
const SITES_FILE = opt('--sites', null);
const READ_SITE_XML = !SITES_FILE || flag('--also-site-xml');
const CWD = process.cwd();

const SKIP_DIRS = new Set(['node_modules', '.git', '.idea', '.vscode', 'coverage', '.claude']);
const MAX_SCAN_BYTES = 512 * 1024; // skip huge (usually compiled) files for pattern scans
const rel = (p) => path.relative(CWD, p).split(path.sep).join('/') || '.';

function walk(dir, onFile, onDir) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue;
      if (onDir && onDir(full, e.name) === false) continue;
      walk(full, onFile, onDir);
    } else if (e.isFile()) onFile(full, e.name);
  }
}
const read = (f) => { try { return fs.statSync(f).size > MAX_SCAN_BYTES ? '' : fs.readFileSync(f, 'utf8'); } catch { return ''; } };
const readJson = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };

function findRepo(dir) {
  let d = dir;
  while (true) {
    if (fs.existsSync(path.join(d, '.git'))) return rel(d);
    const up = path.dirname(d);
    if (up === d) return '(no git repo)';
    d = up;
  }
}

// ---------- 1. discover cartridges ----------
const cartridges = [];
for (const root of roots) {
  const abs = path.resolve(root);
  walk(abs, () => {}, (full) => {
    const inner = path.join(full, 'cartridge');
    if (!fs.existsSync(inner) || !fs.statSync(inner).isDirectory()) return true;
    const name = path.basename(full);
    const isCartridge = fs.existsSync(path.join(full, '.project')) ||
      fs.existsSync(path.join(inner, `${name}.properties`));
    if (isCartridge) { cartridges.push({ name, dir: full }); return false; }
    return true;
  });
}
cartridges.sort((a, b) => a.name.localeCompare(b.name) || a.dir.localeCompare(b.dir));

// ---------- 2. analyse each cartridge ----------
const SIG = {
  sfra: [
    [/require\(\s*['"]server['"]\s*\)/, "require('server')"],
    [/server\.extend\(/, 'server.extend('],
    [/module\.superModule/, 'module.superModule'],
    [/server\.exports\(\)/, 'server.exports()'],
  ],
  sgjc: [
    [/guard\.ensure\(/, 'guard.ensure('],
    [/require\(\s*['"][^'"]*scripts\/guard['"]\s*\)/, "require('.../scripts/guard')"],
    [/app\.get(Model|View|Form|Controller)\(/, 'app.getModel/View/Form/Controller('],
    [/require\(\s*['"][^'"]*app_storefront_(controllers|core)/, 'require(app_storefront_controllers|core)'],
  ],
};
const RX = {
  sfraRoute: /server\.(get|post|use|append|prepend|replace)\(\s*['"]([^'"]+)['"]/g,
  sfraRouteDynamic: /server\.(get|post|use|append|prepend|replace)\(\s*([A-Za-z_$][\w$.]*)\s*,/g,
  classicRoute: /(?:module\.)?exports\.(\w+)\.public\s*=\s*true/g,
  dwGlobal: /(?<![\w.'"\/])dw\.([a-z]+(?:\.[a-z]+)*)\.([A-Z]\w+)/g,
  dwImportClass: /importClass\(\s*dw\.([\w.]+)\s*\)/g,
  serviceDynamic: /LocalServiceRegistry\.createService\(\s*([A-Za-z_$][\w$.]*)\s*,/g,
  sgjcRoute: /exports\.(\w+)\s*=\s*guard\.\w+\(/g,
  dwRequire: /require\(\s*['"](dw\/[\w/]+)['"]\s*\)/g,
  dwImport: /importPackage\(\s*(dw\.[\w.]+)\s*\)/g,
  service: /(?:LocalServiceRegistry\.createService|ServiceRegistry\.(?:get|configure))\(\s*['"]([^'"]+)['"]/g,
  crossCartridge: /require\(\s*['"]([a-z][\w-]*)\/cartridge\/([^'"]+)['"]\s*\)/g,
};

const overrideIndex = new Map(); // relPath -> [cartridge]
const clientIndex = new Map(); // build-time client files -> [cartridge]
const OVERRIDE_ROOTS = ['controllers', 'models', 'scripts', 'templates', 'forms'];

const results = cartridges.map(({ name, dir }) => {
  const inner = path.join(dir, 'cartridge');
  const c = {
    name, path: rel(dir), repo: findRepo(dir),
    counts: { controllers: 0, pipelines: 0, isml: 0, forms: 0, models: 0, clientJs: 0, scss: 0, serverJs: 0 },
    signals: { sfra: new Set(), sgjc: new Set() },
    routes: [], hooks: [], jobSteps: [], services: new Set(), dwApi: {}, crossCartridgeRequires: new Set(),
    customApis: [], pageDesigner: 0, bmExtensions: false,
    hookRegistrations: [], hookScripts: [], hooksFiles: [], hookIssues: [],
  };
  walk(inner, (f, base) => {
    const r = path.relative(inner, f).split(path.sep).join('/');
    const top = r.split('/')[0];
    if (OVERRIDE_ROOTS.includes(top) && !r.includes('/static/')) {
      if (!overrideIndex.has(r)) overrideIndex.set(r, []);
      overrideIndex.get(r).push(name);
    }
    if (r.startsWith('client/')) {
      if (!clientIndex.has(r)) clientIndex.set(r, []);
      clientIndex.get(r).push(name);
    }
    if (/^rest-apis\/[^/]+\/schema\.ya?ml$/.test(r)) c.customApis.push(r.split('/')[1]);
    if (r.startsWith('experience/') && base.endsWith('.json')) c.pageDesigner++;
    if (base.endsWith('.isml')) c.counts.isml++;
    if (base.endsWith('.scss')) c.counts.scss++;
    if (top === 'pipelines' && base.endsWith('.xml')) {
      c.counts.pipelines++;
      const pipeline = base.replace(/\.xml$/, '');
      // Start node names are read best-effort. If none are found, only the pipeline name is listed.
      const starts = [...read(f).matchAll(/<start-node\b[^>]*\bname="([^"]+)"/g)].map((m) => m[1]);
      if (starts.length) for (const s of starts) c.routes.push(`${pipeline}-${s} (pipeline)`);
      else c.routes.push(`${pipeline} (pipeline, start nodes not parsed)`);
    }
    if (top === 'forms' && base.endsWith('.xml')) c.counts.forms++;
    if (!base.endsWith('.js') && !base.endsWith('.ds')) return;
    const isClient = r.startsWith('client/') || r.startsWith('static/');
    if (isClient) { if (r.startsWith('client/')) c.counts.clientJs++; return; }
    c.counts.serverJs++;
    if (top === 'scripts' && /(^|\/)hooks?\//.test(r)) c.hookScripts.push(r);
    if (top === 'models' || r.includes('/models/')) c.counts.models++;
    const src = read(f);
    for (const [rx, label] of SIG.sfra) if (rx.test(src)) c.signals.sfra.add(label);
    for (const [rx, label] of SIG.sgjc) if (rx.test(src)) c.signals.sgjc.add(label);
    if (top === 'controllers') {
      c.counts.controllers++;
      const ctrl = base.replace(/\.(js|ds)$/, '');
      for (const m of src.matchAll(RX.sfraRoute)) c.routes.push(`${ctrl}-${m[2]} (${m[1]})`);
      for (const m of src.matchAll(RX.sgjcRoute)) c.routes.push(`${ctrl}-${m[1]} (guard)`);
      for (const m of src.matchAll(RX.sfraRouteDynamic)) c.routes.push(`${ctrl}-<dynamic:${m[2]}> (${m[1]})`);
      const sgjcNames = new Set([...src.matchAll(RX.sgjcRoute)].map((m) => m[1]));
      for (const m of src.matchAll(RX.classicRoute)) if (!sgjcNames.has(m[1])) c.routes.push(`${ctrl}-${m[1]} (public)`);
    }
    for (const m of src.matchAll(RX.dwRequire)) c.dwApi[m[1]] = (c.dwApi[m[1]] || 0) + 1;
    for (const m of src.matchAll(RX.dwImport)) c.dwApi[m[1]] = (c.dwApi[m[1]] || 0) + 1;
    for (const m of src.matchAll(RX.service)) c.services.add(m[1]);
    for (const m of src.matchAll(RX.serviceDynamic)) c.services.add(`<dynamic:${m[1]}>`);
    for (const m of src.matchAll(RX.dwImportClass)) c.dwApi[`dw.${m[1]}`] = (c.dwApi[`dw.${m[1]}`] || 0) + 1;
    for (const m of src.matchAll(RX.dwGlobal)) {
      const key = `dw.${m[1]}.${m[2]} (global)`;
      c.dwApi[key] = (c.dwApi[key] || 0) + 1;
    }
    for (const m of src.matchAll(RX.crossCartridge)) if (m[1] !== name) c.crossCartridgeRequires.add(m[1]);
  });
  // hooks.json / caches via cartridge package.json; job steps via steptypes.json
  const pkgFile = [path.join(dir, 'package.json'), path.join(inner, 'package.json')].find((f) => fs.existsSync(f));
  const pkg = pkgFile && readJson(pkgFile);
  if (pkg && pkg.hooks) {
    const hooksFile = [path.dirname(pkgFile), dir, inner].map((base) => path.resolve(base, pkg.hooks)).find((f) => fs.existsSync(f));
    const hj = hooksFile && readJson(hooksFile);
    if (!hj) c.hookIssues.push(`${rel(pkgFile)} registers "${pkg.hooks}", which is missing or not valid JSON`);
    for (const h of (hj && hj.hooks) || []) {
      c.hooks.push(`${h.name} -> ${h.script}`);
      c.hookRegistrations.push({ name: h.name, script: h.script, cartridge: name, hooksFile: rel(hooksFile), scriptFile: rel(path.resolve(path.dirname(hooksFile), h.script)) });
    }
  }
  walk(dir, (f, base) => {
    if (base === 'hooks.json') c.hooksFiles.push(rel(f));
    if (base === 'bm_extensions.xml') c.bmExtensions = true;
    if (base === 'steptypes.xml') {
      for (const m of read(f).matchAll(/type-id="([^"]+)"/g)) c.jobSteps.push(`${m[1]} (steptypes.xml)`);
      return;
    }
    if (base !== 'steptypes.json') return;
    const st = readJson(f); const t = st && st['step-types'];
    for (const kind of ['script-module-step', 'chunk-script-module-step']) {
      for (const s of (t && t[kind]) || []) c.jobSteps.push(`${s['@type-id']} (${kind})`);
    }
  });
  // Pipelines and SGJC are different legacy architectures, so they are separate styles.
  c.styles = [c.signals.sfra.size && 'sfra', c.signals.sgjc.size && 'sgjc', c.counts.pipelines && 'pipeline'].filter(Boolean);
  c.classificationSignal = c.styles.length > 1 ? 'hybrid' : c.styles[0] || 'neutral';
  return {
    ...c,
    signals: { sfra: [...c.signals.sfra].sort(), sgjc: [...c.signals.sgjc].sort() },
    routes: [...new Set(c.routes)].sort(), hooks: c.hooks.sort(), jobSteps: c.jobSteps.sort(),
    services: [...c.services].sort(), crossCartridgeRequires: [...c.crossCartridgeRequires].sort(),
    customApis: [...new Set(c.customApis)].sort(),
    hookScripts: c.hookScripts.sort(), hooksFiles: c.hooksFiles.sort(),
    dwApi: Object.fromEntries(Object.entries(c.dwApi).sort()),
  };
});

// ---------- 3. site cartridge paths: user site map and/or site-import archives ----------
const sites = [];
if (SITES_FILE) {
  const sm = readJson(path.resolve(SITES_FILE));
  if (!sm) { console.error(`sfcc-inventory: cannot read ${SITES_FILE}`); process.exit(2); }
  for (const s of sm.sites || []) sites.push({ siteId: s.id, name: s.name, file: rel(path.resolve(SITES_FILE)), cartridgePath: s.cartridgePath });
}
if (READ_SITE_XML) for (const root of roots) {
  walk(path.resolve(root), (f, base) => {
    if (base !== 'site.xml' || path.basename(path.dirname(path.dirname(f))) !== 'sites') return;
    const xml = read(f);
    const cc = xml.match(/<custom-cartridges>([^<]*)<\/custom-cartridges>/);
    const nm = xml.match(/<name[^>]*>([^<]*)<\/name>/);
    sites.push({
      siteId: path.basename(path.dirname(f)), name: nm ? nm[1].trim() : null, file: rel(f),
      cartridgePath: cc ? cc[1].trim().split(':').filter(Boolean) : null,
    });
  });
}
sites.sort((a, b) => a.siteId.localeCompare(b.siteId) || a.file.localeCompare(b.file));
const known = new Set(results.map((c) => c.name));
for (const s of sites) s.missingLocally = (s.cartridgePath || []).filter((n) => !known.has(n));

// ---------- 4. overrides, duplicates, SFRA version ----------
const overrides = [...overrideIndex.entries()].filter(([, l]) => l.length > 1)
  .map(([file, list]) => ({ file, cartridges: [...new Set(list)].sort() })).sort((a, b) => a.file.localeCompare(b.file));
const byName = {};
for (const c of results) (byName[c.name] ||= []).push(c.path);
const duplicateNames = Object.entries(byName).filter(([, p]) => p.length > 1).map(([name, paths]) => ({ name, paths }));
const packages = [];
for (const root of roots) walk(path.resolve(root), (f, base) => {
  if (base !== 'package.json') return;
  const p = readJson(f);
  if (p && p.name && /storefront-reference-architecture|sitegenesis|storefront/i.test(p.name)) packages.push({ file: rel(f), name: p.name, version: p.version || null });
});
// Base SFRA recognized by structure, whatever the package is called.
const findBaseSfra = (full) => {
  if (!fs.existsSync(path.join(full, 'cartridges', 'app_storefront_base', 'cartridge')) || !fs.existsSync(path.join(full, 'cartridges', 'modules', 'server'))) return true;
  const p = readJson(path.join(full, 'package.json'));
  const file = rel(path.join(full, 'package.json'));
  if (!packages.some((x) => x.file === file)) packages.push({ file, name: (p && p.name) || '(no package.json name)', version: (p && p.version) || null, detectedBy: 'structure' });
  return false;
};
for (const root of roots) if (findBaseSfra(path.resolve(root))) walk(path.resolve(root), () => {}, findBaseSfra);
packages.sort((a, b) => a.file.localeCompare(b.file));
const usedBy = {};
for (const s of sites) for (const n of s.cartridgePath || []) (usedBy[n] ||= []).push(s.siteId);

// ---------- 4b. hook registry across cartridges ----------
// A hooks.json can live in a different cartridge than the script it names, so registrations are
// checked against every scanned cartridge, not only the one that registers them.
const innerPath = (scriptFile, cartridge) => {
  const prefix = `${cartridge.path}/cartridge/`;
  return scriptFile.startsWith(prefix) ? scriptFile.slice(prefix.length) : null;
};
const hookRegistry = results.flatMap((c) => c.hookRegistrations.map((h) => {
  const innerRel = innerPath(h.scriptFile, c);
  const alsoIn = innerRel
    ? results.filter((o) => o !== c && fs.existsSync(path.resolve(CWD, o.path, 'cartridge', innerRel))).map((o) => o.name).sort()
    : [];
  const exists = fs.existsSync(path.resolve(CWD, h.scriptFile));
  return { ...h, innerRel, exists, alsoIn, status: exists ? 'found' : alsoIn.length ? 'only in other cartridge' : 'not found' };
})).sort((a, b) => a.name.localeCompare(b.name) || a.cartridge.localeCompare(b.cartridge) || a.script.localeCompare(b.script));
const registeredScripts = new Set(hookRegistry.flatMap((h) => [h.scriptFile, h.innerRel && `*/${h.innerRel}`].filter(Boolean)));
const hookFindings = [];
for (const c of results) {
  for (const issue of c.hookIssues) hookFindings.push(`${c.name}: ${issue}`);
  const registeredFiles = new Set(c.hookRegistrations.map((h) => h.hooksFile));
  for (const f of c.hooksFiles) if (!registeredFiles.has(f)) hookFindings.push(`${c.name}: ${f} is not referenced by a "hooks" entry in this cartridge's package.json, so it is not registered from here`);
  for (const s of c.hookScripts) {
    if (!registeredScripts.has(`${c.path}/cartridge/${s}`) && !registeredScripts.has(`*/${s}`)) hookFindings.push(`${c.name}: cartridge/${s} is not named by any hooks.json that was scanned (unregistered, or registered outside the scanned folders)`);
  }
}
for (const h of hookRegistry) {
  if (h.status === 'not found') hookFindings.push(`${h.cartridge}: ${h.name} registers ${h.script}, but no such file exists in any scanned cartridge`);
  else if (h.alsoIn.length) hookFindings.push(`${h.cartridge}: ${h.name} -> ${h.script} ${h.exists ? 'also exists in' : 'exists only in'} ${h.alsoIn.join(', ')}`);
}
hookFindings.sort();

const siteMapSource = SITES_FILE ? rel(path.resolve(SITES_FILE)) : null;
const unusedLocal = results.filter((c) => !usedBy[c.name]).map((c) => c.name);
const clientOverrides = [...clientIndex.entries()].filter(([, l]) => l.length > 1)
  .map(([file, list]) => ({ file, cartridges: [...new Set(list)].sort() })).sort((a, b) => a.file.localeCompare(b.file));
const inventory = { generator: 'sfcc-inventory v2', clientOverrides, siteMapSource, unusedLocal, roots: roots.map((r) => rel(path.resolve(r))), cartridges: results, sites, usedBy, overrides, duplicateNames, packages, hookRegistry, hookFindings };

// ---------- 5. render markdown ----------
const t = (rows) => rows.map((r) => `| ${r.join(' | ')} |`).join('\n');
const md = [];
md.push('<!-- GENERATED by sfcc-inventory. Do not edit by hand. Regenerate: node <plugin>/scripts/sfcc-inventory.mjs -->');
md.push('# SFCC generated inventory\n');
md.push('Facts extracted mechanically from source. "Signal" classifications are hints, not verdicts: confirm them in docs/ai/project-map.md.\n');
md.push('**Absence here is not evidence of absence.** Known blind spots: routes, services and API calls built from computed strings; code loaded with `importScript`; behavior configured only in Business Manager or imported metadata; content assets and Page Designer data; repositories not scanned. `<dynamic:NAME>` means the value comes from an identifier and was not resolved.\n');
md.push(SITES_FILE ? `## Sites (from user site map ${rel(path.resolve(SITES_FILE))}${READ_SITE_XML ? ' + site.xml' : ''})\n` : '## Sites (from site-import archives)\n');
md.push(sites.length ? t([['Site ID', 'Name', 'Cartridge path', 'Not found locally', 'Source'], ['---', '---', '---', '---', '---'],
  ...sites.map((s) => [s.siteId, s.name || '?', s.cartridgePath ? s.cartridgePath.join(':') : '(no custom-cartridges element)', s.missingLocally.join(', ') || '-', s.file])])
  : '_No `sites/<id>/site.xml` found. Cartridge paths must come from the user or `b2c sites cartridges list`._');
md.push('\n## Cartridges\n');
md.push(t([['Cartridge', 'Repo', 'Signal', 'Used by sites', 'Ctrl', 'Pipe', 'ISML', 'Models', 'Client JS', 'Path'], Array(10).fill('---'),
  ...results.map((c) => [c.name, c.repo, c.classificationSignal, (usedBy[c.name] || []).join(', ') || '?', c.counts.controllers, c.counts.pipelines, c.counts.isml, c.counts.models, c.counts.clientJs, c.path])]));
if (sites.length && unusedLocal.length) md.push(`\n**Cartridges found locally but in no site's path** (BM-only, jobs-only, dead, or used by a site not in the map): ${unusedLocal.join(', ')}`);
if (duplicateNames.length) md.push('\n**Warning: duplicate cartridge names** (cartridge path resolves by name, so only one can be deployed per code version):\n' + duplicateNames.map((d) => `- ${d.name}: ${d.paths.join(', ')}`).join('\n'));
if (packages.length) md.push('\n## Storefront packages\n' + packages.map((p) => `- ${p.name}@${p.version} (${p.file})${p.detectedBy ? ' [base SFRA, detected by folder structure]' : ''}`).join('\n'));
md.push('\n## Files present in more than one cartridge (override candidates)\n');
md.push('Which copy wins depends on each site\'s cartridge path (leftmost wins).\n');
md.push(overrides.length ? t([['File (relative to cartridge/)', 'Cartridges'], ['---', '---'], ...overrides.map((o) => [o.file, o.cartridges.join(', ')])]) : '_None._');
md.push('\n## Client files present in more than one cartridge (build-time override candidates)\n');
md.push('These are resolved by the storefront build (for SFRA, `package.json` paths and sgmf-scripts), not by the cartridge path at runtime.\n');
md.push(clientOverrides.length ? t([['File (relative to cartridge/)', 'Cartridges'], ['---', '---'], ...clientOverrides.map((o) => [o.file, o.cartridges.join(', ')])]) : '_None._');
md.push('\n## Hook registry\n');
md.push('Hooks are not overrides: every cartridge on a site path that registers an extension point runs, in path order. The registering cartridge and the cartridge holding the script can differ. "Script found" means the file exists relative to the hooks.json that names it. Whether the platform also resolves a script from a different cartridge on the path is not verified here, so treat "also in" as something to confirm.\n');
md.push(hookRegistry.length
  ? t([['Extension point', 'Registered in', 'Script', 'Script status', 'Same file also in', 'Sites'], Array(6).fill('---'),
    ...hookRegistry.map((h) => [h.name, h.cartridge, h.script, h.status, h.alsoIn.join(', ') || '-', (usedBy[h.cartridge] || []).join(', ') || '?'])])
  : '_No hooks registered through a cartridge package.json._');
if (hookFindings.length) md.push('\n**Hook findings**\n' + hookFindings.map((f) => `- ${f}`).join('\n'));
for (const c of results) {
  md.push(`\n## ${c.name}\n`);
  md.push(`- Path: \`${c.path}\` (repo: ${c.repo})`);
  md.push(`- Signal: **${c.classificationSignal}**${c.styles.length > 1 ? ` (${c.styles.join(' + ')})` : ''}. SFRA: ${c.signals.sfra.join(', ') || 'none'}. SGJC: ${c.signals.sgjc.join(', ') || 'none'}${c.counts.pipelines ? `, ${c.counts.pipelines} pipelines` : ''}`);
  if (c.crossCartridgeRequires.length) md.push(`- Requires other cartridges by name: ${c.crossCartridgeRequires.join(', ')}`);
  if (c.routes.length) md.push(`- Routes: ${c.routes.join('; ')}`);
  if (c.hooks.length) md.push(`- Hooks: ${c.hooks.join('; ')}`);
  if (c.jobSteps.length) md.push(`- Job steps: ${c.jobSteps.join('; ')}`);
  if (c.services.length) md.push(`- Services: ${c.services.join(', ')}`);
  if (c.customApis.length) md.push(`- SCAPI custom APIs (rest-apis): ${c.customApis.join(', ')}`);
  if (c.pageDesigner) md.push(`- Page Designer JSON files (experience/): ${c.pageDesigner}`);
  if (c.bmExtensions) md.push('- Business Manager extension: bm_extensions.xml');
  const dw = Object.entries(c.dwApi);
  if (dw.length) md.push(`- dw.* usage: ${dw.map(([k, v]) => `${k}(${v})`).join(', ')}`);
}
const outputs = { 'inventory.json': JSON.stringify(inventory, null, 2) + '\n', 'inventory.md': md.join('\n') + '\n' };

// ---------- 6. write or check ----------
const outDir = path.resolve(OUT);
if (CHECK) {
  const stale = Object.entries(outputs).filter(([f, body]) => {
    try { return fs.readFileSync(path.join(outDir, f), 'utf8') !== body; } catch { return true; }
  }).map(([f]) => f);
  if (stale.length) { console.error(`sfcc-inventory: STALE (${stale.join(', ')}). Regenerate and review the diff.`); process.exit(1); }
  console.log('sfcc-inventory: up to date.');
} else {
  fs.mkdirSync(outDir, { recursive: true });
  for (const [f, body] of Object.entries(outputs)) fs.writeFileSync(path.join(outDir, f), body);
  console.log(`sfcc-inventory: ${results.length} cartridges, ${sites.length} sites, ${overrides.length} override candidates -> ${rel(outDir)}`);
}
