/**
 * Drives（内驱力）
 *
 * 维护 agent 的内在状态变量，影响行为倾向但不直接控制决策。
 * 由 Orchestrator 在每次 wake cycle 的 PREPARE 阶段计算，注入 prompt。
 *
 * 参考 docs/runtime/drives.md
 */

export interface Drives {
  creative_energy: number; // 0-1, 高 → 想创作；低 → 想消费/观察
  social_hunger: number;   // 0-1, 高 → 想互动；低 → 想独处
  curiosity: number;       // 0-1, 高 → 想探索新领域；低 → 想深耕已有方向
  confidence: number;      // 0-1, 高 → 敢实验；低 → 倾向保守
}

interface LastWakeContext {
  actions?: Array<{ type: string; summary: string }>;
  observations?: string;
  metrics?: { newFollowers: number; totalFollowers: number };
  drives?: Drives;
}

interface EngagementContext {
  avgLikes: number;
  avgRetweets: number;
  avgReplies: number;
  totalFollowerDelta: number;
  totalPosts: number;
}

const BASELINES: Drives = {
  creative_energy: 0.5,
  social_hunger: 0.4,
  curiosity: 0.3,
  confidence: 0.5,
};

const DECAY_RATES: Record<keyof Drives, number> = {
  creative_energy: 0.1,
  social_hunger: 0.1,
  curiosity: 0.05,
  confidence: 0.1,
};

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function decayToBaseline(current: number, baseline: number, rate: number): number {
  return current + (baseline - current) * rate;
}

function hasActionType(actions: Array<{ type: string }>, type: string): boolean {
  return actions.some(a => a.type === type);
}

function countActionType(actions: Array<{ type: string }>, type: string): number {
  return actions.filter(a => a.type === type).length;
}

/**
 * 计算 drives
 *
 * 输入：上次 wake cycle 的上下文 + engagement 摘要
 * 输出：新的 Drives 值
 */
export function calculateDrives(
  lastWake: LastWakeContext | null,
  engagement: EngagementContext | null,
): Drives {
  const prev = lastWake?.drives ?? { ...BASELINES };
  const actions = lastWake?.actions ?? [];
  const metrics = lastWake?.metrics;

  // --- creative_energy ---
  let creative = decayToBaseline(prev.creative_energy, BASELINES.creative_energy, DECAY_RATES.creative_energy);
  if (!hasActionType(actions, 'post')) {
    creative += 0.1; // 未发帖 → 创作能量积累
  } else {
    creative -= 0.15; // 刚发了帖子
  }
  if (countActionType(actions, 'post') >= 2) {
    creative -= 0.1; // 连续多次创作
  }
  if (lastWake?.observations && lastWake.observations.length > 50) {
    creative += 0.05; // 有启发的观察
  }

  // --- social_hunger ---
  let social = decayToBaseline(prev.social_hunger, BASELINES.social_hunger, DECAY_RATES.social_hunger);
  if (!hasActionType(actions, 'reply') && !hasActionType(actions, 'quote')) {
    social += 0.1; // 长时间未互动
  } else {
    social -= 0.15; // 刚互动过
  }
  if (countActionType(actions, 'reply') + countActionType(actions, 'quote') >= 3) {
    social -= 0.1; // 连续多次互动
  }
  if (metrics && metrics.newFollowers > 0) {
    social += 0.05; // 收到新 follower
  }

  // --- curiosity ---
  let curious = decayToBaseline(prev.curiosity, BASELINES.curiosity, DECAY_RATES.curiosity);
  if (engagement && engagement.totalPosts > 5) {
    // 内容类型单一 → 好奇心上升（简化判定：发帖多但互动少视为单一）
    const interactionRatio = (engagement.avgReplies + engagement.avgRetweets) /
      Math.max(engagement.avgLikes, 1);
    if (interactionRatio < 0.3) {
      curious += 0.1;
    }
  }
  if (lastWake?.observations && lastWake.observations.includes('trend')) {
    curious += 0.15; // 发现新趋势
  }

  // --- confidence ---
  let conf = decayToBaseline(prev.confidence, BASELINES.confidence, DECAY_RATES.confidence);
  if (engagement) {
    const avgEngagement = engagement.avgLikes + engagement.avgReplies + engagement.avgRetweets;
    if (avgEngagement > 5) {
      conf += 0.1; // engagement 高于基本水平
    } else if (avgEngagement < 1 && engagement.totalPosts > 0) {
      conf -= 0.1; // engagement 低
    }
    if (engagement.totalFollowerDelta > 0) {
      conf += 0.05; // 获得新 followers
    } else if (engagement.totalFollowerDelta < 0) {
      conf -= 0.1; // 丢失 followers
    }
  }
  if (metrics && metrics.newFollowers > 0) {
    conf += 0.05; // 正面信号
  }

  return {
    creative_energy: clamp(creative),
    social_hunger: clamp(social),
    curiosity: clamp(curious),
    confidence: clamp(conf),
  };
}

/**
 * 将 drives 转换为自然语言描述，用于 prompt 的 <internal-state> 块
 */
export function describeDrives(drives: Drives): string {
  const describeLevel = (value: number): string => {
    if (value >= 0.7) return '高';
    if (value >= 0.4) return '中';
    return '低';
  };

  const creativeDesc = drives.creative_energy >= 0.7
    ? '你有比较强的创作冲动'
    : drives.creative_energy >= 0.4
      ? '创作欲望一般，可以选择创作也可以观察'
      : '更倾向于消费和观察内容';

  const socialDesc = drives.social_hunger >= 0.7
    ? '你想和别人互动聊天'
    : drives.social_hunger >= 0.4
      ? '没有特别想互动'
      : '更想独处，安静地浏览';

  const curiosityDesc = drives.curiosity >= 0.7
    ? '你对新事物很感兴趣，想尝试新方向'
    : drives.curiosity >= 0.4
      ? '对新领域有一定兴趣'
      : '倾向于深耕熟悉的方向';

  const confidenceDesc = drives.confidence >= 0.7
    ? '最近表现不错，可以大胆尝试'
    : drives.confidence >= 0.4
      ? '表现中规中矩，稳扎稳打'
      : '最近效果不太好，建议保守一些';

  return `<internal-state>
你当前的内在状态：
- 创作能量: ${describeLevel(drives.creative_energy)} (${drives.creative_energy.toFixed(2)}) — ${creativeDesc}
- 社交需求: ${describeLevel(drives.social_hunger)} (${drives.social_hunger.toFixed(2)}) — ${socialDesc}
- 好奇心: ${describeLevel(drives.curiosity)} (${drives.curiosity.toFixed(2)}) — ${curiosityDesc}
- 信心: ${describeLevel(drives.confidence)} (${drives.confidence.toFixed(2)}) — ${confidenceDesc}
</internal-state>`;
}
