#!/usr/bin/env node
/**
 * sfcc-sitemap: user-provided site map for Claude Code (no site.xml needed).
 *
 *   Import a site list, as tab-separated text (Name <TAB> ID <TAB> cartridge:path:...)
 *   or as JSON (a ".json" file with { "sites": [{ "id", "name", "cartridgePath" }] }):
 *     node sfcc-sitemap.mjs --import sites.txt|sites.json [--map docs/ai/site-map.json]
 *   Render the analysis Claude reads:
 *     node sfcc-sitemap.mjs [--map docs/ai/site-map.json] [--out docs/ai/site-map.md] [--check]
 *
 * site-map.json is the human-maintained source of truth. Re-importing keeps any
 * repository, notes and businessManager values you already filled in.
 * site-map.md is generated. Never edit it by hand.
 */
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const MAP = opt('--map', 'docs/ai/site-map.json');
const OUT = opt('--out', path.join(path.dirname(MAP), 'site-map.md'));
const IMPORT = opt('--import', null);
const CHECK = args.includes('--check');

// ---------- import ----------
// Both input formats become the same rows: { name, id, pathRaw }. pathRaw is a string or an array.
function rowsFromTabs(text, notes) {
  const rows = [];
  let lineNo = 0;
  for (const raw of text.split(/\r?\n/)) {
    lineNo++;
    if (!raw.trim()) continue;
    // Split on single tabs so an empty column keeps its position instead of shifting the others.
    const cols = raw.split('\t').map((c) => c.trim());
    if (/^name$/i.test(cols[0]) && /^id$/i.test(cols[1] || '')) continue;
    if (cols.length < 3 || !cols[1] || !cols[2]) {
      notes.add(`Line ${lineNo} skipped: expected Name, ID and Cartridge Path separated by tabs.`);
      continue;
    }
    rows.push({ name: cols[0], id: cols[1], pathRaw: cols[2] });
  }
  return rows;
}

// Accepts { sites: [...] }, a bare array, or { data | items: [...] }. Field names are matched loosely
// so a hand-written file and a tool export both work.
function rowsFromJson(text, notes) {
  let doc;
  try { doc = JSON.parse(text); } catch (err) { throw new Error(`not valid JSON: ${err.message}`); }
  const list = Array.isArray(doc) ? doc : doc.sites || doc.data || doc.items;
  if (!Array.isArray(list)) throw new Error('expected an array of sites, or an object with a "sites" array.');
  const pick = (item, keys) => keys.map((k) => item[k]).find((v) => v !== undefined && v !== null && v !== '');
  const rows = [];
  list.forEach((item, i) => {
    const id = item && pick(item, ['id', 'siteId', 'site_id']);
    const pathRaw = item && pick(item, ['cartridgePath', 'cartridges', 'cartridge_path', 'customCartridges']);
    if (!id || !pathRaw) {
      notes.add(`Entry ${i + 1} skipped: needs an id and a cartridgePath.`);
      return;
    }
    rows.push({ name: pick(item, ['name', 'displayName', 'display_name']) || '', id: String(id), pathRaw });
  });
  return rows;
}

if (IMPORT) {
  const prev = fs.existsSync(MAP) ? JSON.parse(fs.readFileSync(MAP, 'utf8')) : null;
  const prevById = Object.fromEntries((prev?.sites || []).map((s) => [s.id, s]));
  const notes = new Set();
  const text = fs.readFileSync(IMPORT, 'utf8');
  let rows;
  try {
    rows = /\.json$/i.test(IMPORT) ? rowsFromJson(text, notes) : rowsFromTabs(text, notes);
  } catch (err) {
    console.error(`sfcc-sitemap: cannot import ${IMPORT}: ${err.message}`);
    process.exit(2);
  }
  const sites = [];
  for (const { name, id: idRaw, pathRaw } of rows) {
    const id = idRaw.trim();
    if (idRaw !== id) notes.add(`Site ID "${idRaw}" had surrounding whitespace; stored as "${id}".`);
    let p = Array.isArray(pathRaw) ? pathRaw.join(':') : String(pathRaw);
    if (p.startsWith('-')) { p = p.slice(1); notes.add('Leading "-" before cartridge paths was removed (copy/paste artifact).'); }
    const cartridgePath = p.split(':').map((c) => c.trim()).filter(Boolean);
    const old = prevById[id] || {};
    sites.push({
      id, name: name || id, brand: old.brand || id.split('_')[0],
      repository: old.repository ?? null, cartridgePath, notes: old.notes || '',
    });
  }
  const map = {
    $schema: 'sfcc-sitemap/v1',
    description: 'Authoritative site -> cartridge path map for Claude Code. Edit this file; regenerate site-map.md.',
    authoritative: prev?.authoritative ?? true,
    source: prev?.source || `Imported from ${path.basename(IMPORT)}`,
    instance: prev?.instance || 'TODO: which instance these paths were copied from (sandbox/staging/production)',
    capturedOn: new Date().toISOString().slice(0, 10),
    repositories: prev?.repositories || [],
    ...(prev?.businessManager ? { businessManager: prev.businessManager } : {}),
    importNotes: [...notes],
    sites,
  };
  fs.mkdirSync(path.dirname(path.resolve(MAP)), { recursive: true });
  fs.writeFileSync(MAP, JSON.stringify(map, null, 2) + '\n');
  console.log(`sfcc-sitemap: imported ${sites.length} sites -> ${MAP}`);
}

// ---------- analyse ----------
let map;
try {
  map = JSON.parse(fs.readFileSync(MAP, 'utf8'));
} catch (err) {
  console.error(`sfcc-sitemap: cannot read ${MAP}: ${err.message}`);
  process.exit(2);
}
const sites = (Array.isArray(map.sites) ? map.sites : []).filter((s) => s && s.id && Array.isArray(s.cartridgePath));
const bmPath = map.businessManager && Array.isArray(map.businessManager.cartridgePath) ? map.businessManager.cartridgePath : null;
const BASE = 'app_storefront_base';
const brands = [...new Set(sites.map((s) => s.brand))];
const brandOf = Object.fromEntries(sites.map((s) => [s.id, s.brand]));
const usedBy = {};
for (const s of sites) for (const c of s.cartridgePath) (usedBy[c] ||= []).push(s.id);
const cartridges = Object.keys(usedBy).sort();

const scopeOf = (c) => {
  const ids = usedBy[c]; const bs = [...new Set(ids.map((i) => brandOf[i]))];
  if (ids.length === sites.length) return 'all sites';
  if (bs.length > 1) return `${bs.length} brands`;
  const total = sites.filter((s) => s.brand === bs[0]).length;
  if (ids.length === 1 && total > 1) return 'single site';
  return ids.length === total ? `${bs[0]} only (all its sites)` : `${bs[0]} only (some sites)`;
};

// compact site lists: "BrandA (all 5)" when a whole brand is included
const fmtSites = (ids) => {
  const set = new Set(ids);
  if (set.size === sites.length) return `all ${sites.length} sites`;
  const parts = [];
  for (const b of brands) {
    const bs = sites.filter((s) => s.brand === b).map((s) => s.id);
    const hit = bs.filter((i) => set.has(i));
    if (!hit.length) continue;
    parts.push(hit.length === bs.length && bs.length > 1 ? `${b} (all ${bs.length})` : hit.join(', '));
  }
  return parts.join('; ');
};
// checks: each returns Map(label -> [siteIds])
const check = () => new Map();
const add = (m, k, id) => { if (!m.has(k)) m.set(k, []); m.get(k).push(id); };
const C = { dup: check(), right: check(), bm: check(), modules: check(), pair: check(), noBase: check() };
for (const s of sites) {
  const p = s.cartridgePath; const set = new Set(p);
  for (const c of new Set(p.filter((c, i) => p.indexOf(c) !== i))) add(C.dup, c, s.id);
  const bi = p.indexOf(BASE);
  if (bi < 0) add(C.noBase, BASE, s.id);
  else for (const c of p.slice(bi + 1)) add(C.right, c, s.id);
  for (const c of p.filter((c) => c.startsWith('bm_'))) add(C.bm, c, s.id);
  if (set.has('modules')) add(C.modules, 'modules', s.id);
  for (const c of p.filter((c) => set.has(`${c}_sfra`))) {
    const winner = p.indexOf(c) < p.indexOf(`${c}_sfra`) ? `${c} (legacy) wins` : `${c}_sfra wins`;
    add(C.pair, `${c} + ${c}_sfra: ${winner}`, s.id);
  }
}
const foreignUse = [];
for (const c of cartridges) for (const b of brands) {
  if (!c.toLowerCase().includes(b.toLowerCase())) continue;
  const foreign = usedBy[c].filter((id) => brandOf[id] !== b);
  if (foreign.length) foreignUse.push([c, b, foreign]);
}
// brand baselines and deltas
const brandSections = brands.map((b) => {
  const bsites = sites.filter((s) => s.brand === b);
  const count = {}; for (const s of bsites) for (const c of new Set(s.cartridgePath)) count[c] = (count[c] || 0) + 1;
  const majority = new Set(Object.keys(count).filter((c) => count[c] > bsites.length / 2));
  const ref = bsites.reduce((a, s) => (s.cartridgePath.filter((c) => majority.has(c)).length > a.cartridgePath.filter((c) => majority.has(c)).length ? s : a), bsites[0]);
  const baseline = ref.cartridgePath.filter((c) => majority.has(c));
  const deltas = bsites.map((s) => {
    const set = new Set(s.cartridgePath);
    const extra = s.cartridgePath.filter((c) => !majority.has(c));
    const missing = baseline.filter((c) => !set.has(c));
    const common = s.cartridgePath.filter((c) => majority.has(c));
    const exp = baseline.filter((c) => set.has(c));
    const reordered = common.join(':') !== exp.join(':');
    return { id: s.id, extra, missing, reordered };
  });
  return { b, bsites, baseline, deltas };
});

// ---------- render ----------
const L = [];
const row = (r) => `| ${r.join(' | ')} |`;
L.push('<!-- GENERATED by sfcc-sitemap from site-map.json. Do not edit; edit site-map.json and regenerate. -->');
L.push('# Site map\n');
const instance = map.instance && !/^TODO/i.test(map.instance) ? map.instance : 'not configured';
L.push(`Source: ${map.source || 'not recorded'} | Instance: ${instance} | Captured: ${map.capturedOn || 'not recorded'} | Authoritative: ${map.authoritative ? 'yes (use this instead of site.xml)' : 'no'}  `);
L.push(`Confidence: **[user]**, provided from Business Manager, not verified against code. Cartridge path precedence: leftmost wins.\n`);
L.push(`**${sites.length} sites, ${brands.length} brands, ${cartridges.length} distinct cartridges.**\n`);
L.push('## Sites\n');
L.push(row(['Brand', 'Site ID', 'Name', 'Repository', 'Cartridges', 'Position of base']));
L.push(row(Array(6).fill('---')));
for (const s of sites) L.push(row([s.brand, `\`${s.id}\``, s.name, s.repository || 'TODO', s.cartridgePath.length, `${s.cartridgePath.indexOf(BASE) + 1} of ${s.cartridgePath.length}`]));
L.push('\n## Cartridges shared by every site\n');
const all = cartridges.filter((c) => usedBy[c].length === sites.length);
L.push(all.length ? all.map((c) => `\`${c}\``).join(', ') : '_None._');
L.push('\nA change in any of these ships to all sites. Run the sfcc-change-impact skill first.\n');
L.push('## Business Manager cartridge path\n');
if (bmPath) {
  L.push('```\n' + bmPath.join(':') + '\n```\n');
  const bmInStorefront = cartridges.filter((c) => c.startsWith('bm_'));
  const missing = bmInStorefront.filter((c) => !bmPath.includes(c));
  if (missing.length) L.push(`bm_* cartridges in storefront paths but not in the Business Manager path: ${missing.map((c) => `\`${c}\``).join(', ')}. Confirm whether they are meant for BM.\n`);
} else {
  L.push('Not configured (optional). Business Manager extensions and org-level SCAPI Admin custom APIs resolve through this path. Add it as `"businessManager": {"cartridgePath": [...]}` in site-map.json, for example from `b2c sites cartridges list --bm`.\n');
}
L.push('## Brands\n');
for (const { b, bsites, baseline, deltas } of brandSections) {
  L.push(`### ${b} (${bsites.length} site${bsites.length > 1 ? 's' : ''}: ${bsites.map((s) => s.id).join(', ')})\n`);
  L.push(`Brand baseline (cartridges in most ${b} sites, in order):\n`);
  L.push('```\n' + baseline.join(':') + '\n```');
  const d = deltas.filter((x) => x.extra.length || x.missing.length || x.reordered);
  if (!d.length) { L.push('All sites use exactly the baseline.\n'); continue; }
  L.push(row(['Site', 'Adds (vs baseline)', 'Lacks (vs baseline)', 'Order differs']));
  L.push(row(Array(4).fill('---')));
  for (const x of deltas) L.push(row([`\`${x.id}\``, x.extra.join(', ') || '-', x.missing.join(', ') || '-', x.reordered ? 'yes' : '-']));
  L.push('');
}
L.push('## Cartridge usage\n');
L.push(row(['Cartridge', 'Scope', 'Sites']));
L.push(row(Array(3).fill('---')));
const order = (c) => (usedBy[c].length === sites.length ? 0 : 1);
for (const c of [...cartridges].sort((a, b) => order(a) - order(b) || usedBy[b].length - usedBy[a].length || a.localeCompare(b))) {
  const ids = usedBy[c];
  L.push(row([`\`${c}\``, scopeOf(c), fmtSites(ids)]));
}
L.push('\n## Observations to confirm with the team\n');
L.push('Mechanical checks only. Each item is a question for the team, not a verdict.\n');
for (const n of map.importNotes || []) L.push(`- Import: ${n}`);
const section = (title, why, m) => {
  if (!m.size) return;
  L.push(`\n### ${title}\n`); L.push(why + '\n');
  for (const [k, ids] of m) L.push(`- \`${k}\`: ${fmtSites(ids)}`);
};
section('Cartridges to the right of app_storefront_base',
  'Lower precedence than base: they are only reached for files no cartridge to their left provides, and they cannot override base. Fine for libraries and integrations; a problem if any of them is expected to customize base behavior.', C.right);
section('Business Manager cartridges in the storefront path',
  `bm_* cartridges usually belong in the Business Manager cartridge path. Confirm whether they are also needed here (for example for shared scripts).${bmPath ? '' : ' The Business Manager path is not configured, so this cannot be cross-checked.'}`, C.bm);
section('Legacy and _sfra variants in the same path',
  'Hybrid indicator. Where both variants provide the same file, the leftmost wins. Hooks registered by both run in path order. Confirm which variant each feature actually uses (sfcc-hybrid-migration skill).', C.pair);
section('SFRA modules cartridge listed in the path', 'Confirm whether the project relies on this.', C.modules);
section('Duplicate cartridges within one path', 'Only the first occurrence matters; the duplicate is probably a mistake.', C.dup);
section('app_storefront_base not in the path', 'Expected for SiteGenesis-only sites. For SFRA sites it means the path is incomplete.', C.noBase);
if (foreignUse.length) {
  L.push('\n### Brand-named cartridges used by other brands\n');
  L.push('The name suggests one brand, but other brands depend on it. Treat these as shared code.\n');
  for (const [c, b, ids] of foreignUse) L.push(`- \`${c}\` (named for ${b}) is also used by: ${fmtSites(ids)}`);
}
const md = L.join('\n') + '\n';

if (CHECK) {
  const cur = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
  if (cur !== md) { console.error('sfcc-sitemap: site-map.md is STALE. Regenerate.'); process.exit(1); }
  console.log('sfcc-sitemap: up to date.');
} else {
  fs.writeFileSync(OUT, md);
  console.log(`sfcc-sitemap: ${sites.length} sites, ${brands.length} brands, ${cartridges.length} cartridges -> ${OUT}`);
}
