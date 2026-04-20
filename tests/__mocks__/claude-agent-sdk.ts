import type { SDKMessage } from '@anthropic-ai/claude-agent-sdk';

export async function* query(params: { prompt: string; options?: any }): AsyncGenerator<SDKMessage> {
  // Mock success message with structured output (PRD 4.2.3)
  yield {
    type: 'result',
    subtype: 'success',
    result: 'Mock wake cycle completed successfully',
    is_error: false,
    total_cost_usd: 0.05,
    num_turns: 3,
    structured_output: {
      timestamp: new Date().toISOString(),
      timeOfDay: 'morning',
      actions: [
        { type: 'post', summary: 'Mock post about design trends' },
      ],
      observations: 'Mock observation from wake cycle',
      memoryUpdates: ['strategy.md'],
      pendingItems: '',
      metrics: { newFollowers: 2, totalFollowers: 100 },
    },
  } as SDKMessage;
}
