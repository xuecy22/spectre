import { describe, it, expect } from 'vitest';
import { assembleSystemPrompt, type PromptContext } from '../../src/runtime/prompt-builder';

describe('Prompt Builder', () => {
  it('should assemble system prompt with persona via base-prompt template', () => {
    const context: PromptContext = {
      wakeId: 'wake-2026-04-20-1200',
      timestamp: new Date('2026-04-20T12:00:00Z'),
      persona: '# Kira\nTokyo-based illustrator',
    };

    const prompt = assembleSystemPrompt(context);

    // Should use base-prompt.ts format (PRD 4.2.1)
    expect(prompt).toContain('Spectre Agent');
    expect(prompt).toContain('Kira');
    expect(prompt).toContain('当前时间');
    // Should include wake cycle instructions
    expect(prompt).toContain('SENSE');
    expect(prompt).toContain('THINK');
    expect(prompt).toContain('ACT');
    expect(prompt).toContain('REFLECT');
  });

  it('should include last wake context with structured data', () => {
    const context: PromptContext = {
      wakeId: 'wake-2026-04-20-1300',
      timestamp: new Date('2026-04-20T13:00:00Z'),
      lastWake: {
        wakeId: 'wake-2026-04-20-1200',
        timestamp: '2026-04-20T12:00:00+09:00',
        timeOfDay: 'noon',
        actions: [{ type: 'post', summary: 'Posted Shibuya sketch' }],
        observations: 'Good engagement on architecture content',
        memoryUpdates: ['strategy.md'],
        pendingItems: 'Reply to @tokyo_archi',
        metrics: { newFollowers: 5, totalFollowers: 150 },
      },
    };

    const prompt = assembleSystemPrompt(context);

    expect(prompt).toContain('wake-2026-04-20-1200');
    expect(prompt).toContain('Posted Shibuya sketch');
    expect(prompt).toContain('Good engagement');
    expect(prompt).toContain('Reply to @tokyo_archi');
    expect(prompt).toContain('strategy.md');
  });

  it('should include strategy and learnings when provided', () => {
    const context: PromptContext = {
      wakeId: 'wake-2026-04-20-1400',
      timestamp: new Date('2026-04-20T14:00:00Z'),
      strategy: '## What\'s Working\n- Architecture content performs best',
      learnings: '## Key Insight\n- Images outperform text-only posts',
    };

    const prompt = assembleSystemPrompt(context);

    expect(prompt).toContain('当前策略');
    expect(prompt).toContain('Architecture content performs best');
    expect(prompt).toContain('经验洞察');
    expect(prompt).toContain('Images outperform text-only posts');
  });

  it('should handle missing memory files gracefully', () => {
    const context: PromptContext = {
      wakeId: 'wake-2026-04-20-1400',
      timestamp: new Date('2026-04-20T14:00:00Z'),
    };

    expect(() => assembleSystemPrompt(context)).not.toThrow();
  });

  it('should inject drives <internal-state> block when drivesDescription provided', () => {
    const context: PromptContext = {
      wakeId: 'wake-2026-04-20-1400',
      timestamp: new Date('2026-04-20T14:00:00Z'),
      drivesDescription: '<internal-state>\n创作能量: 高 (0.70)\n</internal-state>',
    };

    const prompt = assembleSystemPrompt(context);

    expect(prompt).toContain('<internal-state>');
    expect(prompt).toContain('创作能量');
    expect(prompt).toContain('</internal-state>');
  });

  it('should inject engagement <environment-feedback> block when trend provided', () => {
    const context: PromptContext = {
      wakeId: 'wake-2026-04-20-1400',
      timestamp: new Date('2026-04-20T14:00:00Z'),
      engagementTrend: {
        dailyStats: [
          { date: '2026-04-19', posts: 3, avgLikes: 10, avgReplies: 2, avgRetweets: 1, followerDelta: 5 },
          { date: '2026-04-20', posts: 2, avgLikes: 15, avgReplies: 3, avgRetweets: 2, followerDelta: 3 },
        ],
      },
    };

    const prompt = assembleSystemPrompt(context);

    expect(prompt).toContain('<environment-feedback>');
    expect(prompt).toContain('</environment-feedback>');
    expect(prompt).toContain('总发帖');
    expect(prompt).toContain('粉丝变化');
  });

  it('should not inject engagement block when trend is empty', () => {
    const context: PromptContext = {
      wakeId: 'wake-2026-04-20-1400',
      timestamp: new Date('2026-04-20T14:00:00Z'),
      engagementTrend: { dailyStats: [] },
    };

    const prompt = assembleSystemPrompt(context);

    expect(prompt).not.toContain('<environment-feedback>');
  });
});
