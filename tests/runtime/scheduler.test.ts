import { describe, it, expect, vi } from 'vitest';
import { calculateNextWake, type ScheduleConfig } from '../../src/runtime/scheduler';

describe('Scheduler', () => {
  it('should calculate next wake within active time range', () => {
    const config: ScheduleConfig = {
      timezone: 'Asia/Tokyo',
      schedule: [{
        timeRange: '07:00-09:00',
        intervalMin: 30,
        intervalMax: 60,
        active: true
      }]
    };

    const lastWake = new Date('2026-04-20T07:00:00+09:00');
    const nextWake = calculateNextWake(config, lastWake);

    expect(nextWake.getTime()).toBeGreaterThan(lastWake.getTime());
    expect(nextWake.getHours()).toBeGreaterThanOrEqual(7);
  });

  it('should skip inactive time ranges', () => {
    const config: ScheduleConfig = {
      timezone: 'Asia/Tokyo',
      schedule: [
        { timeRange: '07:00-09:00', intervalMin: 30, intervalMax: 60, active: false },
        { timeRange: '12:00-14:00', intervalMin: 30, intervalMax: 60, active: true }
      ]
    };

    const lastWake = new Date('2026-04-20T08:00:00+09:00');
    const nextWake = calculateNextWake(config, lastWake);

    expect(nextWake.getHours()).toBeGreaterThanOrEqual(12);
  });

  it('should add random jitter to interval', () => {
    const config: ScheduleConfig = {
      timezone: 'UTC',
      schedule: [{
        timeRange: '00:00-23:59',
        intervalMin: 60,
        intervalMax: 60,
        active: true
      }]
    };

    const lastWake = new Date('2026-04-20T12:00:00Z');
    const results = new Set<number>();

    for (let i = 0; i < 10; i++) {
      const nextWake = calculateNextWake(config, lastWake);
      results.add(nextWake.getTime());
    }

    expect(results.size).toBeGreaterThan(1);
  });
});
