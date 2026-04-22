# Session Runner

> 源码：`src/core/session-runner.ts`

## 职责

Agent SDK 的薄封装层，负责启动 Claude Code session 并捕获输出流。不包含业务逻辑。

## 接口

```typescript
// 启动一个 Claude Code session，返回 SDK 消息的异步迭代器
function runSession(options: SessionOptions): AsyncIterable<SDKMessage>
```

## 内置工具

Session 内 Claude 可使用的工具及其在 Spectre 中的用途：

| 工具 | 用途 |
|------|------|
| **Read / Edit / Write** | 读写 memory 文件（strategy.md, learnings.md 等） |
| **Bash** | 调用 X API (curl/CLI)、调用图片生成 API、任何系统命令 |
| **WebSearch / WebFetch** | 搜索趋势话题、行业资讯、灵感素材 |
| **Glob / Grep** | 检索历史记忆文件 |

## 模型选择

| Session 类型 | 模型 | 说明 |
|-------------|------|------|
| 日常 wake cycle | Sonnet | 高频执行，成本优先 |
| Daily reflection | Sonnet | 每日复盘，轻量分析 |
| Weekly/Monthly reflection | Opus | 深度反思，需要更强推理 |

## 启动参数

```typescript
{
  allowedTools: ["Read", "Edit", "Write", "Bash", "WebSearch", "WebFetch", "Glob", "Grep"],
  permissionMode: "bypassPermissions",
  maxTurns: 15,
  model: isDeepReflection ? "claude-opus-4-6" : "claude-sonnet-4-5-20250929",  // weekly/monthly → Opus，其余 → Sonnet
  outputFormat: {
    type: 'json_schema',
    schema: lastWakeSchema       // → docs/runtime/prompts/wake-cycle.md
  },
  hooks: {
    Stop: [{ hooks: [ensureWakeLogHook(wakeId)] }]  // → docs/runtime/memory.md
  }
}
```

## 约束

- Session 内 Claude 拥有完全自主权，外循环不干预决策过程
- Session 行为完全由 system prompt 引导（→ [prompt-builder](../runtime/prompt-builder.md)）
