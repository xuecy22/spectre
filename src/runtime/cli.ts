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
  const timezone = process.env.TIMEZONE || 'America/Los_Angeles';

  return {
    timezone,
    schedule: [
      {
        timeRange: '09:00-22:00',
        intervalMin: 60,
        intervalMax: 180,
        active: true,
      },
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
