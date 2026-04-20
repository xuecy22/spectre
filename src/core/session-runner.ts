import { query, type Options, type SDKMessage, type HookCallbackMatcher, type HookEvent } from '@anthropic-ai/claude-agent-sdk';

export interface SessionOptions {
  prompt: string;
  workingDirectory?: string;
  maxTurns?: number;
  allowedTools?: string[];
  systemPrompt?: string;
  permissionMode?: 'default' | 'acceptEdits' | 'bypassPermissions' | 'plan' | 'dontAsk' | 'auto';
  outputFormat?: {
    type: 'json_schema';
    schema: Record<string, unknown>;
  };
  hooks?: Partial<Record<HookEvent, HookCallbackMatcher[]>>;
}

export interface SessionResult {
  success: boolean;
  output: string;
  messages: SDKMessage[];
  error?: string;
  cost?: number;
  turns?: number;
  structuredOutput?: unknown;
}

const DEFAULT_ALLOWED_TOOLS = [
  'Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep',
];

export async function runSession(options: SessionOptions): Promise<SessionResult> {
  // Mock mode for testing
  if (process.env.MOCK_MODE === 'true') {
    return {
      success: true,
      output: 'Mock session completed successfully',
      messages: [
        {
          type: 'result',
          subtype: 'success',
          result: 'Mock session completed successfully',
          is_error: false,
          total_cost_usd: 0.05,
          num_turns: 3,
          structured_output: {
            timestamp: new Date().toISOString(),
            timeOfDay: 'morning',
            actions: [],
            observations: 'Mock session',
            memoryUpdates: [],
            pendingItems: '',
            metrics: { newFollowers: 0, totalFollowers: 0 },
          },
        } as SDKMessage,
      ],
      cost: 0.05,
      turns: 3,
      structuredOutput: {
        timestamp: new Date().toISOString(),
        timeOfDay: 'morning',
        actions: [],
        observations: 'Mock session',
        memoryUpdates: [],
        pendingItems: '',
        metrics: { newFollowers: 0, totalFollowers: 0 },
      },
    };
  }

  const queryOptions: Options = {
    maxTurns: options.maxTurns ?? 30,
    allowedTools: options.allowedTools ?? DEFAULT_ALLOWED_TOOLS,
    permissionMode: options.permissionMode ?? 'bypassPermissions',
  };

  if (options.workingDirectory) {
    queryOptions.cwd = options.workingDirectory;
  }

  if (options.systemPrompt) {
    queryOptions.systemPrompt = options.systemPrompt;
  }

  if (options.outputFormat) {
    queryOptions.outputFormat = options.outputFormat;
  }

  if (options.hooks) {
    queryOptions.hooks = options.hooks;
  }

  try {
    const messages: SDKMessage[] = [];
    const stream = query({ prompt: options.prompt, options: queryOptions });

    for await (const message of stream) {
      messages.push(message);
    }

    // Find the result message
    const resultMsg = messages.find(
      (m): m is Extract<SDKMessage, { type: 'result' }> => m.type === 'result'
    );

    if (resultMsg && 'subtype' in resultMsg && resultMsg.subtype === 'success') {
      return {
        success: true,
        output: resultMsg.result,
        messages,
        cost: resultMsg.total_cost_usd,
        turns: resultMsg.num_turns,
        structuredOutput: 'structured_output' in resultMsg ? resultMsg.structured_output : undefined,
      };
    }

    if (resultMsg && resultMsg.is_error) {
      return {
        success: false,
        output: '',
        messages,
        error: `Session ended with ${resultMsg.subtype}`,
      };
    }

    return { success: true, output: '', messages };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, output: '', messages: [], error: message };
  }
}
