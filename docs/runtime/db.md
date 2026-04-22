# Database

> 源码：`src/runtime/db.ts`

## 职责

SQLite 数据库管理，存储 engagement metrics 和 wake cycle 快照，供策略分析和进化报告生成。

## 存储位置

`data/spectre.db`

## 数据采集

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

## Wake Cycle 快照

每次 CLEANUP 阶段，Orchestrator 将本次 wake cycle 的完整快照写入 SQLite，用于趋势分析和进化报告生成（→ [report](report.md)）：

```sql
CREATE TABLE wake_snapshots (
  wake_id          TEXT PRIMARY KEY,
  timestamp        TEXT NOT NULL,
  time_of_day      TEXT NOT NULL,
  -- drives（每次 wake cycle 的内驱力快照，用于绘制 motivation 曲线）
  creative_energy  REAL NOT NULL,
  social_hunger    REAL NOT NULL,
  curiosity        REAL NOT NULL,
  confidence       REAL NOT NULL,
  -- 行为
  actions          TEXT NOT NULL,  -- JSON: [{"type":"post","summary":"..."}]
  -- 进化信号
  memory_updates   TEXT,           -- JSON: ["strategy.md: 调高建筑速写权重"]
  observations     TEXT,
  pending_items    TEXT,
  -- metrics
  new_followers    INTEGER DEFAULT 0,
  total_followers  INTEGER DEFAULT 0,
  -- session 元数据
  cost_usd         REAL,
  turns            INTEGER
);
```

`memory_updates` 是进化可观测性的关键字段——记录 agent 每次自主修改了哪些 memory 文件及原因，用于在报告中标注进化事件。

## 读取时机

- PREPARE 阶段：Orchestrator 查询最近发帖记录和 engagement 摘要，注入 prompt
- SENSE 阶段：agent 通过 `scripts/db-query.sh` 查询历史数据
- 深度反思 session：汇总分析趋势
- `spectre report`：读取 `wake_snapshots` + `engagement_metrics` 生成进化报告（→ [report](report.md)）
