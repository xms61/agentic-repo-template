@AGENTS.md

## Claude Code
- Skills: edit them in `.agents/skills/` (shared with the other agents), then run `npm run sync:skills` to mirror them into `.claude/skills/`, the folder Claude Code reads.
- Before you call a non-trivial change done, have the `reviewer` subagent review the diff in a fresh context.
- Shared permissions, sandbox and hooks are in `.claude/settings.json`. Personal overrides go in `.claude/settings.local.json`, which git ignores.
