import test from 'node:test';
import assert from 'node:assert/strict';
import { chmodSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { runClaude } from '../src/run.js';

function writeFakeBin(script) {
  const dir = mkdtempSync(join(tmpdir(), 'claude2-bin-'));
  const file = join(dir, 'fake-claude');
  writeFileSync(file, `#!/usr/bin/env node\n${script}\n`);
  chmodSync(file, 0o755);
  return file;
}

const envStub = { PATH: process.env.PATH, HOME: process.env.HOME };

test('passes CLAUDE_CONFIG_DIR and forwards arguments', async () => {
  const out = join(tmpdir(), `claude2-out-${Date.now()}.json`);
  const bin = writeFakeBin(`
    const fs = require('node:fs');
    fs.writeFileSync(process.env.OUT_FILE, JSON.stringify({
      dir: process.env.CLAUDE_CONFIG_DIR ?? null,
      args: process.argv.slice(2),
    }));
  `);

  const result = await runClaude({
    bin,
    args: ['--version', 'extra'],
    configDir: '/tmp/claude2-account',
    env: { ...envStub, OUT_FILE: out },
    stdio: 'ignore',
  });

  assert.equal(result.ok, true);
  assert.equal(result.code, 0);

  const payload = JSON.parse(readFileSync(out, 'utf8'));
  assert.equal(payload.dir, '/tmp/claude2-account');
  assert.deepEqual(payload.args, ['--version', 'extra']);
});

test('propagates a non-zero exit code', async () => {
  const bin = writeFakeBin('process.exit(3)');
  const result = await runClaude({
    bin,
    args: [],
    configDir: '/tmp/claude2-account',
    env: envStub,
    stdio: 'ignore',
  });
  assert.equal(result.ok, false);
  assert.equal(result.code, 3);
});

test('reports a spawn error instead of throwing', async () => {
  const result = await runClaude({
    bin: '/nonexistent/binary-for-claude2-test',
    args: [],
    configDir: '/tmp/claude2-account',
    env: envStub,
    stdio: 'ignore',
  });
  assert.equal(result.ok, false);
  assert.ok(result.error);
  assert.match(result.error.message, /ENOENT/);
});
