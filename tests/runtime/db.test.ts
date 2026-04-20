import { describe, it, expect, beforeEach } from 'vitest';
import { initDB, saveWakeRecord, getRecentWakes, getTotalCost, type WakeRecord } from '../../src/runtime/db';
import { unlinkSync, existsSync } from 'node:fs';

describe('DB', () => {
  const testDbPath = 'data/test-spectre.db';

  beforeEach(() => {
    if (existsSync(testDbPath)) {
      unlinkSync(testDbPath);
    }
    initDB();
  });

  it('should initialize database', () => {
    expect(existsSync(testDbPath)).toBe(true);
  });

  it('should save wake record', () => {
    const record: WakeRecord = {
      wakeId: 'wake-2026-04-20-1200',
      timestamp: '2026-04-20T12:00:00Z',
      duration: 45000,
      cost: 0.15,
      turns: 8,
      actions: ['post', 'reply'],
    };

    saveWakeRecord(record);
    const recent = getRecentWakes(1);

    expect(recent).toHaveLength(1);
    expect(recent[0].wakeId).toBe('wake-2026-04-20-1200');
  });

  it('should calculate total cost', () => {
    const records: WakeRecord[] = [
      {
        wakeId: 'wake-1',
        timestamp: new Date().toISOString(),
        duration: 30000,
        cost: 0.10,
        turns: 5,
        actions: ['post'],
      },
      {
        wakeId: 'wake-2',
        timestamp: new Date().toISOString(),
        duration: 40000,
        cost: 0.20,
        turns: 7,
        actions: ['reply'],
      },
    ];

    records.forEach(saveWakeRecord);
    const total = getTotalCost(1);

    expect(total).toBe(0.30);
  });
});
