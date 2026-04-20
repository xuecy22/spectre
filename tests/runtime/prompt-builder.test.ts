import { describe, it, expect } from 'vitest';
import { assembleSystemPrompt, type PromptContext } from '../../src/runtime/prompt-builder';

describe('Prompt Builder', () => {
  it('should assemble system prompt with persona', () => {
    const context: PromptContext = {
      wakeId: 'wake-2026-04-20-1200',
      timestamp: new Date('2026-04-20T12:00:00Z'),
    };

    const prompt = assembleSystemPrompt(context);

    expect(prompt).toContain('wake-2026-04-20-1200');
    expect(prompt).toContain('SENSE');
    expect(prompt).toContain('THINK');
    expect(prompt).toContain('ACT');
    expect(prompt).toContain('REFLECT');
  });

  it('should include last wake context if available', () => {
    const context: PromptContext = {
      wakeId: 'wake-2026-04-20-1300',
      timestamp: new Date('2026-04-20T13:00:00Z'),
      lastWake: {
        wakeId: 'wake-2026-04-20-1200',
        actions: [{ type: 'post', summary: 'Posted sketch' }],
      },
    };

    const prompt = assembleSystemPrompt(context);

    expect(prompt).toContain('wake-2026-04-20-1200');
    expect(prompt).toContain('Posted sketch');
  });

  it('should handle missing memory files gracefully', () => {
    const context: PromptContext = {
      wakeId: 'wake-2026-04-20-1400',
      timestamp: new Date('2026-04-20T14:00:00Z'),
    };

    expect(() => assembleSystemPrompt(context)).not.toThrow();
  });
});
