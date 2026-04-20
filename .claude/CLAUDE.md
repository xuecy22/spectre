# Spectre 项目指南

## 项目概述

Spectre 是一个自我进化的 AI agent，自主运营 X/Twitter 账号。

核心架构：
- **外循环（Orchestrator）**：调度、prompt 组装、session 启动/收尾
- **内循环（Claude Code Session）**：感知、决策、执行、反思

## 代码风格

- TypeScript strict mode
- 函数式优先，避免类
- 接口优先于类型别名
- 错误处理：throw Error，不用 try-catch 包裹顶层
- 异步函数使用 async/await
- 文件命名：kebab-case（如 session-runner.ts）
- 导出：优先使用命名导出而非默认导出

## 测试要求

- 使用 vitest
- Mock 所有外部 API（X API, Anthropic API, Image API）
- 测试文件与源文件结构对应
- 测试文件命名：`*.test.ts`

## PRD 关键概念

- **Wake cycle**：一次完整的唤醒周期（SENSE → THINK → ACT → REFLECT）
- **Memory 三层**：Live Memory + Wake-Log + Session Archive
- **Self-evolution**：agent 可修改任何文件，安全靠 git + 自愈

## 依赖管理

- 使用 Claude Agent SDK 启动 Claude Code sessions
- 使用 better-sqlite3 管理本地数据库
- 使用 node-cron 实现定时调度

## 项目结构

```
src/
├── core/              # 共享核心模块（构建时 + 运行时）
├── build/             # 构建时专用
└── runtime/           # 运行时专用
```
