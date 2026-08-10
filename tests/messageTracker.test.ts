import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { MessageTracker, TrackedMessage } from '../src/services/messageTracker';
import { MESSAGE_RETENTION_WINDOW_MS } from '../src/utils/constants';

describe('MessageTracker', () => {
  let tracker: MessageTracker;

  beforeEach(() => {
    vi.useFakeTimers();
    tracker = new MessageTracker();
  });

  afterEach(() => {
    tracker.destroy();
    vi.useRealTimers();
  });

  it('should track messages', () => {
    const msg: TrackedMessage = { guildId: 'g1', channelId: 'c1', messageId: 'm1', authorId: 'u1', createdTimestamp: Date.now() };
    tracker.track(msg);
    const messages = tracker.getUserMessages('g1', 'u1');
    expect(messages).toHaveLength(1);
    expect(messages[0]).toEqual(msg);
  });

  it('should filter messages by user', () => {
    tracker.track({ guildId: 'g1', channelId: 'c1', messageId: 'm1', authorId: 'u1', createdTimestamp: Date.now() });
    tracker.track({ guildId: 'g1', channelId: 'c1', messageId: 'm2', authorId: 'u2', createdTimestamp: Date.now() });
    
    const u1Messages = tracker.getUserMessages('g1', 'u1');
    expect(u1Messages).toHaveLength(1);
    expect(u1Messages[0].authorId).toBe('u1');
  });

  it('should filter messages by guild', () => {
    tracker.track({ guildId: 'g1', channelId: 'c1', messageId: 'm1', authorId: 'u1', createdTimestamp: Date.now() });
    tracker.track({ guildId: 'g2', channelId: 'c2', messageId: 'm2', authorId: 'u1', createdTimestamp: Date.now() });
    
    const g1Messages = tracker.getUserMessages('g1', 'u1');
    expect(g1Messages).toHaveLength(1);
    expect(g1Messages[0].guildId).toBe('g1');
  });

  it('should filter messages by time window', () => {
    const now = Date.now();
    tracker.track({ guildId: 'g1', channelId: 'c1', messageId: 'm1', authorId: 'u1', createdTimestamp: now - 10000 });
    tracker.track({ guildId: 'g1', channelId: 'c1', messageId: 'm2', authorId: 'u1', createdTimestamp: now - 2000 });
    
    const messages = tracker.getUserMessages('g1', 'u1', now - 5000);
    expect(messages).toHaveLength(1);
    expect(messages[0].messageId).toBe('m2');
  });

  it('should remove specific messages', () => {
    tracker.track({ guildId: 'g1', channelId: 'c1', messageId: 'm1', authorId: 'u1', createdTimestamp: Date.now() });
    tracker.removeMessage('g1', 'm1');
    
    const messages = tracker.getUserMessages('g1', 'u1');
    expect(messages).toHaveLength(0);
  });

  it('should clean up expired messages', () => {
    const now = Date.now();
    tracker.track({ guildId: 'g1', channelId: 'c1', messageId: 'm1', authorId: 'u1', createdTimestamp: now - (MESSAGE_RETENTION_WINDOW_MS + 6 * 60 * 1000) });
    
    tracker.cleanup();
    const messages = tracker.getUserMessages('g1', 'u1');
    expect(messages).toHaveLength(0);
  });

  it('should keep recent messages during cleanup', () => {
    const now = Date.now();
    tracker.track({ guildId: 'g1', channelId: 'c1', messageId: 'm1', authorId: 'u1', createdTimestamp: now });
    
    tracker.cleanup();
    const messages = tracker.getUserMessages('g1', 'u1');
    expect(messages).toHaveLength(1);
  });

  it('should return message count per guild', () => {
    tracker.track({ guildId: 'g1', channelId: 'c1', messageId: 'm1', authorId: 'u1', createdTimestamp: Date.now() });
    tracker.track({ guildId: 'g1', channelId: 'c1', messageId: 'm2', authorId: 'u2', createdTimestamp: Date.now() });
    
    expect(tracker.getGuildMessageCount('g1')).toBe(2);
    expect(tracker.getGuildMessageCount('g2')).toBe(0);
  });

  it('should handle empty state gracefully', () => {
    expect(tracker.getUserMessages('g1', 'u1')).toEqual([]);
    expect(tracker.getGuildMessageCount('g1')).toBe(0);
  });

  it('destroy should clear all data', () => {
    tracker.track({ guildId: 'g1', channelId: 'c1', messageId: 'm1', authorId: 'u1', createdTimestamp: Date.now() });
    tracker.destroy();
    
    expect(tracker.getUserMessages('g1', 'u1')).toEqual([]);
    expect(tracker.getGuildMessageCount('g1')).toBe(0);
  });
});
