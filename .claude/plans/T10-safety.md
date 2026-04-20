# Task T10: Safety（安全检查与自愈）

## 目标

实现安全检查机制，包括 persona core identity 保护和 git 自愈。

## 接口签名

```typescript
export interface SafetyCheckResult {
  passed: boolean;
  violations: string[];
}

export function checkPersonaIntegrity(
  personaPath: string
): SafetyCheckResult;

export function autoHeal(): Promise<boolean>;

export function validateRateLimit(
  actionType: string,
  count: number
): boolean;
```

## 实现约束

- 参考 PRD 第 5.5 节"安全护栏"
- 检查 persona.md 的 core identity 字段是否被篡改
- 使用 git diff 检测变更
- 自愈机制：git revert 到最近的 good commit
- 频率限制：每小时最多 10 次发帖

## 验收标准

见 tests/runtime/safety.test.ts
