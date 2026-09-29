#!/usr/bin/env node
import { createRequire } from 'node:module';

import {
  ROOT_DIR,
  ensureAccount,
  ensureRoot,
  listAccounts,
  removeAccount,
} from '../src/accounts.js';
import { findClaude } from '../src/claude-path.js';
import { UsageError, validateAccountName } from '../src/names.js';
import { runClaude } from '../src/run.js';

const require = createRequire(import.meta.url);
const { version } = require('../package.json');

const HELP = `claude2 ${version}
Run multiple Claude Code accounts on the same machine, side by side.

USAGE
  claude2 <account> [claude args...]   Start Claude Code with that account
  claude2 <account>                    Start Claude Code (interactive)
  claude2 <account> -p "prompt"        Start Claude Code in print mode
  claude2                              List all accounts

COMMANDS
  ls, list                 List configured accounts
  env <account>            Print the export line for the current shell
  env --default            Print the export line for the default config dir
  alias <account> [name]   Print a ready-to-paste shell alias
  rm, remove <account>     Delete an account and all of its local data
                           (requires --yes)
  doctor                   Diagnose the installation and the current shell
  help                     Show this help
  version, --version, -v   Show the version

EXAMPLES
  claude2 work                      Start Claude Code as the "work" account
  claude2 personal -p "summarize"   Same, but in print mode
  claude2 ls                        See every account you have created
  eval "$(claude2 env work)"        Make this shell use the "work" account
  eval "$(claude2 env --default)"   Restore the default account in this shell
  claude2 alias work w              Create the shortcut: w -> claude2 work
  claude2 rm work --yes             Remove the "work" account

HOW IT WORKS
  Every account gets its own configuration directory under ${ROOT_DIR},
  passed to Claude Code through the CLAUDE_CONFIG_DIR environment variable.
  Claude Code >= 2.x stores credentials in a separate macOS Keychain entry
  (or an isolated credentials file on Linux/Windows) for each config dir,
  so accounts never share a login, history, settings, or session data.

SECURITY
  claude2 only sets CLAUDE_CONFIG_DIR and starts the "claude" binary.
  It never reads, writes, logs, or transmits credentials or tokens, it has
  zero runtime dependencies, and it never modifies your shell rc files.
`;

function fail(message) {
  process.stderr.write(`claude2: ${message}\n`);
  process.exitCode = 1;
}

function quote(value) {
  return `'${String(value).replaceAll("'", `'\\''`)}'`;
}

function printAccounts() {
  const accounts = listAccounts();
  if (accounts.length === 0) {
    process.stdout.write(
      `No accounts yet.\nStart one with: claude2 <account>\n(e.g. claude2 work)\n`
    );
    return;
  }
  process.stdout.write(`Accounts in ${ROOT_DIR}:\n`);
  for (const name of accounts) {
    process.stdout.write(`  ${name}\n`);
  }
  process.stdout.write(`\nStart one with: claude2 <account>\n`);
}

async function printEnv(args) {
  if (args[0] === '--default') {
    process.stdout.write(`unset CLAUDE_CONFIG_DIR\n`);
    return;
  }
  const name = args[0];
  validateAccountName(name);
  const dir = ensureAccount(name);
  process.stdout.write(`export CLAUDE_CONFIG_DIR=${quote(dir)}\n`);
}

function printAlias(args) {
  const name = args[0];
  validateAccountName(name);
  const aliasName = args[1] ?? name;
  if (!/^[A-Za-z_][A-Za-z0-9_-]*$/.test(aliasName)) {
    throw new UsageError(
      `"${aliasName}" is not a valid shell alias name (letters, digits, "_", "-", starting with a letter).`
    );
  }
  process.stdout.write(
    `alias ${aliasName}='claude2 ${name}'\n\n` +
      `Paste that line into your shell rc file (e.g. ~/.zshrc),\n` +
      `then reload it with "source ~/.zshrc" (zsh) or "source ~/.bashrc" (bash).\n`
  );
}

function doctor() {
  const lines = [];
  lines.push(`claude2 ${version}`);
  lines.push(`node         ${process.version} (${process.platform}/${process.arch})`);
  lines.push(`root         ${ROOT_DIR}`);

  const bin = process.env.CLAUDE_BIN || findClaude();
  if (bin) {
    lines.push(`claude bin   ${bin}`);
  } else {
    lines.push(`claude bin   NOT FOUND`);
    lines.push(
      `             Install Claude Code ("npm install -g @anthropic-ai/claude-code")`
    );
    lines.push(`             or point CLAUDE_BIN at the binary.`);
  }

  const exported = process.env.CLAUDE_CONFIG_DIR;
  if (exported) {
    lines.push(
      `shell env    CLAUDE_CONFIG_DIR=${exported} (an "env" export is active in this shell)`
    );
  } else {
    lines.push(`shell env    CLAUDE_CONFIG_DIR not set (using the default config dir)`);
  }

  const accounts = listAccounts();
  lines.push(`accounts     ${accounts.length}`);
  for (const name of accounts) {
    lines.push(`               - ${name}`);
  }

  const problems = [];
  if (!bin) problems.push('the "claude" binary is not on PATH');
  if (accounts.length === 0) problems.push('no accounts created yet');

  lines.push('');
  lines.push(
    problems.length === 0
      ? 'All checks passed.'
      : `Notes:\n${problems.map((p) => `  - ${p}`).join('\n')}`
  );
  process.stdout.write(`${lines.join('\n')}\n`);
}

function removeCommand(args) {
  const name = args.find((arg) => !arg.startsWith('-'));
  const confirmed = args.includes('--yes') || args.includes('-y');
  validateAccountName(name);
  if (!confirmed) {
    throw new UsageError(
      `Deleting "${name}" also deletes its credentials, history and settings. Re-run with --yes to confirm.`
    );
  }
  const dir = removeAccount(name);
  process.stdout.write(`Removed ${dir}\n`);
}

async function launch(name, args) {
  const dir = ensureAccount(name);
  ensureRoot();

  const bin = process.env.CLAUDE_BIN || findClaude();
  if (!bin) {
    throw new UsageError(
      'Could not find the "claude" binary. Install Claude Code or set CLAUDE_BIN.'
    );
  }

  process.stderr.write(`claude2: account "${name}" -> CLAUDE_CONFIG_DIR=${dir}\n`);

  const result = await runClaude({ bin, args, configDir: dir });
  if (!result.ok) {
    if (result.error) {
      throw new UsageError(`Failed to start claude: ${result.error.message}`);
    }
    process.exitCode = result.code;
  }
}

async function main(argv) {
  const [command, ...rest] = argv;

  switch (command) {
    case undefined:
      printAccounts();
      return;
    case 'help':
    case '--help':
    case '-h':
      process.stdout.write(HELP);
      return;
    case 'version':
    case '--version':
    case '-v':
      process.stdout.write(`${version}\n`);
      return;
    case 'ls':
    case 'list':
      printAccounts();
      return;
    case 'doctor':
      doctor();
      return;
    case 'env':
      await printEnv(rest);
      return;
    case 'alias':
      printAlias(rest);
      return;
    case 'rm':
    case 'remove':
      removeCommand(rest);
      return;
    default:
      if (command.startsWith('-')) {
        throw new UsageError(
          `Unknown option "${command}". Run "claude2 help" for usage.`
        );
      }
      await launch(command, rest);
  }
}

main(process.argv.slice(2)).catch((error) => {
  if (error instanceof UsageError) {
    fail(error.message);
    return;
  }
  fail(error?.stack ?? String(error));
  process.exitCode = 1;
});
