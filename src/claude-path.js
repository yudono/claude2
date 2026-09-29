import { accessSync, constants, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { delimiter, join } from 'node:path';

const FALLBACK_DIRS = [
  join(homedir(), '.bun', 'bin'),
  join(homedir(), '.claude', 'local'),
  join(homedir(), '.local', 'bin'),
  join(homedir(), '.npm-global', 'bin'),
  '/usr/local/bin',
  '/opt/homebrew/bin',
  '/usr/bin',
];

function isExecutable(file) {
  try {
    if (!statSync(file).isFile()) return false;
    accessSync(file, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function candidateNames() {
  if (process.platform === 'win32') {
    return ['claude.cmd', 'claude.exe', 'claude', 'claude.ps1'];
  }
  return ['claude'];
}

export function findClaude(env = process.env) {
  const names = candidateNames();
  const dirs = [
    ...(env.PATH ? env.PATH.split(delimiter) : []),
    ...FALLBACK_DIRS,
  ].filter(Boolean);

  const seen = new Set();
  for (const dir of dirs) {
    if (seen.has(dir)) continue;
    seen.add(dir);
    for (const name of names) {
      const file = join(dir, name);
      if (isExecutable(file)) return file;
    }
  }
  return null;
}
