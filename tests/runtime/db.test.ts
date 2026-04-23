import { describe, it, expect, beforeEach } from 'vitest';
import {
  initDB, closeDB,
  saveWakeRecord, getRecentWakes, getTotalCost,
  savePost, getRecentPosts,
  saveMetrics, getMetricsForPost, getEngagementSummary,
  saveInteraction, getRecentInteractions,
  saveWakeSnapshot, getWakeSnapshots, getEngagementTrend,
  type WakeRecord, type PostRecord, type MetricsRecord, type InteractionRecord,
} from '../../src/runtime/db';
import { unlinkSync, existsSync } from 'node:fs';
import { afterEach } from 'vitest';

describe('DB', () => {
  const testDbPath = 'data/test-spectre.db';

  beforeEach(() => {
    closeDB();
    for (const suffix of ['', '-shm', '-wal']) {
      const p = testDbPath + suffix;
      if (existsSync(p)) unlinkSync(p);
    }
    initDB();
  });

  afterEach(() => {
    closeDB();
  });

  it('should initialize database with all tables', () => {
    expect(existsSync(testDbPath)).toBe(true);
  });

  // --- Wakes ---

  it('should save and retrieve wake record', () => {
    const record: WakeRecord = {
      wakeId: 'wake-2026-04-20-1200',
      timestamp: '2026-04-20T12:00:00Z',
      duration: 45000,
      cost: 0.15,
      turns: 8,
      actions: ['post', 'reply'],
    };

    saveWakeRecord(record);
    const recent = getRecentWakes(1);

    expect(recent).toHaveLength(1);
    expect(recent[0].wakeId).toBe('wake-2026-04-20-1200');
  });

  it('should calculate total cost', () => {
    const records: WakeRecord[] = [
      { wakeId: 'wake-1', timestamp: new Date().toISOString(), cost: 0.10, actions: [] },
      { wakeId: 'wake-2', timestamp: new Date().toISOString(), cost: 0.20, actions: [] },
    ];

    records.forEach(saveWakeRecord);
    const total = getTotalCost(1);

    expect(total).toBe(0.30);
  });

  // --- Posts ---

  it('should save and retrieve posts', () => {
    saveWakeRecord({ wakeId: 'wake-1', timestamp: new Date().toISOString() });

    const post: PostRecord = {
      postId: 'tweet-123',
      wakeId: 'wake-1',
      type: 'original',
      content: 'A sketch of Shibuya at night',
      contentCategory: 'architecture',
      hasImage: true,
      postedAt: new Date().toISOString(),
    };

    savePost(post);
    const posts = getRecentPosts(1);

    expect(posts).toHaveLength(1);
    expect(posts[0].postId).toBe('tweet-123');
    expect(posts[0].type).toBe('original');
    expect(posts[0].hasImage).toBe(true);
    expect(posts[0].contentCategory).toBe('architecture');
  });

  // --- Metrics ---

  it('should save and retrieve metrics', () => {
    saveWakeRecord({ wakeId: 'wake-1', timestamp: new Date().toISOString() });
    savePost({
      postId: 'tweet-123', wakeId: 'wake-1', type: 'original',
      content: 'test', hasImage: false, postedAt: new Date().toISOString(),
    });

    const metrics: MetricsRecord = {
      postId: 'tweet-123',
      likes: 42,
      retweets: 5,
      replies: 3,
      impressions: 1200,
      profileVisits: 15,
      followerDelta: 7,
      measuredAt: new Date().toISOString(),
    };

    saveMetrics(metrics);
    const result = getMetricsForPost('tweet-123');

    expect(result).not.toBeNull();
    expect(result!.likes).toBe(42);
    expect(result!.followerDelta).toBe(7);
  });

  it('should compute engagement summary', () => {
    saveWakeRecord({ wakeId: 'wake-1', timestamp: new Date().toISOString() });

    savePost({
      postId: 'p1', wakeId: 'wake-1', type: 'original',
      content: 'test', hasImage: false, postedAt: new Date().toISOString(),
    });
    savePost({
      postId: 'p2', wakeId: 'wake-1', type: 'quote',
      content: 'nice', hasImage: false, postedAt: new Date().toISOString(),
    });

    saveMetrics({ postId: 'p1', likes: 10, retweets: 2, replies: 4, impressions: 500, profileVisits: 5, followerDelta: 3, measuredAt: new Date().toISOString() });
    saveMetrics({ postId: 'p2', likes: 20, retweets: 4, replies: 6, impressions: 800, profileVisits: 10, followerDelta: 5, measuredAt: new Date().toISOString() });

    const summary = getEngagementSummary(1);

    expect(summary.totalPosts).toBe(2);
    expect(summary.avgLikes).toBe(15);
    expect(summary.avgReplies).toBe(5);
    expect(summary.totalFollowerDelta).toBe(8);
  });

  // --- Wake Snapshots ---

  it('should save and retrieve wake snapshots', () => {
    saveWakeSnapshot({
      wakeId: 'wake-2026-04-20-1200',
      timestamp: new Date().toISOString(),
      timeOfDay: 'noon',
      creativeEnergy: 0.7,
      socialHunger: 0.4,
      curiosity: 0.3,
      confidence: 0.8,
      actions: JSON.stringify([{ type: 'post', summary: 'test' }]),
      memoryUpdates: JSON.stringify(['strategy.md']),
      observations: 'Test observation',
      newFollowers: 5,
      totalFollowers: 100,
      costUsd: 0.15,
      turns: 8,
    });

    const snapshots = getWakeSnapshots(1);
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0].wakeId).toBe('wake-2026-04-20-1200');
    expect(snapshots[0].creativeEnergy).toBe(0.7);
    expect(snapshots[0].confidence).toBe(0.8);
    expect(snapshots[0].totalFollowers).toBe(100);
    expect(snapshots[0].observations).toBe('Test observation');
  });

  it('should return engagement trend by day', () => {
    saveWakeRecord({ wakeId: 'wake-1', timestamp: new Date().toISOString() });
    savePost({
      postId: 'p1', wakeId: 'wake-1', type: 'original',
      content: 'test', hasImage: false, postedAt: new Date().toISOString(),
    });
    saveMetrics({
      postId: 'p1', likes: 10, retweets: 2, replies: 4,
      impressions: 500, profileVisits: 5, followerDelta: 3,
      measuredAt: new Date().toISOString(),
    });

    const trend = getEngagementTrend(1);
    expect(trend.dailyStats).toHaveLength(1);
    expect(trend.dailyStats[0].posts).toBe(1);
    expect(trend.dailyStats[0].avgLikes).toBe(10);
    expect(trend.dailyStats[0].followerDelta).toBe(3);
  });

  // --- Interactions ---

  it('should save and retrieve interactions', () => {
    saveWakeRecord({ wakeId: 'wake-1', timestamp: new Date().toISOString() });

    const interaction: InteractionRecord = {
      wakeId: 'wake-1',
      type: 'quote',
      postId: 'tweet-456',
      targetUser: '@design_weekly',
      content: 'Great composition analysis',
      timestamp: new Date().toISOString(),
    };

    saveInteraction(interaction);
    const recent = getRecentInteractions(1);

    expect(recent).toHaveLength(1);
    expect(recent[0].targetUser).toBe('@design_weekly');
    expect(recent[0].type).toBe('quote');
  });
});
