# Task T12: Scripts（工具脚本）

## 目标

创建 Bash 脚本供 Claude Code session 调用 X API 和图片生成 API。

## 脚本列表

```bash
src/runtime/scripts/
├── x-post.sh           # 发推文
├── x-reply.sh          # 回复
├── x-quote.sh          # 引用转发
├── x-timeline.sh       # 获取时间线
├── x-mentions.sh       # 获取 mentions
├── x-metrics.sh        # 获取账号指标
└── image-gen.sh        # 生成图片（调用 DALL-E 或其他 API）
```

## 实现约束

- 参考 PRD 第 5.4 节
- 使用 curl 调用 X API v2
- 从环境变量读取 API credentials
- 返回 JSON 格式输出
- 错误处理：返回非零退出码

## 验收标准

见 tests/runtime/scripts.test.ts
