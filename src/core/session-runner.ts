import { query, type QueryOptions, type QueryResult } from '@anthropic-ai/claude-agent-sdk';

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
  error?: string;
}

const DEFAULT_ALLOWED_TOOLS = [
  'Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep',
];

export async function runSession(options: SessionOptions): Promise<SessionResult> {
  const queryOptions: QueryOptions = {
    prompt: options.prompt,
    options: {
      maxTurns: options.maxTurns ?? 30,
      allowedTools: options.allowedTools ?? DEFAULT_ALLOWED_TOOLS,
      permissionMode: 'acceptEdits',
    },
  };

  if (options.workingDirectory) {
    queryOptions.options!.cwd = options.workingDirectory;
  }

  if (options.systemPrompt) {
    queryOptions.options!.systemPrompt = options.systemPrompt;
  }

  try {
    const result: QueryResult = await query(queryOptions);
    const output = extractOutput(result);
    return { success: true, output };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, output: '', error: message };
  }
}

function extractOutput(result: QueryResult): string {
  if (!result.messages || result.messages.length === 0) return '';
  const lastMessage = result.messages[result.messages.length - 1];
  if (typeof lastMessage.content === 'string') return lastMessage.content;
  if (Array.isArray(lastMessage.content)) {
    return lastMessage.content
      .filter((block: any) => block.type === 'text')
      .map((block: any) => block.text)
      .join('\n');
  }
  return '';
}
