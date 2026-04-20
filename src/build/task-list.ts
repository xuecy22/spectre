export interface Task {
  id: string;
  description: string;
  planFile: string;
  testFile: string;
  dependencies: string[];
  prdSections?: string[];
}

export const TASK_LIST: Task[] = [
  {
    id: 'T09',
    description: 'Scheduler - 定时调度器',
    planFile: '.claude/plans/T09-scheduler.md',
    testFile: 'tests/runtime/scheduler.test.ts',
    dependencies: [],
    prdSections: ['5.2'],
  },
  {
    id: 'T10',
    description: 'Safety - 安全检查与自愈',
    planFile: '.claude/plans/T10-safety.md',
    testFile: 'tests/runtime/safety.test.ts',
    dependencies: [],
    prdSections: ['5.5'],
  },
  {
    id: 'T11',
    description: 'Prompt Builder - Prompt 组装器',
    planFile: '.claude/plans/T11-prompt-builder.md',
    testFile: 'tests/runtime/prompt-builder.test.ts',
    dependencies: [],
    prdSections: ['4.2', '4.3'],
  },
  {
    id: 'T12',
    description: 'Scripts - 工具脚本',
    planFile: '.claude/plans/T12-scripts.md',
    testFile: 'tests/runtime/scripts.test.ts',
    dependencies: [],
    prdSections: ['5.4'],
  },
  {
    id: 'T13',
    description: 'DB - 数据库模块',
    planFile: '.claude/plans/T13-db.md',
    testFile: 'tests/runtime/db.test.ts',
    dependencies: [],
    prdSections: ['5.3'],
  },
  {
    id: 'T14',
    description: 'Memory - 记忆管理',
    planFile: '.claude/plans/T14-memory.md',
    testFile: 'tests/runtime/memory.test.ts',
    dependencies: [],
    prdSections: ['4.4', '5.3'],
  },
  {
    id: 'T15',
    description: 'Runtime Orchestrator - 运行时编排器',
    planFile: '.claude/plans/T15-orchestrator.md',
    testFile: 'tests/runtime/orchestrator.test.ts',
    dependencies: ['T09', 'T10', 'T11', 'T12', 'T13', 'T14'],
    prdSections: ['4.1', '4.2'],
  },
  {
    id: 'T16',
    description: 'System Prompt - 系统提示词模板',
    planFile: '.claude/plans/T16-system-prompt.md',
    testFile: 'tests/runtime/system-prompt.test.ts',
    dependencies: [],
    prdSections: ['4.3'],
  },
  {
    id: 'T17',
    description: 'CLI - 命令行入口',
    planFile: '.claude/plans/T17-cli.md',
    testFile: 'tests/runtime/cli.test.ts',
    dependencies: ['T15'],
    prdSections: [],
  },
  {
    id: 'T18',
    description: 'Memory Templates - 记忆模板文件',
    planFile: '.claude/plans/T18-memory-templates.md',
    testFile: 'tests/runtime/memory-templates.test.ts',
    dependencies: [],
    prdSections: ['4.4'],
  },
  {
    id: 'T19',
    description: 'Integration Test - 集成测试',
    planFile: '.claude/plans/T19-integration-test.md',
    testFile: 'tests/integration.test.ts',
    dependencies: ['T09', 'T10', 'T11', 'T12', 'T13', 'T14', 'T15', 'T16', 'T17', 'T18'],
    prdSections: [],
  },
];

export function getTask(id: string): Task | undefined {
  return TASK_LIST.find(t => t.id === id);
}

export function getCompletedTasks(completedIds: Set<string>): Task[] {
  return TASK_LIST.filter(t => completedIds.has(t.id));
}

export function getNextTask(completedIds: Set<string>): Task | undefined {
  return TASK_LIST.find(t =>
    !completedIds.has(t.id) &&
    t.dependencies.every(dep => completedIds.has(dep))
  );
}
