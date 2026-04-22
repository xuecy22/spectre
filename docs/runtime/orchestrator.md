# Orchestrator

> 源码：`src/runtime/orchestrator.ts`

## 职责

一个很薄的调度层，管理 wake cycle 的完整生命周期。

| 做什么 | 不做什么 |
|--------|---------|
| 拟人化调度（→ [scheduler](scheduler.md)） | 内容决策（交给 Claude Code session） |
| Prompt 组装（→ [prompt-builder](prompt-builder.md)） | 实现 agent loop（Claude Code 已内置） |
| Session 启动（→ [session-runner](../core/session-runner.md)） | 封装 X API / 图片 API（session 内 Bash 直接调用） |
| Session 收尾（归档、commit、下次调度） | |
| 安全护栏（→ [safety](safety.md)） | |
| Drives 计算（→ [drives](drives.md)） | |

## Wake Cycle 生命周期

```
┌─ 外循环 (Orchestrator) ─────────────────────────────────────────────┐
│                                                                      │
│  PREPARE                    LAUNCH              CLEANUP              │
│  准备上下文 ──────────────▶ 启动 CC Session ───▶ 收尾处理            │
│                                 │                                    │
│              ┌──────────────────┘                                    │
│              ▼                                                       │
│  ┌─ 内循环 (Claude Code Session) ───────────────────────────────┐   │
│  │                                                               │   │
│  │  SENSE ───▶ THINK ───▶ ACT ───▶ REFLECT                     │   │
│  │  感知        决策       执行      反思                         │   │
│  │                                                               │   │
│  └───────────────────────────────────────────────────────────────┘   │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### PREPARE（准备）

1. 生成唯一 `wakeId`（格式：`wake-YYYY-MM-DD-HHMM`）
2. 标记当前 HEAD 为 good commit（PREPARE 成功 = 当前代码可用）（→ [git](../core/git.md)）
3. 读取 `last-wake.json`（上次 wake cycle 的快速摘要）
4. 读取 persona.md、strategy.md、learnings.md、prompt_config.md
5. 查询 SQLite 获取最近发帖记录和 engagement 摘要
6. 计算 drives（→ [drives](drives.md)）
7. 计算当前时间在人设时区中的位置（早晨/工作/晚间等）
8. 拼装完整 system prompt（last-wake + drives + context）（→ [prompt-builder](prompt-builder.md)）
9. 确定本次 session 的工具权限和 max-turns
10. Snapshot persona 核心身份（供 CLEANUP 校验）

### LAUNCH（启动）

通过 Agent SDK 启动 Claude Code session，捕获所有 SDK 消息：

```typescript
const messages: SDKMessage[] = [];
for await (const message of query({
  prompt: assembledPrompt,
  options: { /* → docs/core/session-runner.md */ }
})) {
  messages.push(message);
}
```

### CLEANUP（收尾）

1. 归档 session → `sessions/{wake-id}/session.json` + `report.json`（→ [memory](memory.md)）
2. 从 SDK 结构化输出提取 → 写入 `last-wake.json`（→ [memory](memory.md)）
3. 记录 token 使用和费用
4. 写入 wake_snapshots（drives + actions + memory_updates + metrics + cost）（→ [db](db.md)）
5. 检查 persona 核心身份完整性（→ [safety](safety.md)）
6. Git commit 所有变更（→ [git](../core/git.md)）
7. 计算下次唤醒时间，设置定时器（→ [scheduler](scheduler.md)）

## 终止条件

### Wake Cycle 终止

| 类型 | 触发 | 行为 |
|------|------|------|
| 正常终止 | agent 写完 wake-log 并返回 JSON | 正常 CLEANUP |
| maxTurns 终止 | 达到 maxTurns（15） | 外循环从 tool calls 生成最低限度 wake-log，正常 CLEANUP |
| 错误终止 | API 错误、agent 崩溃、超时 | 跳过归档，触发自愈检查（→ [safety](safety.md)） |
| 安全终止 | 费用超限、频率超限 | 强制结束 session，通知 Operator |

### Daily 终止

进入睡眠时段（人设时区 01:00）时：

1. 完成当前 wake cycle（如果正在进行）
2. 触发 daily reflection session（独立 session，Sonnet，不同于 weekly/monthly 的 Opus）
3. Drives 向基线衰减（模拟睡眠恢复）
4. 停止调度直到下次醒来时段（07:00）

### Phase 终止

Phase transition 条件定义在 → [architecture](../architecture.md)。Orchestrator 在每次 CLEANUP 后检查是否满足 transition 条件。满足时通知 Operator，由 Operator 确认后切换。

### Life 终止（Graceful Shutdown）

触发条件：
- Operator 执行 `spectre stop`
- 连续 5 次 wake cycle 崩溃且自愈失败
- 人设完整性校验连续失败

Shutdown 流程：
1. 停止 scheduler（不再触发新 wake cycle）
2. 等待当前 session 完成（如果正在进行）
3. 归档最终状态
4. Git commit（`final: {shutdown_reason}`）
5. 通知 Operator

## 反思周期调度

除日常 wake cycle 外，Orchestrator 还负责触发深度反思 session：

| 周期 | 触发方式 | 输入材料 |
|------|---------|---------|
| **Daily** | 每天最后一次 wake cycle 后 | 当天所有 wake-logs + memory 文件 + engagement 汇总 |
| **Weekly** | 每周一次（独立 session） | 本周所有 wake-logs + memory + engagement + git log |
| **Monthly** | 每月一次（独立 session） | 本月所有 wake-logs + memory + engagement + git log + 按需读取 session archive |

Weekly/Monthly 使用 Opus 模型，通过不同的 prompt 模板触发。
