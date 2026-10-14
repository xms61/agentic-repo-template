# Bootstrap the repository from the template

## Purpose
Turn the template into this project's repository: the stack chosen and set up, `npm run verify` running the stack's checks locally and in CI, the docs describing this project instead of placeholders, and only the agents the team uses configured. Done when `npm run check:docs` reports no template placeholders and CI is green.

## Context
- [AGENTS.md](../../../AGENTS.md): the commands table and boundaries to fill in.
- [AGENT_TOOLS.md](../../AGENT_TOOLS.md): which agent reads which file, and how to remove one.
- [ARCHITECTURE.md](../../../ARCHITECTURE.md), [CODE_STYLE.md](../../CODE_STYLE.md), [TESTING.md](../../TESTING.md), [SECURITY.md](../../SECURITY.md): the docs with `TODO(template)` placeholders.
- `npm run check:docs` lists every placeholder left, by file and line.

## Plan
1. Interview the owner, one question at a time: what the project does and for whom; the stack and runtime; where it will run; which coding agents the team uses; whether AI review should run in CI; the license; and how many people will work on it. Record the answers in the Decision log.
2. Remove the agents the team doesn't use, following AGENT_TOOLS.md.
3. Add a `LICENSE` file with the chosen license's text; with none, the code stays all rights reserved. If more than one person will work on it, add `.github/CODEOWNERS` and require code-owner review ([SECURITY.md](../../SECURITY.md#agents-in-ci)).
4. Set up the stack: dependencies, formatter, linter, typecheck and test runner, with one passing test. Fill in the AGENTS.md commands table, add the checks to the `verify` script, and add `cache: npm` to the CI setup-node step once there are dependencies.
5. Update `copilot-setup-steps.yml` (and the Codex cloud setup script, if used) so cloud agents can run `npm run verify`.
6. Fill in README.md, ARCHITECTURE.md and the Stack sections of CODE_STYLE.md and TESTING.md. Once there are two layers, enforce the dependency direction with a lint rule or a structural test.
7. Once the app has a user-facing feature, write its verification skill ([TESTING.md](../../TESTING.md#verification-skill)) and prove it on that feature. A library skips this step. If the app has no feature yet, add a tech-debt row instead, so the skill is written with the first feature.
8. Replace the remaining placeholders, then delete TEMPLATE.md.

## Progress
- [ ] Owner interviewed, answers logged
- [ ] Unused agents removed
- [ ] License added; CODEOWNERS added if more than one person works here
- [ ] Stack set up; `verify` runs lint, typecheck and tests
- [ ] Cloud agent setup updated
- [ ] README.md, ARCHITECTURE.md, CODE_STYLE.md and TESTING.md filled in
- [ ] Verification skill written and proven on one feature, skipped for a library, or deferred with a tech-debt row until the first user-facing feature
- [ ] No template placeholders left; TEMPLATE.md deleted

## Decision log
- (none yet)

## Surprises
- (none yet)

## Validation
`npm run verify` passes with the stack's checks included, `npm run check:docs` prints no placeholder warnings, and CI is green on the pull request that finishes this plan. Once this plan moves to `completed/`, any placeholder left fails the doc checks.

## Outcome
Filled in when the plan moves to completed/.
