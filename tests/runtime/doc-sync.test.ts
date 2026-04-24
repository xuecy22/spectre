import { describe, it, expect } from 'vitest';
import { srcToDocPath, checkDocSync, formatDocSyncMessage } from '../../src/runtime/doc-sync';

describe('Doc-Sync', () => {
  describe('srcToDocPath', () => {
    it('should map src/core/*.ts to docs/core/*.md', () => {
      expect(srcToDocPath('src/core/git.ts')).toBe('docs/core/git.md');
      expect(srcToDocPath('src/core/session-runner.ts')).toBe('docs/core/session-runner.md');
    });

    it('should map src/runtime/*.ts to docs/runtime/*.md', () => {
      expect(srcToDocPath('src/runtime/db.ts')).toBe('docs/runtime/db.md');
      expect(srcToDocPath('src/runtime/orchestrator.ts')).toBe('docs/runtime/orchestrator.md');
      expect(srcToDocPath('src/runtime/drives.ts')).toBe('docs/runtime/drives.md');
    });

    it('should map src/runtime/prompts/*.ts to docs/runtime/prompts/*.md', () => {
      expect(srcToDocPath('src/runtime/prompts/wake-cycle.ts')).toBe('docs/runtime/prompts/wake-cycle.md');
    });

    it('should map all scripts to docs/scripts/tools.md', () => {
      expect(srcToDocPath('src/runtime/scripts/x-post.sh')).toBe('docs/scripts/tools.md');
      expect(srcToDocPath('src/runtime/scripts/db-query.sh')).toBe('docs/scripts/tools.md');
      expect(srcToDocPath('src/runtime/scripts/generate-image.sh')).toBe('docs/scripts/tools.md');
    });

    it('should return null for non-src files', () => {
      expect(srcToDocPath('docs/runtime/db.md')).toBeNull();
      expect(srcToDocPath('memory/persona.md')).toBeNull();
      expect(srcToDocPath('tests/runtime/db.test.ts')).toBeNull();
    });
  });

  describe('checkDocSync', () => {
    it('should pass when no src files are changed', () => {
      const result = checkDocSync(['memory/persona.md', 'memory/strategy.md']);
      expect(result.passed).toBe(true);
      expect(result.missingDocs).toHaveLength(0);
    });

    it('should pass when src changes have matching doc changes', () => {
      const result = checkDocSync([
        'src/runtime/db.ts',
        'docs/runtime/db.md',
        'src/runtime/drives.ts',
        'docs/runtime/drives.md',
      ]);
      expect(result.passed).toBe(true);
    });

    it('should fail when src changes lack doc changes', () => {
      const result = checkDocSync([
        'src/runtime/db.ts',
        'src/runtime/drives.ts',
      ]);
      expect(result.passed).toBe(false);
      expect(result.missingDocs).toHaveLength(2);
      expect(result.missingDocs[0].srcFile).toBe('src/runtime/db.ts');
      expect(result.missingDocs[0].expectedDoc).toBe('docs/runtime/db.md');
    });

    it('should detect partial doc sync (some docs missing)', () => {
      const result = checkDocSync([
        'src/runtime/db.ts',
        'docs/runtime/db.md',
        'src/runtime/orchestrator.ts',
        // docs/runtime/orchestrator.md is NOT changed
      ]);
      expect(result.passed).toBe(false);
      expect(result.missingDocs).toHaveLength(1);
      expect(result.missingDocs[0].srcFile).toBe('src/runtime/orchestrator.ts');
    });

    it('should deduplicate scripts → tools.md mapping', () => {
      const result = checkDocSync([
        'src/runtime/scripts/x-post.sh',
        'src/runtime/scripts/x-reply.sh',
        'src/runtime/scripts/db-query.sh',
      ]);
      expect(result.passed).toBe(false);
      // All scripts map to the same doc, should only appear once
      expect(result.missingDocs).toHaveLength(1);
      expect(result.missingDocs[0].expectedDoc).toBe('docs/scripts/tools.md');
    });

    it('should pass when scripts change and tools.md is updated', () => {
      const result = checkDocSync([
        'src/runtime/scripts/x-post.sh',
        'docs/scripts/tools.md',
      ]);
      expect(result.passed).toBe(true);
    });

    it('should ignore test files and non-src files', () => {
      const result = checkDocSync([
        'tests/runtime/db.test.ts',
        'memory/last-wake.json',
        'package.json',
      ]);
      expect(result.passed).toBe(true);
    });
  });

  describe('formatDocSyncMessage', () => {
    it('should return empty string when passed', () => {
      expect(formatDocSyncMessage({ passed: true, missingDocs: [] })).toBe('');
    });

    it('should format missing docs message', () => {
      const msg = formatDocSyncMessage({
        passed: false,
        missingDocs: [
          { srcFile: 'src/runtime/db.ts', expectedDoc: 'docs/runtime/db.md' },
        ],
      });
      expect(msg).toContain('src/runtime/db.ts');
      expect(msg).toContain('docs/runtime/db.md');
      expect(msg).toContain('代码和文档必须保持一致');
    });
  });
});
