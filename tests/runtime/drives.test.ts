import { describe, it, expect } from 'vitest';
import { calculateDrives, describeDrives, type Drives } from '../../src/runtime/drives';

describe('Drives', () => {
  describe('calculateDrives', () => {
    it('should return near-baseline drives when no context provided', () => {
      const drives = calculateDrives(null, null);

      // With no actions, creative_energy gets +0.1 (no post), social_hunger gets +0.1 (no interaction)
      // So values won't be exactly baseline, but should be in reasonable range
      expect(drives.creative_energy).toBeGreaterThanOrEqual(0);
      expect(drives.creative_energy).toBeLessThanOrEqual(1);
      expect(drives.social_hunger).toBeGreaterThanOrEqual(0);
      expect(drives.social_hunger).toBeLessThanOrEqual(1);
      expect(drives.curiosity).toBeGreaterThanOrEqual(0);
      expect(drives.curiosity).toBeLessThanOrEqual(1);
      expect(drives.confidence).toBeGreaterThanOrEqual(0);
      expect(drives.confidence).toBeLessThanOrEqual(1);
    });

    it('should increase creative_energy when no post action in last wake', () => {
      const drives = calculateDrives(
        { actions: [{ type: 'reply', summary: 'replied' }], drives: { creative_energy: 0.5, social_hunger: 0.4, curiosity: 0.3, confidence: 0.5 } },
        null,
      );

      expect(drives.creative_energy).toBeGreaterThan(0.5);
    });

    it('should decrease creative_energy after posting', () => {
      const drives = calculateDrives(
        { actions: [{ type: 'post', summary: 'posted' }], drives: { creative_energy: 0.5, social_hunger: 0.4, curiosity: 0.3, confidence: 0.5 } },
        null,
      );

      expect(drives.creative_energy).toBeLessThan(0.5);
    });

    it('should increase social_hunger when no interaction in last wake', () => {
      const drives = calculateDrives(
        { actions: [{ type: 'post', summary: 'posted' }], drives: { creative_energy: 0.5, social_hunger: 0.4, curiosity: 0.3, confidence: 0.5 } },
        null,
      );

      expect(drives.social_hunger).toBeGreaterThan(0.4);
    });

    it('should decrease social_hunger after interactions', () => {
      const drives = calculateDrives(
        { actions: [{ type: 'reply', summary: 'replied' }, { type: 'quote', summary: 'quoted' }], drives: { creative_energy: 0.5, social_hunger: 0.6, curiosity: 0.3, confidence: 0.5 } },
        null,
      );

      expect(drives.social_hunger).toBeLessThan(0.6);
    });

    it('should increase confidence with good engagement', () => {
      const drives = calculateDrives(
        { drives: { creative_energy: 0.5, social_hunger: 0.4, curiosity: 0.3, confidence: 0.5 } },
        { avgLikes: 10, avgReplies: 3, avgRetweets: 5, totalFollowerDelta: 10, totalPosts: 5 },
      );

      expect(drives.confidence).toBeGreaterThan(0.5);
    });

    it('should decrease confidence with follower loss', () => {
      const drives = calculateDrives(
        { drives: { creative_energy: 0.5, social_hunger: 0.4, curiosity: 0.3, confidence: 0.5 } },
        { avgLikes: 0, avgReplies: 0, avgRetweets: 0, totalFollowerDelta: -5, totalPosts: 3 },
      );

      expect(drives.confidence).toBeLessThan(0.5);
    });

    it('should clamp drives to [0, 1] range', () => {
      const drives = calculateDrives(
        {
          actions: [
            { type: 'post', summary: 'a' }, { type: 'post', summary: 'b' },
            { type: 'post', summary: 'c' }, { type: 'post', summary: 'd' },
          ],
          drives: { creative_energy: 0.05, social_hunger: 0.95, curiosity: 0.95, confidence: 0.05 },
        },
        { avgLikes: 0, avgReplies: 0, avgRetweets: 0, totalFollowerDelta: -10, totalPosts: 10 },
      );

      expect(drives.creative_energy).toBeGreaterThanOrEqual(0);
      expect(drives.creative_energy).toBeLessThanOrEqual(1);
      expect(drives.social_hunger).toBeGreaterThanOrEqual(0);
      expect(drives.social_hunger).toBeLessThanOrEqual(1);
      expect(drives.curiosity).toBeGreaterThanOrEqual(0);
      expect(drives.curiosity).toBeLessThanOrEqual(1);
      expect(drives.confidence).toBeGreaterThanOrEqual(0);
      expect(drives.confidence).toBeLessThanOrEqual(1);
    });

    it('should increase social_hunger when new followers gained', () => {
      const drives = calculateDrives(
        {
          actions: [],
          metrics: { newFollowers: 5, totalFollowers: 100 },
          drives: { creative_energy: 0.5, social_hunger: 0.4, curiosity: 0.3, confidence: 0.5 },
        },
        null,
      );

      // New followers should boost social_hunger
      expect(drives.social_hunger).toBeGreaterThan(0.4);
    });
  });

  describe('describeDrives', () => {
    it('should generate <internal-state> block with natural language', () => {
      const drives: Drives = {
        creative_energy: 0.7,
        social_hunger: 0.4,
        curiosity: 0.3,
        confidence: 0.8,
      };

      const description = describeDrives(drives);

      expect(description).toContain('<internal-state>');
      expect(description).toContain('</internal-state>');
      expect(description).toContain('创作能量');
      expect(description).toContain('社交需求');
      expect(description).toContain('好奇心');
      expect(description).toContain('信心');
      expect(description).toContain('0.70');
      expect(description).toContain('0.80');
    });

    it('should describe high drives correctly', () => {
      const drives: Drives = {
        creative_energy: 0.8,
        social_hunger: 0.8,
        curiosity: 0.8,
        confidence: 0.8,
      };

      const description = describeDrives(drives);

      expect(description).toContain('高');
      expect(description).toContain('创作冲动');
      expect(description).toContain('互动聊天');
      expect(description).toContain('新事物');
      expect(description).toContain('大胆尝试');
    });

    it('should describe low drives correctly', () => {
      const drives: Drives = {
        creative_energy: 0.2,
        social_hunger: 0.2,
        curiosity: 0.2,
        confidence: 0.2,
      };

      const description = describeDrives(drives);

      expect(description).toContain('低');
      expect(description).toContain('消费和观察');
      expect(description).toContain('独处');
      expect(description).toContain('深耕');
      expect(description).toContain('保守');
    });
  });
});
