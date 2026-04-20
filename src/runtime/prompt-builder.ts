import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export interface PromptContext {
  wakeId: string;
  timestamp: Date;
  lastWake?: Record<string, unknown> | null;
  persona?: string;
  strategy?: string;
  learnings?: string;
  metrics?: Record<string, unknown>;
  timeOfDay?: string;
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

export function loadLastWake(): Record<string, unknown> | null {
  const path = join(process.cwd(), 'memory', 'last-wake.json');
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf-8'));
  } catch {
    return null;
  }
}

export function assembleSystemPrompt(context: PromptContext): string {
  const { wakeId, timestamp, lastWake, persona, strategy, learnings } = context;

  const sections: string[] = [];

  // Header
  sections.push(`# Spectre Wake Cycle: ${wakeId}`);
  sections.push(`Timestamp: ${timestamp.toISOString()}`);
  sections.push('');

  // Persona
  if (persona) {
    sections.push('## Persona');
    sections.push(persona);
    sections.push('');
  }

  // Strategy
  if (strategy) {
    sections.push('## Strategy');
    sections.push(strategy);
    sections.push('');
  }

  // Learnings
  if (learnings) {
    sections.push('## Learnings');
    sections.push(learnings);
    sections.push('');
  }

  // Last Wake Context
  if (lastWake) {
    sections.push('## Previous Wake Context');
    sections.push(`Wake ID: ${lastWake.wakeId || 'unknown'}`);
    if (lastWake.actions && Array.isArray(lastWake.actions)) {
      sections.push('');
      sections.push('Actions taken:');
      for (const action of lastWake.actions) {
        const actionObj = action as Record<string, unknown>;
        sections.push(`- ${actionObj.type}: ${actionObj.summary || ''}`);
      }
    }
    sections.push('');
  }

  // Wake Cycle Instructions
  sections.push('## Wake Cycle Instructions');
  sections.push('');
  sections.push('Execute the following phases in order:');
  sections.push('');
  sections.push('### SENSE');
  sections.push('Gather information about the current state:');
  sections.push('- Check X mentions and timeline');
  sections.push('- Review recent engagement metrics');
  sections.push('- Assess current context and time of day');
  sections.push('');
  sections.push('### THINK');
  sections.push('Decide on actions based on gathered information:');
  sections.push('- What content should be posted?');
  sections.push('- Which mentions should be replied to?');
  sections.push('- What interactions are worth pursuing?');
  sections.push('');
  sections.push('### ACT');
  sections.push('Execute decided actions:');
  sections.push('- Post content');
  sections.push('- Reply to mentions');
  sections.push('- Quote retweet or retweet');
  sections.push('');
  sections.push('### REFLECT');
  sections.push('Review and update memory:');
  sections.push('- Analyze engagement data');
  sections.push('- Update strategy and learnings');
  sections.push('- Write wake-log');
  sections.push('');

  return sections.join('\n');
}
