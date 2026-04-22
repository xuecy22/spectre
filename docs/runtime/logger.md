# Logger

> 源码：`src/runtime/logger.ts`

## 职责

结构化日志记录，输出到 console 和文件。

## 输出目标

- Console：实时输出
- 文件：`logs/` 目录

## 日志内容

- Wake cycle 生命周期事件（PREPARE / LAUNCH / CLEANUP）
- Session 元数据（duration、cost、turns）
- 安全事件（自愈触发、人设校验失败）
- 调度事件（下次唤醒时间）
