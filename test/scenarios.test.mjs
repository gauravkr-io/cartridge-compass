import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { detect, doctor, protectRepos, setup, sync, uninstall, UsageError } from '../lib/commands.mjs';
import { buildContext } from '../lib/context.mjs';
import { headlessRepo, integrationRepo, KIT_DIR, put, read, sfraRepo, sgjcRepo, gitRepo, tmpRoot, treeHash, writeChanges } from './helpers.mjs';

const arch = (ctx, name) => ctx.repositories.find((r) => r.name === name).architecture;
const types = (ctx, name) => arch(ctx, name).map((a) => a.type);
const run = (root, extra = {}) => setup({ root, kitDir: KIT_DIR, ...extra });

test('A: single SFRA repository is detected with high confidence and never modified', () => {
  const root = tmpRoot('a');
  const repo = sfraRepo(root);
  const before = treeHash(repo);
  const result = run(root);
  assert.deepEqual(result.problems, []);
  assert.equal(arch(result.context, 'storefront-sfra')[0].type, 'sfra');
  assert.equal(arch(result.context, 'storefront-sfra')[0].confidence, 'high');
  assert.equal(treeHash(repo), before, 'setup must not write inside a repository');
  for (const f of ['CLAUDE.md', '.claude/settings.json', '.claude/rules/sfcc-protected-cartridges.md', 'docs/ai/repositories.md', 'docs/ai/generated/project-context.md', '.sfcc-kit/state.json']) {
    assert.ok(fs.existsSync(path.join(root, f)), `${f} should exist`);
  }
  assert.ok(!fs.existsSync(path.join(root, '.git')), 'setup must never create .git in the project root');
});

test('B: single SGJC repository detects sgjc and pipelines separately', () => {
  const root = tmpRoot('b');
  sgjcRepo(root);
  const t = types(run(root).context, 'storefront-legacy');
  assert.ok(t.includes('sgjc'));
  assert.ok(t.includes('pipelines'));
  assert.ok(!t.includes('sfra'));
});

test('C and D: SFRA plus SGJC plus headless in one workspace', () => {
  const root = tmpRoot('cd');
  sfraRepo(root);
  sgjcRepo(root);
  headlessRepo(root);
  const ctx = run(root).context;
  assert.equal(types(ctx, 'storefront-sfra')[0], 'sfra');
  assert.ok(types(ctx, 'storefront-legacy').includes('sgjc'));
  const headless = types(ctx, 'storefront-next');
  assert.equal(headless[0], 'storefront-next');
  assert.ok(headless.includes('scapi'));
  assert.ok(!headless.includes('sfra'));
});

test('E: explicit mapping overrides detection and records the disagreement', () => {
  const root = tmpRoot('e');
  sfraRepo(root, 'core');
  put(path.join(root, 'docs/ai/repositories.md'), 'Format: 1\n\n## core\n- Type: SGJC\n- Purpose: Declared legacy on purpose\n');
  const r = run(root).context.repositories.find((x) => x.name === 'core');
  assert.deepEqual(r.architecture.map((a) => a.type), ['sgjc']);
  assert.equal(r.architectureSource, 'configured');
  assert.match(r.notes.join(' '), /Detection also found sfra \(high\)\. The configured type wins/);
});

test('F: multiple repositories without mapping produce an auto mapping file', () => {
  const root = tmpRoot('f');
  sfraRepo(root);
  integrationRepo(root);
  run(root);
  const text = read(path.join(root, 'docs/ai/repositories.md'));
  assert.match(text, /## storefront-sfra\n- Path: storefront-sfra\n- Type: auto/);
  assert.match(text, /## integrations/);
  const ctx = buildContext({ root, kitDir: KIT_DIR, kitVersion: 'test' });
  const integ = types(ctx, 'integrations');
  for (const t of ['api-hooks', 'scapi-custom-api', 'integration']) assert.ok(integ.includes(t), `integrations should include ${t}`);
});

test('G and H: no cartridge path and no BM path are explicit "not configured" states', () => {
  const root = tmpRoot('gh');
  sfraRepo(root);
  const ctx = run(root).context;
  assert.equal(ctx.siteMap.status, 'not configured');
  assert.equal(ctx.siteMap.businessManagerPath, 'not configured');
  assert.equal(ctx.siteMap.instance, 'not configured');
  const md = read(path.join(root, 'docs/ai/generated/project-context.md'));
  assert.match(md, /Cartridge paths not configured/);
  assert.match(md, /Business Manager path not configured/);

  put(path.join(root, 'docs/ai/site-map.json'), JSON.stringify({ authoritative: true, instance: 'TODO: fill', sites: [{ id: 'SiteA', cartridgePath: ['app_custom_brand', 'app_storefront_base'] }] }));
  const again = buildContext({ root, kitDir: KIT_DIR, kitVersion: 'test' });
  assert.equal(again.siteMap.status, 'configured');
  assert.equal(again.siteMap.businessManagerPath, 'not configured');
  assert.equal(again.siteMap.instance, 'not configured', 'TODO placeholders are not real values');
});

test('I: partial mapping keeps configured entries and appends only missing repositories', () => {
  const root = tmpRoot('i');
  sfraRepo(root);
  headlessRepo(root);
  const original = 'Format: 1\n- Project: Acme\n\n## storefront-sfra\n- Type: sfra\n';
  put(path.join(root, 'docs/ai/repositories.md'), original);
  run(root);
  const text = read(path.join(root, 'docs/ai/repositories.md'));
  assert.ok(text.startsWith(original.trimEnd()), 'existing content must be kept byte for byte');
  assert.match(text, /## storefront-next\n- Path: storefront-next\n- Type: auto/);
  assert.match(read(path.join(root, 'CLAUDE.md')), /^# Acme\n/);
});

test('J: incorrect optional configuration warns and never guesses', () => {
  const root = tmpRoot('j');
  sfraRepo(root);
  put(path.join(root, 'docs/ai/repositories.md'), [
    'Format: 1',
    '## storefront-sfra', '- Type: magic-framework', '- Status: sometimes',
    '## escape', '- Path: ../outside', '- Type: sfra',
    '## ghost', '- Path: not-cloned', '- Type: sgjc',
    '## storefront-sfra', '- Type: sgjc',
  ].join('\n'));
  put(path.join(root, 'docs/ai/site-map.json'), '{ not json');
  const result = run(root);
  const ctx = result.context;
  const sfra = ctx.repositories.find((r) => r.name === 'storefront-sfra');
  assert.deepEqual(sfra.architecture.map((a) => a.type), ['unknown'], 'an unrecognized explicit type is unknown, not detection');
  assert.equal(sfra.status, 'active');
  const escape = ctx.repositories.find((r) => r.name === 'escape');
  assert.equal(escape.exists, false);
  assert.ok(ctx.repositories.find((r) => r.name === 'ghost').notes.some((n) => /not found on disk/.test(n)));
  const w = ctx.warnings.join('\n');
  for (const pattern of [/not recognized/, /unknown status/, /outside the project root/, /Duplicate repository section/, /not valid JSON/]) assert.match(w, pattern);
  assert.equal(ctx.siteMap.status, 'invalid');
  assert.deepEqual(result.problems, []);
});

test('K: repository with no evidence is unknown', () => {
  const root = tmpRoot('k');
  const repo = path.join(root, 'mystery');
  gitRepo(repo);
  put(path.join(repo, 'README.md'), 'nothing here\n');
  const r = run(root).context.repositories.find((x) => x.name === 'mystery');
  assert.deepEqual(r.architecture.map((a) => a.type), ['unknown']);
});

test('L: a repository added after setup is appended by sync without touching existing sections', () => {
  const root = tmpRoot('l');
  sfraRepo(root);
  run(root);
  const file = path.join(root, 'docs/ai/repositories.md');
  const edited = read(file).replace('- Purpose:\n', '- Purpose: Main storefront\n').replace('- Type: auto', '- Type: sfra');
  fs.writeFileSync(file, edited);
  integrationRepo(root);
  const result = sync({ root, kitDir: KIT_DIR });
  const text = read(file);
  assert.ok(text.startsWith(edited.trimEnd()));
  assert.match(text, /## integrations/);
  assert.ok(result.report.some((l) => /integrations/.test(l)));
  const again = sync({ root, kitDir: KIT_DIR });
  assert.equal(writeChanges(again).length, 0, 'second sync changes nothing');
});

test('M: upgrade from kit 0.1 layout preserves conventions and user edits', () => {
  const root = tmpRoot('m');
  sfraRepo(root);
  const legacy = read(path.join(KIT_DIR, 'templates/legacy/CLAUDE-0.1.md'))
    .replace('<PROJECT NAME>', 'Acme Retail')
    .replace('- Logging: `<project logger helper and category convention>`.', '- Logging: use `scripts/util/log.js` with category `acme`.');
  put(path.join(root, 'CLAUDE.md'), legacy);
  put(path.join(root, '.claude/settings.json'), read(path.join(KIT_DIR, 'templates/legacy/settings-0.1.json')));
  put(path.join(root, '.claude/rules/sfcc-protected-cartridges.md'), read(path.join(KIT_DIR, 'templates/legacy/rules-0.1/sfcc-protected-cartridges.md')));
  put(path.join(root, '.claude/rules/sfcc-sgjc-cartridges.md'), '---\npaths:\n  - "**/app_acme_legacy/**"\n---\n\n# Filled by Phase 7\n');
  put(path.join(root, 'docs/ai/project-map.md'), '# Project map\n\nOur real notes.\n');
  const result = run(root);
  assert.deepEqual(result.problems, []);
  const claude = read(path.join(root, 'CLAUDE.md'));
  assert.match(claude, /^# Acme Retail\n/);
  assert.match(claude, /use `scripts\/util\/log\.js` with category `acme`/);
  assert.match(claude, /<!-- sfcc-kit:begin -->/);
  assert.ok(!/## Verifying Salesforce APIs \(never invent\)/.test(claude), 'old always-on block is replaced, not duplicated');
  const settings = JSON.parse(read(path.join(root, '.claude/settings.json')));
  assert.equal(settings.extraKnownMarketplaces['sfcc-claude-kit'], undefined, 'placeholder marketplace removed');
  assert.ok(settings.permissions.ask.includes('mcp__*__cartridge_deploy'));
  assert.equal(settings.enabledPlugins['sfcc-kb@sfcc-claude-kit'], true, 'a running project keeps its existing plugin ID');
  assert.equal(settings.enabledPlugins['sfcc-kb@cartridge-compass'], undefined, 'the new ID is not added while the old one is in use');
  assert.ok(result.report.some((l) => /Switching to the cartridge-compass marketplace/.test(l)));
  assert.equal(new Set(settings.permissions.ask).size, settings.permissions.ask.length, 'no duplicate rules');
  assert.equal(read(path.join(root, '.claude/rules/sfcc-protected-cartridges.md')), read(path.join(KIT_DIR, 'templates/rules/sfcc-protected-cartridges.md')), 'unmodified legacy rule is updated');
  assert.match(read(path.join(root, '.claude/rules/sfcc-sgjc-cartridges.md')), /app_acme_legacy/, 'user-generated rule is kept');
  assert.ok(fs.existsSync(path.join(root, '.claude/rules/sfcc-sgjc-cartridges.md.kit-new')));
  assert.equal(read(path.join(root, 'docs/ai/project-map.md')), '# Project map\n\nOur real notes.\n');
  const backups = path.join(root, '.sfcc-kit/backups');
  assert.ok(fs.readdirSync(backups).length >= 1, 'replaced files are backed up');
});

test('N: running setup twice changes nothing the second time', () => {
  const root = tmpRoot('n');
  sfraRepo(root);
  sgjcRepo(root);
  run(root);
  const second = run(root);
  assert.deepEqual(writeChanges(second), []);
});

test('O: removed then recreated repository stays mapped', () => {
  const root = tmpRoot('o');
  const repo = sfraRepo(root);
  run(root);
  fs.rmSync(repo, { recursive: true });
  let ctx = sync({ root, kitDir: KIT_DIR }).context;
  let r = ctx.repositories.find((x) => x.name === 'storefront-sfra');
  assert.equal(r.exists, false);
  assert.match(read(path.join(root, 'docs/ai/repositories.md')), /## storefront-sfra/);
  assert.ok(doctor({ root, kitDir: KIT_DIR }).warnings.some((w) => /does not exist/.test(w)));
  sfraRepo(root);
  ctx = sync({ root, kitDir: KIT_DIR }).context;
  r = ctx.repositories.find((x) => x.name === 'storefront-sfra');
  assert.equal(r.exists, true);
  assert.equal(r.architecture[0].type, 'sfra');
});

test('Safety: refuses a project root inside a Git repository', () => {
  const root = tmpRoot('git');
  gitRepo(root);
  assert.throws(() => run(root), UsageError);
  assert.throws(() => run(path.join(root, 'sub'), {}), UsageError);
  fs.mkdirSync(path.join(root, 'sub'));
  assert.throws(() => run(path.join(root, 'sub')), /inside a Git repository/);
});

test('Safety: dry run writes nothing', () => {
  const root = tmpRoot('dry');
  sfraRepo(root);
  const before = fs.readdirSync(root).sort();
  const result = run(root, { dryRun: true });
  assert.ok(writeChanges(result).length > 0);
  assert.deepEqual(fs.readdirSync(root).sort(), before);
});

test('Safety: damaged markers or invalid settings are reported and left untouched', () => {
  const root = tmpRoot('damaged');
  sfraRepo(root);
  const claude = '# Mine\n\n<!-- sfcc-kit:begin -->\nhalf a block\n';
  put(path.join(root, 'CLAUDE.md'), claude);
  put(path.join(root, '.claude/settings.json'), '{ "permissions": ');
  const result = run(root);
  assert.equal(read(path.join(root, 'CLAUDE.md')), claude);
  assert.equal(read(path.join(root, '.claude/settings.json')), '{ "permissions": ');
  assert.equal(result.problems.length, 2);
  assert.ok(doctor({ root, kitDir: KIT_DIR }).errors.some((e) => /not valid JSON/.test(e)));
});

test('Safety: existing user CLAUDE.md and settings are extended, not replaced', () => {
  const root = tmpRoot('user');
  sfraRepo(root);
  put(path.join(root, 'CLAUDE.md'), '# Team notes\n\nAlways run npm test.\n');
  put(path.join(root, '.claude/settings.json'), JSON.stringify({ permissions: { allow: ['Bash(npm test)'] }, model: 'opus', enabledPlugins: { 'b2c-dx-mcp@b2c-developer-tooling': false } }));
  run(root);
  const claude = read(path.join(root, 'CLAUDE.md'));
  assert.ok(claude.startsWith('# Team notes\n\nAlways run npm test.\n'));
  const s = JSON.parse(read(path.join(root, '.claude/settings.json')));
  assert.equal(s.model, 'opus');
  assert.ok(s.permissions.allow.includes('Bash(npm test)'));
  assert.equal(s.enabledPlugins['b2c-dx-mcp@b2c-developer-tooling'], false, 'user choice is not flipped');
});

test('Uninstall: dry run by default, apply removes only kit-managed content', () => {
  const root = tmpRoot('un');
  sfraRepo(root);
  put(path.join(root, '.claude/settings.json'), JSON.stringify({ permissions: { allow: ['Bash(npm test)'] } }));
  run(root);
  const preview = uninstall({ root, kitDir: KIT_DIR });
  assert.ok(fs.existsSync(path.join(root, '.claude/rules/sfcc-protected-cartridges.md')), 'preview changes nothing');
  assert.ok(writeChanges(preview).length > 0);
  uninstall({ root, kitDir: KIT_DIR, apply: true });
  assert.ok(!fs.existsSync(path.join(root, 'CLAUDE.md')), 'kit-created CLAUDE.md with default conventions is removed');
  assert.ok(!fs.existsSync(path.join(root, '.claude/rules/sfcc-protected-cartridges.md')));
  assert.deepEqual(JSON.parse(read(path.join(root, '.claude/settings.json'))).permissions.allow, ['Bash(npm test)']);
  assert.ok(!fs.existsSync(path.join(root, 'docs/ai')), 'docs/ai is removed');
  assert.ok(!fs.existsSync(path.join(root, '.sfcc-kit')), 'state and backups are removed');

  const clean = tmpRoot('un2');
  sfraRepo(clean);
  run(clean);
  uninstall({ root: clean, kitDir: KIT_DIR, apply: true });
  assert.ok(!fs.existsSync(path.join(clean, '.claude/settings.json')), 'a settings file that held only kit entries is removed');
});

test('protect-repos is opt-in, idempotent and only touches .git/info/exclude', () => {
  const root = tmpRoot('protect');
  const repo = sfraRepo(root);
  protectRepos({ root, kitDir: KIT_DIR });
  const second = protectRepos({ root, kitDir: KIT_DIR });
  assert.equal(read(path.join(repo, '.git/info/exclude')), 'CLAUDE.md\nCLAUDE.local.md\n.claude/\n');
  assert.equal(second.changes[0].action, 'unchanged');
});

test('Kit inside the project root is referenced relatively and excluded from discovery', () => {
  const root = tmpRoot('sibling');
  sfraRepo(root);
  const kitCopy = path.join(root, 'cartridge-compass');
  fs.cpSync(KIT_DIR, kitCopy, { recursive: true, filter: (src) => !/[\\/](\.git|test)([\\/]|$)/.test(src) });
  const result = setup({ root, kitDir: kitCopy });
  assert.equal(result.kitRef, 'cartridge-compass');
  assert.ok(!result.context.repositories.some((r) => r.name === 'cartridge-compass'));
  assert.match(read(path.join(root, 'CLAUDE.md')), /node cartridge-compass\/bin\/sfcc-kit\.mjs setup/);
  assert.equal(JSON.parse(read(path.join(root, '.claude/settings.json'))).enabledPlugins['sfcc-kb@cartridge-compass'], true, 'fresh install uses the new plugin ID');
  const s = JSON.parse(read(path.join(root, '.claude/settings.json')));
  assert.equal(s.permissions.additionalDirectories, undefined, 'no extra directory needed for a sibling kit');
  assert.equal(detect({ root, kitDir: kitCopy }).length, 1);
});

test('M2: a workspace written by a newer kit is refused, not downgraded', () => {
  const root = tmpRoot('newer');
  sfraRepo(root);
  run(root);
  const statePath = path.join(root, '.sfcc-kit/state.json');
  const state = JSON.parse(read(statePath));
  fs.writeFileSync(statePath, JSON.stringify({ ...state, configVersion: state.configVersion + 1, kitVersion: '99.0.0' }));
  const claude = read(path.join(root, 'CLAUDE.md'));
  assert.throws(() => run(root), /newer kit/);
  assert.equal(read(path.join(root, 'CLAUDE.md')), claude);
});
