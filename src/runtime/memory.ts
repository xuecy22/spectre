export interface LastWakeData {
  wakeId: string;
  timestamp: string;
  actions?: { type: string; summary: string }[];
  [key: string]: unknown;
}

export function readLastWake(_path?: string): LastWakeData {
  throw new Error('Not implemented');
}

export function writeLastWake(_data: Record<string, unknown>, _path?: string): void {
  throw new Error('Not implemented');
}

export function findWakeLogByTimestamp(_wakeId: string, _dir?: string): string | null {
  throw new Error('Not implemented');
}

export function archiveSession(
  _wakeId: string,
  _messages: unknown[],
  _metadata?: Record<string, unknown>
): void {
  throw new Error('Not implemented');
}

export function searchWakeLogs(_query: string, _dir?: string): string[] {
  throw new Error('Not implemented');
}
