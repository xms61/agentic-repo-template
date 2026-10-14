#!/usr/bin/env node
// Mirrors the shared skills in .agents/skills/ (read by Codex, Gemini CLI, Cursor and Copilot) into
// .claude/skills/ (the only skills folder Claude Code reads). Edit .agents/skills/, then run this.
// --check changes nothing and exits non-zero when the mirror differs; CI and the pre-commit hook run it.
import { cpSync, existsSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SOURCE = '.agents/skills';
const MIRROR = '.claude/skills';

function listFiles(root, dir = '') {
  if (!existsSync(join(root, dir))) return [];
  const files = [];
  for (const entry of readdirSync(join(root, dir), { withFileTypes: true })) {
    const path = dir ? `${dir}/${entry.name}` : entry.name;
    if (entry.isDirectory()) files.push(...listFiles(root, path));
    if (entry.isFile()) files.push(path);
  }
  return files.sort();
}

// Line endings are ignored, so a checkout that converts them doesn't count as a difference.
function sameText(pathA, pathB) {
  const normalized = (path) => readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
  return normalized(pathA) === normalized(pathB);
}

export function mirrorProblems(root) {
  const source = listFiles(join(root, SOURCE));
  const mirror = listFiles(join(root, MIRROR));
  const problems = [];
  for (const path of source) {
    if (!mirror.includes(path)) problems.push(`${MIRROR}/${path}: missing`);
    else if (!sameText(join(root, SOURCE, path), join(root, MIRROR, path)))
      problems.push(`${MIRROR}/${path}: differs from ${SOURCE}/${path}`);
  }
  for (const path of mirror) {
    if (!source.includes(path)) problems.push(`${MIRROR}/${path}: no source in ${SOURCE}/`);
  }
  return problems;
}

export function syncMirror(root) {
  rmSync(join(root, MIRROR), { recursive: true, force: true });
  if (existsSync(join(root, SOURCE))) cpSync(join(root, SOURCE), join(root, MIRROR), { recursive: true });
}

function main() {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  if (process.argv.includes('--check')) {
    const problems = mirrorProblems(root);
    for (const problem of problems) console.error(`error: ${problem}`);
    if (problems.length) {
      console.error(`Edit skills in ${SOURCE}/ only, then run: npm run sync:skills`);
      process.exit(1);
    }
    console.log('Skills mirror OK.');
    return;
  }
  syncMirror(root);
  console.log(`Copied ${SOURCE}/ to ${MIRROR}/.`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) main();
