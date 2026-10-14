---
status: draft
last-verified: 2026-10-14
---

# Agent tools

Which coding agent reads which file, what is set up for each, how to switch on the optional parts, and how to remove an agent the team doesn't use. Every agent shares one source of instructions, [AGENTS.md](../AGENTS.md); the per-agent files only point to it or add guardrails.

## Shared by all agents
| File | Purpose | Used by |
| :-- | :-- | :-- |
| [AGENTS.md](../AGENTS.md) | The map, commands and boundaries | All. Claude Code through the import in CLAUDE.md, Gemini CLI through its settings |
| [REVIEW.md](../REVIEW.md) | What reviewers report and skip | Claude review workflow and Claude Code Review; Codex through the Review guidelines in AGENTS.md; Copilot through its instructions file |
| [.agents/skills/](../.agents/skills/) | Procedures loaded on demand: [exec-plan](../.agents/skills/exec-plan/SKILL.md), [doc-gardening](../.agents/skills/doc-gardening/SKILL.md), and [retro](../.agents/skills/retro/SKILL.md), which Claude Code (through its frontmatter) and Codex (through its `agents/openai.yaml`) run only when someone asks for it | Codex, Gemini CLI, Cursor, Copilot; mirrored for Claude Code |
| [scripts/agent-hooks/guard-tool-use.mjs](../scripts/agent-hooks/guard-tool-use.mjs) | Blocks edits to `.env`, keys, lockfiles and `.git/`, and commands that skip hooks, force-push or touch `.env` | Claude Code, Codex |

To scope rules to one folder for every agent, add a nested `AGENTS.md` in that folder rather than a tool-specific rules file.

## Tickets on GitHub Issues
Exec plans can split their milestones into GitHub issues ([PLANS.md](PLANS.md#tickets)). Sub-issues, blocked-by links and labels work on every GitHub plan, the free one included.

**Set up once per repository:** create the label agents take work from, and keep it out of issue templates ([SECURITY.md](SECURITY.md#tickets-and-untrusted-text)):

```bash
gh label create ready-for-agent --color 0E8A16 --description "A ticket an agent may work on"
```

**Per agent:**
- Local agents use the `gh` CLI, signed in with `gh auth login --with-token` and a fine-grained token limited to this repository ([SECURITY.md](SECURITY.md#tickets-and-untrusted-text)). It needs a version whose `gh issue create --help` lists `--parent` and `--blocked-by`. Claude Code's sandbox allows `github.com`; Codex's sandbox has no network, so approve its `gh` commands or publish the tickets yourself.
- The Copilot coding agent takes a ticket when you assign it to Copilot.
- Codex cloud tasks have no internet by default: paste the ticket into the task.
- The Claude workflow answers `@claude` in an issue from someone with write access, once it is switched on.

## Removing an agent
Do the steps in that agent's **Remove** list below. Then delete the agent's section from this doc and its name from the table above, and run `npm run verify`: the doc checks report any link to a deleted file that you missed.

## Claude Code
**Files:** [CLAUDE.md](../CLAUDE.md) (imports AGENTS.md; an import instead of a symlink, because symlinks break on Windows checkouts), [.claude/settings.json](../.claude/settings.json) (permissions, sandbox, the guard hook), [.claude/agents/reviewer.md](../.claude/agents/reviewer.md) (fresh-context review subagent), `.claude/skills/` (the mirror of `.agents/skills/` that [scripts/sync-skills.mjs](../scripts/sync-skills.mjs) writes, because Claude Code reads skills only from `.claude/skills/`), and the workflows [claude.yml](../.github/workflows/claude.yml) (answers `@claude`) and [claude-review.yml](../.github/workflows/claude-review.yml) (reviews ready PRs).

**Notes:** the sandbox works on macOS, Linux and WSL2; on native Windows, commands run unsandboxed and the permission rules and hook still apply. Personal settings go in `.claude/settings.local.json`, which git ignores.

**Switch on the workflows:** run `/install-github-app` in Claude Code, or install the Claude GitHub App and add an `ANTHROPIC_API_KEY` repository secret by hand. Then set the repository variable `CLAUDE_ACTIONS` to `on`. Both workflows do nothing until that variable is set.

**Remove:**
1. Delete `CLAUDE.md`, `.claude/`, `.github/workflows/claude.yml` and `.github/workflows/claude-review.yml`.
2. Delete `scripts/sync-skills.mjs` and `scripts/sync-skills.test.mjs`. In `package.json`, delete the `check:skills` and `sync:skills` scripts and remove `check:skills` from `verify`. Delete the `sync-skills` line in `.githooks/pre-commit`. In the AGENTS.md commands table, change the Skills row to "Edit `.agents/skills/`".
3. Remove the Claude lines from `.gitignore`; the CLAUDE.md row and the mirror note in the skills row of [KNOWLEDGE_BASE.md](KNOWLEDGE_BASE.md); and the Claude mentions in [REVIEW.md](../REVIEW.md) and [SECURITY.md](SECURITY.md).
4. If Codex is also gone, delete `scripts/agent-hooks/` and its mentions in SECURITY.md, REVIEW.md and the [ARCHITECTURE.md](../ARCHITECTURE.md) code map.

**If Claude Code is the only agent:** keep `.claude/skills/` as the source instead. Move the skills there, delete `.agents/`, and do step 2 above.

## OpenAI Codex
**Files:** [.codex/config.toml](../.codex/config.toml) (workspace-write sandbox without network, approval on request) and [.codex/hooks.json](../.codex/hooks.json) (runs the guard hook on shell commands and `apply_patch` edits). Codex reads AGENTS.md and `.agents/skills/` itself, and its code review follows the Review guidelines section of AGENTS.md.

**Notes:** Codex loads `.codex/` only after you mark the project as trusted. For Codex cloud tasks, set the environment's setup script to `npm ci` in the Codex settings; cloud tasks have no internet access by default. AGENTS.md files are read up to 32 KiB in total.

**Remove:** delete `.codex/`. If Claude Code is also gone, do step 4 of the Claude Code removal.

## GitHub Copilot
**Files:** [.github/copilot-instructions.md](../.github/copilot-instructions.md) (points to AGENTS.md and REVIEW.md) and [copilot-setup-steps.yml](../.github/workflows/copilot-setup-steps.yml) (installs what the coding agent needs before it starts). Copilot also reads AGENTS.md, `.agents/skills/` and `.claude/skills/`; while the Claude mirror exists it may list a skill twice.

**Switch on:** enable the Copilot coding agent for the repository. The setup steps take effect from the default branch. Keep the agent's firewall on, and add `.env` to the repository's content exclusion in the Copilot settings on GitHub.

**Remove:** delete `.github/copilot-instructions.md` and `.github/workflows/copilot-setup-steps.yml`, and the Copilot mention in REVIEW.md.

## Gemini CLI
**Files:** [.gemini/settings.json](../.gemini/settings.json) (reads AGENTS.md instead of GEMINI.md) and `.geminiignore` (keeps `.env` and keys out of its context). It reads `.agents/skills/` itself.

**Remove:** delete `.gemini/` and `.geminiignore`.

## Cursor
**Files:** `.cursorignore` (keeps `.env` and keys out of its context and index). Cursor reads AGENTS.md, nested AGENTS.md files, `.agents/skills/` and `.claude/skills/` itself, so it needs no rules file; while the Claude mirror exists it may list a skill twice.

**Remove:** delete `.cursorignore`.

## Optional additions
- **MCP servers:** add them per tool (`.mcp.json` for Claude Code, `[mcp_servers]` in `.codex/config.toml`) and give each the narrowest scope that works. Every server's tools cost context, and every server is code you run.
- **Agent telemetry:** to see sessions, cost and tool calls per agent, Claude Code exports OpenTelemetry when `CLAUDE_CODE_ENABLE_TELEMETRY=1` and an OTLP endpoint are set. Put them in user or managed settings, not the repo, and leave prompt and tool-content logging off: it sends source code to the telemetry backend.
- **Harder verification gate:** a Claude Code `Stop` hook that runs `npm run verify` blocks a turn from ending while checks fail. It is slower and costs more per session; add it when agents often stop before verifying. Split the work by cost: a hook after each edit runs only fast checks whose findings have a clear fix ([CODE_STYLE.md](CODE_STYLE.md#custom-checks)), and the full `verify` runs once at `Stop`.
- **Other AI reviewers:** Codex review (enable it in the Codex settings), Copilot code review, and Gemini Code Assist (`.gemini/config.yaml`) all work alongside the Claude workflow. Pick one, so findings don't repeat.
