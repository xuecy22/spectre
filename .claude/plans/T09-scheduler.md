# Task T09: Scheduler（定时调度器）

## 目标

实现拟人化的定时调度器，根据人设时区和作息模式计算下次唤醒时间。

## 接口签名

```typescript
export interface ScheduleConfig {
  timezone: string;
  schedule: {
    timeRange: string;      // "07:00-09:00"
    intervalMin: number;    // 最小间隔（分钟）
    intervalMax: number;    // 最大间隔（分钟）
    active: boolean;        // 是否活跃
  }[];
}

export function calculateNextWake(
  config: ScheduleConfig,
  lastWakeTime: Date
): Date;

export function startScheduler(
  config: ScheduleConfig,
  onWake: () => Promise<void>
): void;
```

## 实现约束

- 参考 PRD 第 5.2 节"唤醒频率设计"
- 加入随机抖动（±15 分钟）
- 睡眠时段（01:00-07:00）不唤醒
- 使用 node-cron 实现
- 支持时区转换

## 验收标准

见 tests/runtime/scheduler.test.ts
