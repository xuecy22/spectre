import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Mock all side-effect modules ---

const mockRunSession = vi.fn();
vi.mock('../../src/core/session-runner', () => ({
  runSession: (...args: unknown[]) => mockRunSession(...args),
}));

vi.mock('../../src/core/git', () => ({
  gitAddAll: vi.fn(),
  gitCommit: vi.fn(),
  gitDiffStat: vi.fn().mockReturnValue(''),
  markAsGoodCommit: vi.fn(),
  readLastGoodCommit: vi.fn().mockReturnValue(null),
  gitRevertFiles: vi.fn(),
}));

vi.mock('../../src/runtime/memory', () => ({
  writeLastWake: vi.fn(),
  findWakeLogByTimestamp: vi.fn().mockReturnValue(null),
  archiveSession: vi.fn(),
}));

vi.mock('../../src/runtime/db', () => ({
  saveWakeRecord: vi.fn(),
}));

vi.mock('../../src/runtime/safety', () => ({
  checkPersonaIntegrity: vi.fn().mockReturnValue({ passed: true, violations: [] }),
  snapshotPersona: vi.fn().mockReturnValue({ name: 'Kira', identity: 'Tokyo illustrator' }),
  autoHeal: vi.fn().mockReturnValue([]),
}));

import { runWakeCycle } from '../../src/runtime/orchestrator';
import { writeLastWake, archiveSession } from '../../src/runtime/memory';

function makeSuccessResult(overrides?: Record<string, unknown>) {
  return {
    success: true,
    output: 'OK',
    messages: [],
    cost: 0.05,
    turns: 3,
    structuredOutput: {
      timestamp: new Date().toISOString(),
      timeOfDay: 'morning',
      actions: [],
      observations: '',
      memoryUpdates: [],
      pendingItems: '',
      metrics: { newFollowers: 0, totalFollowers: 0 },
    },
    ...overrides,
  };
}

describe('Runtime Orchestrator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRunSession.mockReset();
    mockRunSession.mockResolvedValue(makeSuccessResult());
  });

  it('should execute complete wake cycle with structured output', async () => {
    mockRunSession.mockResolvedValue(
      makeSuccessResult({
        structuredOutput: {
          timestamp: '2026-04-20T14:00:00Z',
          timeOfDay: 'afternoon',
          actions: [{ type: 'post', summary: 'Test post' }],
          observations: 'Test observations',
          memoryUpdates: ['strategy.md'],
          pendingItems: '',
          metrics: { newFollowers: 5, totalFollowers: 200 },
        },
      }),
    );

    await expect(runWakeCycle()).resolves.not.toThrow();
    expect(archiveSession).toHaveBeenCalled();
    expect(writeLastWake).toHaveBeenCalled();
  });

  it('should pass outputFormat with lastWakeSchema to runSession', async () => {
    await runWakeCycle();

    expect(mockRunSession).toHaveBeenCalledWith(
      expect.objectContaining({
        outputFormat: expect.objectContaining({
          type: 'json_schema',
          schema: expect.objectContaining({
            type: 'object',
            required: expect.arrayContaining(['timestamp', 'timeOfDay', 'actions']),
          }),
        }),
      }),
    );
  });

  it('should pass bypassPermissions permissionMode to runSession', async () => {
    await runWakeCycle();

    expect(mockRunSession).toHaveBeenCalledWith(
      expect.objectContaining({
        permissionMode: 'bypassPermissions',
      }),
    );
  });

  it('should pass Stop hook to runSession', async () => {
    await runWakeCycle();

    expect(mockRunSession).toHaveBeenCalledWith(
      expect.objectContaining({
        hooks: expect.objectContaining({
          Stop: expect.arrayContaining([
            expect.objectContaining({
              hooks: expect.any(Array),
            }),
          ]),
        }),
      }),
    );
  });

  it('should write last-wake.json with structured output data', async () => {
    mockRunSession.mockResolvedValue(
      makeSuccessResult({
        structuredOutput: {
          timestamp: '2026-04-20T14:00:00Z',
          timeOfDay: 'afternoon',
          actions: [{ type: 'post', summary: 'Shibuya sketch' }],
          observations: 'Architecture content works well',
          memoryUpdates: ['strategy.md'],
          pendingItems: 'Reply to @tokyo_archi',
          metrics: { newFollowers: 5, totalFollowers: 200 },
        },
      }),
    );

    await runWakeCycle();

    expect(writeLastWake).toHaveBeenCalledWith(
      expect.objectContaining({
        timeOfDay: 'afternoon',
        actions: [{ type: 'post', summary: 'Shibuya sketch' }],
        observations: 'Architecture content works well',
        pendingItems: 'Reply to @tokyo_archi',
        metrics: { newFollowers: 5, totalFollowers: 200 },
      }),
    );
  });

  it('should retry on failure', async () => {
    let callCount = 0;
    mockRunSession.mockImplementation(async () => {
      callCount++;
      if (callCount < 3) {
        return { success: false, output: '', messages: [], error: 'Transient error' };
      }
      return makeSuccessResult();
    });

    await runWakeCycle();
    expect(callCount).toBe(3);
  });
});
