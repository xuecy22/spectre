import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { buildSystemPrompt, type PromptContext as BasePromptContext } from './prompts/base-prompt';
import type { LastWakeOutput } from './prompts/output-schema';

export interface PromptContext {
  wakeId: string;
  timestamp: Date;
  lastWake?: Record<string, unknown> | null;
  persona?: string;
  strategy?: string;
  learnings?: string;
  promptConfig?: string;
  scheduleConfig?: string;
  metrics?: Record<string, unknown>;
  timeOfDay?: string;
  personaSnapshot?: Record<string, string> | null;
}

export function loadPersona(): string | null {
  const path = join(process.cwd(), 'memory', 'persona.md');
  if (!existsSync(path)) return null;
  return readFileSync(path, 'utf-8');
}

export function loadStrategy(): string | null {
  const path = join(process.cwd(), 'memory', 'strategy.md');
  if (!existsSync(path)) return null;
  return readFileSync(path, 'utf-8');
}

export function loadLearnings(): string | null {
  const path = join(process.cwd(), 'memory', 'learnings.md');
  if (!existsSync(path)) return null;
  return readFileSync(path, 'utf-8');
}

export function loadPromptConfig(): string | null {
  const path = join(process.cwd(), 'memory', 'prompt_config.md');
  if (!existsSync(path)) return null;
  return readFileSync(path, 'utf-8');
}

export function loadScheduleConfig(): string | null {
  const path = join(process.cwd(), 'memory', 'schedule_config.md');
  if (!existsSync(path)) return null;
  return readFileSync(path, 'utf-8');
}

export function loadLastWake(): Record<string, unknown> | null {
  const path = join(process.cwd(), 'memory', 'last-wake.json');
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf-8'));
  } catch {
    return null;
  }
}

/**
 * 组装 system prompt，委托给 base-prompt.ts 的 buildSystemPrompt
 * 参考 PRD 4.2.1 - Prompt 组装
 */
export function assembleSystemPrompt(context: PromptContext): string {
  const timezone = process.env.TIMEZONE || 'Asia/Tokyo';

  // 将 lastWake 数据转换为 base-prompt 期望的类型
  const lastWake = context.lastWake ? parseLastWake(context.lastWake) : undefined;

  const baseContext: BasePromptContext = {
    persona: context.persona || '(No persona defined)',
    currentTime: context.timestamp,
    timeZone: timezone,
    lastWake,
    workingDirectory: process.cwd(),
  };

  let prompt = buildSystemPrompt(baseContext);

  // 追加 strategy 和 learnings（base-prompt 未包含这些，但 PRD PREPARE 阶段要求注入）
  if (context.strategy) {
    prompt += `\n## 当前策略\n\n${context.strategy}\n`;
  }

  if (context.learnings) {
    prompt += `\n## 经验洞察\n\n${context.learnings}\n`;
  }

  if (context.promptConfig) {
    prompt += `\n## Prompt 配置\n\n${context.promptConfig}\n`;
  }

  if (context.scheduleConfig) {
    prompt += `\n## 调度配置\n\n${context.scheduleConfig}\n`;
  }

  return prompt;
}

function parseLastWake(
  data: Record<string, unknown>,
): (LastWakeOutput & { wakeId: string; wakeLogPath?: string }) | undefined {
  if (!data.wakeId) return undefined;

  return {
    wakeId: String(data.wakeId),
    wakeLogPath: data.wakeLogPath ? String(data.wakeLogPath) : undefined,
    timestamp: String(data.timestamp ?? ''),
    timeOfDay: (data.timeOfDay as LastWakeOutput['timeOfDay']) ?? 'morning',
    actions: Array.isArray(data.actions)
      ? data.actions.map((a: Record<string, unknown>) => ({
          type: ((a.type as string) ?? 'skip') as LastWakeOutput['actions'][number]['type'],
          summary: (a.summary as string) ?? '',
          tweetId: a.tweetId as string | undefined,
          to: a.to as string | undefined,
        }))
      : [],
    observations: String(data.observations ?? ''),
    memoryUpdates: Array.isArray(data.memoryUpdates)
      ? data.memoryUpdates.map(String)
      : [],
    pendingItems: String(data.pendingItems ?? ''),
    metrics: {
      newFollowers: Number((data.metrics as Record<string, unknown>)?.newFollowers ?? 0),
      totalFollowers: Number((data.metrics as Record<string, unknown>)?.totalFollowers ?? 0),
    },
  };
}
