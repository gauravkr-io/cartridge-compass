import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { UsageError } from '../lib/commands.mjs';
import { parseSteps, runSteps } from '../lib/steps.mjs';
import { put, read, sfraRepo, tmpRoot } from './helpers.mjs';

const statuses = (run) => Object.fromEntries(run.results.map((r) => [r.key, r.status]));

test('parseSteps accepts ranges, lists and all, and rejects bad input', () => {
  assert.deepEqual(parseSteps('1-3'), [1, 2, 3]);
  assert.deepEqual(parseSteps('5,1,3'), [1, 3, 5]);
  assert.deepEqual(parseSteps('2-3,3'), [2, 3]);
  assert.deepEqual(parseSteps('all'), [1, 2, 3, 4, 5, 6]);
  for (const bad of ['0', '9', '4-2', 'x', '1-']) assert.throws(() => parseSteps(bad), UsageError, bad);
});

test('run 1-3 sets up, imports a JSON site list and writes the inventory without Claude', () => {
  const root = tmpRoot('run');
  sfraRepo(root);
  put(path.join(root, 'sites.json'), JSON.stringify({ sites: [{ id: 'BrandOne', name: 'Brand One', cartridgePath: 'app_custom_brand:app_storefront_base' }] }));
  const run = runSteps({ root, steps: parseSteps('1-3'), sitesFile: path.join(root, 'sites.json') });
  assert.deepEqual(statuses(run), { setup: 'done', 'site-map': 'done', inventory: 'done' });
  assert.ok(fs.existsSync(path.join(root, 'docs/ai/site-map.json')));
  const inventory = JSON.parse(read(path.join(root, 'docs/ai/generated/inventory.json')));
  assert.equal(inventory.sites[0].siteId, 'BrandOne');
});

test('run skips the site map when none is given and reports step 6 as manual', () => {
  const root = tmpRoot('runskip');
  sfraRepo(root);
  const run = runSteps({ root, steps: [1, 2, 6] });
  assert.equal(statuses(run)['site-map'], 'skipped');
  assert.equal(statuses(run)['knowledge-base'], 'manual');
});

test('run with a dry run writes nothing', () => {
  const root = tmpRoot('rundry');
  sfraRepo(root);
  const calls = [];
  const run = runSteps({ root, steps: parseSteps('all'), dryRun: true, exec: (...call) => calls.push(call) });
  assert.equal(calls.length, 0);
  assert.ok(!fs.existsSync(path.join(root, 'docs')));
  assert.ok(!fs.existsSync(path.join(root, '.claude')));
  assert.equal(statuses(run).plugins, 'skipped');
});

test('plugin step runs the claude commands, tolerates "already installed" and reports real failures', () => {
  const root = tmpRoot('runplug');
  sfraRepo(root);
  const calls = [];
  const exec = (command, args) => {
    calls.push([command, ...args].join(' '));
    if (args[1] === 'install') throw Object.assign(new Error('x'), { stderr: 'Plugin already installed' });
    if (args[1] === 'marketplace') throw Object.assign(new Error('x'), { stderr: 'cannot read marketplace' });
  };
  const run = runSteps({ root, steps: [1, 4], exec });
  assert.deepEqual(calls.slice(1).map((c) => c.split(' ').slice(0, 4).join(' ')), ['claude plugin marketplace add', 'claude plugin install sfcc-kb@cartridge-compass']);
  assert.ok(!calls.join('\n').includes('b2c-developer-tooling'), 'the official B2C plugins are never installed by the kit');
  assert.equal(statuses(run).plugins, 'failed');
  const detail = run.results.find((r) => r.key === 'plugins').detail.join('\n');
  assert.match(detail, /already {2}claude plugin install sfcc-kb/);
  assert.match(detail, /FAILED {2}claude plugin marketplace add.*cannot read marketplace/);
});

test('plugin step explains what to run when claude is not installed', () => {
  const root = tmpRoot('runnoclaude');
  sfraRepo(root);
  const run = runSteps({ root, steps: [4], exec: () => { throw new Error('ENOENT'); } });
  assert.equal(statuses(run).plugins, 'failed');
  assert.match(run.results[0].detail.join('\n'), /claude plugin install sfcc-kb@cartridge-compass/);
});

test('run rejects a --sites file that does not exist', () => {
  const root = tmpRoot('runnofile');
  assert.throws(() => runSteps({ root, steps: [2], sitesFile: path.join(root, 'missing.json') }), UsageError);
});

test('uninstall removes everything run created, including docs, but keeps other files in docs', async () => {
  const { uninstall } = await import('../lib/commands.mjs');
  const root = tmpRoot('rununinstall');
  sfraRepo(root);
  put(path.join(root, 'sites.json'), JSON.stringify({ sites: [{ id: 'BrandOne', cartridgePath: 'app_custom_brand:app_storefront_base' }] }));
  runSteps({ root, steps: parseSteps('1-3'), sitesFile: path.join(root, 'sites.json') });
  assert.ok(fs.existsSync(path.join(root, 'docs/ai/generated/inventory.json')));
  uninstall({ root, apply: true });
  assert.ok(!fs.existsSync(path.join(root, 'docs')), 'docs is removed when only kit files were in it');
  assert.ok(!fs.existsSync(path.join(root, '.sfcc-kit')));

  const shared = tmpRoot('rununinstall2');
  sfraRepo(shared);
  runSteps({ root: shared, steps: [1] });
  put(path.join(shared, 'docs/team-notes.md'), 'mine\n');
  uninstall({ root: shared, apply: true });
  assert.ok(!fs.existsSync(path.join(shared, 'docs/ai')));
  assert.equal(read(path.join(shared, 'docs/team-notes.md')), 'mine\n', 'user files in docs are never deleted');
});
