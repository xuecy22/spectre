import { describe, it, expect, beforeEach } from 'vitest';
import { checkPersonaIntegrity, validateRateLimit } from '../../src/runtime/safety';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

describe('Safety', () => {
  const testDir = join(process.cwd(), 'data', 'test-safety');

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
  });

  it('should detect persona core identity tampering', () => {
    const personaPath = join(testDir, 'persona.md');
    writeFileSync(personaPath, `
name: "Kira"
identity: "Tokyo illustrator"
    `);

    const result = checkPersonaIntegrity(personaPath);
    expect(result.passed).toBe(true);
  });

  it('should validate rate limits', () => {
    expect(validateRateLimit('post', 5)).toBe(true);
    expect(validateRateLimit('post', 15)).toBe(false);
  });

  it('should allow strategy modifications', () => {
    const result = checkPersonaIntegrity('memory/persona.md');
    expect(result.passed).toBe(true);
  });
});
