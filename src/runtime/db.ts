import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

// --- Interfaces ---

export interface WakeRecord {
  wakeId: string;
  timestamp: string;
  duration?: number;
  cost?: number;
  turns?: number;
  actions?: string[];
}

export interface PostRecord {
  postId: string;
  wakeId: string;
  type: 'original' | 'reply' | 'retweet' | 'quote';
  content: string;
  contentCategory?: string;
  hasImage: boolean;
  postedAt: string;
  inReplyTo?: string;
}

export interface MetricsRecord {
  postId: string;
  likes: number;
  retweets: number;
  replies: number;
  impressions: number;
  profileVisits: number;
  followerDelta: number;
  measuredAt: string;
}

export interface InteractionRecord {
  interactionId?: number;
  wakeId: string;
  type: 'reply' | 'quote' | 'retweet' | 'mention_received';
  postId?: string;
  targetUser: string;
  content?: string;
  timestamp: string;
}

// --- DB initialization ---

const DEFAULT_DB_PATH =
  process.env.NODE_ENV === 'test' ? 'data/test-spectre.db' : 'data/spectre.db';

let db: Database.Database | null = null;

function getDB(): Database.Database {
  if (!db) throw new Error('Database not initialized. Call initDB() first.');
  return db;
}

export function closeDB(): void {
  if (db) {
    db.close();
    db = null;
  }
}

export function initDB(path?: string): void {
  // If already initialized with a connection, reuse it
  if (db) return;

  const dbPath = resolve(path ?? DEFAULT_DB_PATH);
  mkdirSync(dirname(dbPath), { recursive: true });

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS wakes (
      wake_id TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL,
      duration INTEGER DEFAULT 0,
      cost REAL DEFAULT 0,
      turns INTEGER DEFAULT 0,
      actions TEXT DEFAULT '[]'
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS posts (
      post_id TEXT PRIMARY KEY,
      wake_id TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('original', 'reply', 'retweet', 'quote')),
      content TEXT NOT NULL DEFAULT '',
      content_category TEXT,
      has_image INTEGER NOT NULL DEFAULT 0,
      posted_at TEXT NOT NULL,
      in_reply_to TEXT,
      FOREIGN KEY (wake_id) REFERENCES wakes(wake_id)
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS metrics (
      post_id TEXT PRIMARY KEY,
      likes INTEGER DEFAULT 0,
      retweets INTEGER DEFAULT 0,
      replies INTEGER DEFAULT 0,
      impressions INTEGER DEFAULT 0,
      profile_visits INTEGER DEFAULT 0,
      follower_delta INTEGER DEFAULT 0,
      measured_at TEXT NOT NULL,
      FOREIGN KEY (post_id) REFERENCES posts(post_id)
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS wake_snapshots (
      wake_id          TEXT PRIMARY KEY,
      timestamp        TEXT NOT NULL,
      time_of_day      TEXT NOT NULL,
      creative_energy  REAL NOT NULL,
      social_hunger    REAL NOT NULL,
      curiosity        REAL NOT NULL,
      confidence       REAL NOT NULL,
      actions          TEXT NOT NULL,
      memory_updates   TEXT,
      observations     TEXT,
      pending_items    TEXT,
      new_followers    INTEGER DEFAULT 0,
      total_followers  INTEGER DEFAULT 0,
      cost_usd         REAL,
      turns            INTEGER
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS interactions (
      interaction_id INTEGER PRIMARY KEY AUTOINCREMENT,
      wake_id TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('reply', 'quote', 'retweet', 'mention_received')),
      post_id TEXT,
      target_user TEXT NOT NULL,
      content TEXT,
      timestamp TEXT NOT NULL,
      FOREIGN KEY (wake_id) REFERENCES wakes(wake_id)
    )
  `);
}

// --- Wake records ---

export function saveWakeRecord(record: WakeRecord): void {
  const stmt = getDB().prepare(`
    INSERT OR REPLACE INTO wakes (wake_id, timestamp, duration, cost, turns, actions)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    record.wakeId,
    record.timestamp,
    record.duration ?? 0,
    record.cost ?? 0,
    record.turns ?? 0,
    JSON.stringify(record.actions ?? []),
  );
}

export function getRecentWakes(limit = 10): WakeRecord[] {
  const rows = getDB()
    .prepare('SELECT * FROM wakes ORDER BY timestamp DESC LIMIT ?')
    .all(limit) as Array<{
    wake_id: string;
    timestamp: string;
    duration: number;
    cost: number;
    turns: number;
    actions: string;
  }>;

  return rows.map((row) => ({
    wakeId: row.wake_id,
    timestamp: row.timestamp,
    duration: row.duration,
    cost: row.cost,
    turns: row.turns,
    actions: JSON.parse(row.actions) as string[],
  }));
}

export function getTotalCost(days = 30): number {
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const row = getDB()
    .prepare('SELECT COALESCE(SUM(cost), 0) as total FROM wakes WHERE timestamp >= ?')
    .get(since) as { total: number };
  return Math.round(row.total * 100) / 100;
}

// --- Post records ---

export function savePost(record: PostRecord): void {
  const stmt = getDB().prepare(`
    INSERT OR REPLACE INTO posts (post_id, wake_id, type, content, content_category, has_image, posted_at, in_reply_to)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    record.postId,
    record.wakeId,
    record.type,
    record.content,
    record.contentCategory ?? null,
    record.hasImage ? 1 : 0,
    record.postedAt,
    record.inReplyTo ?? null,
  );
}

export function getRecentPosts(limit = 20): PostRecord[] {
  const rows = getDB()
    .prepare('SELECT * FROM posts ORDER BY posted_at DESC LIMIT ?')
    .all(limit) as Array<{
    post_id: string;
    wake_id: string;
    type: string;
    content: string;
    content_category: string | null;
    has_image: number;
    posted_at: string;
    in_reply_to: string | null;
  }>;

  return rows.map((row) => ({
    postId: row.post_id,
    wakeId: row.wake_id,
    type: row.type as PostRecord['type'],
    content: row.content,
    contentCategory: row.content_category ?? undefined,
    hasImage: row.has_image === 1,
    postedAt: row.posted_at,
    inReplyTo: row.in_reply_to ?? undefined,
  }));
}

// --- Metrics records ---

export function saveMetrics(record: MetricsRecord): void {
  const stmt = getDB().prepare(`
    INSERT OR REPLACE INTO metrics (post_id, likes, retweets, replies, impressions, profile_visits, follower_delta, measured_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    record.postId,
    record.likes,
    record.retweets,
    record.replies,
    record.impressions,
    record.profileVisits,
    record.followerDelta,
    record.measuredAt,
  );
}

export function getMetricsForPost(postId: string): MetricsRecord | null {
  const row = getDB()
    .prepare('SELECT * FROM metrics WHERE post_id = ?')
    .get(postId) as {
    post_id: string;
    likes: number;
    retweets: number;
    replies: number;
    impressions: number;
    profile_visits: number;
    follower_delta: number;
    measured_at: string;
  } | undefined;

  if (!row) return null;

  return {
    postId: row.post_id,
    likes: row.likes,
    retweets: row.retweets,
    replies: row.replies,
    impressions: row.impressions,
    profileVisits: row.profile_visits,
    followerDelta: row.follower_delta,
    measuredAt: row.measured_at,
  };
}

export function getEngagementSummary(days = 7): {
  totalPosts: number;
  avgLikes: number;
  avgReplies: number;
  avgRetweets: number;
  totalFollowerDelta: number;
} {
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const row = getDB().prepare(`
    SELECT
      COUNT(m.post_id) as total_posts,
      COALESCE(AVG(m.likes), 0) as avg_likes,
      COALESCE(AVG(m.replies), 0) as avg_replies,
      COALESCE(AVG(m.retweets), 0) as avg_retweets,
      COALESCE(SUM(m.follower_delta), 0) as total_follower_delta
    FROM metrics m
    JOIN posts p ON m.post_id = p.post_id
    WHERE p.posted_at >= ?
  `).get(since) as {
    total_posts: number;
    avg_likes: number;
    avg_replies: number;
    avg_retweets: number;
    total_follower_delta: number;
  };

  return {
    totalPosts: row.total_posts,
    avgLikes: Math.round(row.avg_likes * 10) / 10,
    avgReplies: Math.round(row.avg_replies * 10) / 10,
    avgRetweets: Math.round(row.avg_retweets * 10) / 10,
    totalFollowerDelta: row.total_follower_delta,
  };
}

// --- Wake snapshots (PRD docs/runtime/db.md) ---

export interface WakeSnapshot {
  wakeId: string;
  timestamp: string;
  timeOfDay: string;
  creativeEnergy: number;
  socialHunger: number;
  curiosity: number;
  confidence: number;
  actions: string; // JSON
  memoryUpdates?: string; // JSON
  observations?: string;
  pendingItems?: string;
  newFollowers: number;
  totalFollowers: number;
  costUsd?: number;
  turns?: number;
}

export function saveWakeSnapshot(snapshot: WakeSnapshot): void {
  const stmt = getDB().prepare(`
    INSERT OR REPLACE INTO wake_snapshots (
      wake_id, timestamp, time_of_day,
      creative_energy, social_hunger, curiosity, confidence,
      actions, memory_updates, observations, pending_items,
      new_followers, total_followers, cost_usd, turns
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    snapshot.wakeId,
    snapshot.timestamp,
    snapshot.timeOfDay,
    snapshot.creativeEnergy,
    snapshot.socialHunger,
    snapshot.curiosity,
    snapshot.confidence,
    snapshot.actions,
    snapshot.memoryUpdates ?? null,
    snapshot.observations ?? null,
    snapshot.pendingItems ?? null,
    snapshot.newFollowers,
    snapshot.totalFollowers,
    snapshot.costUsd ?? null,
    snapshot.turns ?? null,
  );
}

export function getWakeSnapshots(days = 30): WakeSnapshot[] {
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const rows = getDB()
    .prepare('SELECT * FROM wake_snapshots WHERE timestamp >= ? ORDER BY timestamp ASC')
    .all(since) as Array<{
    wake_id: string;
    timestamp: string;
    time_of_day: string;
    creative_energy: number;
    social_hunger: number;
    curiosity: number;
    confidence: number;
    actions: string;
    memory_updates: string | null;
    observations: string | null;
    pending_items: string | null;
    new_followers: number;
    total_followers: number;
    cost_usd: number | null;
    turns: number | null;
  }>;

  return rows.map((row) => ({
    wakeId: row.wake_id,
    timestamp: row.timestamp,
    timeOfDay: row.time_of_day,
    creativeEnergy: row.creative_energy,
    socialHunger: row.social_hunger,
    curiosity: row.curiosity,
    confidence: row.confidence,
    actions: row.actions,
    memoryUpdates: row.memory_updates ?? undefined,
    observations: row.observations ?? undefined,
    pendingItems: row.pending_items ?? undefined,
    newFollowers: row.new_followers,
    totalFollowers: row.total_followers,
    costUsd: row.cost_usd ?? undefined,
    turns: row.turns ?? undefined,
  }));
}

export function getEngagementTrend(days = 7): {
  dailyStats: Array<{
    date: string;
    posts: number;
    avgLikes: number;
    avgReplies: number;
    avgRetweets: number;
    followerDelta: number;
  }>;
} {
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const rows = getDB().prepare(`
    SELECT
      DATE(p.posted_at) as date,
      COUNT(p.post_id) as posts,
      COALESCE(AVG(m.likes), 0) as avg_likes,
      COALESCE(AVG(m.replies), 0) as avg_replies,
      COALESCE(AVG(m.retweets), 0) as avg_retweets,
      COALESCE(SUM(m.follower_delta), 0) as follower_delta
    FROM posts p
    LEFT JOIN metrics m ON p.post_id = m.post_id
    WHERE p.posted_at >= ?
    GROUP BY DATE(p.posted_at)
    ORDER BY date ASC
  `).all(since) as Array<{
    date: string;
    posts: number;
    avg_likes: number;
    avg_replies: number;
    avg_retweets: number;
    follower_delta: number;
  }>;

  return {
    dailyStats: rows.map((row) => ({
      date: row.date,
      posts: row.posts,
      avgLikes: Math.round(row.avg_likes * 10) / 10,
      avgReplies: Math.round(row.avg_replies * 10) / 10,
      avgRetweets: Math.round(row.avg_retweets * 10) / 10,
      followerDelta: row.follower_delta,
    })),
  };
}

// --- Interaction records ---

export function saveInteraction(record: InteractionRecord): void {
  const stmt = getDB().prepare(`
    INSERT INTO interactions (wake_id, type, post_id, target_user, content, timestamp)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    record.wakeId,
    record.type,
    record.postId ?? null,
    record.targetUser,
    record.content ?? null,
    record.timestamp,
  );
}

export function getRecentInteractions(limit = 20): InteractionRecord[] {
  const rows = getDB()
    .prepare('SELECT * FROM interactions ORDER BY timestamp DESC LIMIT ?')
    .all(limit) as Array<{
    interaction_id: number;
    wake_id: string;
    type: string;
    post_id: string | null;
    target_user: string;
    content: string | null;
    timestamp: string;
  }>;

  return rows.map((row) => ({
    interactionId: row.interaction_id,
    wakeId: row.wake_id,
    type: row.type as InteractionRecord['type'],
    postId: row.post_id ?? undefined,
    targetUser: row.target_user,
    content: row.content ?? undefined,
    timestamp: row.timestamp,
  }));
}
