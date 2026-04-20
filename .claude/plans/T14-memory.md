# Task T14: Memory（记忆管理）

## 目标

实现三层记忆架构的管理函数。

## 接口签名

```typescript
export function readLastWake(): any;
export function writeLastWake(data: any): void;

export function findWakeLogByTimestamp(wakeId: string): string | null;
export function archiveSession(
  wakeId: string,
  messages: any[],
  metadata: any
): void;

export function searchWakeLogs(query: string): string[];
```

## 实现约束

- 参考 PRD 第 4.4、5.3 节
- 管理 memory/last-wake.json
- 管理 memory/wake-logs/*.md
- 管理 memory/sessions/{wakeId}/*
- 提供检索和归档功能

## 验收标准

见 tests/runtime/memory.test.ts
