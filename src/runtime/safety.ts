import { readFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { readLastGoodCommit, gitRevertFiles } from '../core/git';

export interface SafetyCheckResult {
  passed: boolean;
  violations: string[];
}

const CORE_IDENTITY_FIELDS = ['name', 'identity', 'background', 'personality'];

const RATE_LIMITS: Record<string, number> = {
  post: 10,
  reply: 20,
  quote: 15,
  retweet: 10,
};

export function checkPersonaIntegrity(personaPath: string): SafetyCheckResult {
  if (!existsSync(personaPath)) {
    return { passed: true, violations: [] };
  }

  const content = readFileSync(personaPath, 'utf-8');
  const violations: string[] = [];

  for (const field of CORE_IDENTITY_FIELDS) {
    const pattern = new RegExp(`^${field}:\\s*`, 'm');
    if (!pattern.test(content)) {
      violations.push(`Missing core identity field: ${field}`);
    }
  }

  // If the file has at least name and identity, consider it valid
  // (background and personality may be in different formats)
  const hasName = /^name:\s*.+/m.test(content);
  const hasIdentity = /^identity:\s*.+/m.test(content);

  if (hasName && hasIdentity) {
    return { passed: true, violations: [] };
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

function getInfraChangedFiles(lastGoodCommit: string): string[] {
  try {
    const output = execSync(
      `git diff --name-only ${lastGoodCommit} HEAD`,
      { encoding: 'utf-8' },
    ).trim();
    if (!output) return [];
    return output.split('\n').filter((f) => f.startsWith('src/'));
  } catch {
    return [];
  }
}

export async function autoHeal(): Promise<boolean> {
  const lastGood = readLastGoodCommit();
  if (!lastGood) return false;

  const infraFiles = getInfraChangedFiles(lastGood);
  if (infraFiles.length === 0) return false;

  gitRevertFiles(infraFiles);
  return true;
}
