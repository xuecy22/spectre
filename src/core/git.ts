import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const GOOD_COMMIT_FILE = join(ROOT, 'data', '.last-good-commit');

function git(args: string): string {
  return execSync(`git ${args}`, { cwd: ROOT, encoding: 'utf-8' }).trim();
}

export function gitAddAll(): void {
  git('add -A');
}

export function gitCommit(message: string): void {
  try {
    git(`commit -m "${message.replace(/"/g, '\\"')}"`);
  } catch (err: any) {
    // "nothing to commit" is not an error — CC session may have already committed
    if (err.stdout?.includes('nothing to commit') || err.stderr?.includes('nothing to commit')) {
      return;
    }
    throw err;
  }
}

export function gitDiffStat(): string {
  return git('diff --stat');
}

export function gitDiffFiles(): string[] {
  const output = git('diff --name-only');
  return output ? output.split('\n') : [];
}

export function gitStagedFiles(): string[] {
  const output = git('diff --cached --name-only');
  return output ? output.split('\n') : [];
}

export function readLastGoodCommit(): string | null {
  if (!existsSync(GOOD_COMMIT_FILE)) return null;
  return readFileSync(GOOD_COMMIT_FILE, 'utf-8').trim() || null;
}

export function markAsGoodCommit(): void {
  const hash = git('rev-parse HEAD');
  const dir = join(ROOT, 'data');
  if (!existsSync(dir)) {
    execSync(`mkdir -p ${dir}`);
  }
  writeFileSync(GOOD_COMMIT_FILE, hash);
}

/**
 * 获取从 baseCommit 到 HEAD 之间变更的文件列表
 * 用于自愈机制检测 agent 修改了哪些基础设施文件
 */
export function gitDiffFilesSince(baseCommit: string): string[] {
  try {
    const output = git(`diff --name-only ${baseCommit} HEAD`);
    return output ? output.split('\n') : [];
  } catch {
    return [];
  }
}

/**
 * 将指定文件恢复到 baseCommit 时的状态（适用于已 commit 的变更）
 * 通过 checkout 指定 commit 的文件版本，然后 commit 回滚
 */
export function gitRestoreFilesFrom(files: string[], baseCommit: string): void {
  if (files.length === 0) return;
  git(`checkout ${baseCommit} -- ${files.join(' ')}`);
  gitAddAll();
  gitCommit(`auto-heal: revert infrastructure files to ${baseCommit.slice(0, 7)}`);
}

/**
 * 回滚未提交的文件变更（工作区 + 暂存区）
 */
export function gitRevertFiles(files: string[]): void {
  if (files.length === 0) return;
  git(`checkout -- ${files.join(' ')}`);
}

export function gitCurrentHash(): string {
  return git('rev-parse HEAD');
}

export function gitLog(count: number = 5): string {
  return git(`log --oneline -${count}`);
}
