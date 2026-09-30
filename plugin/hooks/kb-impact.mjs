#!/usr/bin/env node
// PostToolUse hook (Edit|Write). Silent for ordinary edits. When Claude touches a
// file that changes project STRUCTURE (routes, hooks, jobs, cartridge paths,
// metadata, services), it injects one reminder so the knowledge base is synced
// before the task ends. Reminds once per session per category to avoid noise.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

let input = '';
process.stdin.on('data', (d) => (input += d));
process.stdin.on('end', () => {
  let evt;
  try { evt = JSON.parse(input); } catch { process.exit(0); }
  const file = String(evt?.tool_input?.file_path || '').split(path.sep).join('/');
  if (!file) process.exit(0);
  if (/\/docs\/ai\/(repositories\.md|site-map\.json)$/.test(file)) {
    remind(file, 'project-config', 'the project configuration. Run `node <kit>/bin/sfcc-kit.mjs sync` (see CLAUDE.md for the kit path) so docs/ai/generated/project-context.md reflects it, and regenerate site-map.md with sfcc-sitemap.mjs if site-map.json changed.');
  }
  if (file.includes('/docs/ai/')) process.exit(0);

  const RULES = [
    [/\/cartridge\/controllers\/[^/]+\.(js|ds)$/, 'controllers', 'a controller (routes may have changed)'],
    [/\/cartridge\/pipelines\/[^/]+\.xml$/, 'pipelines', 'an SGJC pipeline'],
    [/(^|\/)hooks\.json$/, 'hooks', 'hook registrations'],
    [/(^|\/)steptypes\.json$/, 'jobs', 'job step types'],
    [/\/sites\/[^/]+\/site\.xml$/, 'sites', "a site's configuration (cartridge path)"],
    [/(system|custom)-objecttype-extensions\.xml$|\/meta\/[^/]+\.xml$/, 'metadata', 'metadata definitions'],
    [/services\.xml$/, 'services', 'service definitions'],
    [/\/cartridge\/rest-apis\/[^/]+\/(schema\.ya?ml|api\.json)$/, 'custom-apis', 'a SCAPI custom API definition'],
    [/(^|\/)bm_extensions\.xml$/, 'bm-extensions', 'Business Manager extensions'],
    [/(^|\/)steptypes\.xml$/, 'jobs', 'job step types'],
    [/(^|\/)jobs\.xml$/, 'jobs-xml', 'job definitions'],
    [/(^|\/)preferences\.xml$/, 'preferences', 'preference definitions or values'],
    [/\/cartridge\/experience\/.+\.json$/, 'page-designer', 'Page Designer page or component metadata'],
    [/\/cartridges\/[^/]+\/package\.json$/, 'cartridge-pkg', 'a cartridge package.json'],
  ];
  const hit = RULES.find(([rx]) => rx.test(file));
  if (!hit) process.exit(0);
  remind(file, hit[1], `${hit[2]}. Before reporting the task as done, run the sfcc-kb-sync skill (regenerate the inventory and update only the affected docs/ai sections).`);

  function remind(changed, category, what) {
    const safeId = String(evt.session_id || 'x').replace(/[^\w-]/g, '');
    const marker = path.join(os.tmpdir(), `sfcc-kb-${safeId}-${category}`);
    if (fs.existsSync(marker)) process.exit(0);
    try { fs.writeFileSync(marker, ''); } catch {}
    process.stdout.write(JSON.stringify({
      hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: `KB impact: ${changed} changes ${what}` },
    }));
    process.exit(0);
  }
});
