#!/usr/bin/env node
// Checks the skills' frontmatter, which agents read to find a skill and decide when to load it. An agent skips a
// skill with a broken name or description without saying so, so nothing else notices. The name and description
// rules are the Agent Skills specification's (https://agentskills.io/specification).
// Exits non-zero on errors; CI and the pre-commit hook run it.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// .agents/skills/ is the source and .claude/skills/ its mirror; a repo where Claude Code is the only agent keeps
// the skills in .claude/skills/ instead.
const SKILL_ROOTS = ['.agents/skills', '.claude/skills'];
const NAME = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const NAME_MAX = 64;
const DESCRIPTION_MAX = 1024;
// Codex reads skills only from .agents/skills/, and reads this file instead of disable-model-invocation.
const CODEX_ROOT = '.agents/skills';
const CODEX_POLICY = 'agents/openai.yaml';
const CODEX_USER_ONLY = /^\s*allow_implicit_invocation:\s*false\s*(#.*)?$/m;

// A one-line YAML value: quotes removed, a trailing comment dropped, and null or ~ read as empty.
function scalar(value) {
  const double = value.match(/^"((?:[^"\\]|\\.)*)"\s*(#.*)?$/);
  if (double) return double[1];
  const single = value.match(/^'((?:[^']|'')*)'\s*(#.*)?$/);
  if (single) return single[1].replace(/''/g, "'");
  const plain = value.replace(/(^|\s)#.*$/, '').trim();
  return /^(null|Null|NULL|~)$/.test(plain) ? '' : plain;
}

// The top-level fields of the frontmatter, with quotes, comments and block scalars (`>` and `|`) resolved; null
// when the file doesn't start with a closed `---` block.
function parseFrontmatter(text) {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/);
  const end = lines.findIndex((line, index) => index > 0 && line.trimEnd() === '---');
  if (lines[0].trimEnd() !== '---' || end === -1) return null;
  const fields = {};
  let key = null;
  let joiner = ' ';
  for (const line of lines.slice(1, end)) {
    const field = line.match(/^([A-Za-z][\w-]*):(.*)$/);
    if (field) {
      key = field[1];
      const value = scalar(field[2].trim());
      const block = value.match(/^([>|])[+-]?$/)?.[1];
      joiner = block === '|' ? '\n' : ' ';
      fields[key] = block ? '' : value;
    } else if (key && /^\s+\S/.test(line)) {
      fields[key] = fields[key] ? `${fields[key]}${joiner}${line.trim()}` : line.trim();
    }
  }
  return fields;
}

function frontmatterProblems(fields, folder) {
  const problems = [];
  const name = fields.name ?? '';
  if (!name) problems.push(`no name; set it to the folder name, "${folder}"`);
  else if (!NAME.test(name) || name.length > NAME_MAX)
    problems.push(
      `name "${name}" must be lowercase letters, digits and single hyphens, at most ${NAME_MAX} characters, and start and end with a letter or digit`,
    );
  else if (name !== folder)
    problems.push(`name "${name}" doesn't match its folder "${folder}"; agents find a skill by its folder, so rename one to match`);
  const description = fields.description ?? '';
  if (!description)
    problems.push('no description; agents decide when to load a skill from it, so say what it does and when to use it');
  else if (description.length > DESCRIPTION_MAX)
    problems.push(
      `description is ${description.length} characters, the limit is ${DESCRIPTION_MAX}; move the detail into the body`,
    );
  const invocation = fields['disable-model-invocation'];
  if (invocation !== undefined && !/^(true|false)$/i.test(invocation))
    problems.push(`disable-model-invocation must be true or false, not "${invocation}"`);
  return problems;
}

// A skill that only a person may start has to say so to Claude Code and to Codex, or one of them runs it unasked.
function codexPolicyProblem(root, dir, fields) {
  const userOnly = /^true$/i.test(fields['disable-model-invocation'] ?? '');
  const policyPath = join(root, dir, CODEX_POLICY);
  const codexUserOnly = existsSync(policyPath) && CODEX_USER_ONLY.test(readFileSync(policyPath, 'utf8'));
  if (userOnly && !codexUserOnly)
    return `${dir}/SKILL.md: disable-model-invocation is true, but Codex can still run the skill on its own; add ${dir}/${CODEX_POLICY} with policy.allow_implicit_invocation: false`;
  if (codexUserOnly && !userOnly)
    return `${dir}/${CODEX_POLICY}: Codex runs the skill only when asked, but Claude Code can still run it on its own; set disable-model-invocation: true in SKILL.md, or delete the policy`;
  return null;
}

export function skillProblems(root) {
  const skillsRoot = SKILL_ROOTS.find((dir) => existsSync(join(root, dir)));
  if (!skillsRoot) return [];
  const problems = [];
  const folders = readdirSync(join(root, skillsRoot), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((a, b) => (a < b ? -1 : 1));
  for (const folder of folders) {
    const dir = `${skillsRoot}/${folder}`;
    // Listed rather than tested with existsSync, which ignores case on Windows and macOS but not on Linux.
    if (!readdirSync(join(root, dir)).includes('SKILL.md')) {
      problems.push(`${dir}: no SKILL.md (the name is case-sensitive); add one, or delete the folder`);
      continue;
    }
    const fields = parseFrontmatter(readFileSync(join(root, dir, 'SKILL.md'), 'utf8'));
    if (!fields) {
      problems.push(
        `${dir}/SKILL.md: no frontmatter; start the file with a --- line, name and description, and a closing --- line`,
      );
      continue;
    }
    problems.push(...frontmatterProblems(fields, folder).map((problem) => `${dir}/SKILL.md: ${problem}`));
    if (skillsRoot === CODEX_ROOT) {
      const problem = codexPolicyProblem(root, dir, fields);
      if (problem) problems.push(problem);
    }
  }
  return problems;
}

function main() {
  const problems = skillProblems(join(dirname(fileURLToPath(import.meta.url)), '..'));
  for (const problem of problems) console.error(`error: ${problem}`);
  if (problems.length) process.exit(1);
  console.log('Skills OK.');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) main();
