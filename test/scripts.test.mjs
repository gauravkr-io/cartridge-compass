import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { KIT_DIR, put, read, tmpRoot } from './helpers.mjs';

const script = (name) => path.join(KIT_DIR, 'plugin/scripts', name);
const node = (args, cwd) => execFileSync(process.execPath, args, { cwd, encoding: 'utf8' });

function fixture() {
  const root = tmpRoot('inv');
  const c = path.join(root, 'repo/cartridges/app_x');
  put(path.join(c, 'cartridge/app_x.properties'), 'x=1\n');
  put(path.join(c, 'cartridge/controllers/Cart.js'), "var server = require('server');\nserver.extend(module.superModule);\nserver.append('Show', function (req, res, next) { next(); });\nvar ROUTE = 'Foo';\nserver.get(ROUTE, function () {});\nmodule.exports = server.exports();\n");
  put(path.join(c, 'cartridge/controllers/Legacy.js'), 'function show() {}\nexports.Show = show;\nexports.Show.public = true;\n');
  put(path.join(c, 'cartridge/scripts/svc.js'), "var LocalServiceRegistry = require('dw/svc/LocalServiceRegistry');\nvar ID = 'x.http';\nmodule.exports = LocalServiceRegistry.createService(ID, {});\nvar site = dw.system.Site.getCurrent();\n");
  put(path.join(c, 'cartridge/rest-apis/loyalty/schema.yaml'), 'openapi: 3.0.0\n');
  put(path.join(c, 'cartridge/experience/components/assets/hero.json'), '{}\n');
  put(path.join(c, 'steptypes.xml'), '<step-types><script-module-step type-id="custom.Export"/></step-types>\n');
  put(path.join(root, 'repo/cartridges/app_storefront_base/cartridge/app_storefront_base.properties'), 'x=1\n');
  put(path.join(root, 'repo/cartridges/modules/server/server.js'), 'module.exports = {};\n');
  put(path.join(root, 'repo/package.json'), JSON.stringify({ name: 'whatever-name', version: '7.1.0' }));
  return root;
}

test('inventory reports items the 0.1 scanner missed', () => {
  const root = fixture();
  node([script('sfcc-inventory.mjs'), 'repo', '--out', 'gen'], root);
  const md = read(path.join(root, 'gen/inventory.md'));
  for (const expected of ['Cart-<dynamic:ROUTE> (get)', 'Cart-Show (append)', 'Legacy-Show (public)', 'Services: <dynamic:ID>', 'dw.system.Site (global)', 'SCAPI custom APIs (rest-apis): loyalty', 'Page Designer JSON files (experience/): 1', 'custom.Export (steptypes.xml)', 'whatever-name@7.1.0', 'Absence here is not evidence of absence']) {
    assert.ok(md.includes(expected), `missing: ${expected}`);
  }
  assert.equal(node([script('sfcc-inventory.mjs'), 'repo', '--out', 'gen', '--check'], root).trim(), 'sfcc-inventory: up to date.');
});

test('site map import keeps columns aligned, reports bad rows, and treats the BM path as optional', () => {
  const root = tmpRoot('sm');
  put(path.join(root, 'sites.txt'), 'Name\tID\tCartridge Path\n\tSiteX\t-app_a:app_a_sfra:app_storefront_base:bm_tool\nbroken row\n');
  node([script('sfcc-sitemap.mjs'), '--import', 'sites.txt'], root);
  const map = JSON.parse(read(path.join(root, 'docs/ai/site-map.json')));
  assert.equal(map.sites[0].id, 'SiteX');
  assert.deepEqual(map.sites[0].cartridgePath, ['app_a', 'app_a_sfra', 'app_storefront_base', 'bm_tool']);
  assert.ok(map.importNotes.some((n) => /Line 3 skipped/.test(n)));
  let md = read(path.join(root, 'docs/ai/site-map.md'));
  assert.match(md, /Instance: not configured/);
  assert.match(md, /## Business Manager cartridge path\n\nNot configured \(optional\)/);
  assert.match(md, /app_a \(legacy\) wins/);
  map.businessManager = { cartridgePath: ['bm_other'] };
  fs.writeFileSync(path.join(root, 'docs/ai/site-map.json'), JSON.stringify(map));
  node([script('sfcc-sitemap.mjs')], root);
  md = read(path.join(root, 'docs/ai/site-map.md'));
  assert.match(md, /not in the Business Manager path: `bm_tool`/);
  node([script('sfcc-sitemap.mjs'), '--import', 'sites.txt'], root);
  assert.deepEqual(JSON.parse(read(path.join(root, 'docs/ai/site-map.json'))).businessManager, { cartridgePath: ['bm_other'] }, 're-import keeps businessManager');
});

test('site map exits cleanly on invalid JSON', () => {
  const root = tmpRoot('smbad');
  put(path.join(root, 'docs/ai/site-map.json'), '{ nope');
  assert.throws(() => node([script('sfcc-sitemap.mjs')], root), (err) => err.status === 2);
});

test('hook registry connects a registration to scripts in other cartridges and reports gaps', () => {
  const root = tmpRoot('hooks');
  const cart = (name) => path.join(root, 'repo/cartridges', name);
  put(path.join(cart('app_left'), 'cartridge/app_left.properties'), 'x=1\n');
  put(path.join(cart('app_left'), 'cartridge/scripts/hooks/calculate.js'), 'exports.calculate = function () {};\n');
  put(path.join(cart('app_left'), 'cartridge/scripts/hooks/unused.js'), 'exports.unused = function () {};\n');
  put(path.join(cart('int_right'), 'cartridge/int_right.properties'), 'x=1\n');
  put(path.join(cart('int_right'), 'package.json'), JSON.stringify({ hooks: './hooks.json' }));
  put(path.join(cart('int_right'), 'hooks.json'), JSON.stringify({ hooks: [
    { name: 'dw.order.calculate', script: './cartridge/scripts/hooks/calculate.js' },
    { name: 'dw.order.calculateTax', script: './cartridge/scripts/hooks/tax.js' },
  ] }));
  node([script('sfcc-inventory.mjs'), 'repo', '--out', 'gen'], root);
  const inv = JSON.parse(read(path.join(root, 'gen/inventory.json')));
  const byName = Object.fromEntries(inv.hookRegistry.map((h) => [h.name, h]));
  assert.equal(byName['dw.order.calculate'].status, 'only in other cartridge');
  assert.deepEqual(byName['dw.order.calculate'].alsoIn, ['app_left']);
  assert.equal(byName['dw.order.calculateTax'].status, 'not found');
  assert.ok(inv.hookFindings.some((f) => /app_left: cartridge\/scripts\/hooks\/unused\.js is not named/.test(f)));
  assert.ok(!inv.hookFindings.some((f) => /calculate\.js is not named/.test(f)), 'a script registered from another cartridge is not an orphan');
  assert.match(read(path.join(root, 'gen/inventory.md')), /## Hook registry/);
});

test('site map imports JSON with a string or array cartridge path and reports bad entries', () => {
  const root = tmpRoot('smjson');
  put(path.join(root, 'sites.json'), JSON.stringify({ sites: [
    { id: 'SiteA', name: 'Site A', cartridgePath: 'app_a:app_storefront_base' },
    { siteId: 'SiteB', cartridges: ['app_b', 'app_storefront_base'] },
    { name: 'No id', cartridgePath: 'app_c' },
  ] }));
  node([script('sfcc-sitemap.mjs'), '--import', 'sites.json'], root);
  const map = JSON.parse(read(path.join(root, 'docs/ai/site-map.json')));
  assert.deepEqual(map.sites.map((s) => s.id), ['SiteA', 'SiteB']);
  assert.deepEqual(map.sites[1].cartridgePath, ['app_b', 'app_storefront_base']);
  assert.ok(map.importNotes.some((n) => /Entry 3 skipped/.test(n)));
  assert.ok(fs.existsSync(path.join(root, 'docs/ai/site-map.md')));
});

test('site map import exits cleanly on malformed JSON input', () => {
  const root = tmpRoot('smjsonbad');
  put(path.join(root, 'sites.json'), '{ nope');
  assert.throws(() => execFileSync(process.execPath, [script('sfcc-sitemap.mjs'), '--import', 'sites.json'], { cwd: root, stdio: 'pipe' }), (err) => err.status === 2 && /not valid JSON/.test(String(err.stderr)));
});
