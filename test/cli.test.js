import test from 'node:test';
import assert from 'node:assert/strict';
import { chmodSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const BIN = join(dirname(fileURLToPath(import.meta.url)), '..', 'bin', 'claude2.js');
const home = mkdtempSync(join(tmpdir(), 'claude2-cli-home-'));
const binDir = mkdtempSync(join(tmpdir(), 'claude2-cli-bin-'));

const fakeClaude = join(binDir, 'fake-claude');
writeFileSync(
  fakeClaude,
  `#!/usr/bin/env node
process.stdout.write(process.env.CLAUDE_CONFIG_DIR ?? 'unset');
`
);
chmodSync(fakeClaude, 0o755);

function cli(args, env = {}) {
  return spawnSync(process.execPath, [BIN, ...args], {
    encoding: 'utf8',
    env: {
      ...process.env,
      CLAUDE2_HOME: home,
      CLAUDE_BIN: fakeClaude,
      ...env,
    },
  });
}

test('shows help and version', () => {
  const help = cli(['help']);
  assert.equal(help.status, 0);
  assert.match(help.stdout, /USAGE/);
  assert.match(help.stdout, /SECURITY/);

  const version = cli(['--version']);
  assert.equal(version.status, 0);
  assert.match(version.stdout.trim(), /^\d+\.\d+\.\d+$/);
});

test('lists nothing before any account exists', () => {
  const result = cli(['ls']);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /No accounts yet/);
});

test('env prints an export for the account and creates its dir', () => {
  const result = cli(['env', 'work']);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /^export CLAUDE_CONFIG_DIR=/m);
  assert.ok(result.stdout.includes(join(home, 'work')));
});

test('env --default restores the default config dir', () => {
  const result = cli(['env', '--default']);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /^unset CLAUDE_CONFIG_DIR$/m);
});

test('alias prints a paste-ready alias', () => {
  const result = cli(['alias', 'work', 'w']);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /^alias w='claude2 work'$/m);
});

test('launch runs claude with the account config dir', () => {
  const result = cli(['work', '--version']);
  assert.equal(result.status, 0);
  assert.ok(result.stdout.includes(join(home, 'work')));
  assert.match(result.stderr, /account "work"/);
});

test('unknown option fails with a usage error', () => {
  const result = cli(['--nope']);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Unknown option/);
});

test('invalid account name fails', () => {
  const result = cli(['../escape']);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /must not contain path separators|not a valid account name/);
});

test('rm refuses without --yes', () => {
  const result = cli(['rm', 'work']);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /--yes/);
});

test('rm --yes deletes the account', () => {
  const result = cli(['rm', 'work', '--yes']);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /Removed/);
  const listed = cli(['ls']);
  assert.doesNotMatch(listed.stdout, /^ {2}work$/m);
});

test('doctor reports the environment', () => {
  mkdirSync(join(home, 'personal'), { recursive: true });
  const result = cli(['doctor']);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /claude bin/);
  assert.match(result.stdout, /- personal/);
});
