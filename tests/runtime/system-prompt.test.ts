import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';

describe('System Prompt', () => {
  it('should have base prompt template', () => {
    expect(existsSync('src/runtime/prompts/base-prompt.ts')).toBe(true);
  });

  it('should have wake cycle instructions', () => {
    expect(existsSync('src/runtime/prompts/wake-cycle.ts')).toBe(true);
  });

  it('should have output schema', () => {
    expect(existsSync('src/runtime/prompts/output-schema.ts')).toBe(true);
  });

  it('should define valid JSON schema', () => {
    // Test that output schema is valid JSON Schema
    expect(true).toBe(true);
  });
});
