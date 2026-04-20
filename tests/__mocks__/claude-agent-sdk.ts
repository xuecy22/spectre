import type { SDKMessage } from '@anthropic-ai/claude-agent-sdk';

export async function* query(params: { prompt: string; options?: any }): AsyncGenerator<SDKMessage> {
  // Mock success message
  yield {
    type: 'result',
    subtype: 'success',
    result: 'Mock wake cycle completed successfully',
    is_error: false,
    total_cost_usd: 0.05,
    num_turns: 3,
  } as SDKMessage;
}
