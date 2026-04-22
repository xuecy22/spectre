# Prompt Builder

> 源码：`src/runtime/prompt-builder.ts`

## 职责

读取 persona + memory + 运行时上下文，拼装完整的 system prompt 传给 Claude Code session。

## 输入源

| 来源 | 说明 |
|------|------|
| `memory/persona.md` | 人设定义 |
| `memory/strategy.md` | 当前运营策略 |
| `memory/learnings.md` | 经验洞察 |
| `memory/prompt_config.md` | Prompt 配置（评估权重等） |
| `memory/last-wake.json` | 上次 wake cycle 摘要 |
| Drives 计算结果 | 当前内驱力状态（→ [drives](drives.md)） |
| SQLite 查询结果 | 最近发帖记录和 engagement 摘要 |
| 当前时间 | 计算人设时区中的时段（早晨/工作/晚间等） |

## 组装逻辑

1. 读取所有输入源
2. 计算当前时间在人设时区中的位置
3. 将 `last-wake.json` 内容注入为 `<previous-wake>` 块
4. 将 drives 注入为 `<internal-state>` 块（自然语言描述，非纯数值）
5. 将 engagement 趋势注入为 `<environment-feedback>` 块（叙事型 reward 的载体）
6. 按模板拼装完整 system prompt

Prompt 模板定义在 `src/runtime/prompts/` 下：

| Session 类型 | 模板文档 | 状态 |
|-------------|---------|------|
| 日常 wake cycle | [wake-cycle](prompts/wake-cycle.md) | 已定义 |
| Daily reflection | 待补充 | 待实现 |
| Weekly reflection | 待补充 | 待实现 |
| Monthly reflection | 待补充 | 待实现 |

## 约束

- 不做内容决策，只负责信息拼装
- 不同类型的 session（日常 / daily / weekly / monthly）使用不同的 prompt 模板
