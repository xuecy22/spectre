# Report（进化报告）

> 源码：`src/runtime/report.ts`（待实现）

## 职责

从 SQLite 读取 wake cycle 历史数据，生成可分享的单文件 HTML 报告。面向 Operator 和外部人员（如投资人），直观展示 agent 的进化过程和运营效果。

## 核心问题

报告要回答一个问题：**这个 agent 真的在自主进化吗？**

回答需要两条线交织：
- **数据线**：follower 增长、engagement 趋势（证明在变好）
- **因果线**：策略变更事件 + 变更前后的数据对比（证明是自主进化导致的变好）

## 数据源

| 表 | 用途 |
|---|------|
| `wake_snapshots` | drives 曲线、进化事件（memory_updates）、activity 分布、follower 趋势 |
| `engagement_metrics` | engagement rate 趋势、内容类型效果对比 |

两张表通过时间轴对齐。

## 报告内容

### 1. Motivation 曲线

四条 drives 折线图（creative_energy / social_hunger / curiosity / confidence），展示 agent 的"情绪节律"。

投资人能看到：agent 不是机械执行，而是有内在状态波动——创作冲动高时多发帖，社交需求高时多互动。

### 2. Growth 曲线

- `total_followers` 趋势线
- 日均 engagement rate 趋势线（从 `engagement_metrics` 聚合）

### 3. Evolution 时间轴

从 `wake_snapshots` 中筛选 `memory_updates IS NOT NULL` 的记录，按时间排列。每个事件显示：
- 时间
- 修改了什么（strategy.md / learnings.md / prompt_config.md 等）
- 修改内容摘要
- 当时的 observations（触发修改的原因）

### 4. 因果关联视图

将 Evolution 时间轴的事件标注在 Growth 曲线上。投资人能直观看到：

> "第 3 天 agent 修改了 strategy.md（调高建筑速写权重）→ 之后 3 天 follower 增速从 5/天提升到 12/天"

### 5. Activity 热力图

按"星期 × 时段"聚合 wake cycle 次数，展示拟人化作息模式。证明 agent 的行为模式接近真人（有作息规律、有活跃/低频时段）。

### 6. 概览数据

报告顶部的关键数字：
- 运行天数
- 总 wake cycle 次数
- 当前 follower 数
- 平均 engagement rate
- 进化事件数（memory_updates 不为空的 wake cycle 数）
- 累计 API 费用

## 输出格式

单个自包含 HTML 文件：
- 内联 CSS + JS，无外部依赖
- 使用 Chart.js（CDN 内联）绘制图表
- 响应式布局，可在浏览器中直接打开
- 可通过邮件/Slack 直接分享

## CLI 集成

```bash
spectre report [--days N] [--out path]
```

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `--days` | 30 | 报告覆盖的天数 |
| `--out` | `report.html` | 输出文件路径 |

详见 → [cli](cli.md)

## 与其他模块的关系

- **db**：读取 `wake_snapshots` 和 `engagement_metrics` 表（→ [db](db.md)）
- **orchestrator**：CLEANUP 阶段写入 `wake_snapshots`，是报告的数据来源（→ [orchestrator](orchestrator.md)）
- **drives**：drives 历史数据通过 `wake_snapshots` 持久化（→ [drives](drives.md)）
