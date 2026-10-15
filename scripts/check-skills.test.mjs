import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, test } from 'node:test';
import { skillProblems } from './check-skills.mjs';

const roots = [];
after(() => roots.forEach((root) => rmSync(root, { recursive: true, force: true })));

function repoWith(files) {
  const root = mkdtempSync(join(tmpdir(), 'check-skills-'));
  roots.push(root);
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  }
  return root;
}

function skill(fields, body = '# Skill\n') {
  return `---\n${fields}\n---\n\n${body}`;
}

const USER_ONLY_POLICY = 'policy:\n  allow_implicit_invocation: false\n';

test("passes on this repo's own skills", () => {
  assert.deepEqual(skillProblems(join(dirname(fileURLToPath(import.meta.url)), '..')), []);
});

test('passes when there is no skills folder', () => {
  assert.deepEqual(skillProblems(repoWith({ 'AGENTS.md': '# Map\n' })), []);
});

test('passes on valid skills: quoted, folded, CRLF, and user-invoked with a Codex policy', () => {
  const root = repoWith({
    '.agents/skills/plan/SKILL.md': skill('name: plan\ndescription: "Plan work. Use when: starting."'),
    '.agents/skills/garden/SKILL.md': skill('name: garden\ndescription: >\n  Tend the docs.\n  Use before a release.'),
    '.agents/skills/fix-bugs/SKILL.md': '---\r\nname: fix-bugs\r\ndescription: Fix bugs.\r\n---\r\n',
    '.agents/skills/retro/SKILL.md': skill('name: retro\ndescription: Run a retro.\ndisable-model-invocation: true'),
    '.agents/skills/retro/agents/openai.yaml': `# Codex only\n${USER_ONLY_POLICY}`,
    '.agents/skills/README.md': 'Not a skill; ignored.\n',
  });
  assert.deepEqual(skillProblems(root), []);
});

test('passes on valid YAML: comments after values, a byte-order mark, trailing spaces on the --- lines', () => {
  const root = repoWith({
    '.agents/skills/retro/SKILL.md': skill(
      'name: retro # the folder name\ndescription: "Run a retro." # quoted\ndisable-model-invocation: true # Claude Code',
    ),
    '.agents/skills/retro/agents/openai.yaml': USER_ONLY_POLICY,
    '.agents/skills/plan/SKILL.md': '﻿--- \nname: plan\ndescription: Plan work#not-a-comment.\n---  \n',
  });
  assert.deepEqual(skillProblems(root), []);
});

test('reports a skill folder without SKILL.md', () => {
  const root = repoWith({ '.agents/skills/plan/skill.md': skill('name: plan\ndescription: Plan.') });
  assert.deepEqual(skillProblems(root), [
    '.agents/skills/plan: no SKILL.md (the name is case-sensitive); add one, or delete the folder',
  ]);
});

test('reports a missing or unclosed frontmatter block', () => {
  const root = repoWith({
    '.agents/skills/plan/SKILL.md': '# Plan\n',
    '.agents/skills/garden/SKILL.md': '---\nname: garden\ndescription: Tend.\n',
  });
  const fix = 'start the file with a --- line, name and description, and a closing --- line';
  assert.deepEqual(skillProblems(root), [
    `.agents/skills/garden/SKILL.md: no frontmatter; ${fix}`,
    `.agents/skills/plan/SKILL.md: no frontmatter; ${fix}`,
  ]);
});

test('reports a missing name, a name unlike its folder, and a malformed name', () => {
  const root = repoWith({
    '.agents/skills/a/SKILL.md': skill('description: A.'),
    '.agents/skills/b/SKILL.md': skill('name: plan\ndescription: B.'),
    '.agents/skills/Bad--Name/SKILL.md': skill('name: Bad--Name\ndescription: C.'),
  });
  assert.deepEqual(skillProblems(root), [
    '.agents/skills/Bad--Name/SKILL.md: name "Bad--Name" must be lowercase letters, digits and single hyphens, at most 64 characters, and start and end with a letter or digit',
    '.agents/skills/a/SKILL.md: no name; set it to the folder name, "a"',
    '.agents/skills/b/SKILL.md: name "plan" doesn\'t match its folder "b"; agents find a skill by its folder, so rename one to match',
  ]);
});

test('reports a missing, empty, null, comment-only or overlong description', () => {
  const root = repoWith({
    '.agents/skills/a/SKILL.md': skill('name: a'),
    '.agents/skills/b/SKILL.md': skill('name: b\ndescription: ""'),
    '.agents/skills/c/SKILL.md': skill(`name: c\ndescription: ${'x'.repeat(1025)}`),
    '.agents/skills/d/SKILL.md': skill('name: d\ndescription: ~'),
    '.agents/skills/e/SKILL.md': skill('name: e\ndescription: # todo'),
  });
  const missing = 'no description; agents decide when to load a skill from it, so say what it does and when to use it';
  assert.deepEqual(skillProblems(root), [
    `.agents/skills/a/SKILL.md: ${missing}`,
    `.agents/skills/b/SKILL.md: ${missing}`,
    '.agents/skills/c/SKILL.md: description is 1025 characters, the limit is 1024; move the detail into the body',
    `.agents/skills/d/SKILL.md: ${missing}`,
    `.agents/skills/e/SKILL.md: ${missing}`,
  ]);
});

test('reports a disable-model-invocation that is not true or false', () => {
  const root = repoWith({ '.agents/skills/a/SKILL.md': skill('name: a\ndescription: A.\ndisable-model-invocation: yes') });
  assert.deepEqual(skillProblems(root), [
    '.agents/skills/a/SKILL.md: disable-model-invocation must be true or false, not "yes"',
  ]);
});

test('reports a skill that Claude Code and Codex would invoke differently', () => {
  const root = repoWith({
    '.agents/skills/a/SKILL.md': skill('name: a\ndescription: A.\ndisable-model-invocation: true'),
    '.agents/skills/b/SKILL.md': skill('name: b\ndescription: B.'),
    '.agents/skills/b/agents/openai.yaml': USER_ONLY_POLICY,
    '.agents/skills/c/SKILL.md': skill('name: c\ndescription: C.\ndisable-model-invocation: true'),
    '.agents/skills/c/agents/openai.yaml': 'policy:\n  allow_implicit_invocation: true\n',
  });
  const codexMissing = (dir) =>
    `.agents/skills/${dir}/SKILL.md: disable-model-invocation is true, but Codex can still run the skill on its own; add .agents/skills/${dir}/agents/openai.yaml with policy.allow_implicit_invocation: false`;
  assert.deepEqual(skillProblems(root), [
    codexMissing('a'),
    '.agents/skills/b/agents/openai.yaml: Codex runs the skill only when asked, but Claude Code can still run it on its own; set disable-model-invocation: true in SKILL.md, or delete the policy',
    codexMissing('c'),
  ]);
});

test('checks .claude/skills/ when it is the only skills folder, without a Codex policy', () => {
  const root = repoWith({
    '.claude/skills/retro/SKILL.md': skill('name: retro\ndescription: Run a retro.\ndisable-model-invocation: true'),
    '.claude/skills/plan/SKILL.md': skill('name: planning\ndescription: Plan.'),
  });
  assert.deepEqual(skillProblems(root), [
    '.claude/skills/plan/SKILL.md: name "planning" doesn\'t match its folder "plan"; agents find a skill by its folder, so rename one to match',
  ]);
});

test('checks only .agents/skills/ when both folders exist, since .claude/skills/ is its mirror', () => {
  const root = repoWith({
    '.agents/skills/plan/SKILL.md': skill('name: plan\ndescription: Plan.'),
    '.claude/skills/plan/SKILL.md': skill('name: plan'),
  });
  assert.deepEqual(skillProblems(root), []);
});
