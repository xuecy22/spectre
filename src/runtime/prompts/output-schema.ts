/**
 * JSON Schema for structured output (last-wake.json)
 *
 * 参考 PRD 4.2.3 节 - last-wake.json 结构定义
 */

export interface LastWakeOutput {
  timestamp: string;
  timeOfDay: 'morning' | 'noon' | 'afternoon' | 'evening' | 'night';
  actions: Array<{
    type: 'post' | 'reply' | 'retweet' | 'quote' | 'skip';
    summary: string;
    tweetId?: string;
    to?: string;
  }>;
  observations: string;
  memoryUpdates: string[];
  pendingItems: string;
  metrics: {
    newFollowers: number;
    totalFollowers: number;
  };
}

export const lastWakeSchema = {
  type: 'object',
  required: ['timestamp', 'timeOfDay', 'actions', 'observations', 'metrics'],
  properties: {
    timestamp: {
      type: 'string',
      description: 'ISO 8601 格式的当前时间'
    },
    timeOfDay: {
      type: 'string',
      enum: ['morning', 'noon', 'afternoon', 'evening', 'night'],
      description: '当前时段'
    },
    actions: {
      type: 'array',
      description: '本次 wake cycle 执行的所有动作',
      items: {
        type: 'object',
        required: ['type', 'summary'],
        properties: {
          type: {
            type: 'string',
            enum: ['post', 'reply', 'retweet', 'quote', 'skip'],
            description: '动作类型'
          },
          summary: {
            type: 'string',
            description: '动作简要描述'
          },
          tweetId: {
            type: 'string',
            description: '相关推文 ID（如果适用）'
          },
          to: {
            type: 'string',
            description: '互动对象（如果适用）'
          }
        }
      }
    },
    observations: {
      type: 'string',
      description: '本次 wake cycle 的关键观察'
    },
    memoryUpdates: {
      type: 'array',
      items: { type: 'string' },
      description: '本次修改了哪些 memory 文件'
    },
    pendingItems: {
      type: 'string',
      description: '遗留事项，下次 wake cycle 应关注'
    },
    metrics: {
      type: 'object',
      required: ['newFollowers', 'totalFollowers'],
      properties: {
        newFollowers: {
          type: 'number',
          description: '本次新增粉丝数'
        },
        totalFollowers: {
          type: 'number',
          description: '当前总粉丝数'
        }
      }
    }
  }
} as const;
