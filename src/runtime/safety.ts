import { readFileSync, existsSync } from 'node:fs';
import { readLastGoodCommit, gitDiffFilesSince, gitRestoreFilesFrom } from '../core/git';

export interface SafetyCheckResult {
  passed: boolean;
  violations: string[];
}

// PRD 3.2: Core identity fields that must NOT be modified by agent
const CORE_IDENTITY_FIELDS = ['name', 'identity', 'background', 'personality'];

const RATE_LIMITS: Record<string, number> = {
  post: 10,
  reply: 20,
  quote: 15,
  retweet: 10,
};

/**
 * 提取 persona.md 中 core identity 字段的值
 * 支持 YAML 格式 (field: value) 和 markdown 格式 (**field**: value)
 */
export function extractCoreIdentity(content: string): Record<string, string> {
  const identity: Record<string, string> = {};

  for (const field of CORE_IDENTITY_FIELDS) {
    // YAML-style: field: "value" or field: value (single line)
    const yamlMatch = content.match(new RegExp(`^${field}:\\s*"?(.+?)"?\\s*$`, 'mi'));
    if (yamlMatch) {
      identity[field] = yamlMatch[1].trim();
      continue;
    }

    // Markdown-style: **field**: value
    const mdMatch = content.match(new RegExp(`\\*\\*${field}\\*\\*[:\\s]+(.+)`, 'i'));
    if (mdMatch) {
      identity[field] = mdMatch[1].trim();
      continue;
    }

    // Multi-line block (background:, personality: followed by list items)
    const blockMatch = content.match(new RegExp(`^${field}:\\s*\\n([\\s\\S]*?)(?=^\\w+:|$)`, 'mi'));
    if (blockMatch) {
      identity[field] = blockMatch[1].trim();
    }
  }

  return identity;
}

/**
 * 快照 persona 的 core identity（PREPARE 阶段调用）
 */
export function snapshotPersona(personaPath: string): Record<string, string> | null {
  if (!existsSync(personaPath)) return null;
  const content = readFileSync(personaPath, 'utf-8');
  return extractCoreIdentity(content);
}

/**
 * 检查 persona 的 core identity 是否被篡改（CLEANUP 阶段调用）
 * 对比 PREPARE 时的快照和当前文件内容
 */
export function checkPersonaIntegrity(
  personaPath: string,
  snapshot?: Record<string, string> | null,
): SafetyCheckResult {
  if (!existsSync(personaPath)) {
    return { passed: true, violations: [] };
  }

  const content = readFileSync(personaPath, 'utf-8');
  const violations: string[] = [];

  // Check field existence
  for (const field of CORE_IDENTITY_FIELDS) {
    const yamlPattern = new RegExp(`^${field}:\\s*`, 'mi');
    const mdPattern = new RegExp(`\\*\\*${field}\\*\\*`, 'i');
    if (!yamlPattern.test(content) && !mdPattern.test(content)) {
      violations.push(`Missing core identity field: ${field}`);
    }
  }

  // If snapshot provided, check values haven't changed
  if (snapshot) {
    const current = extractCoreIdentity(content);
    for (const field of CORE_IDENTITY_FIELDS) {
      if (snapshot[field] && current[field] && snapshot[field] !== current[field]) {
        violations.push(`Core identity field tampered: ${field}`);
      }
    }
  }

  return {
    passed: violations.length === 0,
    violations,
  };
}

export function validateRateLimit(actionType: string, count: number): boolean {
  const limit = RATE_LIMITS[actionType] ?? 10;
  return count <= limit;
}

/**
 * 判断文件是否属于基础设施代码（外循环在下次 wake cycle 执行的代码）
 * agent 修改这些文件后如果导致崩溃，需要自愈回滚
 */
function isInfrastructureFile(file: string): boolean {
  return file.startsWith('src/');
}

/**
 * 自愈机制 (PRD 8.3)
 *
 * 检测 agent 是否修改了基础设施代码（src/ 下的文件），
 * 如果是，将这些文件恢复到 last good commit 的状态。
 *
 * 返回被回滚的文件列表，空数组表示无需回滚。
 */
export function autoHeal(): string[] {
  const lastGood = readLastGoodCommit();
  if (!lastGood) return [];

  const changedFiles = gitDiffFilesSince(lastGood);
  const infraFiles = changedFiles.filter(isInfrastructureFile);

  if (infraFiles.length === 0) return [];

  gitRestoreFilesFrom(infraFiles, lastGood);
  return infraFiles;
}
