import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { lastWakeSchema, type LastWakeOutput } from '../../src/runtime/prompts/output-schema';
import { wakeCycleInstructions } from '../../src/runtime/prompts/wake-cycle';

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

  it('should define valid JSON schema with required fields per PRD', () => {
    expect(lastWakeSchema.type).toBe('object');
    expect(lastWakeSchema.required).toContain('timestamp');
    expect(lastWakeSchema.required).toContain('timeOfDay');
    expect(lastWakeSchema.required).toContain('actions');
    expect(lastWakeSchema.required).toContain('observations');
    expect(lastWakeSchema.required).toContain('metrics');

    // actions schema
    expect(lastWakeSchema.properties.actions.type).toBe('array');
    expect(lastWakeSchema.properties.actions.items.properties.type.enum).toContain('post');
    expect(lastWakeSchema.properties.actions.items.properties.type.enum).toContain('reply');
    expect(lastWakeSchema.properties.actions.items.properties.type.enum).toContain('quote');

    // metrics schema
    expect(lastWakeSchema.properties.metrics.required).toContain('newFollowers');
    expect(lastWakeSchema.properties.metrics.required).toContain('totalFollowers');
  });

  it('should include SENSE/THINK/ACT/REFLECT phases in wake cycle instructions', () => {
    expect(wakeCycleInstructions).toContain('SENSE');
    expect(wakeCycleInstructions).toContain('THINK');
    expect(wakeCycleInstructions).toContain('ACT');
    expect(wakeCycleInstructions).toContain('REFLECT');
    expect(wakeCycleInstructions).toContain('wake-log');
  });
});
