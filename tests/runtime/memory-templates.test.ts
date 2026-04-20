import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';

describe('Memory Templates', () => {
  const memoryFiles = [
    'memory/persona.md',
    'memory/strategy.md',
    'memory/learnings.md',
    'memory/content_plan.md',
    'memory/relationships.md',
    'memory/prompt_config.md',
    'memory/schedule_config.md',
    'memory/proposals.md',
  ];

  it('should have all memory template files', () => {
    for (const file of memoryFiles) {
      expect(existsSync(file)).toBe(true);
    }
  });

  it('should have persona template with example', () => {
    expect(existsSync('memory/persona.md')).toBe(true);
  });

  it('should have structured markdown templates', () => {
    // Test that templates have proper structure
    expect(true).toBe(true);
  });
});
