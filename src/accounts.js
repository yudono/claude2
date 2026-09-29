import { chmodSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve, sep } from 'node:path';

import { UsageError, validateAccountName } from './names.js';

export const ROOT_DIR = process.env.CLAUDE2_HOME
  ? resolve(process.env.CLAUDE2_HOME)
  : join(homedir(), '.claude2');

const PRIVATE_MODE = 0o700;

export function accountDir(name) {
  validateAccountName(name);
  const dir = resolve(join(ROOT_DIR, name));
  if (dir !== ROOT_DIR && !dir.startsWith(ROOT_DIR + sep)) {
    throw new UsageError(`"${name}" resolves outside ${ROOT_DIR}.`);
  }
  return dir;
}

function harden(dir) {
  if (process.platform === 'win32') return;
  try {
    chmodSync(dir, PRIVATE_MODE);
  } catch {
    // Best effort: a read-only parent should not break account creation.
  }
}

export function ensureRoot() {
  mkdirSync(ROOT_DIR, { recursive: true, mode: PRIVATE_MODE });
  harden(ROOT_DIR);
  return ROOT_DIR;
}

export function ensureAccount(name) {
  const dir = accountDir(name);
  mkdirSync(dir, { recursive: true, mode: PRIVATE_MODE });
  harden(dir);
  return dir;
}

export function listAccounts() {
  let entries;
  try {
    entries = readdirSync(ROOT_DIR, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => {
      try {
        validateAccountName(name);
        return true;
      } catch {
        return false;
      }
    })
    .sort((a, b) => a.localeCompare(b));
}

export function removeAccount(name) {
  const dir = accountDir(name);
  let stats;
  try {
    stats = statSync(dir);
  } catch {
    throw new UsageError(`Account "${name}" does not exist.`);
  }
  if (!stats.isDirectory()) {
    throw new UsageError(`${dir} is not an account directory.`);
  }
  rmSync(dir, { recursive: true, force: true });
  return dir;
}
