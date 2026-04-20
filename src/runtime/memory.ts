import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export interface LastWakeData {
  wakeId: string;
  timestamp: string;
  actions?: { type: string; summary: string }[];
  [key: string]: unknown;
}

const DEFAULT_MEMORY_DIR = join(process.cwd(), 'memory');

/**
 * 读取 last-wake.json
 */
export function readLastWake(path?: string): LastWakeData {
  const filePath = path || join(DEFAULT_MEMORY_DIR, 'last-wake.json');

  if (!existsSync(filePath)) {
    throw new Error(`last-wake.json not found at ${filePath}`);
  }

  const content = readFileSync(filePath, 'utf-8');
  return JSON.parse(content) as LastWakeData;
}

/**
 * 写入 last-wake.json（覆写制）
 */
export function writeLastWake(data: Record<string, unknown>, path?: string): void {
  const filePath = path || join(DEFAULT_MEMORY_DIR, 'last-wake.json');
  const dir = join(filePath, '..');

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * 根据 wakeId 查找对应的 wake-log 文件
 * wakeId 格式: wake-YYYY-MM-DD-HHMM
 * wake-log 文件名格式: YYYY-MM-DD_HHMM_*.md
 */
export function findWakeLogByTimestamp(wakeId: string, dir?: string): string | null {
  const wakeLogsDir = dir || join(DEFAULT_MEMORY_DIR, 'wake-logs');

  if (!existsSync(wakeLogsDir)) {
    return null;
  }

  // 从 wakeId "wake-2026-04-20-1200" 提取时间前缀 "2026-04-20_1200"
  const match = wakeId.match(/wake-(\d{4}-\d{2}-\d{2})-(\d{4})/);
  if (!match) {
    return null;
  }

  const prefix = `${match[1]}_${match[2]}`;

  const files = readdirSync(wakeLogsDir);
  const found = files.find(f => f.startsWith(prefix) && f.endsWith('.md'));

  return found ? join(wakeLogsDir, found) : null;
}

/**
 * 归档 session 到 sessions/{wakeId}/
 * 写入 session.json（完整对话记录）和 report.json（元数据）
 */
export function archiveSession(
  wakeId: string,
  messages: unknown[],
  metadata?: Record<string, unknown>
): void {
  const sessionDir = join(DEFAULT_MEMORY_DIR, 'sessions', wakeId);

  if (!existsSync(sessionDir)) {
    mkdirSync(sessionDir, { recursive: true });
  }

  writeFileSync(
    join(sessionDir, 'session.json'),
    JSON.stringify({ wakeId, messages }, null, 2),
    'utf-8'
  );

  writeFileSync(
    join(sessionDir, 'report.json'),
    JSON.stringify({ wakeId, ...metadata }, null, 2),
    'utf-8'
  );
}

/**
 * 在 wake-logs/ 中搜索包含指定关键词的文件
 */
export function searchWakeLogs(query: string, dir?: string): string[] {
  const wakeLogsDir = dir || join(DEFAULT_MEMORY_DIR, 'wake-logs');

  if (!existsSync(wakeLogsDir)) {
    return [];
  }

  const files = readdirSync(wakeLogsDir);
  const results: string[] = [];

  for (const file of files) {
    if (!file.endsWith('.md')) continue;

    const filePath = join(wakeLogsDir, file);
    const content = readFileSync(filePath, 'utf-8');

    if (content.includes(query)) {
      results.push(filePath);
    }
  }

  return results;
}
