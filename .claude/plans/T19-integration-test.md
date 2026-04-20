# Task T19: Integration Test（集成测试）

## 目标

创建端到端集成测试，验证完整的 wake cycle。

## 测试场景

1. 完整 wake cycle（Mock 模式）
2. Scheduler 触发 wake cycle
3. Prompt 组装正确性
4. Session 归档完整性
5. 安全检查触发

## 实现约束

- 依赖 T09-T18 所有模块
- 使用 Mock X API 和 Claude API
- 验证文件系统状态
- 验证数据库记录

## 验收标准

见 tests/integration.test.ts
