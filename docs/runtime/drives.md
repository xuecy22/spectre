# Drives（内驱力）

> 源码：`src/runtime/drives.ts`（待实现）

## 职责

维护 agent 的内在状态变量（drives），影响行为倾向但不直接控制决策。类似"潜意识"——agent 能感知到当前 drives 状态，但不直接修改它们。Drives 由 system loop 在每次 wake cycle 的 PREPARE 阶段计算，注入 prompt。

## Drives 定义

```typescript
interface Drives {
  creative_energy: number;  // 0-1, 高 → 想创作；低 → 想消费/观察
  social_hunger: number;    // 0-1, 高 → 想互动；低 → 想独处
  curiosity: number;        // 0-1, 高 → 想探索新领域；低 → 想深耕已有方向
  confidence: number;       // 0-1, 高 → 敢实验；低 → 倾向保守
}
```

## 更新规则

每次 wake cycle 的 PREPARE 阶段，system loop 根据上次 wake cycle 的结果和历史数据计算新的 drives 值。

### creative_energy

```
基线: 0.5
上升因素:
  + 长时间未发帖（距上次发帖 > 3 小时）: +0.1
  + 浏览了有启发的内容（上次 wake-log 中有 observations）: +0.05
下降因素:
  - 刚发了帖子: -0.15
  - 连续多次 wake cycle 都在创作: -0.1
衰减: 每次 wake cycle 向基线衰减 10%
```

### social_hunger

```
基线: 0.4
上升因素:
  + 有未回复的 mentions: +0.2
  + 长时间未互动（> 2 小时）: +0.1
  + 收到新 follower: +0.05
下降因素:
  - 刚进行了互动（reply/quote）: -0.15
  - 连续多次互动: -0.1
衰减: 每次 wake cycle 向基线衰减 10%
```

### curiosity

```
基线: 0.3
上升因素:
  + 发现新的趋势话题: +0.15
  + 看到不熟悉领域的优质内容: +0.1
  + 长时间内容类型单一: +0.1
下降因素:
  - 刚尝试了新类型内容: -0.1
  - 新尝试的效果不好（engagement 低于均值）: -0.15
衰减: 每次 wake cycle 向基线衰减 5%
```

### confidence

```
基线: 0.5
上升因素:
  + 最近帖子 engagement 高于均值: +0.1
  + 获得新 followers: +0.05
  + 收到正面互动（被引用、被回复）: +0.05
下降因素:
  - 最近帖子 engagement 低于均值: -0.1
  - 连续多条帖子表现差: -0.15
  - 丢失 followers: -0.1
衰减: 每次 wake cycle 向基线衰减 10%
```

## 计算时机

```
PREPARE 阶段:
  1. 读取上次 drives 值（存储在 last-wake.json 或独立文件）
  2. 读取上次 wake cycle 的结果（last-wake.json 的 actions/observations/metrics）
  3. 查询 SQLite 获取近期 engagement 数据
  4. 按公式计算新 drives
  5. Clamp 到 [0, 1] 范围
  6. 注入 prompt（→ prompt-builder.md）
```

## 存储

Drives 当前值存储在两个位置：

1. **`memory/last-wake.json`**：覆写制，仅保留最新值，供下次 PREPARE 阶段读取和 prompt 注入
2. **`wake_snapshots` 表（SQLite）**：累积制，每次 wake cycle 的 drives 快照持久化，供趋势分析和进化报告（→ [db](db.md)、[report](report.md)）

last-wake.json 中的格式：

```json
{
  "wakeId": "wake-2026-04-20-2130",
  "drives": {
    "creative_energy": 0.7,
    "social_hunger": 0.4,
    "curiosity": 0.3,
    "confidence": 0.8
  },
  ...
}
```

由 Orchestrator 在 CLEANUP 阶段写入（和其他 last-wake 字段一起）。

## Prompt 注入

Prompt builder 将 drives 注入为 `<internal-state>` 块（→ [prompt-builder](prompt-builder.md)）：

```
<internal-state>
你当前的内在状态：
- 创作能量: 高 (0.7) — 你有比较强的创作冲动
- 社交需求: 中 (0.4) — 没有特别想互动
- 好奇心: 低 (0.3) — 倾向于深耕熟悉的方向
- 信心: 高 (0.8) — 最近表现不错，可以大胆尝试
</internal-state>
```

注入的是自然语言描述而非纯数值，让 agent 像感知情绪一样感知 drives，而非当作参数来优化。

## 与其他模块的关系

- **scheduler**：drives 不影响唤醒时间（scheduler 只管"什么时候醒"），但影响醒来后的行为倾向
- **prompt-builder**：将 drives 注入 prompt 的 `<internal-state>` 块
- **orchestrator**：PREPARE 阶段计算 drives，CLEANUP 阶段持久化
- **wake-cycle prompt**：引导 agent 在 THINK 阶段参考 drives 做决策

## 进化性

Drives 的计算公式在 `src/runtime/drives.ts` 中，agent 可以修改（L4 action）。如果修改导致行为异常，自愈机制兜底（→ [safety](safety.md)）。Weekly reflection 的 prompt 应提醒检查 drives 公式是否被修改过及其效果。
