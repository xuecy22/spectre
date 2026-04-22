# 工具脚本

> 源码：`scripts/`

## 职责

供 Claude Code session 内通过 Bash 调用的薄脚本。只处理认证和参数格式化，不包含业务逻辑。

## 脚本列表

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

## X API 互动限制

2026 年 2 月起，X API 对自动化操作有明确限制：

| 操作 | API 状态 | Spectre 策略 |
|------|---------|-------------|
| 发布原创推文 | 完全允许 | 核心增长引擎 |
| 引用转发（带评论） | 完全允许 | 主要主动互动方式 |
| 纯转发 | 完全允许 | 适度使用 |
| 回复 mention/quote | 允许 | 被动互动 |
| 回复任意推文 | **API 拒绝**（非 Enterprise） | 不做 |
| 自动点赞 | API 可用但**违反政策** | 不做（封号首因，增长贡献低） |

## 互动策略

### 主动互动（涨粉）——以引用转发为核心

- 通过 WebSearch / timeline 发现设计/插画领域的优质内容
- 引用转发并附上专业评论（展示审美和专业视角，而非泛泛的"nice work!"）
- 引用转发会出现在对方的通知中，自然建立连接
- 转发优质内容，维持社交存在感

### 被动互动（维系）——回复 mention

- 及时回复提及自己的推文（@mention）
- 回复引用了自己帖子的推文（quote）
- 回复自己帖子下的评论
- 感谢转发和分享

## 内容类型

| 类型 | 频率 | 说明 |
|------|------|------|
| 原创图文 | 每天 1-3 条 | 插画作品 + 简短描述（主要增长引擎） |
| 纯文字想法 | 每天 1-2 条 | 对设计/生活的随想 |
| 引用转发 | 每天 1-5 条 | 引用别人的设计作品并加专业评论 |
| 回复 mention | 每天 0-10 条 | 回复提及自己的推文和评论 |
| 转发 | 每天 0-3 条 | 纯转发优质内容 |

> 具体频率和比例由 agent 在 `memory/strategy.md` 中自行调整。

## 图片生成

MVP 阶段采用风格化内容路线：

- **风格一致性**: 在图片生成 prompt 中固化风格关键词（参考 persona 的 image_style）
- **主题契合**: 图片主题与文案内容匹配，由 agent 在 THINK 阶段一并规划
- **Prompt 模板**: 维护一套 base prompt，每次生成在此基础上变化

```
Base prompt 示例:
"minimal digital illustration, clean linework, soft muted color palette
with occasional vibrant accents, Japanese aesthetic influence,
architectural subject, white space composition, procreate style"

+ 具体主题: "a quiet Tokyo side street with a vintage coffee shop sign"
```
