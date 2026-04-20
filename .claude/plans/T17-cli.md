# Task T17: CLI（命令行入口）

## 目标

创建运行时 CLI 入口，启动 Spectre。

## 接口签名

```typescript
// src/runtime/cli.ts
export async function main(): Promise<void>;
```

## 实现约束

- 依赖 T15 orchestrator
- 支持命令行参数：--mock（Mock 模式）
- 读取 .env 配置
- 启动 scheduler
- 错误处理和日志

## 验收标准

见 tests/runtime/cli.test.ts
