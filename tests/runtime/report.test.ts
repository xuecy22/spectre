import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { generateReport } from '../../src/runtime/report';
import { initDB, closeDB, saveWakeSnapshot } from '../../src/runtime/db';
import { existsSync, unlinkSync, readFileSync } from 'node:fs';

describe('Report', () => {
  const testDbPath = 'data/test-spectre.db';
  const testReportPath = 'data/test-report.html';

  beforeEach(() => {
    closeDB();
    for (const suffix of ['', '-shm', '-wal']) {
      const p = testDbPath + suffix;
      if (existsSync(p)) unlinkSync(p);
    }
    if (existsSync(testReportPath)) unlinkSync(testReportPath);
    initDB();
  });

  afterEach(() => {
    closeDB();
    if (existsSync(testReportPath)) unlinkSync(testReportPath);
  });

  it('should generate HTML report with empty data', () => {
    const outPath = generateReport({ days: 30, outPath: testReportPath });

    expect(existsSync(outPath)).toBe(true);
    const html = readFileSync(outPath, 'utf-8');
    expect(html).toContain('Spectre Evolution Report');
    expect(html).toContain('chart.js');
  });

  it('should include wake snapshot data in report', () => {
    saveWakeSnapshot({
      wakeId: 'wake-2026-04-20-1200',
      timestamp: new Date().toISOString(),
      timeOfDay: 'noon',
      creativeEnergy: 0.7,
      socialHunger: 0.4,
      curiosity: 0.3,
      confidence: 0.8,
      actions: JSON.stringify([{ type: 'post', summary: 'test post' }]),
      memoryUpdates: JSON.stringify(['strategy.md']),
      observations: 'Architecture content resonates',
      newFollowers: 5,
      totalFollowers: 100,
      costUsd: 0.15,
      turns: 8,
    });

    const outPath = generateReport({ days: 30, outPath: testReportPath });
    const html = readFileSync(outPath, 'utf-8');

    expect(html).toContain('0.70'); // creative_energy
    expect(html).toContain('0.80'); // confidence
    expect(html).toContain('100'); // followers
    expect(html).toContain('strategy.md'); // evolution event
  });

  it('should include all report sections', () => {
    saveWakeSnapshot({
      wakeId: 'wake-2026-04-20-1200',
      timestamp: new Date().toISOString(),
      timeOfDay: 'noon',
      creativeEnergy: 0.5,
      socialHunger: 0.4,
      curiosity: 0.3,
      confidence: 0.5,
      actions: JSON.stringify([]),
      newFollowers: 0,
      totalFollowers: 50,
    });

    const outPath = generateReport({ days: 30, outPath: testReportPath });
    const html = readFileSync(outPath, 'utf-8');

    // Report sections
    expect(html).toContain('Motivation Curves');
    expect(html).toContain('Growth Curves');
    expect(html).toContain('Evolution Timeline');
    expect(html).toContain('Activity Heatmap');
    // Overview stats
    expect(html).toContain('Wake Cycles');
    expect(html).toContain('Followers');
    expect(html).toContain('API Cost');
  });
});
