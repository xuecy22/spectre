# Git 操作

> 源码：`src/core/git.ts`

## 职责

Git 版本控制操作，为自进化和自愈提供基础设施。

## Git 的三重作用

| 作用 | 说明 |
|------|------|
| **进化历史** | `git log` 天然记录系统的每一步进化，每个 commit = 一次进化步 |
| **回滚能力** | 任何变更可精确回滚，包括单文件级别 |
| **自愈基础** | "last good commit" 机制支撑自愈（→ [safety](../runtime/safety.md)） |

## Commit 流程

每次 wake cycle 结束后，外循环自动 commit 所有变更：

```typescript
async function cleanup(result: SessionResult) {
  archiveSession(result);
  writeLastWake(result);

  const diff = await gitDiffStat();
  if (diff) {
    await gitAddAll();
    await gitCommit(`wake: ${result.summary}\n\nwakeId: ${wakeId}`);
    // 注意：不在这里标记 good commit
    // agent 的修改可能改坏了基础设施代码，需要下次 PREPARE 成功后才能确认
  }
}
```

## Good Commit 追踪

- 存储位置：`data/.last-good-commit`
- 写入时机：wake cycle 开始时，PREPARE 成功后（证明当前 HEAD 的外循环代码能正常运行）
- 读取时机：wake cycle 启动失败时（供自愈机制使用）

```typescript
async function wake() {
  const lastGoodCommit = readLastGoodCommit();

  try {
    const prompt = assemblePrompt();   // PREPARE
    markCurrentCommitAsGood();         // PREPARE 成功 → 当前代码可用

    const result = await runSession(prompt);  // LAUNCH（agent 可能修改代码）
    await cleanup(result);                     // CLEANUP（commit agent 的修改，不更新 good commit）
  } catch (err) {
    // 自愈逻辑 → safety.md
  }
}
```

这样确保 good commit 始终指向一个"经过验证能跑"的版本，而非包含未验证 agent 修改的版本。

## 进化历史示例

```
a3f2c1d wake: 优化发帖时间策略，修改 schedule_config.md
b7e4d2a wake: 发现 hashtag 抓取脚本遗漏引号话题，修复 x-timeline.sh
c9a1f3b wake: 新增竞品账号分析脚本 x-analyze-competitor.sh
d2b5e6c wake: 重构 prompt-builder.ts 加入情绪感知
```

配合 wake-log 就知道每次进化的原因——git 记录 what changed，wake-log 记录 why。
