/**
 * Report（进化报告）
 *
 * 从 SQLite 读取 wake cycle 历史数据，生成可分享的单文件 HTML 报告。
 * 参考 docs/runtime/report.md
 */

import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { initDB, getWakeSnapshots, getTotalCost } from './db';
import type { WakeSnapshot } from './db';

export interface ReportOptions {
  days: number;
  outPath: string;
}

interface OverviewMetrics {
  runningDays: number;
  totalCycles: number;
  currentFollowers: number;
  avgEngagementRate: number;
  evolutionEvents: number;
  totalCost: number;
}

function computeOverview(snapshots: WakeSnapshot[], days: number): OverviewMetrics {
  const cost = getTotalCost(days);

  const dates = new Set(snapshots.map(s => s.timestamp.slice(0, 10)));
  const runningDays = dates.size;
  const totalCycles = snapshots.length;

  const lastSnapshot = snapshots[snapshots.length - 1];
  const currentFollowers = lastSnapshot?.totalFollowers ?? 0;

  // Evolution events = snapshots where memoryUpdates is non-empty
  const evolutionEvents = snapshots.filter(s => {
    if (!s.memoryUpdates) return false;
    try {
      const updates = JSON.parse(s.memoryUpdates);
      return Array.isArray(updates) && updates.length > 0;
    } catch {
      return false;
    }
  }).length;

  // Average "engagement rate" approximation from actions count
  const totalActions = snapshots.reduce((sum, s) => {
    try {
      const actions = JSON.parse(s.actions);
      return sum + (Array.isArray(actions) ? actions.length : 0);
    } catch {
      return sum;
    }
  }, 0);
  const avgEngagementRate = totalCycles > 0
    ? Math.round((totalActions / totalCycles) * 100) / 100
    : 0;

  return { runningDays, totalCycles, currentFollowers, avgEngagementRate, evolutionEvents, totalCost: cost };
}

function buildDrivesData(snapshots: WakeSnapshot[]): string {
  const labels = snapshots.map(s => `"${s.timestamp.slice(0, 16)}"`).join(',');
  const creative = snapshots.map(s => s.creativeEnergy.toFixed(2)).join(',');
  const social = snapshots.map(s => s.socialHunger.toFixed(2)).join(',');
  const curiosity = snapshots.map(s => s.curiosity.toFixed(2)).join(',');
  const confidence = snapshots.map(s => s.confidence.toFixed(2)).join(',');

  return `{
    labels: [${labels}],
    creative: [${creative}],
    social: [${social}],
    curiosity: [${curiosity}],
    confidence: [${confidence}]
  }`;
}

function buildFollowerData(snapshots: WakeSnapshot[]): string {
  const labels = snapshots.map(s => `"${s.timestamp.slice(0, 10)}"`).join(',');
  const followers = snapshots.map(s => s.totalFollowers).join(',');
  return `{ labels: [${labels}], followers: [${followers}] }`;
}

function buildEvolutionEvents(snapshots: WakeSnapshot[]): string {
  const events = snapshots
    .filter(s => {
      if (!s.memoryUpdates) return false;
      try {
        const updates = JSON.parse(s.memoryUpdates);
        return Array.isArray(updates) && updates.length > 0;
      } catch {
        return false;
      }
    })
    .map(s => {
      const updates = JSON.parse(s.memoryUpdates!);
      return `{ time: "${s.timestamp.slice(0, 16)}", updates: ${JSON.stringify(updates)}, observations: ${JSON.stringify(s.observations ?? '')} }`;
    });
  return `[${events.join(',')}]`;
}

function buildActivityHeatmap(snapshots: WakeSnapshot[]): string {
  // 7 days x 6 time segments
  const heatmap: number[][] = Array.from({ length: 7 }, () => Array(6).fill(0));
  const timeSegments = ['07-09', '09-12', '12-14', '14-18', '18-22', '22-01'];

  for (const s of snapshots) {
    const date = new Date(s.timestamp);
    const dayOfWeek = date.getDay(); // 0=Sun
    const hour = date.getHours();

    let segment = 5; // default to late night
    if (hour >= 7 && hour < 9) segment = 0;
    else if (hour >= 9 && hour < 12) segment = 1;
    else if (hour >= 12 && hour < 14) segment = 2;
    else if (hour >= 14 && hour < 18) segment = 3;
    else if (hour >= 18 && hour < 22) segment = 4;

    heatmap[dayOfWeek][segment]++;
  }

  return JSON.stringify({ days: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], segments: timeSegments, data: heatmap });
}

function generateHTML(snapshots: WakeSnapshot[], overview: OverviewMetrics): string {
  const drivesData = buildDrivesData(snapshots);
  const followerData = buildFollowerData(snapshots);
  const evolutionEvents = buildEvolutionEvents(snapshots);
  const activityHeatmap = buildActivityHeatmap(snapshots);

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Spectre Evolution Report</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4"></script>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0a0a0a; color: #e0e0e0; padding: 2rem; }
  .container { max-width: 1200px; margin: 0 auto; }
  h1 { font-size: 2rem; margin-bottom: 0.5rem; color: #fff; }
  h2 { font-size: 1.3rem; margin: 2rem 0 1rem; color: #ccc; border-bottom: 1px solid #333; padding-bottom: 0.5rem; }
  .subtitle { color: #888; margin-bottom: 2rem; }

  .overview { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
  .stat { background: #1a1a2e; border-radius: 12px; padding: 1.2rem; text-align: center; }
  .stat .value { font-size: 1.8rem; font-weight: bold; color: #7c3aed; }
  .stat .label { font-size: 0.85rem; color: #888; margin-top: 0.3rem; }

  .chart-container { background: #1a1a2e; border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem; }
  canvas { max-height: 300px; }

  .timeline { list-style: none; }
  .timeline li { background: #1a1a2e; border-radius: 8px; padding: 1rem; margin-bottom: 0.8rem; border-left: 3px solid #7c3aed; }
  .timeline .time { color: #7c3aed; font-size: 0.85rem; font-weight: bold; }
  .timeline .updates { margin-top: 0.3rem; }
  .timeline .obs { color: #888; font-size: 0.85rem; margin-top: 0.3rem; }

  .heatmap { display: grid; grid-template-columns: 60px repeat(6, 1fr); gap: 4px; }
  .heatmap .cell { border-radius: 4px; padding: 0.5rem; text-align: center; font-size: 0.75rem; }
  .heatmap .header { color: #888; font-weight: bold; }
  .heatmap .day-label { color: #888; display: flex; align-items: center; font-size: 0.8rem; }

  footer { margin-top: 3rem; text-align: center; color: #555; font-size: 0.8rem; }
</style>
</head>
<body>
<div class="container">
  <h1>Spectre Evolution Report</h1>
  <p class="subtitle">Generated: ${new Date().toISOString().slice(0, 10)}</p>

  <!-- Overview -->
  <div class="overview">
    <div class="stat"><div class="value">${overview.runningDays}</div><div class="label">Running Days</div></div>
    <div class="stat"><div class="value">${overview.totalCycles}</div><div class="label">Wake Cycles</div></div>
    <div class="stat"><div class="value">${overview.currentFollowers}</div><div class="label">Followers</div></div>
    <div class="stat"><div class="value">${overview.avgEngagementRate}</div><div class="label">Avg Actions/Cycle</div></div>
    <div class="stat"><div class="value">${overview.evolutionEvents}</div><div class="label">Evolution Events</div></div>
    <div class="stat"><div class="value">$${overview.totalCost}</div><div class="label">API Cost</div></div>
  </div>

  <!-- Motivation Curves -->
  <h2>Motivation Curves</h2>
  <div class="chart-container"><canvas id="drivesChart"></canvas></div>

  <!-- Growth Curves -->
  <h2>Growth Curves</h2>
  <div class="chart-container"><canvas id="followerChart"></canvas></div>

  <!-- Evolution Timeline -->
  <h2>Evolution Timeline</h2>
  <ul class="timeline" id="timeline"></ul>

  <!-- Activity Heatmap -->
  <h2>Activity Heatmap</h2>
  <div class="chart-container"><div class="heatmap" id="heatmap"></div></div>

  <footer>Spectre - Self-evolving AI Agent</footer>
</div>

<script>
const drivesData = ${drivesData};
const followerData = ${followerData};
const evolutionEvents = ${evolutionEvents};
const heatmapData = ${activityHeatmap};

// Drives Chart
new Chart(document.getElementById('drivesChart'), {
  type: 'line',
  data: {
    labels: drivesData.labels,
    datasets: [
      { label: 'Creative Energy', data: drivesData.creative, borderColor: '#f472b6', tension: 0.3, pointRadius: 0 },
      { label: 'Social Hunger', data: drivesData.social, borderColor: '#60a5fa', tension: 0.3, pointRadius: 0 },
      { label: 'Curiosity', data: drivesData.curiosity, borderColor: '#34d399', tension: 0.3, pointRadius: 0 },
      { label: 'Confidence', data: drivesData.confidence, borderColor: '#fbbf24', tension: 0.3, pointRadius: 0 },
    ]
  },
  options: {
    responsive: true,
    scales: { y: { min: 0, max: 1, ticks: { color: '#888' }, grid: { color: '#222' } }, x: { ticks: { display: false }, grid: { display: false } } },
    plugins: { legend: { labels: { color: '#ccc' } } }
  }
});

// Follower Chart
new Chart(document.getElementById('followerChart'), {
  type: 'line',
  data: {
    labels: followerData.labels,
    datasets: [{ label: 'Followers', data: followerData.followers, borderColor: '#7c3aed', fill: true, backgroundColor: 'rgba(124,58,237,0.1)', tension: 0.3, pointRadius: 2 }]
  },
  options: {
    responsive: true,
    scales: { y: { ticks: { color: '#888' }, grid: { color: '#222' } }, x: { ticks: { color: '#888', maxTicksLimit: 10 }, grid: { display: false } } },
    plugins: { legend: { labels: { color: '#ccc' } } }
  }
});

// Evolution Timeline
const tl = document.getElementById('timeline');
if (evolutionEvents.length === 0) {
  tl.innerHTML = '<li>No evolution events recorded yet.</li>';
} else {
  evolutionEvents.forEach(e => {
    const li = document.createElement('li');
    li.innerHTML = '<div class="time">' + e.time + '</div><div class="updates">' + e.updates.join(', ') + '</div>' + (e.observations ? '<div class="obs">' + e.observations + '</div>' : '');
    tl.appendChild(li);
  });
}

// Activity Heatmap
const hm = document.getElementById('heatmap');
// Header row
hm.innerHTML = '<div></div>' + heatmapData.segments.map(s => '<div class="cell header">' + s + '</div>').join('');
heatmapData.days.forEach((day, di) => {
  hm.innerHTML += '<div class="day-label">' + day + '</div>';
  heatmapData.data[di].forEach(count => {
    const intensity = Math.min(count / 5, 1);
    const bg = 'rgba(124,58,237,' + (0.1 + intensity * 0.8).toFixed(2) + ')';
    hm.innerHTML += '<div class="cell" style="background:' + bg + '">' + count + '</div>';
  });
});
</script>
</body>
</html>`;
}

/**
 * 生成进化报告 HTML 文件
 */
export function generateReport(options: ReportOptions): string {
  initDB();
  const snapshots = getWakeSnapshots(options.days);
  const overview = computeOverview(snapshots, options.days);
  const html = generateHTML(snapshots, overview);

  const outPath = resolve(options.outPath);
  writeFileSync(outPath, html, 'utf-8');

  return outPath;
}
