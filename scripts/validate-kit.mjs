#!/usr/bin/env node
/**
 * Consistency checks for the kit itself. Run with `npm run validate`.
 *
 * Errors fail the run: broken relative links, unknown source IDs, missing
 * knowledge frontmatter, version mismatch, missing templates, and house-style
 * punctuation (em dashes anywhere, semicolons in Markdown prose).
 * Warnings do not fail: facts due for re-verification.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const KIT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REVERIFY_DAYS = 183;
const SKIP_DIRS = new Set(['.git', 'node_modules']);
// The 0.1 README and legacy templates are preserved verbatim as history.
const STYLE_EXEMPT = ['docs/history/', 'templates/legacy/'];

const errors = [];
const warnings = [];
const rel = (file) => path.relative(KIT, file).split(path.sep).join('/');
// Normalize line endings so results match on Windows checkouts without .gitattributes.
const readText = (file) => fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');

function listFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) listFiles(full, out);
    else out.push(full);
  }
  return out;
}

/** Markdown lines outside fenced code blocks, with their line numbers. */
function proseLines(text) {
  const lines = [];
  let fenced = false;
  text.split(/\r?\n/).forEach((line, i) => {
    if (/^\s*```/.test(line)) {
      fenced = !fenced;
      return;
    }
    if (!fenced) lines.push({ line, n: i + 1 });
  });
  return lines;
}

const files = listFiles(KIT);
const markdown = files.filter((f) => f.endsWith('.md'));

// 1. Relative links resolve.
for (const file of markdown) {
  for (const { line, n } of proseLines(readText(file))) {
    const withoutCode = line.replace(/`[^`]*`/g, '');
    for (const m of withoutCode.matchAll(/\[[^\]]*\]\(([^)\s]+)\)/g)) {
      const target = m[1];
      if (/^(https?:|mailto:|#)/.test(target)) continue;
      const resolved = path.resolve(path.dirname(file), decodeURI(target.split('#')[0]));
      if (!fs.existsSync(resolved)) errors.push(`${rel(file)}:${n} broken link ${target}`);
    }
  }
}

// 2. Source IDs cited in knowledge exist in the registry.
const sourcesText = fs.readFileSync(path.join(KIT, 'knowledge/sources.md'), 'utf8');
const knownIds = new Set([...sourcesText.matchAll(/^\|\s*([SRCXE]\d{2})\s*\|/gm)].map((m) => m[1]));
const knowledgeFiles = markdown.filter((f) => rel(f).startsWith('knowledge/'));
for (const file of knowledgeFiles) {
  const text = readText(file);
  for (const m of text.matchAll(/\[(?:FACT|TEST)\s+([^\]]+)\]/g)) {
    for (const id of m[1].match(/\b[SRCXE]\d{2}\b/g) || []) {
      if (!knownIds.has(id)) errors.push(`${rel(file)} cites unknown source ${id}`);
    }
  }
}

// 3. Knowledge frontmatter and re-verification dates.
const now = Date.now();
for (const file of knowledgeFiles) {
  const text = readText(file);
  const fm = text.match(/^---\n([\s\S]*?)\n---/);
  if (!fm) {
    errors.push(`${rel(file)} has no frontmatter`);
    continue;
  }
  const date = fm[1].match(/^last_verified:\s*(\d{4}-\d{2}-\d{2})\s*$/m);
  if (!date) {
    errors.push(`${rel(file)} frontmatter lacks last_verified`);
    continue;
  }
  const age = (now - Date.parse(date[1])) / 86400000;
  if (age > REVERIFY_DAYS && /\[FACT /.test(text)) warnings.push(`${rel(file)} last verified ${date[1]}. Re-check its facts`);
}

// 4. Kit and plugin versions match.
const kitVersion = JSON.parse(fs.readFileSync(path.join(KIT, 'package.json'), 'utf8')).version;
const pluginVersion = JSON.parse(fs.readFileSync(path.join(KIT, 'plugin/.claude-plugin/plugin.json'), 'utf8')).version;
if (kitVersion !== pluginVersion) errors.push(`package.json ${kitVersion} and plugin.json ${pluginVersion} differ`);
if (!fs.readFileSync(path.join(KIT, 'CHANGELOG.md'), 'utf8').includes(`## ${kitVersion}`)) errors.push(`CHANGELOG.md has no entry for ${kitVersion}`);

// 5. Templates referenced by the code exist.
const libText = fs.readdirSync(path.join(KIT, 'lib')).map((f) => fs.readFileSync(path.join(KIT, 'lib', f), 'utf8')).join('\n');
const templateRefs = new Set(['claude-block.md', 'settings.kit.json', 'rules/sfcc-shared-cartridges.template.md']);
for (const m of libText.matchAll(/readTemplate\(kitDir, '([^']+)'\)/g)) templateRefs.add(m[1]);
for (const m of libText.matchAll(/MANAGED_RULES = \[([^\]]+)\]/g)) {
  for (const name of m[1].match(/'[^']+'/g)) {
    templateRefs.add(`rules/${name.slice(1, -1)}`);
    templateRefs.add(`legacy/rules-0.1/${name.slice(1, -1)}`);
  }
}
for (const m of libText.matchAll(/DOCS_AI_SKELETON = \[([^\]]+)\]/g)) {
  for (const name of m[1].match(/'[^']+'/g)) templateRefs.add(`docs-ai/${name.slice(1, -1)}`);
}
for (const ref of templateRefs) {
  if (!fs.existsSync(path.join(KIT, 'templates', ref))) errors.push(`templates/${ref} is referenced but missing`);
}

// 6. House style.
for (const file of files.filter((f) => /\.(md|mjs|json|ya?ml|txt)$/.test(f))) {
  const r = rel(file);
  if (STYLE_EXEMPT.some((p) => r.startsWith(p))) continue;
  const text = readText(file);
  text.split(/\r?\n/).forEach((line, i) => {
    if (line.includes('\u2014')) errors.push(`${r}:${i + 1} em dash`);
  });
  if (!file.endsWith('.md')) continue;
  for (const { line, n } of proseLines(text)) {
    const prose = line.replace(/`[^`]*`/g, '').replace(/<!--.*?-->/g, '').replace(/\]\([^)]*\)/g, ']');
    if (/;/.test(prose) && !/&\w+;/.test(prose)) errors.push(`${r}:${n} semicolon in prose`);
  }
}

for (const w of warnings) console.log(`WARN  ${w}`);
for (const e of errors) console.log(`ERROR ${e}`);
console.log(`validate-kit: ${markdown.length} Markdown files, ${knownIds.size} sources, ${errors.length} errors, ${warnings.length} warnings`);
process.exit(errors.length ? 1 : 0);
