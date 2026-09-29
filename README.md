# claude2

[![CI](https://github.com/yudono/claude2/actions/workflows/ci.yml/badge.svg)](https://github.com/yudono/claude2/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/claude2.svg)](https://www.npmjs.com/package/claude2)
[![node](https://img.shields.io/node/v/claude2.svg)](https://www.npmjs.com/package/claude2)
[![license](https://img.shields.io/npm/l/claude2.svg)](LICENSE)

Run **multiple Claude Code accounts on the same machine** — side by side or one after another — by giving each account its own isolated configuration directory via `CLAUDE_CONFIG_DIR`.

```bash
claude2 work      # Claude Code logged in as your work account
claude2 personal  # Claude Code logged in as your personal account
```

Each account keeps its own login, history, settings, sessions, and permissions. Nothing is shared between them.

- Zero runtime dependencies (no supply-chain surface)
- Never reads, writes, or logs credentials or tokens
- Works on macOS, Linux, and Windows
- Requires [Claude Code](https://claude.com/claude-code) to be installed

---

## Table of contents

- [Requirements](#requirements)
- [Install](#install)
- [Quick start](#quick-start)
- [Commands](#commands)
- [Running accounts side by side](#running-accounts-side-by-side)
- [Shell aliases](#shell-aliases)
- [Configuration](#configuration)
- [How it works](#how-it-works)
- [Data stored per account](#data-stored-per-account)
- [Security and privacy](#security-and-privacy)
- [Troubleshooting](#troubleshooting)
- [FAQ](#faq)
- [Uninstall](#uninstall)
- [Development](#development)
- [License](#license)

---

## Requirements

| Requirement | Version | Notes |
| --- | --- | --- |
| Node.js | `>= 18` | `node -v` to check |
| Claude Code | any recent | [Install docs](https://claude.com/claude-code) — `npm install -g @anthropic-ai/claude-code` |
| OS | macOS, Linux, Windows | Account isolation works the same on all three |

`claude2` finds the `claude` binary on your `PATH`. If you keep it somewhere unusual, point `CLAUDE_BIN` at it (see [Configuration](#configuration)).

## Install

```bash
npm install -g claude2
```

Verify:

```bash
claude2 --version
claude2 doctor
```

## Quick start

```bash
# 1. Start (or create) your first account.
#    The config dir is created automatically with 0700 permissions.
claude2 work

# 2. Inside Claude Code, log in once (type /login, or accept the browser prompt).
#    Those credentials belong only to the "work" account.

# 3. Start a second account in another terminal.
claude2 personal

# 4. Log in with the other account. From now on the two never mix.
claude2 work      # always account 1
claude2 personal  # always account 2

# 5. See everything you have.
claude2 ls
```

The first run of a brand-new account prints:

```
claude2: account "work" -> CLAUDE_CONFIG_DIR=/Users/you/.claude2/work
```

so you always know which account a terminal is using.

## Commands

### `claude2 <account> [claude args...]`

Start Claude Code with the given account. The account is created on first use. All extra arguments are passed straight to `claude`.

```bash
claude2 work                       # interactive session
claude2 work --continue            # resume the last session of that account
claude2 personal -p "hello"        # print mode
claude2 work --model opus          # any supported claude flag
```

Exit code mirrors Claude Code's exit code.

### `claude2` / `claude2 ls`

List every account configured under the root directory.

```
Accounts in /Users/you/.claude2:
  personal
  work

Start one with: claude2 <account>
```

With no accounts yet it prints a short "get started" hint instead.

### `claude2 env <account>`

Print a shell export line for the current account, creating the account if needed. Use it to make an **existing shell** (or a new terminal tab) use a specific account, then run plain `claude`.

```bash
eval "$(claude2 env work)"    # this shell now uses "work"
claude                        # runs as "work"
eval "$(claude2 env --default)"  # back to the default config dir
```

Output is a single, safely quoted POSIX line:

```
export CLAUDE_CONFIG_DIR='/Users/you/.claude2/work'
```

### `claude2 alias <account> [alias-name]`

Print a ready-to-paste shell alias. `claude2` never edits your shell rc files — you decide where it goes.

```bash
claude2 alias work w
```

```
alias w='claude2 work'

Paste that line into your shell rc file (e.g. ~/.zshrc),
then reload it with "source ~/.zshrc" (zsh) or "source ~/.bashrc" (bash).
```

The alias name defaults to the account name when you omit it: `claude2 alias work` prints `alias work='claude2 work'`.

### `claude2 rm <account> --yes`

Delete an account **and all of its local data** (credentials reference, history, settings, sessions). Refuses without `--yes`, so a typo cannot destroy an account.

```bash
claude2 rm work --yes
```

> On macOS the OAuth credential itself lives in your login Keychain under a per-account entry; removing the config dir removes the only reference `claude2` manages. You can also revoke sessions from your Anthropic account settings if a device should be fully de-authorized.

### `claude2 doctor`

Diagnose the installation and the current shell: Node version, root directory, `claude` binary location, whether `CLAUDE_CONFIG_DIR` is already exported in this shell, and how many accounts exist.

```
claude2 1.0.0
node         v24.18.0 (darwin/arm64)
root         /Users/you/.claude2
claude bin   /Users/you/.bun/bin/claude
shell env    CLAUDE_CONFIG_DIR not set (using the default config dir)
accounts     2
               - personal
               - work

All checks passed.
```

### `claude2 help` · `claude2 version`

Full usage text, or the version string.

### Exit codes

| Code | Meaning |
| --- | --- |
| `0` | Success |
| `1` | Usage error (bad name, missing `--yes`, unknown option) or a failed setup step |
| other | Whatever Claude Code itself returned |

Reserved command names (`env`, `alias`, `ls`, `list`, `rm`, `remove`, `doctor`, `help`, `version`) cannot be used as account names.

## Running accounts side by side

Three equivalent ways, pick whichever fits your workflow:

**1. One command per terminal** — simplest:

```bash
terminal 1:  claude2 work
terminal 2:  claude2 personal
```

**2. Pin a whole shell to an account** — good when you also run other `claude` commands:

```bash
eval "$(claude2 env work)"      # terminal 1
eval "$(claude2 env personal)"  # terminal 2
claude                          # each terminal stays on its own account
```

**3. Short aliases** — fastest day-to-day:

```bash
claude2 alias work w
claude2 alias personal p
# add the two printed lines to ~/.zshrc, reload, then:
w
p
```

Because each account has its own config dir, two sessions can run at the same time without clobbering each other's sessions or history.

## Shell aliases

`claude2` deliberately does **not** touch `~/.zshrc`, `~/.bashrc`, or any other rc file. Every command that would modify your shell prints the exact line to paste instead. This keeps installs reversible and makes the tool safe to run from CI or scripts.

## Configuration

All settings are environment variables. There is no config file.

| Variable | Default | Description |
| --- | --- | --- |
| `CLAUDE2_HOME` | `~/.claude2` | Root directory where account config dirs are created. |
| `CLAUDE_BIN` | *(auto-detected)* | Absolute path to the `claude` binary, used by `claude2 <account>` and reported by `doctor`. |
| `CLAUDE_CONFIG_DIR` | unset | Managed by `claude2` for you. Set by `env`, or exported manually if you prefer raw control. |
| `PATH` | — | Where `claude2` looks for `claude`. |

Examples:

```bash
export CLAUDE2_HOME="$HOME/.config/claude2-accounts"
export CLAUDE_BIN="/opt/claude/bin/claude"
```

Account names must match `^[A-Za-z0-9][A-Za-z0-9._-]{0,31}$` — no path separators, no `..`, no leading dot or dash.

## How it works

Claude Code stores its entire state in a configuration directory:

- default: `~/.claude` (when `CLAUDE_CONFIG_DIR` is unset)
- overridden by the `CLAUDE_CONFIG_DIR` environment variable

`claude2 <account>` does exactly two things:

1. resolves `CLAUDE2_HOME/<account>` (creating it with mode `0700` if needed),
2. spawns the `claude` binary with `CLAUDE_CONFIG_DIR` set to that path.

That is the whole tool — there is no daemon, no wrapper around your prompt, and no interception of network traffic.

### Why credentials are isolated too

Credentials are the part people usually worry about, because on macOS Claude Code stores them in the **login Keychain** rather than in a plain file. Isolation still holds: when `CLAUDE_CONFIG_DIR` is set, Claude Code derives the Keychain service name from a short hash of that directory:

```
default config dir :  Claude Code-credentials
set config dir     :  Claude Code-credentials-<sha256(dir)[0..7]>
```

So every account gets its **own Keychain entry** (verified against Claude Code 2.1.284, which introduced this derivation). On Linux and Windows, credentials live in a file inside the account's config dir, which is isolated by construction.

Net effect: logging into `work` never overwrites `personal`, and switching accounts never re-authenticates the other one.

## Data stored per account

Everything below lives under `CLAUDE2_HOME/<account>/` and belongs to that account only:

| Data | Purpose |
| --- | --- |
| credentials (file or Keychain entry derived from this dir) | login / OAuth token |
| `settings.json` | user settings, permissions allow-list |
| `history.jsonl` | prompt history |
| `projects/` | per-project session transcripts |
| `sessions/`, `tasks/` | background sessions and tasks |
| `plugins/`, `skills/`, `mcp*` | installed plugins, skills, MCP servers |
| `stats-cache.json`, `telemetry/` | local usage statistics |

Nothing is written outside `CLAUDE2_HOME/<account>/` except the child process's own normal behavior.

## Security and privacy

Design rules the package follows:

- **Credentials are never touched.** `claude2` does not open, parse, copy, print, or delete credential files or Keychain items — `rm` only deletes the account directory tree, and only after `--yes`.
- **No secrets in logs.** The only thing printed before launch is the config directory path. Environment variables and tokens are never echoed.
- **Zero runtime dependencies.** The published package installs nothing but itself, so there is no third-party code in the install path.
- **No network, no telemetry.** The package makes no HTTP requests and phones nothing home.
- **Path safety.** Account names are validated against a strict pattern and the resolved path must stay inside `CLAUDE2_HOME`; `../` and absolute paths are rejected before anything is created or deleted.
- **Private directories.** New directories are created with mode `0700` on POSIX systems.
- **Shell rc files are never modified.** Aliases are printed, not installed.
- **Predictable process handling.** `SIGINT`/`SIGTERM`/`SIGHUP` are forwarded to Claude Code and its exit code is propagated, so Ctrl-C behaves as if you had run `claude` directly.

## Troubleshooting

**`claude2: Could not find the "claude" binary`**
Install Claude Code, or set the path explicitly: `export CLAUDE_BIN=/path/to/claude`. Run `claude2 doctor` to see what was searched.

**Both accounts show the same login / `/status` looks identical**
Check that the shell is not overriding things: `echo $CLAUDE_CONFIG_DIR`. If you ran `eval "$(claude2 env work)"` earlier in that shell, the export applies to everything you launch there — use a fresh terminal or `eval "$(claude2 env --default)"`.

**I am asked to log in every time**
Make sure you are not creating a new account name each session (`claude2 ls` to check). Also confirm Claude Code is recent enough to derive per-directory Keychain entries; update with `npm install -g @anthropic-ai/claude-code`.

**`Keychain access denied` on macOS**
Your login keychain is locked. Unlock it in another terminal with `security unlock-keychain`, then retry.

**Permission denied writing to `CLAUDE2_HOME`**
Fix ownership/permissions, for example `chmod 700 ~/.claude2`. `claude2 doctor` reports the root path in use.

**`"name" is a reserved command`**
Pick another account name — `env`, `rm`, `ls`, `doctor`, and friends are taken by subcommands.

**Can I use account names with spaces or emoji?**
No. Names are limited to letters, digits, `.`, `_`, `-` (max 32 characters) so they are safe in shells, scripts, and directory listings.

## FAQ

**Does this violate the Claude Code terms of service?**
It only separates local configuration directories; it does not bypass authentication, quotas, or licensing. Use accounts you are legitimately entitled to, and follow Anthropic's terms.

**Can I copy an existing login into a new account?**
Not with this tool — copying credentials between stores is exactly the kind of secret handling `claude2` avoids. Log in once per account instead.

**Can I run the same account in two terminals at the same time?**
Yes, but two concurrent sessions of one account share its session state. For parallel work, use two accounts or two terminals pointed at different accounts.

**Does it work with `claude --resume` / `--continue`?**
Yes. Those flags operate on the account's own session store.

**How do I migrate my default `~/.claude` setup to an account?**
Start it as an account and log in there: `claude2 default`-style migrations would mean copying credentials, which this tool intentionally does not do. Your default `~/.claude` keeps working untouched until you decide to move over.

## Uninstall

```bash
npm uninstall -g claude2
rm -rf ~/.claude2     # optional: removes every account and its local data
```

Nothing else on your system is modified. Your default `~/.claude` configuration is never touched by `claude2`.

## Development

```bash
git clone https://github.com/yudono/claude2.git
cd claude2
npm install        # dev tooling only (eslint); the package itself has no dependencies
npm test           # node --test (unit + CLI integration tests)
npm run lint       # eslint
npm pack --dry-run # inspect exactly what gets published
```

Tests use a stubbed `claude` binary (`CLAUDE_BIN`), so they never launch a real session or touch credentials.

Releasing:

```bash
npm version 1.0.0 --no-git-tag-version
npm test && npm run lint
npm publish        # prepublishOnly runs the test suite and lint first
git commit -am "chore: release vX.Y.Z" && git tag vX.Y.Z && git push --follow-tags
```

## License

[MIT](LICENSE) © yudono
