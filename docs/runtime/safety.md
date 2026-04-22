# Safety

> 源码：`src/runtime/safety.ts`

## 职责

人设保护、自愈机制、硬限制、紧急机制。

## Action 层级与风险

Agent 的 action 分 L0-L4 层（→ [architecture](../architecture.md)）。高层 action 的约束：

| 层 | 风险 | 约束 |
|---|------|------|
| L0-L1 | 低 | 无特殊约束 |
| L2（改 scripts） | 中 | agent 在 session 内能直接验证效果 |
| L3（改 prompts/config） | 高 | 效果要到下次 wake cycle 才能验证；weekly reflection 应审查 |
| L4（改 src/、drives 公式） | 极高 | 自愈机制兜底；weekly reflection prompt 明确提醒检查此类修改 |

L3/L4 修改不被阻止——鼓励 agent 大胆尝试。但 weekly reflection（Opus）的 prompt 应包含："检查本周是否有 L3/L4 层的代码修改，评估其效果，必要时建议回滚。"

## 人设保护

Core Identity（名字、身份、背景、性格）不可变。CLEANUP 阶段校验：

1. PREPARE 阶段 snapshot persona 核心字段
2. Session 结束后重新读取 persona.md
3. 比对核心字段，若被篡改则回滚并告警

| 层级 | 保护方式 |
|------|---------|
| Core Identity + Personality | 外循环校验，被篡改则回滚 |
| Interests / Content Style / Strategy | agent 自由修改 |

## 自愈机制

Agent 修改基础设施代码（`src/` 下的文件）时存在风险：这些代码在下次 wake cycle 的外循环中执行，agent 改完就退出了，无法在当次 session 中验证。

```typescript
async function wake() {
  const lastGoodCommit = readLastGoodCommit();

  try {
    const prompt = assemblePrompt();   // PREPARE
    markCurrentCommitAsGood();         // PREPARE 成功 → 当前代码可用（→ git.md）

    const result = await runSession(prompt);  // LAUNCH
    await cleanup(result);                     // CLEANUP（commit 但不更新 good commit）
  } catch (err) {
    const changedFiles = gitDiffFiles(lastGoodCommit, 'HEAD');
    const infraFiles = changedFiles.filter(f => isInfrastructure(f));

    if (infraFiles.length > 0) {
      // 回滚被 agent 修改的基础设施文件
      gitRevertFiles(infraFiles, lastGoodCommit);
      notifyHuman(`Agent broke infrastructure, reverted: ${infraFiles}`);
      return wake();  // 回滚后重试
    } else {
      notifyHuman(`Wake cycle failed (external cause): ${err.message}`);
    }
  }
}
```

| 场景 | 自愈行为 |
|------|---------|
| Agent 改了 `prompt-builder.ts` 导致崩溃 | 自动回滚该文件到 last good commit，重试 |
| Agent 改了 `x-timeline.sh` 导致报错 | **不触发自愈**——脚本在 session 内执行，agent 自己能看到错误并修复 |
| 外部原因崩溃（API 挂了、网络断了） | **不触发自愈**——diff 中无基础设施变更，通知人类 |

> Agent 修改基础设施代码不会被阻止——鼓励大胆尝试。自愈只是安全网。

## 硬限制

在外循环代码中强制执行，agent 无法绕过：

- **频率限制**：每日最大发帖/互动次数上限
- **费用上限**：API 调用费用上限（Claude API + 图片生成 + X API）

## 紧急机制

- **Kill Switch**：一键暂停所有活动
- **Content Review**：可开启"发布前人工审核"模式（debug 用）
- **Rate Limiter**：硬性频率限制，即使 agent 决策要高频发帖也不允许超限

## 内容安全边界

- 不生成 NSFW、仇恨言论、政治敏感内容
- 不参与争吵、不回复恶意内容、不传播虚假信息

## 安全机制总览

| 机制 | 说明 |
|------|------|
| Git 版本控制 | 所有变更自动 commit，任何时刻可回滚（→ [git](../core/git.md)） |
| 自愈机制 | 基础设施代码变更检测 + 自动回滚 |
| 外循环硬限制 | 频率、费用在外循环强制执行 |
| 核心身份保护 | CLEANUP 时校验，被篡改则回滚 |
| Operator 通知 | 基础设施代码变更自动通知 |
| 效果验证 | Weekly 深度反思时验证变更效果 |
