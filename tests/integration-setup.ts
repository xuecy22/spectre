import { vi, beforeAll, afterAll } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// Mock @anthropic-ai/claude-agent-sdk
vi.mock('@anthropic-ai/claude-agent-sdk', () => {
  return {
    query: async function* () {
      yield {
        type: 'result',
        subtype: 'success',
        result: 'Mock wake cycle completed successfully',
        is_error: false,
        total_cost_usd: 0.05,
        num_turns: 3,
      };
    },
  };
});

// Mock git operations (execSync-based)
vi.mock('../src/core/git', () => ({
  gitAddAll: vi.fn(),
  gitCommit: vi.fn(),
  gitDiffStat: vi.fn().mockReturnValue('1 file changed'),
  gitDiffFiles: vi.fn().mockReturnValue([]),
  gitStagedFiles: vi.fn().mockReturnValue([]),
  readLastGoodCommit: vi.fn().mockReturnValue(null),
  markAsGoodCommit: vi.fn(),
  gitRevertFiles: vi.fn(),
  gitCurrentHash: vi.fn().mockReturnValue('abc123'),
  gitLog: vi.fn().mockReturnValue('abc123 mock commit'),
}));

// Mock DB operations
vi.mock('../src/runtime/db', () => ({
  initDB: vi.fn(),
  saveWakeRecord: vi.fn(),
  getRecentWakes: vi.fn().mockReturnValue([]),
  getTotalCost: vi.fn().mockReturnValue(0),
}));

// Ensure memory directory structure exists for tests
const memoryDir = join(process.cwd(), 'memory');
const sessionsDir = join(memoryDir, 'sessions');
const wakeLogsDir = join(memoryDir, 'wake-logs');

beforeAll(() => {
  mkdirSync(sessionsDir, { recursive: true });
  mkdirSync(wakeLogsDir, { recursive: true });

  // Ensure persona.md exists with required fields
  const personaPath = join(memoryDir, 'persona.md');
  if (!existsSync(personaPath)) {
    writeFileSync(
      personaPath,
      'name: Spectre\nidentity: AI agent\nbackground: Autonomous\npersonality: Curious\n',
    );
  }
});
