# Spectre - PRD

> **代号**: Spectre
> **定位**: Agent 主导的社交网络幽灵 —— 一个自我进化的 AI agent 社会实验
> **版本**: v0.4 Draft
> **日期**: 2026-04-20

---

## 1. 项目概述

### 1.1 愿景

Spectre 是一个 AI agent 驱动的社交媒体实验项目。它以一个人类设定的人设为起点，自主经营 X/Twitter 社交账号，自主决定发布内容、互动策略，并通过社交反馈（点赞、评论、转发、粉丝增长）不断进化自身策略。最终目标是让这个 agent 经营的账号在内容质量、互动方式和整体表现上与真人账号无异。

### 1.2 核心原则

- **Agent 自主性**: agent 自主决策发什么、何时发、和谁互动，人类不做日常干预
- **人设一致性**: 所有输出（文字、图片、互动）与设定的人设保持一致
- **自我进化**: 基于环境反馈持续调整策略，越来越"聪明"
- **拟人化**: 行为模式模拟真人，包括作息规律、发帖节奏、语言习惯

### 1.3 不做什么

- 不做通用社交媒体管理工具
- 不做多账号批量运营
- 不做付费推广/广告投放
- MVP 不做 Instagram（Phase 2）
- MVP 不做视频内容

---

## 2. 用户角色

| 角色 | 说明 |
|------|------|
| **Operator（操作者）** | 人类。负责初始人设设定、系统部署、监控、必要时干预 |
| **Spectre（agent）** | AI。自主运营账号、生成内容、执行互动、自我进化 |
| **Audience（受众）** | X/Twitter 上的真实用户，是 spectre 的互动对象和反馈来源 |

---

## 3. 人设系统 (Persona)

### 3.1 人设定义

由 Operator 在 `persona.md` 中定义，包含：

```yaml
name: "Kira"                          # 账号显示名
handle: "@kira_draws"                  # X handle
identity: "东京独立插画师/平面设计师"      # 核心身份
age: 27
location: "Tokyo, Japan"
languages: ["English", "日本語"]        # 可使用的语言

background:
  - 在东京武蔵野美术大学学习过视觉传达
  - 自由职业插画师，偶尔接商业项目
  - 喜欢城市速写和数字插画
  - 对日本街头文化和建筑有深厚兴趣

personality:
  - 安静但有主见
  - 对细节很敏感
  - 偶尔会展现冷幽默
  - 真诚，不刻意讨好

interests:
  - 插画 / 平面设计 / 字体设计
  - 日本街头摄影
  - 独立音乐 / lo-fi
  - 咖啡文化
  - 城市建筑

content_style:
  tone: "简洁、有质感、不啰嗦"
  visual_style: "干净的线条感、日系配色、留白"
  posting_language: "以英文为主，偶尔夹杂日语"
  avoids: ["过度使用 emoji", "hashtag 堆砌", "鸡汤文", "争议性政治话题"]

image_style:
  medium: "数字插画 + 偶尔的手绘扫描"
  color_palette: "柔和的莫兰迪色系，偶尔有高饱和点缀"
  subjects: ["城市建筑速写", "日常物品", "人物剪影", "字体设计"]
  tools_reference: ["Procreate风格", "简约矢量插画"]
```

### 3.2 人设的不可变与可变部分

| 层级 | 内容 | 是否可变 | 保护机制 |
|------|------|---------|---------|
| **Core Identity** | 名字、身份、背景故事 | 不可变 | 外循环 CLEANUP 时校验，被篡改则回滚 |
| **Personality** | 性格特征、价值观 | 不可变 | 同上 |
| **Interests** | 关注领域、话题 | 可进化 | agent 自由修改 |
| **Content Style** | 语言风格、视觉风格 | 可进化 | agent 自由修改 |
| **Strategy** | 发帖时间、互动策略 | 完全可变 | agent 自由修改 |

---

## 4. 系统架构

### 4.1 设计哲学：双循环架构

Spectre 采用 **"外循环 + 内循环"** 的双循环架构，核心思想是：**不重新发明轮子**。

Claude Code 本身已经是一个成熟的 agent 运行时（内置 agent loop、tool use、上下文管理、重试逻辑等）。Spectre 不重写这些能力，而是在其外围构建一个薄的编排层来管理"何时唤醒、带着什么记忆唤醒、唤醒后做什么收尾"。

```
外循环 (Spectre Orchestrator)              内循环 (Claude Code Session)
┌──────────────────────────┐              ┌──────────────────────────┐
│                          │   启动session │                          │
│  Scheduler (拟人化调度)   │─────────────▶│  读取 memory/ 下的文件    │
│          │               │              │          │               │
│          ▼               │              │          ▼               │
│  Prompt Assembler        │              │  感知环境 (X API via Bash)│
│  (拼装 persona+memory+   │              │          │               │
│   context → system prompt)│              │          ▼               │
│          │               │              │  决策 (Claude 推理)       │
│          ▼               │              │          │               │
│  Session Launcher        │              │          ▼               │
│  (调用 Agent SDK)        │              │  执行 (发帖/回复/引用转发  │
│          │               │              │   /生成图片 via Bash)     │
│          ▼               │  session结束  │          │               │
│  Post-session Handler  ◀│──────────────│          ▼               │
│  (日志/费用/下次调度)     │              │  反思 & 更新 memory 文件  │
│                          │              │                          │
└──────────────────────────┘              └──────────────────────────┘
```

**关键原则：Claude Code session 内部拥有完全的自主权**。它可以自由读写 memory 文件、通过 Bash 调用任何 API、使用 WebSearch 搜索信息。外循环不干预内循环的决策过程。

**核心洞察：Coding Agent = Self-Evolution**。因为 Spectre 的执行引擎是 Claude Code——一个完整的 coding agent——agent 天然具备修改自身任何代码、脚本、配置的能力。self-evolution 不需要专门的机制，它就是 coding 本身。安全性通过 git + 外循环自愈来保障（详见第 8 章）。

### 4.2 核心模块

#### 4.2.1 Orchestrator（编排器）

一个**很薄的调度层**，职责精确：

| 职责 | 说明 |
|------|------|
| **拟人化调度** | 根据人设时区和作息模式，计算下次唤醒时间（含随机抖动） |
| **Prompt 组装** | 读取 persona.md + strategy.md + 最新 metrics，拼装 system prompt |
| **Session 启动** | 通过 Claude Code Agent SDK 启动一个 session，传入 prompt 和工具权限 |
| **Session 收尾** | session 结束后记录日志、统计费用、计算下次唤醒时间 |
| **安全护栏** | 频率限制、费用上限等硬性约束（在外循环强制执行，不依赖 agent 自觉） |

Orchestrator **不做**的事：
- 不做内容决策（交给 Claude Code session）
- 不实现 agent loop（Claude Code 已内置）
- 不封装 X API / 图片生成 API（Claude Code session 内通过 Bash 直接调用）

#### 4.2.2 Claude Code Session（agent 内循环）

每次唤醒的核心。通过 Agent SDK 启动，拥有以下内置工具：

| 工具 | 在 Spectre 中的用途 |
|------|---------------------|
| **Read / Edit / Write** | 读写 memory 文件（strategy.md, learnings.md 等） |
| **Bash** | 调用 X API (curl/CLI)、调用图片生成 API、任何系统命令 |
| **WebSearch / WebFetch** | 搜索趋势话题、行业资讯、灵感素材 |
| **Glob / Grep** | 检索历史记忆文件 |

Session 内 Claude 的行为完全由 **system prompt** 引导（包含人设、记忆、当前上下文、行为准则）。

#### 4.2.3 Memory Layer（记忆层）

采用 **三层记忆架构**（参考 [nanoclaw](https://github.com/anthropics/nanoclaw) 的 Memory System 设计），memory 目录是 Claude Code 的工作目录，agent 在 session 内直接读写：

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

#### 目录结构

```
memory/
├── persona.md              # 人设定义（core identity 由外循环保护）
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
```

> **Agent 可以修改项目中的任何文件**——包括 `memory/` 下的配置、`scripts/` 下的工具脚本、甚至 `src/` 下的基础设施代码。这是 coding agent 的核心优势。安全性不依赖限制 agent 能改什么，而是通过 git 版本控制 + 外循环自愈机制保障（详见第 8 章）。

#### 归档机制总览

三种记忆产物由不同的角色在不同时机写入：

```
                        内循环 (Claude Code Session)                外循环 (Orchestrator)
                        ──────────────────────────                  ────────────────────
REFLECT 阶段:
  agent 写入 ──→  wake-logs/{date}_{time}_{topic}.md (累积)

CLEANUP 阶段 (session 结束后):
                                                      Orchestrator ──→  last-wake.json (从结构化输出生成，覆写)
                                                      Orchestrator ──→  sessions/{wake-id}/session.json
                                                      Orchestrator ──→  sessions/{wake-id}/report.json
                                                      Orchestrator ──→  git commit 所有变更
```

#### 写入可靠性保障

wake-log 和 last-wake.json 采用不同的可靠性策略：

**wake-log：agent 写入 + Stop hook 兜底**

wake-log 的价值在于 agent 视角的反思（决策原因、观察），这是外循环无法替代的。通过 SDK 的 `Stop` hook 确保 agent 一定有机会写入：

```typescript
// 外循环在 LAUNCH 时配置 Stop hook
function ensureWakeLogHook(wakeId: string) {
  // 从 wakeId "wake-2026-04-20-2130" 提取时间前缀 "2026-04-20_2130"
  const prefix = wakeId.replace('wake-', '').replace(/-(\d{4})$/, '_$1');
  return async () => {
    const hasWakeLog = globSync(`memory/wake-logs/${prefix}*.md`).length > 0;
    if (!hasWakeLog) {
      return {
        decision: 'block',   // ← 阻止 session 结束
        systemMessage: '你还没有写 wake-log。请现在写入 wake-logs/ 再结束。'
      };
    }
    return { decision: 'approve' };
  };
}
```

基于 `wakeId` 的时间前缀匹配（而非日期前缀），确保检查的是**本次 wake cycle** 的 wake-log，不会被今天早些时候的 wake-log 误满足。

当 agent 试图结束 session 时，Stop hook 检查 wake-log 是否存在。如果没有，注入提醒让 agent 继续执行写入。这给了 agent 额外的机会完成 REFLECT，而不是静默丢失。

如果 hook 触发后 agent 仍未写入（极端情况如 maxTurns 耗尽），外循环在 CLEANUP 阶段从 SDK 消息流中提取 tool call 记录，生成一个**最低限度的 wake-log**（只有动作列表，无决策原因）。

**last-wake.json：外循环从结构化输出生成**

last-wake.json 是结构化数据，不需要 agent 的主观反思，因此由外循环保证写入——通过 SDK 的 `outputFormat` 强制 agent 返回结构化结果：

```typescript
for await (const message of query({
  prompt: assembledPrompt,
  options: {
    // ...其他配置
    outputFormat: {
      type: 'json_schema',
      schema: lastWakeSchema   // ← 强制返回结构化的 wake 摘要
    }
  }
})) {
  messages.push(message);
}

// CLEANUP 阶段：从 SDK result 中提取结构化输出，写入 last-wake.json
const result = messages.find(m => m.type === 'result');
const lastWake = result.structured_output;  // ← SDK 保证符合 schema
lastWake.wakeId = currentWakeId;
lastWake.wakeLogPath = findWakeLogByTimestamp(currentWakeId);
writeJson('memory/last-wake.json', lastWake);
```

JSON Schema 定义：

```json
{
  "type": "object",
  "required": ["timestamp", "timeOfDay", "actions", "observations", "metrics"],
  "properties": {
    "timestamp": { "type": "string", "description": "ISO 8601 格式的当前时间" },
    "timeOfDay": { "type": "string", "enum": ["morning", "noon", "afternoon", "evening", "night"] },
    "actions": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "type": { "type": "string", "enum": ["post", "reply", "retweet", "quote", "skip"] },
          "summary": { "type": "string" }
        }
      }
    },
    "observations": { "type": "string", "description": "本次 wake cycle 的关键观察" },
    "memoryUpdates": { "type": "array", "items": { "type": "string" }, "description": "本次修改了哪些 memory 文件" },
    "pendingItems": { "type": "string", "description": "遗留事项，下次 wake cycle 应关注" },
    "metrics": {
      "type": "object",
      "properties": {
        "newFollowers": { "type": "number" },
        "totalFollowers": { "type": "number" }
      }
    }
  }
}
```

这样 last-wake.json 的写入由 SDK 机制保证——即使 agent 异常，只要 session 有 result 输出，外循环就能生成。

**总结：**

| 产物 | 写入者 | 可靠性机制 | 失败时的兜底 |
|------|--------|-----------|-------------|
| **wake-log** | 内循环 agent | Stop hook 阻止未写入就结束 | 外循环从 SDK tool calls 生成最低限度版本 |
| **last-wake.json** | 外循环 Orchestrator | SDK `outputFormat` 强制结构化输出 | SDK 机制保证，几乎不会失败 |
| **session archive** | 外循环 Orchestrator | SDK 消息流捕获 | 外循环完全控制，不依赖 agent |

#### last-wake.json（wake cycle 间快速上下文传递）

| 属性 | 说明 |
|------|------|
| **写入者** | 外循环 Orchestrator（CLEANUP 阶段，从 SDK 结构化输出生成） |
| **写入时机** | CLEANUP 阶段，session 结束后 |
| **数据来源** | SDK 的 `outputFormat` 结构化输出（agent 最终返回的 JSON）+ Orchestrator 补充 wakeId/wakeLogPath |
| **读取者** | 外循环 Orchestrator（PREPARE 阶段） |
| **读取时机** | 下次 wake cycle 启动时，自动注入到 system prompt 的 `<previous-wake>` 块 |
| **生命周期** | **覆写制**——每次 wake cycle 覆写上一次，始终只保留最新一份 |

```json
{
  "wakeId": "wake-2026-04-20-2130",
  "wakeLogPath": "wake-logs/2026-04-20_2130_shibuya-night-sketch.md",
  "timestamp": "2026-04-20T21:30:00+09:00",
  "timeOfDay": "evening",
  "actions": [
    {"type": "post", "tweetId": "1234567890", "summary": "涩谷夜景速写 + 配图"},
    {"type": "reply", "tweetId": "9876543210", "to": "@typographer_jp", "summary": "讨论衬线字体在招牌设计中的运用"},
    {"type": "quote", "tweetId": "5678901234", "to": "@design_weekly", "summary": "引用建筑摄影作品，评论构图手法"}
  ],
  "observations": "@design_weekly 转发了我的建筑速写，带来 12 个新粉丝",
  "memoryUpdates": ["strategy.md: 调高建筑速写内容权重"],
  "pendingItems": "有一条来自 @tokyo_archi 的评论值得下次回复",
  "metrics": {"newFollowers": 12, "totalFollowers": 187}
}
```

#### Wake-Log（结构化 wake cycle 摘要）

| 属性 | 说明 |
|------|------|
| **写入者** | 内循环 agent（REFLECT 阶段，通过 `Write memory/wake-logs/{date}_{time}_{topic}.md`） |
| **写入时机** | 每次 wake cycle 的 REFLECT 阶段 |
| **数据来源** | Agent 自身对本次 wake cycle 的结构化反思（包括决策原因、观察） |
| **读取者** | agent 自身（主动检索历史）/ 深度反思 session（weekly/monthly） |
| **生命周期** | **累积制**——每个 wake cycle 产生一个文件，持续积累 |
| **可靠性** | Stop hook 保障——agent 未写入 wake-log 就无法结束 session；极端失败时外循环从 SDK tool calls 生成最低限度版本 |

```markdown
# Wake Log: 涩谷夜景速写

Date: 2026-04-20
Time: 21:30 JST
Wake ID: wake-2026-04-20-2130

## Context
- 晚间活跃时段，距上次唤醒 45 分钟
- 上次发帖（建筑速写）获得 32 likes，高于平均

## Actions Taken
- 回复了 @typographer_jp 的字体讨论 mention（与人设 interests 一致）
- 发布了一条涩谷夜景速写 + 配图
- 引用转发了 @design_weekly 的建筑摄影作品，附评论分析构图手法

## Decisions Made
- 选择发涩谷夜景而非咖啡主题，因为近期建筑类内容数据好
- 没有追热门话题 #DesignTrends，因为与人设风格不符

## Observations
- @design_weekly 连续第二次互动，可能值得建立更深的关系
- 带配图的帖子互动率持续高于纯文字

## Open Items
- @tokyo_archi 的评论待下次回复（内容涉及建筑摄影角度）
```

Wake-log 的核心价值：不仅记录"做了什么"，更记录**"为什么这样做"和"观察到了什么"**，为 weekly/monthly 深度反思提供决策归因素材。

#### Session Archive（完整 session 记录）

| 属性 | 说明 |
|------|------|
| **写入者** | 外循环 Orchestrator（CLEANUP 阶段） |
| **写入时机** | Claude Code session 结束后，CLEANUP 阶段自动执行 |
| **数据来源** | Agent SDK 的流式输出——Orchestrator 在 LAUNCH 阶段捕获所有 `SDKMessage`，CLEANUP 时序列化写入 |
| **读取者** | 深度反思 session（weekly/monthly，Opus 按需读取） |
| **生命周期** | **累积制**——每个 wake cycle 产生一个目录 |

归档流程：

```
LAUNCH 阶段:
  const messages: SDKMessage[] = [];
  for await (const msg of query({...})) {
    messages.push(msg);        // ← 捕获所有 SDK 消息
    // 流式处理（日志等）
  }

CLEANUP 阶段:
  // 从 SDK result message 中提取元数据
  const result = messages.find(m => m.type === 'result');
  // → result.total_cost_usd, result.duration_ms, result.num_turns, result.usage

  // 扫描 wake-logs/ 找到本次 agent 写的 wake-log（按时间戳匹配）
  const wakeLogPath = findWakeLogByTimestamp(wakeId);

  // 写 report.json（轻量元数据，几 KB）
  writeJson(`sessions/${wakeId}/report.json`, {
    wakeId, timestamp, wakeLogPath,    // ← 关联到 wake-log
    duration: result.duration_ms,
    cost: result.total_cost_usd, turns: result.num_turns,
    tokens: result.usage, model: result.modelUsage
  });

  // 写 session.json（完整记录，可能几百 KB）
  writeJson(`sessions/${wakeId}/session.json`, {
    wakeId, messages: messages  // 所有 assistant/user/tool turns
  });

  // 在 wake-log 末尾追加 session 关联标记
  if (wakeLogPath) {
    appendToFile(wakeLogPath, `\n<!-- session: ${wakeId} -->\n`);
  }
```

| 文件 | 大小估算 | 内容 |
|------|---------|------|
| `report.json` | ~1-5 KB | wake-id、时间、费用、token、turns 数、模型 |
| `session.json` | ~100-500 KB | 完整对话记录（所有 turns + tool calls + tool results） |

Session archive 不在日常 wake cycle 中使用（太大），仅在 **weekly/monthly 深度反思**时由 Opus 按需读取特定 session 的详情。日常通过 wake-log 就够了。

#### 关联机制

`wakeId` 是贯穿所有记忆产物的唯一标识，格式为 `wake-{YYYY-MM-DD}-{HHMM}`。三者通过以下方式建立双向关联：

```
last-wake.json                 Wake-Log                          Session Archive
──────────────                 ────────                          ───────────────
{                              # Wake Log: 涩谷夜景速写           sessions/wake-2026-04-20-2130/
  "wakeId": "wake-...",          Wake ID: wake-2026-04-20-2130     ├── report.json
  "wakeLogPath":                 ...                               │   { "wakeId": "wake-...",
    "wake-logs/2026-04-20        ## Open Items                     │     "wakeLogPath": "wake-logs/..." }
     _2130_shibuya.md"           ...                               └── session.json
}                                <!-- session: wake-...-2130 -->
      │                                │                 │                    │
      │    wakeLogPath                 │  <!-- session:  │    wakeLogPath     │
      └────────────────►               └────────────────►│◄───────────────────┘
                                                         │
                                              sessions/{wakeId}/
```

| 方向 | 机制 | 说明 |
|------|------|------|
| last-wake → wake-log | `wakeLogPath` 字段 | 直接定位到本次的 wake-log 文件 |
| last-wake → session | `wakeId` 字段 | `sessions/{wakeId}/` 即为对应目录 |
| wake-log → session | 末尾 `<!-- session: {wakeId} -->` 注释 | 由外循环 CLEANUP 阶段追加（agent 写 wake-log 时不含此标记，Orchestrator 在 session 归档后补上） |
| session → wake-log | `report.json` 中的 `wakeLogPath` 字段 | 由外循环 CLEANUP 阶段写入（Orchestrator 扫描 wake-logs/ 目录匹配时间戳） |
| 关键词 → wake-log | `Grep wake-logs/ "关键词"` | 全文搜索 |
| wake-log → session（手动） | 从 wake-log 的 `Wake ID` 字段推导 | `sessions/{Wake ID}/` |

**归档时序（CLEANUP 阶段详细流程）：**

```
Session 结束
  → Orchestrator 写 sessions/{wakeId}/session.json（SDK 消息捕获）
  → Orchestrator 写 sessions/{wakeId}/report.json（元数据 + wakeLogPath）
  → Orchestrator 扫描 wake-logs/ 找到本次 agent 写的 wake-log 文件
  → Orchestrator 在该 wake-log 末尾追加 <!-- session: {wakeId} -->
  → 关联建立完成
```

#### Memory 检索路径

**日常 wake cycle（自动注入）：**
```
外循环读 last-wake.json → 注入 prompt → agent 直接获得上次上下文
  需要更多细节 → 从 wakeLogPath 读上次的 wake-log
```

**agent 需要更多历史（主动检索）：**
```
Grep wake-logs/ "关键词"
  → 读 wake-log 获取摘要和决策原因
  → 需要完整记录 → 从 <!-- session: {wakeId} --> 定位 sessions/{wakeId}/session.json
```

**weekly 深度反思：**
```
Glob wake-logs/*.md 获取本周所有 wake-log（摘要级，全部能塞进 context）
  → 识别模式和趋势
  → 需要深入分析某次决策 → 从 wake-log 的 session 标记跳转到完整 session archive
```

#### 4.2.4 工具脚本（供 Claude Code Bash 调用）

不做 SDK 级封装，只提供薄脚本让 Claude Code 在 session 中通过 Bash 调用：

```
scripts/
├── x-post.sh              # 发推文（支持纯文字和带图）
├── x-reply.sh             # 回复推文（仅限 mention/quote 的回复）
├── x-quote.sh             # 引用转发（主要主动互动方式）
├── x-retweet.sh           # 纯转发
├── x-timeline.sh          # 获取 timeline
├── x-mentions.sh          # 获取提及/通知
├── x-metrics.sh           # 获取帖子 engagement 数据
├── generate-image.sh      # 调用图片生成 API
└── db-query.sh            # SQLite 查询辅助
```

这些脚本是**简单的 curl/CLI 包装**，处理认证和参数格式化，不包含业务逻辑。

### 4.3 技术栈

| 组件 | 选型 | 理由 |
|------|------|------|
| 语言 | TypeScript | Orchestrator 使用，类型安全 |
| 运行时 | Node.js | 成熟稳定 |
| AI 引擎 | Claude Code Agent SDK (`@anthropic-ai/claude-agent-sdk`) | 内置完整 agent loop + 工具，不需自建 |
| AI 模型 | Claude Sonnet (日常) / Opus (深度反思) | Sonnet 够用且成本低，重要决策用 Opus |
| X API | Shell 脚本 + curl（X API v2, OAuth 2.0 PKCE） | 简单直接，Claude Code 通过 Bash 调用 |
| 图片生成 | DALL-E 3 / Stable Diffusion API (via curl) | 可切换 |
| 定时调度 | node-cron | 进程内调度，支持动态间隔 |
| 数据存储 | SQLite (better-sqlite3) | 轻量，单文件 |
| 文件记忆 | Markdown | 人类可读，Claude Code 原生支持读写 |

---

## 5. Agent 生命周期

### 5.1 单次唤醒周期（Wake Cycle）

每次 cron 触发后，系统执行一个完整的唤醒周期。外循环和内循环各有分工：

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

#### 外循环阶段

**PREPARE（准备）** — Orchestrator 执行：
- 读取 `last-wake.json`（上次 wake cycle 的快速摘要）
- 读取 persona.md、strategy.md、learnings.md、prompt_config.md
- 查询 SQLite 获取最近发帖记录和 engagement 摘要
- 计算当前时间在人设时区中的位置（早晨/工作/晚间等）
- 将以上信息拼装成一个完整的 system prompt（last-wake 摘要作为 `<previous-wake>` 块注入）
- 确定本次 session 的工具权限和 max-turns

**LAUNCH（启动）** — 通过 Agent SDK 启动 Claude Code session：
```typescript
for await (const message of query({
  prompt: assembledPrompt,
  options: {
    allowedTools: ["Read", "Edit", "Write", "Bash", "WebSearch", "WebFetch", "Glob", "Grep"],
    permissionMode: "bypassPermissions",
    maxTurns: 15,
    model: isReflectionCycle ? "claude-opus-4-6" : "claude-sonnet-4-5-20250929",
    outputFormat: {
      type: 'json_schema',
      schema: lastWakeSchema   // 强制返回结构化的 wake 摘要（见 4.2.3 写入可靠性保障）
    },
    hooks: {
      Stop: [{                 // 确保 agent 写了 wake-log 才允许结束（见 4.2.3）
        hooks: [ensureWakeLogHook(wakeId)]
      }]
    }
  }
})) {
  messages.push(message);
}
```

**CLEANUP（收尾）** — session 结束后：
- 归档 session：解析 session 输出，写入 `sessions/{wake-id}/session.json` 和 `report.json`
- 写入 `last-wake.json`（从 SDK 结构化输出提取）
- 记录本次 session 的 token 使用和费用
- **Git commit 所有变更**（agent 的代码修改、memory 更新、新脚本等全部入库）
- 标记当前 commit 为 "good commit"（供自愈机制使用，见第 8 章）
- 根据拟人化调度表计算下次唤醒时间
- 设置下次定时器

#### 内循环阶段（Claude Code Session 内自主执行）

以下 4 个阶段不是硬编码的代码流程，而是通过 **system prompt 引导** Claude 自主执行的行为模式：

**SENSE（感知）** — Claude Code 通过 Bash 工具自主收集信息：
- `bash scripts/x-mentions.sh` → 获取新提及和回复
- `bash scripts/x-metrics.sh` → 获取近期帖子的 engagement 数据
- `bash scripts/x-timeline.sh` → 浏览关注者的最新动态
- `Read memory/strategy.md` → 回顾当前策略
- 可选：`WebSearch` → 搜索设计/插画领域的趋势话题

**THINK（决策）** — Claude 基于感知到的信息 + 记忆 + 策略，自主决定行动：
- 现在适合发帖吗？发什么类型的内容？
- 有没有值得回复的提及或评论？
- 有没有值得互动的其他创作者内容？
- 是否需要生成配图？

**ACT（执行）** — Claude Code 通过工具直接执行：
- `bash scripts/generate-image.sh "prompt..."` → 生成图片
- `bash scripts/x-post.sh "content" --media image.png` → 发推文
- `bash scripts/x-quote.sh tweet_id "comment"` → 引用转发（主要主动互动方式）
- `bash scripts/x-reply.sh tweet_id "reply content"` → 回复 mention
- `bash scripts/x-retweet.sh tweet_id` → 转发
- `Write memory/content_plan.md` → 更新内容规划

**REFLECT（反思）** — Claude 回顾并更新记忆：
- 分析本次和近期的 engagement 数据
- `Edit memory/strategy.md` → 更新策略
- `Edit memory/learnings.md` → 记录新洞察
- `Edit memory/relationships.md` → 更新社交关系
- `Write memory/wake-logs/{date}_{time}_{topic}.md` → 写结构化 wake-log（做了什么、为什么、观察到什么）
- Session 结束时返回结构化 JSON → 外循环据此生成 `last-wake.json`（见 4.2.3 写入可靠性保障）

### 5.2 唤醒频率设计

为模拟真人行为模式，唤醒频率应不均匀：

```
时间段（人设时区）        唤醒频率        行为模式
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
07:00 - 09:00  早晨      每30-60分钟     起床，浏览 timeline，偶尔互动
09:00 - 12:00  上午      每60-90分钟     工作状态，可能发创作过程
12:00 - 14:00  午间      每45-60分钟     午休，较活跃的互动期
14:00 - 18:00  下午      每60-120分钟    工作状态，低频互动
18:00 - 22:00  晚间      每30-60分钟     最活跃时段，发成品、深度互动
22:00 - 01:00  深夜      每60-120分钟    随意浏览，偶尔发感想
01:00 - 07:00  睡眠      不唤醒          模拟睡眠
```

加入随机抖动（±15分钟）避免机械感。

---

## 6. 内容生成

### 6.1 内容类型

| 类型 | 频率 | 说明 |
|------|------|------|
| **原创图文** | 每天 1-3 条 | 插画作品 + 简短描述（主要增长引擎） |
| **纯文字想法** | 每天 1-2 条 | 对设计/生活的随想 |
| **引用转发** | 每天 1-5 条 | 引用别人的设计作品并加专业评论（主要主动互动方式） |
| **回复 mention** | 每天 0-10 条 | 回复提及自己的推文和评论（API 仅允许回复 mention/quote） |
| **转发** | 每天 0-3 条 | 纯转发优质内容 |

> **注：不做自动点赞**。自动点赞违反 X 自动化政策且是封号首因，增长贡献低，风险收益比不值得。
>
> **注：不做主动回复陌生人**。2026 年 2 月起 X API 限制自动回复只能回复 mention 或 quote 自己的推文。用引用转发代替——效果更好（自带内容传播），且完全合规。

### 6.2 图片生成策略

MVP 阶段采用风格化内容路线：

- **风格一致性**: 在图片生成 prompt 中固化风格关键词（参考 persona.md 中的 image_style）
- **主题契合**: 图片主题与文案内容匹配，由 agent 在 THINK 阶段一并规划
- **Prompt 模板**: 维护一套 base prompt，每次生成在此基础上变化

```
Base prompt 示例:
"minimal digital illustration, clean linework, soft muted color palette
with occasional vibrant accents, Japanese aesthetic influence,
architectural subject, white space composition, procreate style"

+ 具体主题: "a quiet Tokyo side street with a vintage coffee shop sign"
```

### 6.3 拟人化处理

为降低被检测为 bot 的风险：

- **发帖时间**: 严格遵循人设时区的作息规律，加入随机性
- **内容节奏**: 不过于规律，模拟人类的"有灵感就多发、没灵感就少发"
- **语言细节**: 偶尔的 typo（极少）、口语化表达、emoji 使用符合人设
- **行为模式**: 有时只浏览不发帖，有时集中发多条，模拟真实使用习惯
- **设备指纹**: API 调用不需要特别处理，但避免 metadata 泄露（如 user-agent）

---

## 7. 互动策略

### 7.1 X API 互动限制

2026 年 2 月起，X API 对自动化操作有明确限制：

| 操作 | API 状态 | Spectre 策略 |
|------|---------|-------------|
| 发布原创推文 | 完全允许 | 核心增长引擎 |
| 引用转发（带评论） | 完全允许 | 主要主动互动方式 |
| 纯转发 | 完全允许 | 适度使用 |
| 回复 mention/quote | 允许 | 被动互动 |
| 回复任意推文 | **API 拒绝**（非 Enterprise） | 不做 |
| 自动点赞 | API 可用但**违反政策** | 不做 |

### 7.2 互动对象选择

Agent 需要自主构建社交圈，策略围绕合规操作设计：

**主动互动（涨粉策略）——以引用转发为核心：**
- 通过 WebSearch / timeline 发现设计/插画领域的优质内容
- 引用转发并附上专业评论（展示审美和专业视角，而非泛泛的"nice work!"）
- 引用转发会出现在对方的通知中，自然建立连接
- 转发优质内容，维持社交存在感

**被动互动（维系策略）——回复 mention：**
- 及时回复提及自己的推文（@mention）
- 回复引用了自己帖子的推文（quote）
- 回复自己帖子下的评论
- 感谢转发和分享

### 7.3 互动质量准则

写入 agent 的 system prompt：
- 引用转发的评论必须有实质内容，展示专业视角（而非空洞赞美）
- 回复要体现人设的专业性和审美
- 避免模板化表达，每条都应该独特
- 控制互动频率，不要显得过于活跃

---

## 8. 自进化机制

### 8.1 设计哲学：Coding Agent = Self-Evolution

Spectre 的核心洞察：**agent 本身就是一个 coding agent，self-evolution 不需要专门的机制——它就是 coding 本身**。

传统 agent 的自进化受限于配置调整（改 JSON、改权重、改 prompt），因为 agent 没有修改自身代码的能力。但 Spectre 基于 Claude Code，天然具备完整的编程能力——它可以阅读、理解、修改项目中的**任何文件**：

| 发现的问题 | Agent 的应对（举例） |
|-----------|---------------------|
| Timeline 抓取遗漏了引用推文 | 修改 `scripts/x-timeline.sh`，增加 `--expansions` 参数 |
| 缺少分析 hashtag 趋势的能力 | 新建 `scripts/x-hashtag-trends.sh` |
| 发帖时间策略不够灵活 | 修改 `memory/schedule_config.md` |
| Prompt 拼装逻辑遗漏了 relationships | 修改 `src/prompt-builder.ts` |
| 需要一张新表追踪互动关系 | 修改 `scripts/db-query.sh`，加建表语句 |
| 图片生成的 base prompt 效果差 | 修改 `memory/strategy.md` 中的 prompt 模板 |
| 外循环日志格式不便于分析 | 修改 `src/logger.ts` |

**不限制 agent 能修改什么文件**。任何问题，agent 都可以通过"写代码"来解决。安全性通过 git + 自愈机制保障，而不是限制 agent 的能力（见 8.3、8.7）。

> 参考：[Karpathy autoresearch](https://github.com/karpathy/autoresearch) 采用约束设计（一个可变文件 + 一个标量指标），适合 ML 训练这种静态环境。社交媒体是动态环境 + 多维指标，需要更灵活的进化能力——而 coding agent 天然提供了这种灵活性。

### 8.2 Git 作为进化基础设施

每次 wake cycle 结束后，外循环自动 commit 所有变更：

```typescript
// CLEANUP 阶段
async function cleanup(result: SessionResult) {
  archiveSession(result);
  writeLastWake(result);

  // commit agent 的所有变更
  const diff = await gitDiffStat();
  if (diff) {
    await gitAddAll();
    await gitCommit(`wake: ${result.summary}\n\nwakeId: ${wakeId}`);
    markAsGoodCommit();  // 记录此 commit hash 为 "last good"
  }
}
```

**Git 的三重作用：**

| 作用 | 说明 |
|------|------|
| **进化历史** | `git log` 天然记录系统的每一步进化，每个 commit = 一次进化步 |
| **回滚能力** | 任何变更可精确回滚，包括单文件级别 |
| **自愈基础** | "last good commit" 机制支撑自愈（见 8.3） |

```
// git log 即进化历史
a3f2c1d wake: 优化发帖时间策略，修改 schedule_config.md
b7e4d2a wake: 发现 hashtag 抓取脚本遗漏引号话题，修复 x-timeline.sh
c9a1f3b wake: 新增竞品账号分析脚本 x-analyze-competitor.sh
d2b5e6c wake: 重构 prompt-builder.ts 加入情绪感知
e1f8a9d wake: 新建 db migration 脚本，增加 interactions 表
```

配合 wake-log 就知道每次进化的原因——git 记录 what changed，wake-log 记录 why。

### 8.3 自愈机制

Agent 修改基础设施代码（`src/` 下的 orchestrator、scheduler 等）时存在风险：这些代码在**下次 wake cycle 的外循环**中执行，agent 改完就退出了，无法在当次 session 中验证。如果改坏了，下次外循环直接崩溃，agent 没有机会醒来修复。

外循环内置自愈机制来应对此场景：

```typescript
async function wake() {
  const lastGoodCommit = readLastGoodCommit();

  try {
    const result = await runSession(assemblePrompt());
    await cleanup(result);        // cleanup 内执行 git commit
    markCurrentCommitAsGood();    // commit 成功后才标记为 good
  } catch (err) {
    // wake cycle 失败，检查是否是 agent 上次改坏了代码
    const changedFiles = gitDiffFiles(lastGoodCommit, 'HEAD');
    const infraFiles = changedFiles.filter(f => isInfrastructure(f));

    if (infraFiles.length > 0) {
      // 回滚被 agent 修改的基础设施文件
      gitRevertFiles(infraFiles, lastGoodCommit);
      notifyHuman(`Agent broke infrastructure, reverted: ${infraFiles}`);
      return wake();  // 回滚后重试
    } else {
      notifyHuman(`Wake cycle failed (external cause): ${err.message}`);
    }
  }
}
```

| 场景 | 自愈行为 |
|------|---------|
| Agent 改了 `prompt-builder.ts` 导致崩溃 | 自动回滚该文件到 last good commit，重试 |
| Agent 改了 `x-timeline.sh` 导致报错 | **不触发自愈**——脚本在 session 内执行，agent 自己能看到错误并修复 |
| 外部原因崩溃（API 挂了、网络断了） | **不触发自愈**——diff 中无基础设施变更，通知人类 |

> 注：agent 修改基础设施代码不会被阻止——鼓励 agent 大胆尝试。自愈机制只是一个安全网，确保改坏了不会砖掉系统。

### 8.4 进化的典型模式

虽然 agent 可以修改任何文件，但实践中进化会自然分层：

**日常进化（每次 wake cycle）**：修改 memory 文件和工具脚本
```markdown
# strategy.md (auto-updated by Spectre)
# Last updated: 2026-04-20 21:30 JST

## What's Working
- 建筑速写类内容互动率最高（avg likes 45 vs overall avg 20）
- 周二和周四晚间 8-9pm (JST) 发帖效果最好
- 对 @design_weekly 的引用转发能带来新粉丝

## What's Not Working
- 纯文字感想帖互动率低于预期
- 周末发帖频率太高，显得不自然

## Current Focus
- 增加建筑速写系列的比重
- 尝试"创作过程"类内容（WIP shots）

## Next Experiment
- 尝试发布 mini-tutorial 类内容，看是否能带来更多关注
```

**深度进化（weekly/monthly）**：修改配置、基础设施代码
```markdown
# prompt_config.md
# Last updated: 2026-05-01 (weekly reflection)

## Evaluation Weights
metrics_weights:
  likes: 0.2
  replies: 0.4              # ← 上次从 0.2 调到 0.4，replies 与涨粉强相关
  retweets: 0.2
  follower_delta: 0.2

## Change Log
# 2026-05-01: replies 权重 0.2→0.4 (reason: 过去两周 replies 与 follower_delta 相关系数 0.72)
```

**请求人类协助（proposals）**：agent 自身无法完成的操作

```markdown
# proposals.md

## Proposal #3 — 2026-05-15
**Type**: 新工具请求
**Proposal**: 接入 Pinterest API 搜索设计灵感
**Reason**: 目前只能通过 WebSearch 找灵感，Pinterest 的视觉内容质量更高
**Status**: pending

## Proposal #2 — 2026-05-08
**Type**: 账号操作
**Proposal**: 在 bio 中增加 "typography enthusiast"
**Reason**: 字体设计相关内容连续 3 周互动率 top
**Status**: approved ✓
```

### 8.5 反思周期与模型选择

| 周期 | 频率 | 模型 | 典型进化动作 |
|------|------|------|-------------|
| **Micro** | 每次 wake cycle | Sonnet | 更新 strategy/content_plan，修复脚本 bug |
| **Daily** | 每天一次 | Sonnet | 日度复盘，更新 learnings.md，总结数据趋势 |
| **Weekly** | 每周一次 | **Opus** | 深度分析，修改 prompt_config / schedule_config / 脚本逻辑 |
| **Monthly** | 每月一次 | **Opus** | 全面评估，修改基础设施代码，提出 proposals |

Weekly 和 Monthly 的深度反思是**独立的 session**，与日常 wake cycle 分开，外循环通过不同的 prompt 模板触发。输入材料：
- 本周/月所有 `wake-logs/*.md`（摘要级，全部注入 context）
- 当前所有 memory 文件状态
- SQLite 中的 engagement 数据汇总
- `git log` 查看近期的代码变更和进化轨迹
- 按需读取特定 `sessions/{wake-id}/session.json`（完整记录，用于归因分析）

### 8.6 数据采集

每次 SENSE 阶段采集，存入 SQLite：

```typescript
interface EngagementMetrics {
  postId: string;
  type: 'original' | 'reply' | 'retweet' | 'quote';
  contentCategory: string;     // 内容分类（agent 自行标注）
  hasImage: boolean;
  postedAt: Date;
  metrics: {
    likes: number;
    retweets: number;
    replies: number;
    impressions: number;
    profileVisits: number;
  };
  followerDelta: number;       // 发帖后粉丝变化
}
```

### 8.7 进化的安全机制

| 机制 | 说明 |
|------|------|
| **Git 版本控制** | 所有变更自动 commit，任何时刻可精确回滚到任意历史状态 |
| **自愈机制** | 外循环检测到 agent 改坏基础设施代码时自动回滚（见 8.3） |
| **外循环硬限制** | 频率限制、费用上限在外循环代码中强制执行，agent 无法绕过 |
| **核心身份保护** | persona.md 的 name / identity / background / personality 由外循环在 CLEANUP 时校验，若被篡改则回滚并告警 |
| **Operator 通知** | 基础设施代码（`src/`）变更自动通知 Operator |
| **效果验证** | Weekly 深度反思时验证上次变更的效果，无正面效果则考虑回滚 |

---

## 9. 安全与监控

### 9.1 安全边界

- **内容安全**: 不生成 NSFW、仇恨言论、政治敏感内容
- **互动安全**: 不参与争吵、不回复恶意内容、不传播虚假信息
- **频率安全**: 硬编码每日最大发帖/互动次数上限，防止异常行为
- **花费安全**: 设置 API 调用费用上限（Claude API + 图片生成 + X API）

### 9.2 Operator 监控面板

提供简单的状态查看能力（MVP 可以是 CLI 命令）：

```bash
spectre status          # 当前状态、最近一次唤醒时间、今日行动摘要
spectre metrics         # engagement 数据趋势
spectre history         # 最近 N 条发帖/互动记录
spectre logs            # 决策日志
spectre pause / resume  # 暂停/恢复运行
```

### 9.3 紧急机制

- **Kill Switch**: 一键暂停所有活动
- **Content Review**: 可开启"发布前人工审核"模式（debug 用）
- **Rate Limiter**: 硬性频率限制，即使 agent 决策要高频发帖也不允许超限

---

## 10. MVP 范围

### Phase 1: MVP（核心闭环）

**目标**: 跑通"外循环调度 → Claude Code session 自主执行完整 wake cycle"的闭环

**外循环 (TypeScript):**
- [ ] Orchestrator：组装 prompt → 启动 Agent SDK session → 收尾处理
- [ ] Scheduler：拟人化定时调度（作息模式 + 随机抖动）
- [ ] Prompt Builder：读取 persona + memory + metrics，拼装 system prompt
- [ ] Safety：频率限制、费用上限
- [ ] CLI：status / logs / pause

**工具脚本 (Shell):**
- [ ] X API 脚本：发推、回复、引用转发、转发、读取 timeline、获取 mentions 和 metrics
- [ ] SQLite 辅助脚本

**Memory:**
- [ ] persona.md 模板
- [ ] 初始 strategy.md / learnings.md / prompt_config.md
- [ ] SQLite schema（posts, metrics, interactions）
- [ ] last-wake.json 读写 + 自动注入 prompt
- [ ] wake-logs/ 目录 + wake-log 模板
- [ ] sessions/ 目录 + session 归档逻辑（CLEANUP 阶段自动保存）

**内循环 (System Prompt 引导):**
- [ ] Wake cycle prompt：引导 Claude 完成 SENSE → THINK → ACT → REFLECT
- [ ] REFLECT 阶段写 wake-log（Stop hook 保障）
- [ ] CLEANUP 阶段写 last-wake.json（outputFormat 结构化输出）
- [ ] 内容生成：纯文字帖 + 基础回复

### Phase 2: 视觉能力

- [ ] 图片生成脚本：接入 image API
- [ ] 更新 system prompt：引导 agent 自主决定是否配图及图片内容

### Phase 3: 自进化

- [ ] 日常进化：Engagement 数据采集、Daily 复盘、strategy.md 自动更新
- [ ] 深度进化：Weekly/Monthly 深度反思 session（Opus），agent 可修改任意文件（含脚本和基础设施代码）
- [ ] Proposals 机制：proposals.md 提案 + Operator 通知
- [ ] Git 进化基础设施：每次 wake cycle 自动 commit、good commit 追踪
- [ ] 自愈机制：基础设施代码变更检测 + 自动回滚 + Operator 通知

### Phase 4: 增长

- [ ] 主动互动策略（寻找互动对象、社交圈构建）
- [ ] 内容实验框架（A/B test 不同类型内容）
- [ ] Instagram 支持

---

## 11. 项目结构

```
spectre/
├── src/
│   ├── orchestrator.ts            # 核心：生命周期编排、session 启动
│   ├── scheduler.ts               # 拟人化定时调度（作息模式 + 随机抖动）
│   ├── prompt-builder.ts          # Prompt 组装（persona + memory + context）
│   ├── safety.ts                  # 安全护栏（频率限制、费用上限）
│   ├── logger.ts                  # 日志记录
│   ├── config.ts                  # 系统配置
│   └── cli.ts                     # CLI 命令入口 (status/logs/pause)
├── scripts/                       # 供 Claude Code session 内 Bash 调用的薄脚本
│   ├── x-post.sh                  # 发推文
│   ├── x-reply.sh                 # 回复推文（仅限 mention/quote）
│   ├── x-quote.sh                 # 引用转发
│   ├── x-retweet.sh               # 纯转发
│   ├── x-timeline.sh              # 获取 timeline
│   ├── x-mentions.sh              # 获取提及/通知
│   ├── x-metrics.sh               # 获取 engagement 数据
│   ├── generate-image.sh          # 调用图片生成 API
│   └── db-query.sh                # SQLite 查询辅助
├── memory/                        # Agent 的工作空间（agent 可自由修改所有文件）
│   ├── persona.md                 # 人设定义（core identity 由外循环保护）
│   ├── strategy.md                # 运营策略
│   ├── learnings.md               # 经验洞察
│   ├── content_plan.md            # 内容规划
│   ├── relationships.md           # 社交关系
│   ├── prompt_config.md           # Prompt/评估配置
│   ├── schedule_config.md         # 唤醒调度配置
│   ├── proposals.md               # Operator 提案（需要人类操作的事项）
│   ├── last-wake.json             # 上次 wake cycle 摘要（自动注入下次 prompt）
│   ├── wake-logs/                 # 每次 wake cycle 的结构化摘要
│   │   └── {YYYY-MM-DD}_{HHMM}_{topic}.md
│   └── sessions/                  # Session 完整归档（供深度反思使用）
│       └── {wake-id}/
│           ├── session.json       # 完整对话记录
│           └── report.json        # 轻量元数据
├── data/
│   └── spectre.db                 # SQLite: 发帖记录、metrics、互动历史
├── logs/                          # 运行日志
├── package.json
├── tsconfig.json
└── .env                           # API keys (X API, Anthropic, Image API)
```

**对比之前的设计，代码量大幅缩减**：
- 去掉了 `brain/` 目录 — 决策逻辑全在 Claude Code session 内，不需要代码实现
- 去掉了 `tools/` 目录 — 不需要 TypeScript 封装 X API / 图片 API，用 shell 脚本即可
- 去掉了 `memory/` 的 TypeScript 封装 — Claude Code 原生支持文件读写
- `src/` 从 15 个文件缩减到 7 个，全部是外循环逻辑

---

## 12. 成功指标

| 指标 | MVP 目标（1个月） | 中期目标（3个月） |
|------|-------------------|-------------------|
| 粉丝数 | 100+ | 1,000+ |
| 平均帖子互动率 | >2% | >5% |
| 日均发帖量 | 2-5 条 | 3-8 条 |
| 人设一致性 | 人工评估通过 | 社区无人质疑 |
| 自进化证据 | strategy.md 有自主更新 | 可观察到策略优化效果 |
| 系统稳定性 | 连续运行 7 天无故障 | 连续运行 30 天无故障 |

---

## 附录 A: 竞品/参考项目

| 项目 | 关系 |
|------|------|
| [ElizaOS](https://github.com/elizaOS/eliza) | 最接近的开源框架，但偏 Web3，自进化能力弱 |
| [Moltbook](https://en.wikipedia.org/wiki/Moltbook) / [OpenClaw](https://en.wikipedia.org/wiki/OpenClaw) | AI agent 社交网络，验证了 agent 社交的可行性 |
| AI 虚拟网红工具（Higgsfield 等） | 只做内容生成，无自主决策和进化 |
| [Self-Evolving Agents (OpenAI)](https://developers.openai.com/cookbook/examples/partners/self_evolving_agents/autonomous_agent_retraining) | 自进化架构参考 |
| [karpathy/autoresearch](https://github.com/karpathy/autoresearch) | 自进化循环设计参考（约束 + 标量指标 + 复合迭代） |
| [Sibyl System](https://github.com/Sibyl-Research-Team/AutoResearch-SibylSystem) | Lesson extraction + 时间加权衰减 + 自动 prompt 精炼 |
| nanoclaw (内部项目) | 三层记忆架构、session 归档、last-session 上下文注入、work-log 结构化摘要 |

## 附录 B: 待讨论

- System prompt 的具体设计（wake cycle 引导 prompt 的措辞和结构）
- 图片生成的具体 API 选型和风格固化方案
- X API 调用成本估算与预算（pay-per-use 模型：发帖 $0.01/条、读取 $0.005/条、互动 $0.015/次，预估 $100-200/月）
- X API OAuth 2.0 认证方案（user-context 操作需要 OAuth 2.0 with PKCE，token refresh 机制）
- 长期运行的基础设施方案（本地 / VPS / 云函数）
- Phase 2 考虑：浏览器自动化（Playwright）绕过 API 限制，实现主动回复和点赞（参考 nanoclaw IPC + Playwright 方案）
- Git 仓库体积管理（session archive 和 SQLite 的增长控制，考虑 .gitignore 或定期归档）
