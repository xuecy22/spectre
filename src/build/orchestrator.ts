import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { runSession } from '../core/session-runner.js';
import { gitAddAll, gitCommit, gitCurrentHash } from '../core/git.js';
import { validateTypeScript, runTests } from './validator.js';
import { TASK_LIST, getNextTask, type Task } from './task-list.js';

const ROOT = process.cwd();
const STATE_FILE = join(ROOT, 'data', '.build-state.json');

interface BuildState {
  completedTasks: string[];
  currentTask?: string;
  lastError?: string;
}

interface PromptContext {
  taskId: string;
  planFile: string;
  testFile: string;
  prdContext: string;
  existingCode: string;
  errorContext?: string;
}

export async function runBuild(): Promise<void> {
  console.log('🚀 Starting Spectre build process...\n');

  const state = loadState();
  const completedIds = new Set(state.completedTasks);

  for (const task of TASK_LIST) {
    if (completedIds.has(task.id)) {
      console.log(`✓ Task ${task.id} already completed`);
      continue;
    }

    console.log(`\n📋 Starting task ${task.id}: ${task.description}`);

    // Check dependencies
    for (const dep of task.dependencies) {
      if (!completedIds.has(dep)) {
        throw new Error(`Dependency ${dep} not completed for task ${task.id}`);
      }
    }

    // Execute task with retries
    await executeTask(task, state);

    // Mark as completed
    completedIds.add(task.id);
    state.completedTasks.push(task.id);
    state.currentTask = undefined;
    saveState(state);

    console.log(`✓ Task ${task.id} completed successfully\n`);
  }

  console.log('\n🎉 Build complete! All tasks finished successfully.');
}

async function executeTask(task: Task, state: BuildState, maxRetries = 3): Promise<void> {
  let errorContext: string | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`  Attempt ${attempt}/${maxRetries}...`);

    try {
      // Assemble prompt
      const prompt = assemblePrompt(task, errorContext);

      // Update state
      state.currentTask = task.id;
      state.lastError = errorContext;
      saveState(state);

      // Run CC session
      console.log('  Running Claude Code session...');
      const result = await runSession({
        prompt,
        workingDirectory: ROOT,
        maxTurns: 30,
      });

      if (!result.success) {
        throw new Error(`Session failed: ${result.error}`);
      }

      // Validate TypeScript
      console.log('  Validating TypeScript...');
      const tsResult = validateTypeScript();
      if (!tsResult.success) {
        throw new Error(`TypeScript validation failed:\n${tsResult.error}`);
      }

      // Run tests
      console.log('  Running tests...');
      const testResult = runTests(task.testFile);
      if (!testResult.success) {
        throw new Error(`Tests failed:\n${testResult.error}`);
      }

      // Commit changes
      console.log('  Committing changes...');
      gitAddAll();
      gitCommit(`build: complete ${task.id} - ${task.description}`);

      return; // Success!

    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`  ❌ Attempt ${attempt} failed: ${message}`);
      errorContext = message;

      if (attempt === maxRetries) {
        console.error(`\n❌ Task ${task.id} failed after ${maxRetries} attempts.`);
        console.error('Please review the error and fix manually.\n');
        throw err;
      }
    }
  }
}

function assemblePrompt(task: Task, errorContext?: string): string {
  const planContent = readFileIfExists(task.planFile);
  const testContent = readFileIfExists(task.testFile);
  const prdContext = extractPRDContext(task.prdSections || []);
  const claudeMd = readFileIfExists('.claude/CLAUDE.md');

  let prompt = `你的任务是实现 Spectre 项目的 ${task.description}。

## 项目背景
${prdContext}

## 项目指南
${claudeMd}

## 任务计划
${planContent}

## 验收标准（测试文件）
${testContent}

## 要求
1. 实现代码使测试通过
2. 遵循 .claude/CLAUDE.md 中的代码风格
3. 接口签名必须与计划文件一致
4. 不要修改测试文件
5. 实现应该简洁，避免过度工程

完成后，确保：
- \`tsc --noEmit\` 无错误
- \`vitest run ${task.testFile}\` 全部通过`;

  if (errorContext) {
    prompt += `\n\n## 上次执行的错误
上次尝试失败，错误信息如下：
\`\`\`
${errorContext}
\`\`\`

请修复这些错误后重试。`;
  }

  return prompt;
}

function extractPRDContext(sections: string[]): string {
  if (sections.length === 0) return '参考完整 PRD.md 文档。';

  const prdPath = join(ROOT, 'PRD.md');
  if (!existsSync(prdPath)) return '（PRD 文件不存在）';

  const prdContent = readFileSync(prdPath, 'utf-8');
  return `参考 PRD.md 的以下章节：${sections.join(', ')}

完整 PRD 内容：
${prdContent}`;
}

function readFileIfExists(path: string): string {
  const fullPath = join(ROOT, path);
  if (!existsSync(fullPath)) return `（文件 ${path} 不存在）`;
  return readFileSync(fullPath, 'utf-8');
}

function loadState(): BuildState {
  if (!existsSync(STATE_FILE)) {
    return { completedTasks: [] };
  }
  const content = readFileSync(STATE_FILE, 'utf-8');
  return JSON.parse(content);
}

function saveState(state: BuildState): void {
  const dir = join(ROOT, 'data');
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}
