import { runWakeCycle } from './orchestrator';
import { startScheduler, type ScheduleConfig } from './scheduler';
import { config } from 'dotenv';
import { existsSync, writeFileSync, mkdirSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { initDB, getRecentWakes, getRecentPosts, getEngagementSummary, getTotalCost } from './db';
import { loadLastWake } from './prompt-builder';

interface CliOptions {
  mock?: boolean;
  command?: string;
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const command = args.find(a => !a.startsWith('--'));
  return {
    mock: args.includes('--mock'),
    command,
  };
}

function loadEnv(): void {
  const envPath = join(process.cwd(), '.env');
  if (existsSync(envPath)) {
    config({ path: envPath });
  }
}

function getScheduleConfig(): ScheduleConfig {
  const timezone = process.env.TIMEZONE || 'Asia/Tokyo';

  // PRD 5.2: 7 段拟人化调度，模拟真人作息
  return {
    timezone,
    schedule: [
      { timeRange: '07:00-09:00', intervalMin: 30, intervalMax: 60,  active: true },  // 早晨：起床浏览
      { timeRange: '09:00-12:00', intervalMin: 60, intervalMax: 90,  active: true },  // 上午：工作状态
      { timeRange: '12:00-14:00', intervalMin: 45, intervalMax: 60,  active: true },  // 午间：较活跃
      { timeRange: '14:00-18:00', intervalMin: 60, intervalMax: 120, active: true },  // 下午：低频
      { timeRange: '18:00-22:00', intervalMin: 30, intervalMax: 60,  active: true },  // 晚间：最活跃
      { timeRange: '22:00-01:00', intervalMin: 60, intervalMax: 120, active: true },  // 深夜：随意浏览
      { timeRange: '01:00-07:00', intervalMin: 0,  intervalMax: 0,   active: false }, // 睡眠：不唤醒
    ],
  };
}

// --- Subcommands (PRD 9.2) ---

function cmdStatus(): void {
  const lastWake = loadLastWake();
  console.log('=== Spectre Status ===\n');

  if (lastWake) {
    console.log(`Last wake: ${lastWake.wakeId ?? 'unknown'}`);
    console.log(`Timestamp: ${lastWake.timestamp ?? 'unknown'}`);
    console.log(`Time of day: ${lastWake.timeOfDay ?? 'unknown'}`);
    const actions = lastWake.actions as Array<{ type: string; summary: string }> | undefined;
    if (actions && actions.length > 0) {
      console.log(`Actions: ${actions.map(a => `${a.type}: ${a.summary}`).join(', ')}`);
    } else {
      console.log('Actions: none');
    }
    console.log(`Pending: ${lastWake.pendingItems || 'none'}`);
  } else {
    console.log('No wake cycle has run yet.');
  }

  // Check pause state
  const pauseFile = join(process.cwd(), 'data', '.paused');
  if (existsSync(pauseFile)) {
    console.log('\nState: PAUSED');
  } else {
    console.log('\nState: RUNNING');
  }
}

function cmdMetrics(): void {
  try {
    initDB();
    const summary = getEngagementSummary(7);
    const cost = getTotalCost(30);

    console.log('=== Engagement Metrics (7 days) ===\n');
    console.log(`Total posts: ${summary.totalPosts}`);
    console.log(`Avg likes: ${summary.avgLikes}`);
    console.log(`Avg replies: ${summary.avgReplies}`);
    console.log(`Avg retweets: ${summary.avgRetweets}`);
    console.log(`Follower delta: ${summary.totalFollowerDelta > 0 ? '+' : ''}${summary.totalFollowerDelta}`);
    console.log(`\nAPI cost (30 days): $${cost}`);
  } catch (err) {
    console.error('Failed to load metrics:', err instanceof Error ? err.message : String(err));
  }
}

function cmdHistory(limit = 10): void {
  try {
    initDB();
    const posts = getRecentPosts(limit);

    console.log(`=== Recent Posts (${posts.length}) ===\n`);
    if (posts.length === 0) {
      console.log('No posts recorded yet.');
      return;
    }
    for (const post of posts) {
      const preview = post.content.length > 60 ? post.content.slice(0, 60) + '...' : post.content;
      console.log(`[${post.postedAt}] ${post.type}: ${preview}`);
    }
  } catch (err) {
    console.error('Failed to load history:', err instanceof Error ? err.message : String(err));
  }
}

function cmdLogs(limit = 10): void {
  try {
    initDB();
    const wakes = getRecentWakes(limit);

    console.log(`=== Recent Wake Cycles (${wakes.length}) ===\n`);
    if (wakes.length === 0) {
      console.log('No wake cycles recorded yet.');
      return;
    }
    for (const wake of wakes) {
      const actions = wake.actions?.join(', ') || 'none';
      console.log(`[${wake.timestamp}] ${wake.wakeId} (${wake.turns} turns, $${wake.cost?.toFixed(3)})`);
      console.log(`  Actions: ${actions}`);
    }
  } catch (err) {
    console.error('Failed to load logs:', err instanceof Error ? err.message : String(err));
  }
}

function cmdPause(): void {
  const pauseFile = join(process.cwd(), 'data', '.paused');
  mkdirSync(join(process.cwd(), 'data'), { recursive: true });
  writeFileSync(pauseFile, new Date().toISOString());
  console.log('Spectre paused. Run "spectre resume" to resume.');
}

function cmdResume(): void {
  const pauseFile = join(process.cwd(), 'data', '.paused');
  if (existsSync(pauseFile)) {
    unlinkSync(pauseFile);
    console.log('Spectre resumed.');
  } else {
    console.log('Spectre is not paused.');
  }
}

function isPaused(): boolean {
  return existsSync(join(process.cwd(), 'data', '.paused'));
}

// --- Main entry point ---

export async function main(): Promise<void> {
  const options = parseArgs();

  // Load environment variables
  loadEnv();

  // Handle subcommands (PRD 9.2)
  switch (options.command) {
    case 'status':
      cmdStatus();
      return;
    case 'metrics':
      cmdMetrics();
      return;
    case 'history':
      cmdHistory();
      return;
    case 'logs':
      cmdLogs();
      return;
    case 'pause':
      cmdPause();
      return;
    case 'resume':
      cmdResume();
      return;
  }

  console.log('Spectre starting...');
  if (options.mock) {
    console.log('Running in mock mode');
  }

  // Get schedule configuration
  const scheduleConfig = getScheduleConfig();

  // Start scheduler
  console.log(`Starting scheduler (timezone: ${scheduleConfig.timezone})`);
  startScheduler(scheduleConfig, async () => {
    if (isPaused()) {
      console.log('Wake cycle skipped (paused)');
      return;
    }
    console.log('Wake cycle triggered');
    try {
      await runWakeCycle();
      console.log('Wake cycle completed');
    } catch (err) {
      console.error('Wake cycle failed:', err instanceof Error ? err.message : String(err));
    }
  });

  console.log('Spectre is running. Press Ctrl+C to stop.');

  // Keep process alive
  process.on('SIGINT', () => {
    console.log('\nShutting down Spectre...');
    process.exit(0);
  });
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}
