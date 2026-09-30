import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const toPosix = (p) => p.split(path.sep).join('/');
export const sha256 = (text) => crypto.createHash('sha256').update(text).digest('hex');
export const today = () => new Date().toISOString().slice(0, 10);

export function isInside(parent, child) {
  const rel = path.relative(path.resolve(parent), path.resolve(child));
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

/** Returns the nearest directory at or above `start` that contains `.git`, or null. */
export function findGitAncestor(start) {
  let dir = path.resolve(start);
  for (;;) {
    if (fs.existsSync(path.join(dir, '.git'))) return dir;
    const up = path.dirname(dir);
    if (up === dir) return null;
    dir = up;
  }
}

export function readTextIfExists(file) {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
}

export function readJsonIfExists(file) {
  const text = readTextIfExists(file);
  if (text === null) return { status: 'missing' };
  try {
    return { status: 'ok', data: JSON.parse(text), text };
  } catch (err) {
    return { status: 'invalid', error: err.message, text };
  }
}

/**
 * All project writes go through this class. It only writes inside the locations the kit owns,
 * refuses to write through symbolic links, skips identical content, and backs up anything it replaces.
 */
export class Writer {
  constructor(root, { dryRun = false, stamp } = {}) {
    this.root = path.resolve(root);
    this.dryRun = dryRun;
    this.changes = [];
    this.backupDir = path.join(this.root, '.sfcc-kit', 'backups', stamp || new Date().toISOString().replace(/[:.]/g, '-'));
    this.allowed = ['CLAUDE.md', '.claude', path.join('docs', 'ai'), '.sfcc-kit'].map((p) => path.join(this.root, p));
  }

  rel(abs) {
    return toPosix(path.relative(this.root, abs));
  }

  assertAllowed(target) {
    const abs = path.resolve(target);
    if (!this.allowed.some((base) => isInside(base, abs))) {
      throw new Error(`Refusing to write outside kit-managed locations: ${abs}`);
    }
    for (let cur = abs; cur !== this.root && isInside(this.root, cur); cur = path.dirname(cur)) {
      let stat = null;
      try {
        stat = fs.lstatSync(cur);
      } catch (err) {
        if (err.code !== 'ENOENT') throw err;
      }
      if (stat && stat.isSymbolicLink()) throw new Error(`Refusing to write through a symbolic link: ${cur}`);
    }
    return abs;
  }

  backup(abs, previous) {
    if (this.dryRun) return;
    const dest = path.join(this.backupDir, path.relative(this.root, abs));
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, previous);
  }

  write(target, content, { backup = true } = {}) {
    const abs = this.assertAllowed(target);
    const previous = readTextIfExists(abs);
    if (previous === content) {
      this.changes.push({ action: 'unchanged', file: this.rel(abs) });
      return 'unchanged';
    }
    const action = previous === null ? 'create' : 'update';
    if (!this.dryRun) {
      if (previous !== null && backup) this.backup(abs, previous);
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, content);
    }
    this.changes.push({ action, file: this.rel(abs) });
    return action;
  }

  createIfMissing(target, content) {
    const abs = this.assertAllowed(target);
    if (fs.existsSync(abs)) {
      this.changes.push({ action: 'kept', file: this.rel(abs) });
      return 'kept';
    }
    return this.write(abs, content);
  }

  remove(target) {
    const abs = this.assertAllowed(target);
    const previous = readTextIfExists(abs);
    if (previous === null) return 'missing';
    if (!this.dryRun) {
      this.backup(abs, previous);
      fs.unlinkSync(abs);
    }
    this.changes.push({ action: 'remove', file: this.rel(abs) });
    return 'remove';
  }

  /** Deletes a kit-owned directory and everything in it, with no backup. Symbolic links are unlinked, never followed. */
  removeTree(target) {
    const abs = this.assertAllowed(target);
    if (!fs.existsSync(abs)) return 'missing';
    const files = [];
    const walk = (dir) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else files.push(full);
      }
    };
    if (fs.lstatSync(abs).isDirectory()) walk(abs);
    else files.push(abs);
    for (const file of files) this.changes.push({ action: 'remove', file: this.rel(file) });
    if (!this.dryRun) fs.rmSync(abs, { recursive: true, force: true });
    return 'remove';
  }

  /** Removes a directory only when it is empty. */
  removeIfEmpty(target) {
    const abs = path.resolve(target);
    try {
      if (fs.readdirSync(abs).length) return 'kept';
    } catch (err) {
      if (err.code === 'ENOENT' || err.code === 'ENOTDIR') return 'missing';
      throw err;
    }
    if (!this.dryRun) fs.rmdirSync(abs);
    this.changes.push({ action: 'remove', file: `${this.rel(abs)}/` });
    return 'remove';
  }

  note(action, file) {
    this.changes.push({ action, file });
  }
}
