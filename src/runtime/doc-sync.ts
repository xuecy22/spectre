/**
 * Doc-Sync（文档同步校验）
 *
 * 检测 agent 在 session 中修改了 src/ 代码后是否同步更新了对应的 docs/。
 * 用于 Stop Hook（阻断）和 CLEANUP（兜底告警）两层约束。
 *
 * 映射规则:
 *   src/core/{name}.ts        → docs/core/{name}.md
 *   src/runtime/{name}.ts     → docs/runtime/{name}.md
 *   src/runtime/prompts/{n}.ts → docs/runtime/prompts/{n}.md
 *   src/runtime/scripts/*.sh  → docs/scripts/tools.md
 */

import { execSync } from 'node:child_process';

/**
 * 根据 src 路径推导对应的 docs 路径
 */
export function srcToDocPath(srcPath: string): string | null {
  // scripts → 统一映射到 docs/scripts/tools.md
  if (srcPath.startsWith('src/runtime/scripts/')) {
    return 'docs/scripts/tools.md';
  }

  // .ts 文件 → 替换 src/ 为 docs/，.ts 替换为 .md
  if (srcPath.startsWith('src/') && srcPath.endsWith('.ts')) {
    return srcPath.replace(/^src\//, 'docs/').replace(/\.ts$/, '.md');
  }

  return null;
}

/**
 * 获取当前工作区所有已修改和新增的文件
 * 包含 unstaged changes + untracked files
 */
export function getChangedFiles(): string[] {
  try {
    const cwd = process.cwd();

    // 已修改的文件（unstaged + staged）
    const modified = execSync('git diff --name-only HEAD', { cwd, encoding: 'utf-8' }).trim();
    // 新文件（untracked）
    const untracked = execSync('git ls-files --others --exclude-standard', { cwd, encoding: 'utf-8' }).trim();

    const files = new Set<string>();
    if (modified) modified.split('\n').forEach(f => files.add(f));
    if (untracked) untracked.split('\n').forEach(f => files.add(f));

    return [...files];
  } catch {
    return [];
  }
}

export interface DocSyncResult {
  passed: boolean;
  missingDocs: Array<{
    srcFile: string;
    expectedDoc: string;
  }>;
}

/**
 * 检查所有修改的 src/ 文件是否有对应的 docs/ 文件也被修改
 *
 * @param changedFiles - 所有已变更的文件列表（传入以便测试）
 */
export function checkDocSync(changedFiles?: string[]): DocSyncResult {
  const files = changedFiles ?? getChangedFiles();

  const changedSet = new Set(files);
  const srcFiles = files.filter(f => f.startsWith('src/'));
  const missingDocs: DocSyncResult['missingDocs'] = [];

  // 对每个变更的 src 文件，检查对应的 doc 是否也被变更
  for (const srcFile of srcFiles) {
    const docPath = srcToDocPath(srcFile);
    if (!docPath) continue;

    // scripts 去重：多个 .sh 文件都映射到同一个 docs/scripts/tools.md
    if (missingDocs.some(m => m.expectedDoc === docPath)) continue;

    if (!changedSet.has(docPath)) {
      missingDocs.push({ srcFile, expectedDoc: docPath });
    }
  }

  return {
    passed: missingDocs.length === 0,
    missingDocs,
  };
}

/**
 * 生成给 agent 的提示信息，告知哪些 docs 需要更新
 */
export function formatDocSyncMessage(result: DocSyncResult): string {
  if (result.passed) return '';

  const lines = result.missingDocs.map(
    m => `  - ${m.srcFile} → 请更新 ${m.expectedDoc}`
  );

  return `你修改了以下源代码文件，但没有同步更新对应的文档：\n${lines.join('\n')}\n\n请先更新对应的 docs/ 文件再结束 session。代码和文档必须保持一致。`;
}
