# 系统架构

## 设计基础：五维框架

Spectre 作为 self-evolving engine，设计围绕五个核心维度展开：

| 维度 | 核心问题 | 谁控制 |
|------|---------|--------|
| **Observation Space** | agent 能感知什么 | 可被 agent 扩展（写新脚本、新工具） |
| **Action Space** | agent 能做什么 | 分层 L0-L4，高层 action 可扩展 |
| **Motivation** | agent 为什么要做 | drives 由 system loop 计算（潜意识）；goals 由 agent 自己设定 |
| **Reward** | 做了之后怎么评价 | 叙事型：环境反馈 + drives 状态注入 prompt，agent 自己解读 |
| **Terminal Condition** | 什么时候停 | 多层：wake cycle / daily / phase / life |

### Observation Space

三层感知能力：

- **环境观察**：X/Twitter（mentions、timeline、metrics、followers）、时间、WebSearch
- **自我观察**：memory 文件（strategy、learnings、relationships）、wake-logs、last-wake
- **元观察**：自己的代码（src/、scripts/、prompts/）、进化历史（git log）、评估标准（prompt_config）

Observation space 可被 agent 扩展——agent 可以写新脚本来获取新的信息源。

### Action Space

分层结构，从低风险到高风险：

| 层 | 动作类型 | 频率 | 风险 | 例子 |
|---|---------|------|------|------|
| L0 | 外部行为 | 每次 wake cycle | 低 | post、reply、quote、retweet |
| L1 | 记忆更新 | 每次 wake cycle | 低 | 改 strategy.md、learnings.md |
| L2 | 工具进化 | 偶尔 | 中 | 改 scripts/、新建工具 |
| L3 | 认知进化 | 少 | 高 | 改 prompts/、prompt_config |
| L4 | 基础设施进化 | 极少 | 极高 | 改 src/、drives 公式 |

Action space 可被 agent 扩展——agent 可以发明新的行为类别。

### Motivation

两层驱动：

- **Drives（潜意识）**：creative_energy、social_hunger、curiosity、confidence。由 system loop 在 PREPARE 阶段用公式计算，注入 prompt 作为 `<internal-state>`。Agent 能感知但不直接修改。详见 → [drives](runtime/drives.md)
- **Goals（意志）**：agent 在 memory/strategy.md 中自己设定和调整的目标。短期（这周试什么）、中期（建立什么关系）、长期（成为什么样的声音）。

### Reward

叙事型，不是标量。System loop 将环境反馈（metrics 变化、follower 趋势、互动质量）和 drives 状态注入 prompt，agent 在 REFLECT 阶段自己解读"最近怎么样"并据此调整策略。

不定义数值 reward function。Agent 的"reward 解读能力"本身是可进化的（通过修改 prompt_config 和 strategy）。

### Terminal Condition

多层终止：

| 层级 | 触发 | 行为 |
|------|------|------|
| **Wake cycle** | agent 主动结束 / maxTurns | 正常 CLEANUP |
| **Daily** | 进入睡眠时段 | 触发 daily reflection，drives 向基线衰减 |
| **Phase** | 达到 phase transition 条件 | 解锁新能力、调整参数 |
| **Life** | Operator 决定 / 身份崩塌 / 环境不可用 | Graceful shutdown |

详见 → [orchestrator](runtime/orchestrator.md)。

### 不可变的边界

五个维度中，几乎一切都可进化。唯二不可变的：

1. **System loop 骨架**：调用顺序（PREPARE → LAUNCH → CLEANUP）、自愈逻辑、drives 计算的触发时机
2. **Core identity**：persona 的名字、身份、背景、性格（→ [safety](runtime/safety.md)）

这两个构成了"自我"的边界。其他一切——observation space、action space、motivation 公式、reward 解读、terminal 条件——都是可进化的。

---

## 双循环架构

Spectre 采用"外循环 + 内循环"的双循环架构，核心思想是：**不重新发明轮子**。

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

## 自进化哲学：Coding Agent = Self-Evolution

**核心洞察：Spectre 的执行引擎是 Claude Code——一个完整的 coding agent——agent 天然具备修改自身任何代码、脚本、配置的能力。self-evolution 不需要专门的机制，它就是 coding 本身。**

| 发现的问题 | Agent 的应对（举例） |
|-----------|---------------------|
| Timeline 抓取遗漏了引用推文 | 修改 `scripts/x-timeline.sh`，增加 `--expansions` 参数 |
| 缺少分析 hashtag 趋势的能力 | 新建 `scripts/x-hashtag-trends.sh` |
| Prompt 拼装逻辑遗漏了 relationships | 修改 `src/runtime/prompt-builder.ts` |
| 图片生成的 base prompt 效果差 | 修改 `memory/strategy.md` 中的 prompt 模板 |
| 外循环日志格式不便于分析 | 修改 `src/runtime/logger.ts` |

不限制 agent 能修改什么文件。安全性通过 git + 自愈机制保障（→ [safety](runtime/safety.md)、[git](core/git.md)）。

> 参考：[Karpathy autoresearch](https://github.com/karpathy/autoresearch) 采用约束设计（一个可变文件 + 一个标量指标），适合 ML 训练这种静态环境。社交媒体是动态环境 + 多维指标，需要更灵活的进化能力——而 coding agent 天然提供了这种灵活性。

### 四层进化模式

| 周期 | 频率 | 模型 | 典型进化动作 |
|------|------|------|-------------|
| **Micro** | 每次 wake cycle | Sonnet | 更新 strategy/content_plan，修复脚本 bug |
| **Daily** | 每天一次 | Sonnet | 日度复盘，更新 learnings.md，总结数据趋势 |
| **Weekly** | 每周一次 | **Opus** | 深度分析，修改 prompt_config / schedule_config / 脚本逻辑 |
| **Monthly** | 每月一次 | **Opus** | 全面评估，修改基础设施代码，提出 proposals |

Weekly/Monthly 的深度反思是独立 session，与日常 wake cycle 分开。详见 → [orchestrator](runtime/orchestrator.md)。

## 模块总览

```
src/
├── core/                          # 共享核心模块
│   ├── session-runner.ts          → docs/core/session-runner.md
│   └── git.ts                     → docs/core/git.md
└── runtime/                       # 运行时模块
    ├── orchestrator.ts            → docs/runtime/orchestrator.md
    ├── scheduler.ts               → docs/runtime/scheduler.md
    ├── prompt-builder.ts          → docs/runtime/prompt-builder.md
    ├── safety.ts                  → docs/runtime/safety.md
    ├── drives.ts                  → docs/runtime/drives.md
    ├── memory.ts                  → docs/runtime/memory.md
    ├── db.ts                      → docs/runtime/db.md
    ├── logger.ts                  → docs/runtime/logger.md
    ├── cli.ts                     → docs/runtime/cli.md
    ├── report.ts                  → docs/runtime/report.md
    └── prompts/                   → docs/runtime/prompts/wake-cycle.md
        ├── base-prompt.ts
        ├── output-schema.ts
        └── wake-cycle.ts
```

其他目录：
- `scripts/` — 供 Claude Code session 内 Bash 调用的工具脚本 → [tools](scripts/tools.md)
- `memory/` — Agent 的工作空间（三层记忆）→ [memory](runtime/memory.md)
- `data/` — SQLite 数据库（→ [db](runtime/db.md)）、`.last-good-commit` 标记（→ [git](core/git.md)）

## 技术栈

| 组件 | 选型 | 理由 |
|------|------|------|
| 语言 | TypeScript (strict mode) | 类型安全 |
| 运行时 | Node.js 20+ | 成熟稳定 |
| AI 引擎 | Claude Code Agent SDK | 内置完整 agent loop + 工具，不需自建 |
| AI 模型 | Sonnet (日常) / Opus (深度反思) | Sonnet 够用且成本低，重要决策用 Opus |
| X API | Shell 脚本 + curl（X API v2, OAuth 2.0 PKCE） | 简单直接 |
| 图片生成 | DALL-E 3 / Stable Diffusion API (via curl) | 可切换 |
| 定时调度 | node-cron | 进程内调度，支持动态间隔 |
| 数据存储 | SQLite (better-sqlite3) | 轻量，单文件 |
| 文件记忆 | Markdown | 人类可读，Claude Code 原生支持读写 |

## Phase 规划

### Phase 1: MVP（核心闭环）

跑通"外循环调度 → Claude Code session 自主执行完整 wake cycle"的闭环。

- 外循环：Orchestrator + Scheduler + Prompt Builder + Safety + Drives + CLI
- 工具脚本：X API 全套 + SQLite 辅助
- Memory：persona 模板 + 初始配置 + last-wake + wake-logs + session 归档
- 内循环：Wake cycle prompt 引导 SENSE → THINK → ACT → REFLECT

**Phase transition → Phase 2**：连续 7 天无崩溃，wake cycle 闭环稳定运行。

### Phase 2: 视觉能力

- 图片生成脚本：接入 image API
- 更新 system prompt：引导 agent 自主决定是否配图

**Phase transition → Phase 3**：图片生成集成完成，30 天稳定运行，engagement 基线建立。

### Phase 3: 自进化

- 日常进化：Engagement 数据采集、Daily 复盘、strategy.md 自动更新
- 深度进化：Weekly/Monthly 深度反思 session（Opus）
- Proposals 机制 + Git 进化基础设施 + 自愈机制

**Phase transition → Phase 4**：agent 有可观察到的策略优化证据，自愈机制验证通过。

### Phase 4: 增长

- 主动互动策略（社交圈构建）
- 内容实验框架（A/B test）
- Instagram 支持

## 待讨论

- System prompt 的具体措辞和结构
- 图片生成的具体 API 选型和风格固化方案
- X API 调用成本估算与预算
- X API OAuth 2.0 认证方案（token refresh 机制）
- 长期运行的基础设施方案（本地 / VPS / 云函数）
- Phase 2 考虑：浏览器自动化（Playwright）绕过 API 限制
- Git 仓库体积管理（session archive 和 SQLite 的增长控制）
