import { runSession, type SessionResult } from '../core/session-runner';
import { gitAddAll, gitCommit, gitDiffStat, markAsGoodCommit } from '../core/git';
import {
  type PromptContext,
  loadPersona,
  loadStrategy,
  loadLearnings,
  loadLastWake,
  loadPromptConfig,
  loadScheduleConfig,
  assembleSystemPrompt,
} from './prompt-builder';
import { writeLastWake, findWakeLogByTimestamp, archiveSession } from './memory';
import { checkPersonaIntegrity, snapshotPersona, autoHeal } from './safety';
import { saveWakeRecord } from './db';
import { lastWakeSchema, type LastWakeOutput } from './prompts/output-schema';
import { join } from 'node:path';
import { appendFileSync, readdirSync, existsSync } from 'node:fs';
import type { HookCallbackMatcher } from '@anthropic-ai/claude-agent-sdk';

const MAX_RETRIES = 2;

export interface WakeCyclePhases {
  PREPARE: () => Promise<PromptContext>;
  LAUNCH: (prompt: string) => Promise<SessionResult>;
  CLEANUP: (result: SessionResult) => Promise<void>;
}

function generateWakeId(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}${pad(now.getMinutes())}`;
  return `wake-${date}-${time}`;
}

function getTimeOfDay(hour: number): string {
  if (hour < 9) return 'morning';
  if (hour < 12) return 'noon';
  if (hour < 14) return 'afternoon';
  if (hour < 18) return 'afternoon';
  if (hour < 22) return 'evening';
  return 'night';
}

// --- PREPARE ---

async function prepare(): Promise<PromptContext> {
  const wakeId = generateWakeId();
  const timestamp = new Date();

  const persona = loadPersona();
  const strategy = loadStrategy();
  const learnings = loadLearnings();
  const lastWake = loadLastWake();
  const promptConfig = loadPromptConfig();
  const scheduleConfig = loadScheduleConfig();

  // PRD 3.2: Snapshot persona core identity for integrity check in CLEANUP
  const personaPath = join(process.cwd(), 'memory', 'persona.md');
  const personaSnapshot = snapshotPersona(personaPath);

  return {
    wakeId,
    timestamp,
    persona: persona ?? undefined,
    strategy: strategy ?? undefined,
    learnings: learnings ?? undefined,
    promptConfig: promptConfig ?? undefined,
    scheduleConfig: scheduleConfig ?? undefined,
    lastWake,
    timeOfDay: getTimeOfDay(timestamp.getHours()),
    personaSnapshot,
  };
}

// --- Stop Hook: ensure wake-log is written before session ends ---

function ensureWakeLogHook(wakeId: string): HookCallbackMatcher {
  // 从 wakeId "wake-2026-04-20-2130" 提取时间前缀 "2026-04-20_2130"
  const match = wakeId.match(/wake-(\d{4}-\d{2}-\d{2})-(\d{4})/);
  const prefix = match ? `${match[1]}_${match[2]}` : '';

  return {
    hooks: [
      async () => {
        const wakeLogsDir = join(process.cwd(), 'memory', 'wake-logs');
        if (!existsSync(wakeLogsDir)) {
          return {
            decision: 'block' as const,
            systemMessage: '你还没有写 wake-log。请现在写入 memory/wake-logs/ 再结束。',
          };
        }
        const files = readdirSync(wakeLogsDir);
        const hasWakeLog = files.some(f => f.startsWith(prefix) && f.endsWith('.md'));

        if (!hasWakeLog) {
          return {
            decision: 'block' as const,
            systemMessage: '你还没有写 wake-log。请现在写入 memory/wake-logs/ 再结束。',
          };
        }
        return { decision: 'approve' as const };
      },
    ],
  };
}

// --- LAUNCH ---

async function launch(context: PromptContext): Promise<SessionResult> {
  const systemPrompt = assembleSystemPrompt(context);

  const result = await runSession({
    prompt: `Execute wake cycle ${context.wakeId}. Follow the wake cycle instructions in the system prompt.`,
    systemPrompt,
    maxTurns: 15,
    permissionMode: 'bypassPermissions',
    allowedTools: ['Read', 'Edit', 'Write', 'Bash', 'WebSearch', 'WebFetch', 'Glob', 'Grep'],
    outputFormat: {
      type: 'json_schema',
      schema: lastWakeSchema as unknown as Record<string, unknown>,
    },
    hooks: {
      Stop: [ensureWakeLogHook(context.wakeId)],
    },
  });

  return result;
}

// --- CLEANUP ---

async function cleanup(context: PromptContext, result: SessionResult): Promise<void> {
  const { wakeId } = context;
  const messages = result.messages ?? [];

  // Archive session
  const wakeLogPath = findWakeLogByTimestamp(wakeId);
  archiveSession(wakeId, messages, {
    timestamp: context.timestamp.toISOString(),
    wakeLogPath,
    duration: result.turns,
    cost: result.cost,
    turns: result.turns,
  });

  // Write last-wake.json from SDK structured output (PRD 4.2.3)
  const structuredOutput = result.structuredOutput as Partial<LastWakeOutput> | undefined;
  const lastWakeData: Record<string, unknown> = {
    wakeId,
    wakeLogPath: wakeLogPath ? wakeLogPath.replace(`${process.cwd()}/`, '') : undefined,
    timestamp: structuredOutput?.timestamp ?? context.timestamp.toISOString(),
    timeOfDay: structuredOutput?.timeOfDay ?? context.timeOfDay,
    actions: structuredOutput?.actions ?? [],
    observations: structuredOutput?.observations ?? result.output ?? '',
    memoryUpdates: structuredOutput?.memoryUpdates ?? [],
    pendingItems: structuredOutput?.pendingItems ?? '',
    metrics: structuredOutput?.metrics ?? { newFollowers: 0, totalFollowers: 0 },
  };
  writeLastWake(lastWakeData);

  // Append session marker to wake-log if it exists
  if (wakeLogPath) {
    appendFileSync(wakeLogPath, `\n<!-- session: ${wakeId} -->\n`);
  }

  // Check persona integrity
  const personaPath = join(process.cwd(), 'memory', 'persona.md');
  const integrityCheck = checkPersonaIntegrity(personaPath, context.personaSnapshot);
  if (!integrityCheck.passed) {
    console.warn(`Persona integrity violations: ${integrityCheck.violations.join(', ')}`);
  }

  // Git commit all changes
  if (process.env.MOCK_MODE !== 'true') {
    try {
      const diff = gitDiffStat();
      if (diff) {
        gitAddAll();

        // Build commit message with actual action summary
        const actionLines = (structuredOutput?.actions ?? [])
          .map((a) => `- ${a.type}: ${a.summary}`)
          .join('\n');
        const summary = actionLines || 'no actions taken';
        gitCommit(`wake: ${wakeId}\n\n${summary}\n\nwakeId: ${wakeId}`);

        markAsGoodCommit();
      }
    } catch {
      // Git operations are best-effort; don't fail the wake cycle
    }
  }

  // Save wake record to DB
  if (process.env.MOCK_MODE !== 'true') {
    try {
      const actionSummaries = (structuredOutput?.actions ?? []).map(
        (a) => `${a.type}: ${a.summary}`
      );
      saveWakeRecord({
        wakeId,
        timestamp: context.timestamp.toISOString(),
        duration: result.turns,
        cost: result.cost,
        turns: result.turns,
        actions: actionSummaries,
      });
    } catch {
      // DB write is best-effort
    }
  }
}

// --- Main entry point ---

export async function runWakeCycle(): Promise<void> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const context = await prepare();
      const result = await launch(context);

      if (!result.success) {
        throw new Error(result.error ?? 'Session failed');
      }

      await cleanup(context, result);
      return;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      if (attempt < MAX_RETRIES) {
        // Self-healing (PRD 8.3): check if agent broke infrastructure code
        if (process.env.MOCK_MODE !== 'true') {
          const revertedFiles = autoHeal();
          if (revertedFiles.length > 0) {
            console.warn(
              `Auto-heal: reverted infrastructure files: ${revertedFiles.join(', ')}`,
            );
          }
        }

        console.warn(`Wake cycle attempt ${attempt + 1} failed, retrying: ${lastError.message}`);
        continue;
      }
    }
  }

  throw lastError ?? new Error('Wake cycle failed after retries');
}
