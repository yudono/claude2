import test from 'node:test';
import assert from 'node:assert/strict';

import { UsageError, validateAccountName } from '../src/names.js';

test('accepts simple account names', () => {
  assert.equal(validateAccountName('work'), 'work');
  assert.equal(validateAccountName('personal-1'), 'personal-1');
  assert.equal(validateAccountName('client_a.b'), 'client_a.b');
  assert.equal(validateAccountName('A9'), 'A9');
});

test('rejects path traversal and separators', () => {
  for (const name of ['..', '.', '../evil', 'a/b', 'a\\b', '']) {
    assert.throws(() => validateAccountName(name), UsageError);
  }
});

test('rejects names that are too long or badly shaped', () => {
  assert.throws(() => validateAccountName('x'.repeat(33)), UsageError);
  assert.throws(() => validateAccountName('.hidden'), UsageError);
  assert.throws(() => validateAccountName('-lead'), UsageError);
  assert.throws(() => validateAccountName('has space'), UsageError);
  assert.throws(() => validateAccountName('emoji😀'), UsageError);
});

test('rejects reserved command names', () => {
  for (const name of ['env', 'rm', 'doctor', 'help', 'ls']) {
    assert.throws(() => validateAccountName(name), UsageError);
  }
});

test('rejects non-string input', () => {
  for (const value of [undefined, null, 42, {}]) {
    assert.throws(() => validateAccountName(value), UsageError);
  }
});
