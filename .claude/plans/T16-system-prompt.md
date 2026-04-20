# Task T16: System Prompt（系统提示词模板）

## 目标

创建 system prompt 模板文件，定义 agent 的行为准则。

## 文件列表

```
src/runtime/prompts/
├── base-prompt.ts       # 基础 prompt 模板
├── wake-cycle.ts        # Wake cycle 指令
└── output-schema.ts     # 结构化输出 schema
```

## 实现约束

- 参考 PRD 第 4.3 节
- 定义 SENSE → THINK → ACT → REFLECT 流程
- 包含人设注入点
- 包含 last-wake 注入点
- 定义 JSON Schema for outputFormat

## 验收标准

见 tests/runtime/system-prompt.test.ts
