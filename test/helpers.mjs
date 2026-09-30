import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const KIT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function tmpRoot(name = 'ws') {
  return fs.mkdtempSync(path.join(os.tmpdir(), `sfcc-kit-${name}-`));
}

export function put(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

export function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
}

export function gitRepo(dir) {
  fs.mkdirSync(path.join(dir, '.git', 'info'), { recursive: true });
  put(path.join(dir, '.git', 'HEAD'), 'ref: refs/heads/main\n');
}

function cartridge(repo, name, files) {
  const dir = path.join(repo, 'cartridges', name);
  put(path.join(dir, 'cartridge', `${name}.properties`), `demandware.cartridges.${name}.id=${name}\n`);
  for (const [rel, content] of Object.entries(files)) put(path.join(dir, rel), content);
}

export function sfraRepo(root, name = 'storefront-sfra') {
  const repo = path.join(root, name);
  gitRepo(repo);
  put(path.join(repo, 'package.json'), JSON.stringify({ name, devDependencies: { 'sgmf-scripts': '^2.0.0' } }));
  cartridge(repo, 'app_custom_brand', {
    'cartridge/controllers/Cart.js': "'use strict';\nvar server = require('server');\nserver.extend(module.superModule);\nserver.append('Show', function (req, res, next) { next(); });\nmodule.exports = server.exports();\n",
    'cartridge/scripts/helpers/cartHelpers.js': "module.exports = {};\n",
  });
  return repo;
}

export function sgjcRepo(root, name = 'storefront-legacy') {
  const repo = path.join(root, name);
  gitRepo(repo);
  cartridge(repo, 'app_storefront_controllers', {
    'cartridge/controllers/Cart.js': "var guard = require('~/cartridge/scripts/guard');\nvar app = require('~/cartridge/scripts/app');\nexports.Show = guard.ensure(['get'], function () { app.getView().render('cart'); });\n",
  });
  cartridge(repo, 'app_storefront_core', { 'cartridge/pipelines/Old.xml': '<pipeline/>\n', 'cartridge/scripts/util/x.ds': 'importPackage( dw.system );\n' });
  return repo;
}

export function headlessRepo(root, name = 'storefront-next') {
  const repo = path.join(root, name);
  gitRepo(repo);
  put(path.join(repo, 'package.json'), JSON.stringify({ name, dependencies: { react: '^19.0.0', '@salesforce/storefront-next-runtime': '1.0.0', 'commerce-sdk-isomorphic': '^4.0.0' } }));
  put(path.join(repo, 'src', 'api.ts'), "export const host = 'https://abc123.api.commercecloud.salesforce.com';\n");
  return repo;
}

export function integrationRepo(root, name = 'integrations') {
  const repo = path.join(root, name);
  gitRepo(repo);
  cartridge(repo, 'int_payments', {
    'cartridge/scripts/services/payment.js': "var LocalServiceRegistry = require('dw/svc/LocalServiceRegistry');\n",
    'package.json': JSON.stringify({ hooks: './cartridge/scripts/hooks.json' }),
    'cartridge/scripts/hooks.json': JSON.stringify({ hooks: [{ name: 'dw.ocapi.shop.basket.afterPOST', script: './hooks/basket' }] }),
    'cartridge/rest-apis/loyalty/schema.yaml': 'openapi: 3.0.0\n',
    'cartridge/rest-apis/loyalty/api.json': '{"endpoints":[]}\n',
  });
  return repo;
}

/** Hash of every file under a directory, so tests can prove the kit never wrote into a repository. */
export function treeHash(dir) {
  const hash = crypto.createHash('sha256');
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const full = path.join(d, e.name);
      hash.update(path.relative(dir, full));
      if (e.isDirectory()) walk(full);
      else hash.update(fs.readFileSync(full));
    }
  };
  walk(dir);
  return hash.digest('hex');
}

export function writeChanges(result) {
  return result.changes.filter((c) => c.action === 'create' || c.action === 'update' || c.action === 'remove');
}
