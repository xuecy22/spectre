import { execSync } from 'node:child_process';

const ROOT = process.cwd();

export interface ValidationResult {
  success: boolean;
  output: string;
  error?: string;
}

export function validateTypeScript(): ValidationResult {
  try {
    const output = execSync('npx tsc --noEmit', {
      cwd: ROOT,
      encoding: 'utf-8',
      stdio: 'pipe',
    });
    return { success: true, output };
  } catch (err: any) {
    return {
      success: false,
      output: err.stdout || '',
      error: err.stderr || err.message,
    };
  }
}

export function runTests(testFile?: string): ValidationResult {
  try {
    const cmd = testFile
      ? `npx vitest run ${testFile}`
      : 'npx vitest run';
    const output = execSync(cmd, {
      cwd: ROOT,
      encoding: 'utf-8',
      stdio: 'pipe',
    });
    return { success: true, output };
  } catch (err: any) {
    return {
      success: false,
      output: err.stdout || '',
      error: err.stderr || err.message,
    };
  }
}
