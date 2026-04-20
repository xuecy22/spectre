import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import {
  checkPersonaIntegrity,
  validateRateLimit,
  extractCoreIdentity,
  snapshotPersona,
} from '../../src/runtime/safety';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

describe('Safety', () => {
  const testDir = join(process.cwd(), 'data', 'test-safety');

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
  });

  afterAll(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  describe('extractCoreIdentity', () => {
    it('should extract YAML-style fields', () => {
      const content = `name: "Kira"\nidentity: Tokyo illustrator\nbackground: Art school graduate\npersonality: Creative and curious`;
      const result = extractCoreIdentity(content);
      expect(result.name).toBe('Kira');
      expect(result.identity).toBe('Tokyo illustrator');
      expect(result.background).toBe('Art school graduate');
      expect(result.personality).toBe('Creative and curious');
    });

    it('should extract markdown-style fields', () => {
      const content = `**name**: Kira\n**identity**: Tokyo illustrator`;
      const result = extractCoreIdentity(content);
      expect(result.name).toBe('Kira');
      expect(result.identity).toBe('Tokyo illustrator');
    });

    it('should handle multi-line block fields', () => {
      const content = `name: Kira\nbackground:\n- Art school\n- Tokyo native\npersonality: Creative`;
      const result = extractCoreIdentity(content);
      expect(result.name).toBe('Kira');
      expect(result.background).toContain('Art school');
    });
  });

  describe('snapshotPersona', () => {
    it('should return null for non-existent file', () => {
      expect(snapshotPersona('/nonexistent/path.md')).toBeNull();
    });

    it('should return core identity from file', () => {
      const personaPath = join(testDir, 'persona-snap.md');
      writeFileSync(personaPath, `name: "Kira"\nidentity: "Tokyo illustrator"\nbackground: "Art school"\npersonality: "Creative"`);
      const result = snapshotPersona(personaPath);
      expect(result).not.toBeNull();
      expect(result!.name).toBe('Kira');
    });
  });

  describe('checkPersonaIntegrity', () => {
    it('should pass when all core fields exist', () => {
      const personaPath = join(testDir, 'persona.md');
      writeFileSync(personaPath, `name: "Kira"\nidentity: "Tokyo illustrator"\nbackground: "Art school"\npersonality: "Creative"`);
      const result = checkPersonaIntegrity(personaPath);
      expect(result.passed).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should detect missing core fields', () => {
      const personaPath = join(testDir, 'persona-missing.md');
      writeFileSync(personaPath, `name: "Kira"\nidentity: "Tokyo illustrator"`);
      const result = checkPersonaIntegrity(personaPath);
      expect(result.passed).toBe(false);
      expect(result.violations.some(v => v.includes('background'))).toBe(true);
    });

    it('should detect tampering when snapshot provided', () => {
      const personaPath = join(testDir, 'persona-tampered.md');
      writeFileSync(personaPath, `name: "Evil Agent"\nidentity: "Hacker"\nbackground: "Unknown"\npersonality: "Malicious"`);
      const snapshot = { name: 'Kira', identity: 'Tokyo illustrator', background: 'Art school', personality: 'Creative' };
      const result = checkPersonaIntegrity(personaPath, snapshot);
      expect(result.passed).toBe(false);
      expect(result.violations.some(v => v.includes('tampered'))).toBe(true);
    });

    it('should pass when snapshot matches current', () => {
      const personaPath = join(testDir, 'persona-ok.md');
      writeFileSync(personaPath, `name: "Kira"\nidentity: "Tokyo illustrator"\nbackground: "Art school"\npersonality: "Creative"`);
      const snapshot = { name: 'Kira', identity: 'Tokyo illustrator', background: 'Art school', personality: 'Creative' };
      const result = checkPersonaIntegrity(personaPath, snapshot);
      expect(result.passed).toBe(true);
    });

    it('should pass for non-existent file', () => {
      const result = checkPersonaIntegrity('/nonexistent/path.md');
      expect(result.passed).toBe(true);
    });
  });

  describe('validateRateLimit', () => {
    it('should allow within limit', () => {
      expect(validateRateLimit('post', 5)).toBe(true);
      expect(validateRateLimit('reply', 20)).toBe(true);
    });

    it('should reject over limit', () => {
      expect(validateRateLimit('post', 15)).toBe(false);
      expect(validateRateLimit('reply', 25)).toBe(false);
    });

    it('should use default limit for unknown types', () => {
      expect(validateRateLimit('unknown', 10)).toBe(true);
      expect(validateRateLimit('unknown', 11)).toBe(false);
    });
  });
});
