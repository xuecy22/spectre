import { runWakeCycle } from './orchestrator';
import { startScheduler, type ScheduleConfig } from './scheduler';
import { config } from 'dotenv';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

interface CliOptions {
  mock?: boolean;
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  return {
    mock: args.includes('--mock'),
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

export async function main(): Promise<void> {
  const options = parseArgs();

  // Load environment variables
  loadEnv();

  console.log('Spectre starting...');
  if (options.mock) {
    console.log('Running in mock mode');
  }

  // Get schedule configuration
  const scheduleConfig = getScheduleConfig();

  // Start scheduler
  console.log(`Starting scheduler (timezone: ${scheduleConfig.timezone})`);
  startScheduler(scheduleConfig, async () => {
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
