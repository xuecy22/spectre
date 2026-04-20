import { describe, it, expect, beforeEach } from 'vitest';
import {
  readLastWake,
  writeLastWake,
  findWakeLogByTimestamp,
  archiveSession,
  searchWakeLogs,
} from '../../src/runtime/memory';
import { mkdirSync, existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

describe('Memory', () => {
  const memoryDir = join(process.cwd(), 'memory');

  beforeEach(() => {
    mkdirSync(memoryDir, { recursive: true });
    mkdirSync(join(memoryDir, 'wake-logs'), { recursive: true });
    mkdirSync(join(memoryDir, 'sessions'), { recursive: true });
  });

  it('should read and write last-wake.json', () => {
    const data = {
      wakeId: 'wake-2026-04-20-1200',
      timestamp: '2026-04-20T12:00:00Z',
      actions: [{ type: 'post', summary: 'Posted sketch' }],
    };

    writeLastWake(data);
    const result = readLastWake();

    expect(result.wakeId).toBe('wake-2026-04-20-1200');
  });

  it('should find wake log by timestamp', () => {
    const wakeLogPath = join(memoryDir, 'wake-logs', '2026-04-20_1200_sketch.md');
    writeFileSync(wakeLogPath, '# Wake Log\n\nTest content');

    const found = findWakeLogByTimestamp('wake-2026-04-20-1200');
    expect(found).toContain('2026-04-20_1200');
  });

  it('should archive session', () => {
    const wakeId = 'wake-2026-04-20-1300';
    const messages = [{ role: 'assistant', content: 'Test' }];
    const metadata = { cost: 0.15, turns: 5 };

    archiveSession(wakeId, messages, metadata);

    const sessionDir = join(memoryDir, 'sessions', wakeId);
    expect(existsSync(sessionDir)).toBe(true);
    expect(existsSync(join(sessionDir, 'session.json'))).toBe(true);
    expect(existsSync(join(sessionDir, 'report.json'))).toBe(true);
  });

  it('should search wake logs', () => {
    const wakeLogPath = join(memoryDir, 'wake-logs', '2026-04-20_1400_test.md');
    writeFileSync(wakeLogPath, '# Wake Log\n\nPosted about architecture');

    const results = searchWakeLogs('architecture');
    expect(results.length).toBeGreaterThan(0);
  });
});
