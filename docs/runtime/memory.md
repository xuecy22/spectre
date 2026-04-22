# Memory

> 源码：`src/runtime/memory.ts`

## 职责

三层记忆架构的管理：Live Memory、Wake-Log、Session Archive。

## 架构总览

```
┌───────────────────────────────────────────────────────────────┐
│                      Memory Layers                            │
├─────────────────┬────────────────────┬────────────────────────┤
│  Live Memory    │    Wake-Log        │    Session Archive     │
│  (实时配置)      │   (结构化摘要)      │    (完整记录)           │
│                 │                    │                        │
│  persona        │  做了什么           │  对话、工具调用、token  │
│  strategy       │  决策及原因         │  每次 wake cycle 的    │
│  prompt_config  │  观察到的现象       │  完整上下文             │
│  手动+agent维护  │  agent 每次写入    │  自动归档               │
├─────────────────┴────────────────────┴────────────────────────┤
│              last-wake.json (快速上下文传递)                    │
│           上次 wake cycle 摘要 → 自动注入下次 prompt            │
└───────────────────────────────────────────────────────────────┘
```

## 目录结构

```
memory/
├── persona.md              # 人设定义（core identity 由外循环保护 → safety.md）
├── strategy.md             # 运营策略（agent 自由读写）
├── learnings.md            # 经验洞察（agent 自由读写）
├── content_plan.md         # 内容规划（agent 自由读写）
├── relationships.md        # 社交关系（agent 自由读写）
├── prompt_config.md        # Prompt/评估配置（agent 自由读写）
├── schedule_config.md      # 唤醒调度配置（agent 自由读写）
├── proposals.md            # Operator 提案（agent 提出，需要人类操作的事项）
├── last-wake.json          # 上次 wake cycle 摘要（外循环自动注入下次 prompt）
├── wake-logs/              # 每次 wake cycle 的结构化摘要
│   └── {YYYY-MM-DD}_{HHMM}_{topic}.md
└── sessions/               # Session 完整归档（供深度反思使用）
    └── {wake-id}/
        ├── session.json    # 完整对话记录
        └── report.json     # 轻量元数据（token、费用、动作列表）

data/                          # 非记忆类持久化数据
├── spectre.db                 # SQLite 数据库（→ db.md）
└── .last-good-commit          # 自愈用的 good commit 标记（→ ../core/git.md）
```

> Agent 可以修改项目中的任何文件——包括 memory/、scripts/、甚至 src/。安全性不依赖限制 agent 能改什么，而是通过 git + 自愈保障（→ [safety](safety.md)、[git](../core/git.md)）。

## 各文件规范

### last-wake.json

| 属性 | 说明 |
|------|------|
| 写入者 | 外循环 Orchestrator（CLEANUP 阶段，从 SDK 结构化输出生成） |
| 读取者 | 外循环 Orchestrator（PREPARE 阶段，注入 `<previous-wake>` 块） |
| 生命周期 | 覆写制——每次 wake cycle 覆写上一次 |

```json
{
  "wakeId": "wake-2026-04-20-2130",
  "wakeLogPath": "wake-logs/2026-04-20_2130_shibuya-night-sketch.md",
  "timestamp": "2026-04-20T21:30:00+09:00",
  "timeOfDay": "evening",
  "drives": {
    "creative_energy": 0.7,
    "social_hunger": 0.4,
    "curiosity": 0.3,
    "confidence": 0.8
  },
  "actions": [
    {"type": "post", "tweetId": "1234567890", "summary": "涩谷夜景速写 + 配图"},
    {"type": "reply", "tweetId": "9876543210", "to": "@typographer_jp", "summary": "讨论衬线字体在招牌设计中的运用"}
  ],
  "observations": "@design_weekly 转发了我的建筑速写，带来 12 个新粉丝",
  "memoryUpdates": ["strategy.md: 调高建筑速写内容权重"],
  "pendingItems": "有一条来自 @tokyo_archi 的评论值得下次回复",
  "metrics": {"newFollowers": 12, "totalFollowers": 187}
}
```

### Wake-Log

| 属性 | 说明 |
|------|------|
| 写入者 | 内循环 agent（REFLECT 阶段） |
| 读取者 | agent 自身（主动检索历史）/ 深度反思 session |
| 生命周期 | 累积制——每个 wake cycle 产生一个文件 |
| 可靠性 | Stop hook 保障（见下文） |

```markdown
# Wake Log: 涩谷夜景速写

Date: 2026-04-20
Time: 21:30 JST
Wake ID: wake-2026-04-20-2130

## Context
- 晚间活跃时段，距上次唤醒 45 分钟

## Actions Taken
- 回复了 @typographer_jp 的字体讨论 mention
- 发布了一条涩谷夜景速写 + 配图

## Decisions Made
- 选择发涩谷夜景而非咖啡主题，因为近期建筑类内容数据好
- 没有追热门话题 #DesignTrends，因为与人设风格不符

## Observations
- @design_weekly 连续第二次互动，可能值得建立更深的关系

## Open Items
- @tokyo_archi 的评论待下次回复
```

核心价值：不仅记录"做了什么"，更记录"为什么这样做"和"观察到了什么"。

### Session Archive

| 属性 | 说明 |
|------|------|
| 写入者 | 外循环 Orchestrator（CLEANUP 阶段） |
| 读取者 | 深度反思 session（weekly/monthly，Opus 按需读取） |
| 生命周期 | 累积制——每个 wake cycle 产生一个目录 |

| 文件 | 大小估算 | 内容 |
|------|---------|------|
| `report.json` | ~1-5 KB | wake-id、时间、费用、token、turns 数、模型 |
| `session.json` | ~100-500 KB | 完整对话记录（所有 turns + tool calls） |

Session archive 不在日常 wake cycle 中使用（太大），仅在 weekly/monthly 深度反思时按需读取。

### proposals.md

| 属性 | 说明 |
|------|------|
| 写入者 | agent（提出需要人类操作的事项） |
| 读取者 | Operator |
| 格式 | 每个 proposal 包含 Type、Proposal、Reason、Status |

## 归档机制

三种记忆产物由不同角色在不同时机写入：

```
内循环 (Claude Code Session)                外循环 (Orchestrator)
──────────────────────────                  ────────────────────
REFLECT 阶段:
  agent ──→ wake-logs/{date}_{time}_{topic}.md

CLEANUP 阶段 (session 结束后):
                                  Orchestrator ──→ last-wake.json (覆写)
                                  Orchestrator ──→ sessions/{wake-id}/session.json
                                  Orchestrator ──→ sessions/{wake-id}/report.json
                                  Orchestrator ──→ git commit 所有变更
```

## 写入可靠性保障

### wake-log：Stop hook 兜底

通过 SDK 的 `Stop` hook 确保 agent 一定有机会写入 wake-log：

```typescript
function ensureWakeLogHook(wakeId: string) {
  const prefix = wakeId.replace('wake-', '').replace(/-(\d{4})$/, '_$1');
  return async () => {
    const hasWakeLog = globSync(`memory/wake-logs/${prefix}*.md`).length > 0;
    if (!hasWakeLog) {
      return {
        decision: 'block',
        systemMessage: '你还没有写 wake-log。请现在写入 wake-logs/ 再结束。'
      };
    }
    return { decision: 'approve' };
  };
}
```

基于 `wakeId` 的时间前缀匹配，确保检查的是本次 wake cycle 的 wake-log。

极端失败时（maxTurns 耗尽），外循环从 SDK tool call 记录生成最低限度 wake-log。

### last-wake.json：SDK outputFormat 保证

通过 SDK 的 `outputFormat` 强制 agent 返回结构化结果，外循环从中提取写入。SDK 机制保证，几乎不会失败。

### 可靠性总结

| 产物 | 写入者 | 可靠性机制 | 失败兜底 |
|------|--------|-----------|---------|
| wake-log | 内循环 agent | Stop hook | 外循环从 tool calls 生成最低限度版本 |
| last-wake.json | 外循环 | SDK outputFormat | SDK 机制保证 |
| session archive | 外循环 | SDK 消息流捕获 | 外循环完全控制 |

## 关联机制

`wakeId` 是贯穿所有记忆产物的唯一标识，格式为 `wake-{YYYY-MM-DD}-{HHMM}`。

| 方向 | 机制 |
|------|------|
| last-wake → wake-log | `wakeLogPath` 字段 |
| last-wake → session | `wakeId` → `sessions/{wakeId}/` |
| wake-log → session | 末尾 `<!-- session: {wakeId} -->` 注释（CLEANUP 追加） |
| session → wake-log | `report.json` 中的 `wakeLogPath` 字段 |

## 检索路径

**日常 wake cycle（自动注入）：**
```
外循环读 last-wake.json → 注入 prompt → agent 直接获得上次上下文
  需要更多细节 → 从 wakeLogPath 读上次的 wake-log
```

**agent 需要更多历史（主动检索）：**
```
Grep wake-logs/ "关键词" → 读 wake-log → 从 <!-- session: --> 定位 session archive
```

**weekly 深度反思：**
```
Glob wake-logs/*.md → 本周所有 wake-log → 识别模式 → 按需跳转 session archive
```
