import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { buildContext, SITE_MAP } from './context.mjs';
import { doctor, KIT_DIR, KIT_VERSION, resolveRoot, setup, UsageError } from './commands.mjs';
import { toPosix } from './util.mjs';

const INVENTORY_OUT = 'docs/ai/generated';

export const STEPS = [
  { id: 1, key: 'setup', title: 'Create kit files and the project context' },
  { id: 2, key: 'site-map', title: 'Import site cartridge paths (needs --sites <file>) or refresh the site map analysis' },
  { id: 3, key: 'inventory', title: 'Generate the code inventory (no model tokens)' },
  { id: 4, key: 'plugins', title: 'Install the sfcc-kb plugin (the official B2C plugins are installed by hand, see SETUP.md)' },
  { id: 5, key: 'doctor', title: 'Check configuration and safety settings' },
  { id: 6, key: 'knowledge-base', title: 'Build the knowledge base with /sfcc-kb-init (runs inside Claude Code)', manual: true },
];

/** Turns "1-4", "1,3,5", "2-3,5" or "all" into a sorted list of step ids. */
export function parseSteps(text) {
  const ids = STEPS.map((s) => s.id);
  if (!text || text === 'all') return ids;
  const picked = new Set();
  for (const part of String(text).split(',')) {
    const match = part.trim().match(/^(\d+)(?:-(\d+))?$/);
    if (!match) throw new UsageError(`Cannot read "${part}" in --steps. Use a number, a range like 1-4, a list like 1,3,5, or "all".`);
    const from = Number(match[1]);
    const to = Number(match[2] ?? match[1]);
    if (from > to) throw new UsageError(`The range ${from}-${to} runs backwards.`);
    for (let n = from; n <= to; n++) {
      if (!ids.includes(n)) throw new UsageError(`Step ${n} does not exist. Steps are numbered ${ids[0]} to ${ids[ids.length - 1]}. Run "steps" to list them.`);
      picked.add(n);
    }
  }
  return [...picked].sort((a, b) => a - b);
}

function runCommand(command, args, cwd) {
  return execFileSync(command, args, { cwd, encoding: 'utf8', stdio: 'pipe' });
}

/** Only the kit's own plugin. The official B2C plugins come from GitHub and are left for the user to install. */
function pluginCommands(kitRef) {
  const marketplace = /^([A-Za-z]:|\/)/.test(kitRef) ? kitRef : `./${kitRef}`;
  return [
    ['plugin', 'marketplace', 'add', marketplace],
    ['plugin', 'install', 'sfcc-kb@cartridge-compass', '--scope', 'project'],
  ];
}

const outputLines = (text) => String(text || '').trim().split('\n').filter(Boolean);
const lastLine = (text) => outputLines(text).pop() || '';

function stepSetup(ctx) {
  const result = setup({ root: ctx.root, kitDir: ctx.kitDir, dryRun: ctx.dryRun, allowGitRoot: ctx.allowGitRoot });
  ctx.kitRef = result.kitRef;
  const written = result.changes.filter((c) => c.action === 'create' || c.action === 'update').length;
  const detail = [`${written} file${written === 1 ? '' : 's'} ${ctx.dryRun ? 'would change' : 'written or updated'}.`, ...result.report];
  return { status: result.problems.length ? 'failed' : 'done', detail: [...detail, ...result.problems.map((p) => `Problem: ${p}`)] };
}

function stepSiteMap(ctx) {
  const script = path.join(ctx.kitDir, 'plugin/scripts/sfcc-sitemap.mjs');
  const mapExists = fs.existsSync(path.join(ctx.root, SITE_MAP));
  if (!ctx.sitesFile && !mapExists) {
    return { status: 'skipped', detail: ['No site list given and no docs/ai/site-map.json yet. Re-run with --sites <file> (JSON or tab-separated) to add cartridge paths. The kit works without them.'] };
  }
  if (ctx.dryRun) return { status: 'skipped', detail: [`Dry run. Would ${ctx.sitesFile ? `import ${ctx.sitesFile}` : 'refresh the site map analysis'}.`] };
  const args = ctx.sitesFile ? [script, '--import', ctx.sitesFile] : [script];
  try {
    return { status: 'done', detail: outputLines(runCommand(process.execPath, args, ctx.root)) };
  } catch (err) {
    return { status: 'failed', detail: [lastLine(err.stderr) || err.message] };
  }
}

function stepInventory(ctx) {
  const context = buildContext({ root: ctx.root, kitDir: ctx.kitDir, kitVersion: KIT_VERSION });
  const roots = context.repositories.filter((r) => r.exists && r.status === 'active').map((r) => r.path);
  if (!roots.length) return { status: 'skipped', detail: ['No active repositories found, so there is nothing to scan.'] };
  const args = [path.join(ctx.kitDir, 'plugin/scripts/sfcc-inventory.mjs'), ...roots, '--out', INVENTORY_OUT];
  const map = context.siteMap;
  if (map.status === 'configured' && map.authoritative) args.push('--sites', SITE_MAP);
  if (ctx.dryRun) return { status: 'skipped', detail: [`Dry run. Would scan ${roots.join(', ')}.`] };
  try {
    return { status: 'done', detail: [lastLine(runCommand(process.execPath, args, ctx.root))] };
  } catch (err) {
    return { status: 'failed', detail: [lastLine(err.stderr) || err.message] };
  }
}

function stepPlugins(ctx) {
  const commands = pluginCommands(ctx.kitRef || toPosix(path.relative(ctx.root, ctx.kitDir)) || '.');
  if (ctx.dryRun) return { status: 'skipped', detail: commands.map((c) => `Dry run. Would run: claude ${c.join(' ')}`) };
  try {
    ctx.exec('claude', ['--version'], ctx.root);
  } catch {
    return { status: 'failed', detail: ['The claude command was not found. Install Claude Code, then run these from the project root:', ...commands.map((c) => `  claude ${c.join(' ')}`)] };
  }
  const detail = [];
  let failures = 0;
  for (const args of commands) {
    try {
      ctx.exec('claude', args, ctx.root);
      detail.push(`ok       claude ${args.join(' ')}`);
    } catch (err) {
      const output = `${err.stdout || ''}${err.stderr || ''}`;
      if (/already/i.test(output)) {
        detail.push(`already  claude ${args.join(' ')}`);
      } else {
        failures++;
        detail.push(`FAILED  claude ${args.join(' ')}: ${lastLine(output) || err.message}`);
      }
    }
  }
  return { status: failures ? 'failed' : 'done', detail };
}

function stepDoctor(ctx) {
  const result = doctor({ root: ctx.root, kitDir: ctx.kitDir, allowGitRoot: ctx.allowGitRoot });
  const detail = [...result.errors.map((e) => `ERROR ${e}`), ...result.warnings.map((w) => `WARN  ${w}`)];
  if (!detail.length) detail.push('No problems found.');
  return { status: result.errors.length ? 'failed' : 'done', detail };
}

const RUNNERS = { setup: stepSetup, 'site-map': stepSiteMap, inventory: stepInventory, plugins: stepPlugins, doctor: stepDoctor };

/**
 * Runs the chosen steps in order. A failed step is reported and the run goes on, because later
 * steps rarely depend on it. Step 6 never runs here: it is a slash command inside Claude Code.
 */
export function runSteps({ root, kitDir = KIT_DIR, steps, sitesFile, dryRun = false, allowGitRoot = false, exec = runCommand }) {
  const projectRoot = resolveRoot({ root, allowGitRoot, kitDir });
  const ctx = { root: projectRoot, kitDir, sitesFile: sitesFile ? path.resolve(sitesFile) : null, dryRun, allowGitRoot, exec };
  if (ctx.sitesFile && !fs.existsSync(ctx.sitesFile)) throw new UsageError(`The --sites file does not exist: ${ctx.sitesFile}`);
  const results = [];
  for (const id of steps) {
    const step = STEPS.find((s) => s.id === id);
    if (step.manual) {
      results.push({ id, key: step.key, title: step.title, status: 'manual', detail: ['Start claude in the project root and run /sfcc-kb-init all, or a range such as /sfcc-kb-init 1-4.'] });
      continue;
    }
    results.push({ id, key: step.key, title: step.title, ...RUNNERS[step.key](ctx) });
  }
  return { root: projectRoot, dryRun, results };
}
