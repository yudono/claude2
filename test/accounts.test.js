import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { UsageError } from '../src/names.js';

const home = mkdtempSync(join(tmpdir(), 'claude2-home-'));
process.env.CLAUDE2_HOME = home;
mkdirSync(join(home, 'nested'), { recursive: true });

const { ROOT_DIR, accountDir, ensureAccount, listAccounts, removeAccount } =
  await import('../src/accounts.js');

test('root is created inside CLAUDE2_HOME', () => {
  assert.equal(ROOT_DIR, home);
});

test('account dirs are created private and stay inside the root', () => {
  const dir = ensureAccount('work');
  assert.equal(dir, join(home, 'work'));
  assert.ok(existsSync(dir));
  if (process.platform !== 'win32') {
    assert.equal(statSync(dir).mode & 0o777, 0o700);
    assert.equal(statSync(home).mode & 0o777, 0o700);
  }
});

test('accountDir refuses traversal', () => {
  assert.throws(() => accountDir('../escape'), UsageError);
  assert.throws(() => accountDir('..'), UsageError);
  assert.throws(() => accountDir('nested/child'), UsageError);
});

test('listAccounts returns created accounts only, sorted', () => {
  ensureAccount('alpha');
  ensureAccount('beta');
  assert.deepEqual(listAccounts(), ['alpha', 'beta', 'nested', 'work']);
});

test('removeAccount deletes the directory and errors when missing', () => {
  removeAccount('beta');
  assert.ok(!existsSync(join(home, 'beta')));
  assert.throws(() => removeAccount('beta'), /does not exist/);
  assert.deepEqual(listAccounts(), ['alpha', 'nested', 'work']);
});
