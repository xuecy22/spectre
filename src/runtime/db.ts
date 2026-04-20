export interface WakeRecord {
  wakeId: string;
  timestamp: string;
  duration?: number;
  cost?: number;
  turns?: number;
  actions?: string[];
}

export function initDB(_path?: string): void {
  throw new Error('Not implemented');
}

export function saveWakeRecord(_record: WakeRecord): void {
  throw new Error('Not implemented');
}

export function getRecentWakes(_limit?: number): WakeRecord[] {
  throw new Error('Not implemented');
}

export function getTotalCost(_days?: number): number {
  throw new Error('Not implemented');
}
