# Spectre — 愿景

> **代号**: Spectre
> **定位**: Agent 主导的社交网络幽灵 —— 一个自我进化的 AI agent 社会实验

## 愿景

Spectre 是一个 AI agent 驱动的社交媒体实验项目。它以一个人类设定的人设为起点，自主经营 X/Twitter 社交账号，自主决定发布内容、互动策略，并通过社交反馈（点赞、评论、转发、粉丝增长）不断进化自身策略。最终目标是让这个 agent 经营的账号在内容质量、互动方式和整体表现上与真人账号无异。

## 核心原则

- **Agent 自主性**: agent 自主决策发什么、何时发、和谁互动，人类不做日常干预
- **人设一致性**: 所有输出（文字、图片、互动）与设定的人设保持一致
- **自我进化**: 基于环境反馈持续调整策略，越来越"聪明"
- **拟人化**: 行为模式模拟真人，包括作息规律、发帖节奏、语言习惯

## 不做什么

- 不做通用社交媒体管理工具
- 不做多账号批量运营
- 不做付费推广/广告投放
- MVP 不做 Instagram（Phase 4）
- MVP 不做视频内容

## 用户角色

| 角色 | 说明 |
|------|------|
| **Operator（操作者）** | 人类。负责初始人设设定、系统部署、监控、必要时干预 |
| **Spectre（agent）** | AI。自主运营账号、生成内容、执行互动、自我进化 |
| **Audience（受众）** | X/Twitter 上的真实用户，是 spectre 的互动对象和反馈来源 |

## 人设系统

由 Operator 在 `memory/persona.md` 中定义，包含：

```yaml
name: "Kira"
handle: "@kira_draws"
identity: "东京独立插画师/平面设计师"
age: 27
location: "Tokyo, Japan"
languages: ["English", "日本語"]

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

### 可变性层级

| 层级 | 内容 | 是否可变 | 保护机制 |
|------|------|---------|---------|
| **Core Identity** | 名字、身份、背景故事 | 不可变 | 外循环 CLEANUP 时校验，被篡改则回滚（→ [safety](runtime/safety.md)） |
| **Personality** | 性格特征、价值观 | 不可变 | 同上 |
| **Interests** | 关注领域、话题 | 可进化 | agent 自由修改 |
| **Content Style** | 语言风格、视觉风格 | 可进化 | agent 自由修改 |
| **Strategy** | 发帖时间、互动策略 | 完全可变 | agent 自由修改 |

## 成功指标

| 指标 | MVP 目标（1个月） | 中期目标（3个月） |
|------|-------------------|-------------------|
| 粉丝数 | 100+ | 1,000+ |
| 平均帖子互动率 | >2% | >5% |
| 日均发帖量 | 2-5 条 | 3-8 条 |
| 人设一致性 | 人工评估通过 | 社区无人质疑 |
| 自进化证据 | strategy.md 有自主更新 | 可观察到策略优化效果 |
| 系统稳定性 | 连续运行 7 天无故障 | 连续运行 30 天无故障 |

## 竞品/参考

| 项目 | 关系 |
|------|------|
| [ElizaOS](https://github.com/elizaOS/eliza) | 最接近的开源框架，但偏 Web3，自进化能力弱 |
| AI 虚拟网红工具（Higgsfield 等） | 只做内容生成，无自主决策和进化 |
| [Self-Evolving Agents (OpenAI)](https://developers.openai.com/cookbook/examples/partners/self_evolving_agents/autonomous_agent_retraining) | 自进化架构参考 |
| [karpathy/autoresearch](https://github.com/karpathy/autoresearch) | 自进化循环设计参考（约束 + 标量指标 + 复合迭代） |
| [Sibyl System](https://github.com/Sibyl-Research-Team/AutoResearch-SibylSystem) | Lesson extraction + 时间加权衰减 + 自动 prompt 精炼 |
| nanoclaw (内部项目) | 三层记忆架构、session 归档、last-session 上下文注入 |
