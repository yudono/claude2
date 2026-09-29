import { spawn } from 'node:child_process';

const SIGNAL_NUMBERS = { SIGHUP: 1, SIGINT: 2, SIGTERM: 15 };

export function runClaude({ bin, args, configDir, env = process.env, stdio = 'inherit' }) {
  const childEnv = { ...env };
  if (configDir !== undefined) {
    childEnv.CLAUDE_CONFIG_DIR = configDir;
  }

  const useShell = process.platform === 'win32' && /\.(cmd|bat)$/i.test(bin);

  const child = spawn(bin, args, {
    env: childEnv,
    stdio,
    shell: useShell,
  });

  const forward = (signal) => {
    try {
      child.kill(signal);
    } catch {
      // Child may already be gone.
    }
  };

  const listeners = [
    ['SIGINT', () => forward('SIGINT')],
    ['SIGTERM', () => forward('SIGTERM')],
    ['SIGHUP', () => forward('SIGHUP')],
  ];
  for (const [signal, listener] of listeners) {
    process.on(signal, listener);
  }

  const cleanup = () => {
    for (const [signal, listener] of listeners) {
      process.removeListener(signal, listener);
    }
  };

  return new Promise((resolvePromise) => {
    child.on('error', (error) => {
      cleanup();
      resolvePromise({ ok: false, error });
    });
    child.on('exit', (code, signal) => {
      cleanup();
      if (signal) {
        resolvePromise({ ok: false, signal, code: 128 + (SIGNAL_NUMBERS[signal] ?? 0) });
        return;
      }
      resolvePromise({ ok: code === 0, code: code ?? 0 });
    });
  });
}
