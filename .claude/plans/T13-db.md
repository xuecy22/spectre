# Task T13: DB（数据库模块）

## 目标

使用 better-sqlite3 管理本地数据库，存储 wake cycle 元数据和费用统计。

## 接口签名

```typescript
export interface WakeRecord {
  wakeId: string;
  timestamp: string;
  duration: number;
  cost: number;
  turns: number;
  actions: string[];
}

export function initDB(): void;
export function saveWakeRecord(record: WakeRecord): void;
export function getRecentWakes(limit: number): WakeRecord[];
export function getTotalCost(days: number): number;
```

## 实现约束

- 参考 PRD 第 5.3 节
- 数据库文件：data/spectre.db
- 表结构：wakes, costs, metrics
- 使用 better-sqlite3
- 支持查询统计

## 验收标准

见 tests/runtime/db.test.ts
