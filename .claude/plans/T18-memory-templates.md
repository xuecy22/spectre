# Task T18: Memory Templates（记忆模板文件）

## 目标

创建 memory/ 目录下的初始模板文件。

## 文件列表

```
memory/
├── persona.md              # 人设定义
├── strategy.md             # 运营策略
├── learnings.md            # 经验洞察
├── content_plan.md         # 内容规划
├── relationships.md        # 社交关系
├── prompt_config.md        # Prompt 配置
├── schedule_config.md      # 调度配置
└── proposals.md            # Operator 提案
```

## 实现约束

- 参考 PRD 第 4.4 节
- 每个文件包含结构化的 markdown 模板
- persona.md 包含示例人设（Kira）
- 其他文件包含空模板和注释说明

## 验收标准

见 tests/runtime/memory-templates.test.ts
