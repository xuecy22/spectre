import { runSession, type SessionResult } from '../core/session-runner';
import { gitAddAll, gitCommit, gitDiffStat, markAsGoodCommit } from '../core/git';
import {
  type PromptContext,
  loadPersona,
  loadStrategy,
  loadLastWake,
  assembleSystemPrompt,
} from './prompt-builder';
import { writeLastWake, findWakeLogByTimestamp, archiveSession } from './memory';
import { checkPersonaIntegrity } from './safety';
import { saveWakeRecord } from './db';
import { join } from 'node:path';
import { appendFileSync } from 'node:fs';

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
  const lastWake = loadLastWake();

  return {
    wakeId,
    timestamp,
    persona: persona ?? undefined,
    strategy: strategy ?? undefined,
    lastWake,
    timeOfDay: getTimeOfDay(timestamp.getHours()),
  };
}

// --- LAUNCH ---

async function launch(context: PromptContext): Promise<SessionResult> {
  const systemPrompt = assembleSystemPrompt(context);

  const result = await runSession({
    prompt: `Execute wake cycle ${context.wakeId}. Follow the wake cycle instructions in the system prompt.`,
    systemPrompt,
    maxTurns: 15,
    allowedTools: ['Read', 'Edit', 'Write', 'Bash', 'WebSearch', 'WebFetch', 'Glob', 'Grep'],
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

  // Write last-wake.json from session output
  const lastWakeData: Record<string, unknown> = {
    wakeId,
    timestamp: context.timestamp.toISOString(),
    timeOfDay: context.timeOfDay,
    actions: [],
    observations: result.output || '',
    memoryUpdates: [],
    pendingItems: '',
    metrics: { newFollowers: 0, totalFollowers: 0 },
  };
  writeLastWake(lastWakeData);

  // Append session marker to wake-log if it exists
  if (wakeLogPath) {
    appendFileSync(wakeLogPath, `\n<!-- session: ${wakeId} -->\n`);
  }

  // Check persona integrity
  const personaPath = join(process.cwd(), 'memory', 'persona.md');
  const integrityCheck = checkPersonaIntegrity(personaPath);
  if (!integrityCheck.passed) {
    console.warn(`Persona integrity violations: ${integrityCheck.violations.join(', ')}`);
  }

  // Git commit all changes
  try {
    const diff = gitDiffStat();
    if (diff) {
      gitAddAll();
      gitCommit(`wake: ${wakeId}\n\nwakeId: ${wakeId}`);
      markAsGoodCommit();
    }
  } catch {
    // Git operations are best-effort; don't fail the wake cycle
  }

  // Save wake record to DB
  try {
    saveWakeRecord({
      wakeId,
      timestamp: context.timestamp.toISOString(),
      duration: result.turns,
      cost: result.cost,
      turns: result.turns,
      actions: [],
    });
  } catch {
    // DB write is best-effort
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
        console.warn(`Wake cycle attempt ${attempt + 1} failed, retrying: ${lastError.message}`);
        continue;
      }
    }
  }

  throw lastError ?? new Error('Wake cycle failed after retries');
}
