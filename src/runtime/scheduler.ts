import * as cron from 'node-cron';

export interface ScheduleConfig {
  timezone: string;
  schedule: {
    timeRange: string;
    intervalMin: number;
    intervalMax: number;
    active: boolean;
  }[];
}

interface TimeRange {
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
}

interface ZonedTime {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

function parseTimeRange(timeRange: string): TimeRange {
  const [start, end] = timeRange.split('-');
  const [startHour, startMinute] = start.split(':').map(Number);
  const [endHour, endMinute] = end.split(':').map(Number);

  return { startHour, startMinute, endHour, endMinute };
}

function toMinutes(hour: number, minute: number): number {
  return hour * 60 + minute;
}

function getRandomInterval(intervalMin: number, intervalMax: number): number {
  const baseInterval = Math.random() * (intervalMax - intervalMin) + intervalMin;
  const jitter = (Math.random() - 0.5) * 30;

  return Math.max(1, Math.round(baseInterval + jitter));
}

function getZonedTime(date: Date, timezone: string): ZonedTime {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  const parts = formatter.formatToParts(date);
  const getValue = (type: string): number => {
    const value = parts.find(part => part.type === type)?.value;

    if (!value) {
      throw new Error(`Missing ${type} in formatted date`);
    }

    return Number(value);
  };

  return {
    year: getValue('year'),
    month: getValue('month'),
    day: getValue('day'),
    hour: getValue('hour'),
    minute: getValue('minute')
  };
}

function createLocalDate(time: ZonedTime): Date {
  return new Date(time.year, time.month - 1, time.day, time.hour, time.minute, 0, 0);
}

function getTimezoneOffsetMinutes(date: Date, timezone: string): number {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    timeZoneName: 'shortOffset'
  });

  const value = formatter.formatToParts(date).find(part => part.type === 'timeZoneName')?.value;
  const match = value?.match(/^GMT(?:(\+|-)(\d{1,2})(?::?(\d{2}))?)?$/);

  if (!match) {
    return 0;
  }

  const sign = match[1] === '-' ? -1 : 1;
  const hours = Number(match[2] || '0');
  const minutes = Number(match[3] || '0');

  return sign * (hours * 60 + minutes);
}

function createAbsoluteDate(time: ZonedTime, timezone: string): Date {
  const utcGuess = Date.UTC(time.year, time.month - 1, time.day, time.hour, time.minute, 0, 0);
  const offsetMinutes = getTimezoneOffsetMinutes(new Date(utcGuess), timezone);

  return new Date(utcGuess - offsetMinutes * 60 * 1000);
}

function calculateNextWakeTime(config: ScheduleConfig, lastWakeTime: Date): ZonedTime {
  const activeSchedules = config.schedule
    .filter(schedule => schedule.active)
    .sort((a, b) => {
      const aRange = parseTimeRange(a.timeRange);
      const bRange = parseTimeRange(b.timeRange);

      return toMinutes(aRange.startHour, aRange.startMinute) - toMinutes(bRange.startHour, bRange.startMinute);
    });

  if (activeSchedules.length === 0) {
    throw new Error('No active schedule found');
  }

  const currentTime = getZonedTime(lastWakeTime, config.timezone);
  const currentMinutes = toMinutes(currentTime.hour, currentTime.minute);

  for (const schedule of activeSchedules) {
    const range = parseTimeRange(schedule.timeRange);
    const startMinutes = toMinutes(range.startHour, range.startMinute);
    const endMinutes = toMinutes(range.endHour, range.endMinute);

    if (currentMinutes >= startMinutes && currentMinutes <= endMinutes) {
      const candidate = createLocalDate(currentTime);
      candidate.setMinutes(candidate.getMinutes() + getRandomInterval(schedule.intervalMin, schedule.intervalMax));

      if (toMinutes(candidate.getHours(), candidate.getMinutes()) <= endMinutes) {
        return {
          year: candidate.getFullYear(),
          month: candidate.getMonth() + 1,
          day: candidate.getDate(),
          hour: candidate.getHours(),
          minute: candidate.getMinutes()
        };
      }
    }

    if (currentMinutes < startMinutes) {
      return {
        year: currentTime.year,
        month: currentTime.month,
        day: currentTime.day,
        hour: range.startHour,
        minute: range.startMinute
      };
    }
  }

  const firstRange = parseTimeRange(activeSchedules[0].timeRange);
  const nextDay = createLocalDate(currentTime);
  nextDay.setDate(nextDay.getDate() + 1);

  return {
    year: nextDay.getFullYear(),
    month: nextDay.getMonth() + 1,
    day: nextDay.getDate(),
    hour: firstRange.startHour,
    minute: firstRange.startMinute
  };
}

export function calculateNextWake(
  config: ScheduleConfig,
  lastWakeTime: Date
): Date {
  return createLocalDate(calculateNextWakeTime(config, lastWakeTime));
}

export function startScheduler(
  config: ScheduleConfig,
  onWake: () => Promise<void>
): void {
  let lastWakeTime = new Date();
  let nextWakeTime = createAbsoluteDate(calculateNextWakeTime(config, lastWakeTime), config.timezone);

  cron.schedule('* * * * *', async () => {
    if (new Date() < nextWakeTime) {
      return;
    }

    lastWakeTime = new Date();
    await onWake();
    nextWakeTime = createAbsoluteDate(calculateNextWakeTime(config, lastWakeTime), config.timezone);
  }, {
    timezone: config.timezone
  });
}
