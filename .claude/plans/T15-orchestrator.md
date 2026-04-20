# Task T15: Runtime Orchestrator（运行时编排器）

## 目标

实现运行时编排器，管理 wake cycle 的完整生命周期。

## 接口签名

```typescript
export async function runWakeCycle(): Promise<void>;

export interface WakeCyclePhases {
  PREPARE: () => Promise<PromptContext>;
  LAUNCH: (prompt: string) => Promise<SessionResult>;
  CLEANUP: (result: SessionResult) => Promise<void>;
}
```

## 实现约束

- 参考 PRD 第 4.1、4.2 节
- 依赖 T09-T14 的所有模块
- PREPARE：组装 prompt，读取 last-wake
- LAUNCH：启动 Claude Code session，配置 Stop hook
- CLEANUP：归档 session，写 last-wake.json，commit
- 错误处理和重试逻辑

## 验收标准

见 tests/runtime/orchestrator.test.ts
