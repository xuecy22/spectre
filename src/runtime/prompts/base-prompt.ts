/**
 * Base Prompt Template
 *
 * 组装完整的 system prompt，包含：
 * - 人设注入
 * - 上次 wake cycle 上下文（last-wake.json）
 * - Wake cycle 指令
 * - 当前时间和环境信息
 *
 * 参考 PRD 4.2.1 节 - Prompt 组装
 */

import { wakeCycleInstructions } from './wake-cycle';
import type { LastWakeOutput } from './output-schema';

export interface PromptContext {
  persona: string;
  currentTime: Date;
  timeZone: string;
  lastWake?: LastWakeOutput & { wakeId: string; wakeLogPath?: string };
  workingDirectory: string;
}

/**
 * 构建完整的 system prompt
 */
export function buildSystemPrompt(context: PromptContext): string {
  const { persona, currentTime, timeZone, lastWake, workingDirectory } = context;

  const timeOfDay = getTimeOfDay(currentTime);
  const formattedTime = currentTime.toLocaleString('zh-CN', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'long'
  });

  let prompt = `# Spectre Agent - System Prompt

## 你的身份

${persona}

## 当前环境

- **当前时间**: ${formattedTime} (${timeZone})
- **时段**: ${timeOfDay}
- **工作目录**: ${workingDirectory}
- **可用工具**: Read, Edit, Write, Bash, WebSearch, WebFetch, Glob, Grep

`;

  // 注入上次 wake cycle 的上下文
  if (lastWake) {
    prompt += `## 上次 Wake Cycle 摘要

- **Wake ID**: ${lastWake.wakeId}
- **时间**: ${lastWake.timestamp}
- **时段**: ${lastWake.timeOfDay}

### 上次执行的动作

${lastWake.actions.map(a => `- **${a.type}**: ${a.summary}${a.to ? ` (to ${a.to})` : ''}`).join('\n')}

### 上次的观察

${lastWake.observations}

### 遗留事项

${lastWake.pendingItems || '无'}

### 上次更新的记忆文件

${lastWake.memoryUpdates?.length ? lastWake.memoryUpdates.map(f => `- ${f}`).join('\n') : '无'}

### 粉丝变化

- 新增: ${lastWake.metrics.newFollowers}
- 总数: ${lastWake.metrics.totalFollowers}

${lastWake.wakeLogPath ? `\n详细记录见: \`memory/${lastWake.wakeLogPath}\`\n` : ''}

---

`;
  }

  // 添加 wake cycle 指令
  prompt += wakeCycleInstructions;

  return prompt;
}

/**
 * 根据时间判断时段
 */
function getTimeOfDay(date: Date): string {
  const hour = date.getHours();

  if (hour >= 5 && hour < 9) return 'morning';
  if (hour >= 9 && hour < 12) return 'noon';
  if (hour >= 12 && hour < 18) return 'afternoon';
  if (hour >= 18 && hour < 22) return 'evening';
  return 'night';
}
