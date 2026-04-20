# Task T11: Prompt Builder（Prompt 组装器）

## 目标

组装 Claude Code session 的 system prompt，包含人设、记忆、上下文。

## 接口签名

```typescript
export interface PromptContext {
  wakeId: string;
  timestamp: Date;
  lastWake?: any;
}

export function assembleSystemPrompt(
  context: PromptContext
): string;

export function loadPersona(): any;
export function loadStrategy(): any;
export function loadLastWake(): any;
```

## 实现约束

- 参考 PRD 第 4.2、4.3 节
- 读取 memory/persona.md, memory/strategy.md
- 读取 memory/last-wake.json
- 组装成结构化的 system prompt
- 包含 wake cycle 指令（SENSE → THINK → ACT → REFLECT）

## 验收标准

见 tests/runtime/prompt-builder.test.ts
