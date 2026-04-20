import { query, type Options, type SDKMessage } from '@anthropic-ai/claude-agent-sdk';

export interface SessionOptions {
  prompt: string;
  workingDirectory?: string;
  maxTurns?: number;
  allowedTools?: string[];
  systemPrompt?: string;
}

export interface SessionResult {
  success: boolean;
  output: string;
  messages: SDKMessage[];
  error?: string;
  cost?: number;
  turns?: number;
}

const DEFAULT_ALLOWED_TOOLS = [
  'Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep',
];

export async function runSession(options: SessionOptions): Promise<SessionResult> {
  const queryOptions: Options = {
    maxTurns: options.maxTurns ?? 30,
    allowedTools: options.allowedTools ?? DEFAULT_ALLOWED_TOOLS,
    permissionMode: 'acceptEdits' as const,
  };

  if (options.workingDirectory) {
    queryOptions.cwd = options.workingDirectory;
  }

  if (options.systemPrompt) {
    queryOptions.systemPrompt = options.systemPrompt;
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
