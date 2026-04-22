# Wake Cycle Prompt

> 源码：`src/runtime/prompts/base-prompt.ts`、`output-schema.ts`、`wake-cycle.ts`

## 职责

定义 Claude Code session 内的行为引导——通过 system prompt 引导 agent 自主执行 SENSE → THINK → ACT → REFLECT。

## 四阶段引导

以下 4 个阶段不是硬编码的代码流程，而是通过 system prompt 引导 Claude 自主执行的行为模式：

### SENSE（感知）

Claude Code 通过 Bash 工具自主收集信息：

- `bash scripts/x-mentions.sh` → 获取新提及和回复
- `bash scripts/x-metrics.sh` → 获取近期帖子的 engagement 数据
- `bash scripts/x-timeline.sh` → 浏览关注者的最新动态
- `Read memory/strategy.md` → 回顾当前策略
- 可选：`WebSearch` → 搜索设计/插画领域的趋势话题

### THINK（决策）

Claude 基于感知到的信息 + 记忆 + 策略 + 内在状态（drives），自主决定行动：

- 参考 `<internal-state>` 中的 drives：creative_energy 高时倾向创作，social_hunger 高时倾向互动
- 现在适合发帖吗？发什么类型的内容？
- 有没有值得回复的提及或评论？
- 有没有值得互动的其他创作者内容？
- 是否需要生成配图？
- 也可以决定"这次什么都不做"——这是合法的行为

### ACT（执行）

Claude Code 通过工具直接执行：

- `bash scripts/generate-image.sh "prompt..."` → 生成图片
- `bash scripts/x-post.sh "content" --media image.png` → 发推文
- `bash scripts/x-quote.sh tweet_id "comment"` → 引用转发
- `bash scripts/x-reply.sh tweet_id "reply content"` → 回复 mention
- `bash scripts/x-retweet.sh tweet_id` → 转发
- `Write memory/content_plan.md` → 更新内容规划

### REFLECT（反思）

Claude 回顾并更新记忆：

- 参考 `<environment-feedback>` 中的 engagement 趋势，解读"最近怎么样"
- 分析本次和近期的 engagement 数据
- `Edit memory/strategy.md` → 更新策略
- `Edit memory/learnings.md` → 记录新洞察
- `Edit memory/relationships.md` → 更新社交关系
- `Write memory/wake-logs/{date}_{time}_{topic}.md` → 写结构化 wake-log
- Session 结束时返回结构化 JSON（→ 外循环据此生成 `last-wake.json`）

Reward 是叙事型的：agent 不计算分数，而是从环境反馈和自身状态中自行提取 signal，决定下一步怎么调整。

## 输出 JSON Schema

SDK `outputFormat` 强制 agent 返回结构化结果：

```json
{
  "type": "object",
  "required": ["timestamp", "timeOfDay", "wakeLogPath", "actions", "observations", "metrics"],
  "properties": {
    "timestamp": { "type": "string", "description": "ISO 8601 格式的当前时间" },
    "timeOfDay": { "type": "string", "enum": ["morning", "noon", "afternoon", "evening", "night"] },
    "wakeLogPath": { "type": "string", "description": "本次写入的 wake-log 相对路径，如 wake-logs/2026-04-20_2130_topic.md" },
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

## 拟人化行为准则

写入 system prompt，降低被检测为 bot 的风险：

- 发帖时间严格遵循人设时区的作息规律，加入随机性
- 内容节奏不过于规律，模拟"有灵感就多发、没灵感就少发"
- 语言细节：偶尔的口语化表达、emoji 使用符合人设
- 行为模式：有时只浏览不发帖，有时集中发多条

## 互动质量准则

写入 system prompt：

- 引用转发的评论必须有实质内容，展示专业视角（而非空洞赞美）
- 回复要体现人设的专业性和审美
- 避免模板化表达，每条都应该独特
- 控制互动频率，不要显得过于活跃
