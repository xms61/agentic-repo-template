import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, test } from 'node:test';
import { mirrorProblems, syncMirror } from './sync-skills.mjs';

const roots = [];
after(() => roots.forEach((root) => rmSync(root, { recursive: true, force: true })));

function repoWith(files) {
  const root = mkdtempSync(join(tmpdir(), 'sync-skills-'));
  roots.push(root);
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  }
  return root;
}

test('passes when the mirror matches, ignoring line endings', () => {
  const root = repoWith({
    '.agents/skills/plan/SKILL.md': 'a\nb\n',
    '.claude/skills/plan/SKILL.md': 'a\r\nb\r\n',
  });
  assert.deepEqual(mirrorProblems(root), []);
});

test('passes when neither folder exists', () => {
  assert.deepEqual(mirrorProblems(repoWith({ 'AGENTS.md': '# Map\n' })), []);
});

test('reports missing, changed and orphaned mirror files', () => {
  const root = repoWith({
    '.agents/skills/plan/SKILL.md': 'new\n',
    '.agents/skills/garden/SKILL.md': 'x\n',
    '.claude/skills/plan/SKILL.md': 'old\n',
    '.claude/skills/gone/SKILL.md': 'x\n',
  });
  assert.deepEqual(mirrorProblems(root), [
    '.claude/skills/garden/SKILL.md: missing',
    '.claude/skills/plan/SKILL.md: differs from .agents/skills/plan/SKILL.md',
    '.claude/skills/gone/SKILL.md: no source in .agents/skills/',
  ]);
});

test('sync makes the mirror an exact copy', () => {
  const root = repoWith({
    '.agents/skills/plan/SKILL.md': 'new\n',
    '.agents/skills/plan/template.md': 't\n',
    '.claude/skills/gone/SKILL.md': 'x\n',
  });
  syncMirror(root);
  assert.deepEqual(mirrorProblems(root), []);
});
