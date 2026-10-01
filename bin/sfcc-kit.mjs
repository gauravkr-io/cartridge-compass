#!/usr/bin/env node
import { detect, doctor, KIT_VERSION, protectRepos, setup, sync, uninstall, UsageError } from '../lib/commands.mjs';
import { parseSteps, runSteps, STEPS } from '../lib/steps.mjs';

const HELP = `Cartridge Compass ${KIT_VERSION} (command: sfcc-kit)

Usage: node <kit>/bin/sfcc-kit.mjs <command> [options]

Commands
  setup          Create or update kit files in the project root. Safe to run repeatedly.
  sync           Add newly found repositories to docs/ai/repositories.md and regenerate the project context.
  run            Run several setup steps in one go. Use --steps 1-4, --steps 1,3 or --all. See "steps".
  steps          List the numbered setup steps. Writes nothing.
  detect         Show discovered repositories and detected architectures. Writes nothing.
  doctor         Check configuration, versions and safety settings. Writes nothing.
  uninstall      Show what would be removed. Add --apply to remove everything the kit created, including docs/ai and .sfcc-kit.
  protect-repos  Opt-in. Add CLAUDE.md, CLAUDE.local.md and .claude/ to each repository's .git/info/exclude.
  version        Print the kit version.

Options
  --root <dir>       Project root that contains your repositories. Default: the folder that contains the kit.
  --dry-run          Show changes without writing (setup, sync, protect-repos).
  --json             Machine-readable output.
  --allow-git-root   Allow a project root that is inside a Git repository. Not recommended.
  --steps <list>     Steps for run: a range (1-4), a list (1,3,5) or all.
  --all              Same as --steps all.
  --sites <file>     Site list to import during run (JSON or tab-separated).
  --apply            Required for uninstall to change anything.
`;

const argv = process.argv.slice(2);
const VALUE_FLAGS = ['--root', '--steps', '--sites'];
const command = argv.find((a, i) => !a.startsWith('--') && !VALUE_FLAGS.includes(argv[i - 1])) || 'help';
const flag = (name) => argv.includes(name);
const rootIndex = argv.indexOf('--root');
const root = rootIndex >= 0 ? argv[rootIndex + 1] : undefined;
if (rootIndex >= 0 && (!root || root.startsWith('--'))) fail('--root needs a folder path.');
const valueOf = (name) => {
  const i = argv.indexOf(name);
  if (i < 0) return undefined;
  if (!argv[i + 1] || argv[i + 1].startsWith('--')) fail(`${name} needs a value.`);
  return argv[i + 1];
};
const common = { root, allowGitRoot: flag('--allow-git-root') };

function fail(message) {
  console.error(`sfcc-kit: ${message}`);
  process.exit(2);
}

function printChanges(result) {
  const visible = result.changes.filter((c) => c.action !== 'unchanged' && c.action !== 'kept');
  const prefix = result.dryRun ? '[dry run] would ' : '';
  if (!visible.length) console.log(`${result.dryRun ? '[dry run] ' : ''}No file changes.`);
  for (const c of visible) console.log(`  ${prefix}${c.action.padEnd(9)} ${c.file}`);
  for (const line of result.report) console.log(`- ${line}`);
  for (const line of result.problems) console.log(`! ${line}`);
}

try {
  switch (command) {
    case 'setup': {
      const result = setup({ ...common, dryRun: flag('--dry-run') });
      if (flag('--json')) {
        console.log(JSON.stringify(result, null, 2));
        break;
      }
      console.log(`Cartridge Compass ${KIT_VERSION} setup in ${result.root}`);
      printChanges(result);
      const repos = result.context.repositories;
      console.log(`\nRepositories: ${repos.length ? repos.map((r) => `${r.name} [${r.architecture.map((a) => a.type).join(', ')}]`).join('; ') : 'none found'}`);
      console.log(`Site cartridge paths: ${result.context.siteMap.status}. Business Manager path: ${result.context.siteMap.businessManagerPath}.`);
      console.log(`\nNext steps (run from ${result.root}):`);
      console.log(`  1. Review docs/ai/repositories.md and set Type where detection is wrong or unknown.`);
      const marketplacePath = /^([A-Za-z]:|\/)/.test(result.kitRef) ? result.kitRef : `./${result.kitRef}`;
      console.log('  2. Optional: add your site cartridge paths so the agent knows what each site loads.');
      console.log('       Write a JSON file with your sites (id, name, cartridgePath), or a tab-separated text file.');
      console.log(`       See ${marketplacePath}/templates/docs-ai/site-map.sample.json for the format. Then run:`);
      console.log(`         node ${marketplacePath}/plugin/scripts/sfcc-sitemap.mjs --import sites.json`);
      console.log('       This writes docs/ai/site-map.json (edit this one) and docs/ai/site-map.md (generated, read by the agent).');
      console.log(`  3. Install the kit plugin once, if not installed yet:`);
      console.log(`       claude plugin marketplace add "${marketplacePath}"`);
      console.log('       claude plugin install sfcc-kb@cartridge-compass --scope project');
      console.log('     The official B2C plugins are optional and are never installed for you. See "Official B2C plugins" in SETUP.md.');
      console.log('  4. Start claude here and run /sfcc-kb-init (or /sfcc-kb-init all to run every phase in one session).');
      console.log(`\nTo do steps 1 to 5 in one command instead: node ${marketplacePath}/bin/sfcc-kit.mjs run --all --sites sites.json`);
      if (result.problems.length) process.exitCode = 1;
      break;
    }
    case 'steps':
      for (const s of STEPS) console.log(`  ${s.id}. ${s.title}`);
      console.log('\nRun some or all of them: node <kit>/bin/sfcc-kit.mjs run --steps 1-4 (or --all).');
      break;
    case 'run': {
      if (!flag('--all') && valueOf('--steps') === undefined) fail('run needs --steps <list> or --all. Run "steps" to see the numbered steps.');
      const result = runSteps({ ...common, steps: parseSteps(flag('--all') ? 'all' : valueOf('--steps')), sitesFile: valueOf('--sites'), dryRun: flag('--dry-run') });
      if (flag('--json')) console.log(JSON.stringify(result, null, 2));
      else {
        console.log(`Cartridge Compass ${KIT_VERSION} in ${result.root}${result.dryRun ? ' (dry run)' : ''}`);
        for (const r of result.results) {
          console.log(`\n${r.id}. ${r.title}: ${r.status}`);
          for (const line of r.detail) console.log(`   ${line}`);
        }
      }
      if (result.results.some((r) => r.status === 'failed')) process.exitCode = 1;
      break;
    }
    case 'sync': {
      const result = sync({ ...common, dryRun: flag('--dry-run') });
      if (flag('--json')) console.log(JSON.stringify(result, null, 2));
      else printChanges(result);
      break;
    }
    case 'detect': {
      const result = detect(common);
      if (flag('--json')) {
        console.log(JSON.stringify(result, null, 2));
        break;
      }
      if (!result.length) console.log('No repositories found under the project root.');
      for (const r of result) {
        console.log(`${r.name}${r.git ? '' : ' (not a git repository)'}`);
        if (!r.detection.types.length) console.log('  unknown: no SFCC or storefront evidence found');
        for (const t of r.detection.types) {
          console.log(`  ${t.type} (${t.confidence})`);
          for (const e of t.evidence) console.log(`    - ${e.kind} x${e.count}: ${e.examples.join(', ')}`);
        }
        if (r.detection.truncated) console.log('  note: scan stopped at the file limit. Results may be incomplete.');
      }
      break;
    }
    case 'doctor': {
      const result = doctor(common);
      if (flag('--json')) console.log(JSON.stringify(result, null, 2));
      else {
        for (const e of result.errors) console.log(`ERROR   ${e}`);
        for (const w of result.warnings) console.log(`WARN    ${w}`);
        for (const i of result.info) console.log(`INFO    ${i}`);
        if (!result.errors.length && !result.warnings.length) console.log('OK      No problems found.');
      }
      if (result.errors.length) process.exitCode = 1;
      break;
    }
    case 'uninstall': {
      const result = uninstall({ ...common, apply: flag('--apply') });
      printChanges(result);
      if (!flag('--apply')) console.log('\nNothing was changed. Run again with --apply to remove these files.');
      break;
    }
    case 'protect-repos':
      printChanges(protectRepos({ ...common, dryRun: flag('--dry-run') }));
      break;
    case 'version':
      console.log(KIT_VERSION);
      break;
    case 'help':
      console.log(HELP);
      break;
    default:
      fail(`unknown command "${command}". Run with "help" for usage.`);
  }
} catch (err) {
  if (err instanceof UsageError) fail(err.message);
  throw err;
}
