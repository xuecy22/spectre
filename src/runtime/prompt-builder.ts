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

export function assembleSystemPrompt(_context: PromptContext): string {
  throw new Error('Not implemented');
}
